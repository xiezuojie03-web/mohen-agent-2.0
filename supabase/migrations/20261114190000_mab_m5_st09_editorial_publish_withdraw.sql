-- M5 / ST-09 / EditorialDecision · Publish · Withdraw
--
-- 设计原文依据：
--   KAD2 §1「Editorial Operator：审核准确作品修订、媒资/发布用途，执行发布/撤回；
--            不得因运营批准覆盖G/权利」→ 回执 `EditorialDecision`、`PublicationSnapshot`
--   KAD2 §7 ST-09「接受运营退修/合法上线/撤回｜独立Operator决策精确revision与指针；不代G
--            → `publication_snapshot@rev`；失败保留旧合法稿」
--   KAD2 §9 `PUBLISH_ELIGIBILITY_HOLD`「作品rev资格/版权/运营核签不足 → 仅内部预览，不切公开指针」
--   KALC §4「作品：DRAFT → SUBMITTED → CHANGES_REQUESTED | APPROVED → PUBLISHED →
--            SUSPENDED | WITHDRAWN；运营编辑决定不构成知识G资格，WATCH不使用未发布作品」
--   KALC §11「CAS发布只指向批准且当下合法的不可变 WorkRevision；新版本失败不破坏旧合法发布指针」
--   AGENT 合同 §6.2 ST-09「接收退回/发布/撤回｜提供依赖/资格检查｜editorial_decision/published_work_version」
--              「作品发布后同一合法 WorkRevision@rev 供 WATCH 消费，不另建第二作品；运营审核不代签G」
--
-- 设计取舍（不自行发挥）：
--   1) **不另建第二套发布真值**：发布指针仍只有 `publication.published_pointers` 一张表；
--      本迁移把它扩展成可指向 `studio.work_revisions`（`source_schema` 区分），旧行默认仍指
--      legacy `publication.work_revisions`，一行不动、语义不变。WATCH 只读这张指针表。
--   2) 运营决策与发布是两件事：`EditorialDecision` 只表达运营核签（退修/通过/拒绝），
--      不构成知识 G 资格；`Publish` 必须在决策当下**重新**校验 G5 当前有效 + 逐动作媒体权利，
--      任一不成立即 `PUBLISH_ELIGIBILITY_HOLD`，**指针保持原样**（失败保留旧合法稿）。
--   3) 「当时快照不抵当前复核」（KALC §10）：权利按当前 source 权利词典实时重查，
--      不沿用 ST-08 投稿快照里记录的旧值。
--   4) 运营身份与创作者、Gate 签发身份三者分离：新增 DB 角色 `mohen_editorial_operator`，
--      且函数内拒绝 operator 与作品 creator 同一人（不代签、不自审）。
--   5) 撤回即失效：`publication.withdrawals` 追加一行 + 同事务删除公开指针；
--      历史 publication_snapshot 保留为历史，不复活撤权内容。
begin;

-- ============== 0) 运营身份角色（与 Creator / Gate 签发分离） ==============
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mohen_editorial_operator') then
    create role mohen_editorial_operator nologin;
  end if;
end $$;

-- ============== 1) 作品级媒体权利复核（实时，不沿用旧快照） ==============
create or replace function studio.private_work_rights_summary(
 p_revision_id uuid,
 p_project_id uuid,
 p_actions text[]
) returns jsonb language plpgsql stable security definer
set search_path=public,studio,source,control set jit=off as $$
declare
 wr studio.work_revisions;
 original_ids uuid[];
 oid uuid;
 orig_state text;
 src_id uuid;
 rights_obj jsonb;
 rights_ev jsonb;
 entry jsonb;
 originals jsonb := '[]'::jsonb;
 gaps jsonb := '[]'::jsonb;
 act text;
 act_value text;
begin
 select * into wr from studio.work_revisions
  where revision_id = p_revision_id and project_id = p_project_id;
 if not found then raise exception 'PRIVATE_RIGHTS_REVISION_NOT_FOUND'; end if;

 select array_agg(distinct t.value::uuid)
   into original_ids
 from jsonb_array_elements_text(coalesce(wr.payload->'original_ids','[]'::jsonb)) as t(value);

 if original_ids is null then
  return jsonb_build_object('originals','[]'::jsonb,'gaps','[]'::jsonb,'original_count',0);
 end if;

 foreach oid in array original_ids loop
  orig_state := null; src_id := null; rights_obj := null; rights_ev := null;
  select o.state, s.source_id, s.rights_by_action, s.rights_evidence
    into orig_state, src_id, rights_obj, rights_ev
  from studio.private_originals o
   join source.raw_items ri
     on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
    and ri.checksum_sha256 = o.sha256 and ri.byte_size = o.byte_size
   join source.source_versions v on v.source_version_id = ri.source_version_id
   join source.sources s on s.source_id = v.source_id
  where o.original_id = oid and o.project_id = p_project_id;
  if not found then raise exception 'PRIVATE_RIGHTS_ORIGINAL_NOT_RESOLVED:%', oid; end if;
  if orig_state is distinct from 'STORED_VERIFIED' then
   raise exception 'PRIVATE_RIGHTS_ORIGINAL_NOT_VERIFIED:%:%', oid, coalesce(orig_state,'unknown');
  end if;

  entry := jsonb_build_object('original_id', oid, 'source_id', src_id,
    'basis', coalesce(rights_ev->>'basis',''), 'actions', coalesce(rights_obj,'{}'::jsonb),
    'blocked_actions','[]'::jsonb);
  foreach act in array p_actions loop
   act_value := coalesce(rights_obj->>act,'unknown');
   if act_value <> 'allowed' then
    entry := jsonb_set(entry,'{blocked_actions}', (entry->'blocked_actions') || to_jsonb(act));
    gaps := gaps || jsonb_build_array(jsonb_build_object(
      'code','rights_action_not_allowed:'||act,'scope','media_rights',
      'original_id',oid,'action',act,'value',act_value));
   end if;
  end loop;
  originals := originals || jsonb_build_array(entry);
 end loop;

 return jsonb_build_object('originals', originals, 'gaps', gaps,
  'original_count', cardinality(original_ids));
end $$;

-- ============== 2) publication.editorial_decisions（运营核签，append-only） ==============
create table if not exists publication.editorial_decisions (
  decision_id             uuid primary key,
  work_id                 uuid not null,
  revision_id             uuid not null references studio.work_revisions(revision_id),
  project_id              uuid not null references studio.projects(project_id),
  submission_snapshot_id  uuid not null references studio.submission_snapshots(snapshot_id),
  decision                text not null check (decision in ('APPROVED','CHANGES_REQUESTED','REJECTED')),
  operator_id             text not null check (length(btrim(operator_id)) > 0),
  operator_role           text not null default 'editorial_operator',
  content_hash            text not null,
  artifact_revision       text not null,
  knowledge_gate_audit_id uuid not null,
  rights_snapshot         jsonb not null default '{}'::jsonb,
  rights_gaps             jsonb not null default '[]'::jsonb,
  notes                   text not null default '',
  idempotency_key         text not null,
  created_at              timestamptz not null default now(),
  unique (idempotency_key)
);
create index if not exists editorial_decisions_revision_idx
  on publication.editorial_decisions (revision_id, created_at desc);

alter table publication.editorial_decisions enable row level security;
drop policy if exists editorial_decisions_app_runtime_read on publication.editorial_decisions;
create policy editorial_decisions_app_runtime_read on publication.editorial_decisions
  for select to mohen_app_runtime using (true);
drop policy if exists editorial_decisions_operator_read on publication.editorial_decisions;
create policy editorial_decisions_operator_read on publication.editorial_decisions
  for select to mohen_editorial_operator using (true);

revoke all on publication.editorial_decisions
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select on publication.editorial_decisions to mohen_app_runtime, mohen_editorial_operator;

create or replace function publication.editorial_decisions_immutable() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'EDITORIAL_DECISION_IMMUTABLE';
end $$;
drop trigger if exists editorial_decisions_immutable on publication.editorial_decisions;
create trigger editorial_decisions_immutable
  before update or delete on publication.editorial_decisions
  for each row execute function publication.editorial_decisions_immutable();

-- ============== 3) publication.publication_snapshots（X1 PublicationSnapshot@rev） ==============
create table if not exists publication.publication_snapshots (
  publication_id     uuid primary key,
  work_id            uuid not null,
  revision_id        uuid not null references studio.work_revisions(revision_id),
  project_id         uuid not null references studio.projects(project_id),
  decision_id        uuid not null references publication.editorial_decisions(decision_id),
  submission_snapshot_id uuid not null references studio.submission_snapshots(snapshot_id),
  artifact_revision  text not null check (artifact_revision ~ '^[0-9a-f]{64}$'),
  scope              text not null default 'PUBLIC' check (scope in ('PUBLIC')),
  published_by       text not null,
  rights_snapshot    jsonb not null default '{}'::jsonb,
  idempotency_key    text not null,
  created_at         timestamptz not null default now(),
  unique (idempotency_key)
);

alter table publication.publication_snapshots enable row level security;
drop policy if exists publication_snapshots_app_runtime_read on publication.publication_snapshots;
create policy publication_snapshots_app_runtime_read on publication.publication_snapshots
  for select to mohen_app_runtime using (true);
drop policy if exists publication_snapshots_operator_read on publication.publication_snapshots;
create policy publication_snapshots_operator_read on publication.publication_snapshots
  for select to mohen_editorial_operator using (true);

revoke all on publication.publication_snapshots
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select on publication.publication_snapshots to mohen_app_runtime, mohen_editorial_operator;

create or replace function publication.publication_snapshots_immutable() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'PUBLICATION_SNAPSHOT_IMMUTABLE';
end $$;
drop trigger if exists publication_snapshots_immutable on publication.publication_snapshots;
create trigger publication_snapshots_immutable
  before update or delete on publication.publication_snapshots
  for each row execute function publication.publication_snapshots_immutable();

-- ============== 4) publication.withdrawals（撤回记录，append-only） ==============
create table if not exists publication.withdrawals (
  withdrawal_id  uuid primary key,
  work_id        uuid not null,
  publication_id uuid not null references publication.publication_snapshots(publication_id),
  withdrawn_by   text not null,
  reason         text not null default '',
  idempotency_key text not null,
  created_at     timestamptz not null default now(),
  unique (idempotency_key)
);

alter table publication.withdrawals enable row level security;
drop policy if exists withdrawals_app_runtime_read on publication.withdrawals;
create policy withdrawals_app_runtime_read on publication.withdrawals
  for select to mohen_app_runtime using (true);
drop policy if exists withdrawals_operator_read on publication.withdrawals;
create policy withdrawals_operator_read on publication.withdrawals
  for select to mohen_editorial_operator using (true);

revoke all on publication.withdrawals
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select on publication.withdrawals to mohen_app_runtime, mohen_editorial_operator;

create or replace function publication.withdrawals_immutable() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'WITHDRAWAL_IMMUTABLE';
end $$;
drop trigger if exists withdrawals_immutable on publication.withdrawals;
create trigger withdrawals_immutable
  before update or delete on publication.withdrawals
  for each row execute function publication.withdrawals_immutable();

-- ============== 5) 发布指针扩展：同一张表，可指向 studio 精确修订 ==============
alter table publication.published_pointers
  add column if not exists source_schema text not null default 'publication',
  add column if not exists studio_revision_id uuid references studio.work_revisions(revision_id),
  add column if not exists publication_id uuid references publication.publication_snapshots(publication_id);

alter table publication.published_pointers alter column revision_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'published_pointers_source_schema_check') then
    alter table publication.published_pointers
      add constraint published_pointers_source_schema_check
      check (source_schema in ('publication','studio'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'published_pointers_target_exclusive') then
    alter table publication.published_pointers
      add constraint published_pointers_target_exclusive check (
        (source_schema = 'publication' and revision_id is not null and studio_revision_id is null and publication_id is null)
        or (source_schema = 'studio' and studio_revision_id is not null and revision_id is null and publication_id is not null)
      );
  end if;
end $$;

-- 旧的 work_id → publication.works 外键把"作品身份"硬锁在 legacy 表上，
-- 而新链的作品身份只在 studio.work_revisions.work_id（没有 studio.works 表）。
-- 为了让**同一张指针表**同时承载两条链（不另建第二套发布真值），这里把该外键换成目标校验触发器：
-- legacy 行仍必须在 publication.works 存在；studio 行必须能对上精确修订与其 work_id。
alter table publication.published_pointers drop constraint if exists published_pointers_work_id_fkey;

create or replace function publication.published_pointers_target_guard() returns trigger
language plpgsql security definer set search_path=publication,studio,pg_catalog as $$
begin
  if new.source_schema = 'publication' then
    if not exists (select 1 from publication.works w where w.work_id = new.work_id) then
      raise exception 'PUBLISHED_POINTER_WORK_NOT_FOUND';
    end if;
  else
    if not exists (select 1 from studio.work_revisions r
                    where r.revision_id = new.studio_revision_id and r.work_id = new.work_id) then
      raise exception 'PUBLISHED_POINTER_REVISION_MISMATCH';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists published_pointers_target_guard on publication.published_pointers;
create trigger published_pointers_target_guard
  before insert or update on publication.published_pointers
  for each row execute function publication.published_pointers_target_guard();

-- ============== 6) 运营核签：decide_editorial ==============
create or replace function publication.decide_editorial(
 p_decision_id uuid,
 p_work_id uuid,
 p_revision_id uuid,
 p_decision text,
 p_operator_id text,
 p_notes text,
 p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path=public,studio,source,control,publication set jit=off as $$
declare
 wr studio.work_revisions;
 ss studio.submission_snapshots;
 g5 record;
 existing publication.editorial_decisions;
 current_rev text;
 rights jsonb;
 gaps jsonb;
 act text;
begin
 if p_decision_id is null or p_work_id is null or p_revision_id is null
    or coalesce(btrim(p_idempotency_key),'') = '' then
  raise exception 'EDITORIAL_DECISION_INVALID';
 end if;
 if p_decision not in ('APPROVED','CHANGES_REQUESTED','REJECTED') then
  raise exception 'EDITORIAL_DECISION_INVALID:unknown_decision';
 end if;

 -- 幂等：同一 idempotency_key 重放返回旧决策
 select * into existing from publication.editorial_decisions where idempotency_key = p_idempotency_key;
 if found then
  return jsonb_build_object('decision_id', existing.decision_id, 'decision', existing.decision,
   'revision_id', existing.revision_id, 'idempotent', true,
   'rights_gaps', existing.rights_gaps,
   'publishable', (existing.decision = 'APPROVED' and jsonb_array_length(
     coalesce(existing.rights_gaps,'[]'::jsonb)) = 0));
 end if;

 select * into wr from studio.work_revisions
  where revision_id = p_revision_id and work_id = p_work_id;
 if not found then raise exception 'EDITORIAL_REVISION_NOT_FOUND'; end if;

 -- 只有「已投稿冻结」的精确修订可被运营核签
 select * into ss from studio.submission_snapshots where revision_id = p_revision_id;
 if not found then raise exception 'EDITORIAL_SUBMISSION_REQUIRED'; end if;
 if ss.content_hash is distinct from wr.content_hash then
  raise exception 'EDITORIAL_SUBMISSION_STALE:content_hash_mismatch';
 end if;

 -- 运营身份必须存在、且不得是作品创作者本人（不代签、不自审）
 if coalesce(btrim(p_operator_id),'') = '' then raise exception 'EDITORIAL_OPERATOR_REQUIRED'; end if;
 if p_operator_id = wr.creator_id then raise exception 'EDITORIAL_OPERATOR_CONFLICT:creator_self_review'; end if;

 -- 运营批准不能覆盖知识资格：决策当下必须仍有精确修订的当前 G5
 select ga.gate_audit_id, ga.artifact_revision into g5
 from control.gate_audits ga
  where ga.object_type = 'work_revision' and ga.object_id = p_revision_id
    and ga.gate_code = 'G5' and ga.result = 'PASS' and ga.current_valid
    and (ga.valid_until is null or now() < ga.valid_until)
  order by ga.signed_at desc limit 1;
 if not found then raise exception 'EDITORIAL_KNOWLEDGE_NOT_CURRENT:no_current_g5'; end if;

 current_rev := control.artifact_revision_for('work_revision', p_revision_id);
 if current_rev is null or current_rev is distinct from g5.artifact_revision then
  raise exception 'EDITORIAL_KNOWLEDGE_NOT_CURRENT:artifact_revision_moved';
 end if;

 -- 逐动作媒体权利实时复核（不沿用投稿快照旧值）：只记录缺口，不代 G、不代权利
 rights := studio.private_work_rights_summary(p_revision_id, wr.project_id,
  array['display','quote','download','adapt','redistribute','external_processing']);
 gaps := coalesce(rights->'gaps','[]'::jsonb);

 insert into publication.editorial_decisions(
  decision_id, work_id, revision_id, project_id, submission_snapshot_id, decision,
  operator_id, operator_role, content_hash, artifact_revision, knowledge_gate_audit_id,
  rights_snapshot, rights_gaps, notes, idempotency_key
 ) values (
  p_decision_id, p_work_id, p_revision_id, wr.project_id, ss.snapshot_id, p_decision,
  p_operator_id, 'editorial_operator', wr.content_hash, current_rev, g5.gate_audit_id,
  rights, gaps, coalesce(p_notes,''), p_idempotency_key
 );

 return jsonb_build_object(
  'decision_id', p_decision_id,
  'decision', p_decision,
  'revision_id', p_revision_id,
  'submission_snapshot_id', ss.snapshot_id,
  'idempotent', false,
  'rights_gaps', gaps,
  'publishable', (p_decision = 'APPROVED' and jsonb_array_length(gaps) = 0)
 );
end $$;

-- ============== 7) 发布：publish_exact_revision（CAS 指向精确修订，失败不动旧指针） ==============
create or replace function publication.publish_exact_revision(
 p_publication_id uuid,
 p_work_id uuid,
 p_revision_id uuid,
 p_operator_id text,
 p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path=public,studio,source,control,publication set jit=off as $$
declare
 wr studio.work_revisions;
 ss studio.submission_snapshots;
 dec publication.editorial_decisions;
 existing publication.publication_snapshots;
 g5 record;
 current_rev text;
 rights jsonb;
 gaps jsonb;
 display_blocked integer;
begin
 if p_publication_id is null or p_work_id is null or p_revision_id is null
    or coalesce(btrim(p_idempotency_key),'') = '' then
  raise exception 'PUBLISH_INVALID';
 end if;

 select * into existing from publication.publication_snapshots where idempotency_key = p_idempotency_key;
 if found then
  return jsonb_build_object('publication_id', existing.publication_id,
   'revision_id', existing.revision_id, 'scope', existing.scope, 'idempotent', true);
 end if;

 select * into wr from studio.work_revisions where revision_id = p_revision_id and work_id = p_work_id;
 if not found then raise exception 'PUBLISH_REVISION_NOT_FOUND'; end if;

 -- 必须已有投稿冻结与「当前最新」的运营通过决策
 select * into ss from studio.submission_snapshots where revision_id = p_revision_id;
 if not found then raise exception 'PUBLISH_SUBMISSION_REQUIRED'; end if;

 select * into dec from publication.editorial_decisions
  where revision_id = p_revision_id
  order by created_at desc limit 1;
 if not found or dec.decision <> 'APPROVED' then
  raise exception 'PUBLISH_DECISION_REQUIRED';
 end if;
 if coalesce(btrim(p_operator_id),'') = '' or p_operator_id = wr.creator_id then
  raise exception 'PUBLISH_OPERATOR_REQUIRED';
 end if;

 -- 发布当下重新校验知识资格（不允许用旧快照顶当前有效）
 select ga.gate_audit_id, ga.artifact_revision into g5
 from control.gate_audits ga
  where ga.object_type = 'work_revision' and ga.object_id = p_revision_id
    and ga.gate_code = 'G5' and ga.result = 'PASS' and ga.current_valid
    and (ga.valid_until is null or now() < ga.valid_until)
  order by ga.signed_at desc limit 1;
 if not found then raise exception 'PUBLISH_ELIGIBILITY_HOLD:knowledge_not_current'; end if;

 current_rev := control.artifact_revision_for('work_revision', p_revision_id);
 if current_rev is null or current_rev is distinct from g5.artifact_revision then
  raise exception 'PUBLISH_ELIGIBILITY_HOLD:artifact_revision_moved';
 end if;

 -- 公开发布必须有显式公开展示许可；权利不明一律 HOLD，指针保持原样
 rights := studio.private_work_rights_summary(p_revision_id, wr.project_id,
  array['display','quote','download','adapt','redistribute','external_processing']);
 gaps := coalesce(rights->'gaps','[]'::jsonb);
 select count(*) into display_blocked from jsonb_array_elements(gaps) g
  where g->>'action' = 'display';
 if display_blocked > 0 then
  raise exception 'PUBLISH_ELIGIBILITY_HOLD:rights_display_not_allowed';
 end if;

 -- 原子：先落发布快照，再切指针（同一事务，失败整体回滚 → 旧合法稿不受影响）
 insert into publication.publication_snapshots(
  publication_id, work_id, revision_id, project_id, decision_id, submission_snapshot_id,
  artifact_revision, scope, published_by, rights_snapshot, idempotency_key
 ) values (
  p_publication_id, p_work_id, p_revision_id, wr.project_id, dec.decision_id, ss.snapshot_id,
  current_rev, 'PUBLIC', p_operator_id, rights, p_idempotency_key
 );

 insert into publication.published_pointers(
  work_id, source_schema, revision_id, studio_revision_id, publication_id, published_at, published_by
 ) values (
  p_work_id, 'studio', null, p_revision_id, p_publication_id, now(), p_operator_id
 )
 on conflict (work_id) do update set
  source_schema = 'studio',
  revision_id = null,
  studio_revision_id = excluded.studio_revision_id,
  publication_id = excluded.publication_id,
  published_at = excluded.published_at,
  published_by = excluded.published_by;

 return jsonb_build_object(
  'publication_id', p_publication_id,
  'revision_id', p_revision_id,
  'artifact_revision', current_rev,
  'decision_id', dec.decision_id,
  'scope', 'PUBLIC',
  'idempotent', false
 );
end $$;

-- ============== 8) 撤回：withdraw_publication（撤回即失效，历史留痕） ==============
create or replace function publication.withdraw_publication(
 p_withdrawal_id uuid,
 p_work_id uuid,
 p_publication_id uuid,
 p_operator_id text,
 p_reason text,
 p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path=public,studio,control,publication set jit=off as $$
declare
 ptr publication.published_pointers;
 existing publication.withdrawals;
begin
 if p_withdrawal_id is null or p_work_id is null or p_publication_id is null
    or coalesce(btrim(p_idempotency_key),'') = '' then
  raise exception 'WITHDRAW_INVALID';
 end if;
 if coalesce(btrim(p_operator_id),'') = '' then raise exception 'WITHDRAW_OPERATOR_REQUIRED'; end if;

 select * into existing from publication.withdrawals where idempotency_key = p_idempotency_key;
 if found then
  return jsonb_build_object('withdrawal_id', existing.withdrawal_id,
   'publication_id', existing.publication_id, 'idempotent', true);
 end if;

 select * into ptr from publication.published_pointers where work_id = p_work_id for update;
 if not found or ptr.source_schema <> 'studio' or ptr.publication_id is distinct from p_publication_id then
  raise exception 'WITHDRAW_NOT_PUBLISHED';
 end if;

 insert into publication.withdrawals(
  withdrawal_id, work_id, publication_id, withdrawn_by, reason, idempotency_key
 ) values (
  p_withdrawal_id, p_work_id, p_publication_id, p_operator_id, coalesce(p_reason,''), p_idempotency_key
 );

 -- 撤回即失效：公开指针同事务内移除，历史快照不复活
 delete from publication.published_pointers
  where work_id = p_work_id and publication_id = p_publication_id;

 return jsonb_build_object('withdrawal_id', p_withdrawal_id, 'publication_id', p_publication_id,
  'idempotent', false, 'pointer_removed', true);
end $$;

-- ============== 9) 授权：运营身份专用，Creator 侧不可决策/发布 ==============
revoke all on function publication.decide_editorial(uuid,uuid,uuid,text,text,text,text)
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer, mohen_app_runtime;
revoke all on function publication.publish_exact_revision(uuid,uuid,uuid,text,text)
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer, mohen_app_runtime;
revoke all on function publication.withdraw_publication(uuid,uuid,uuid,text,text,text)
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer, mohen_app_runtime;
revoke all on function studio.private_work_rights_summary(uuid,uuid,text[])
  from public, anon, authenticated, service_role;

grant execute on function publication.decide_editorial(uuid,uuid,uuid,text,text,text,text)
  to mohen_editorial_operator;
grant execute on function publication.publish_exact_revision(uuid,uuid,uuid,text,text)
  to mohen_editorial_operator;
grant execute on function publication.withdraw_publication(uuid,uuid,uuid,text,text,text)
  to mohen_editorial_operator;

-- 运营需要进入 publication 模式才能调用上述函数（schema USAGE 是函数调用的前置）
grant usage on schema publication to mohen_editorial_operator;

-- 运营需要读判据：投稿快照与作品修订
grant select on studio.submission_snapshots to mohen_editorial_operator;
grant select on studio.work_revisions to mohen_editorial_operator;
grant select on publication.published_pointers to mohen_editorial_operator;

commit;
