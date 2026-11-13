-- M5 / ST-08 / SubmitForEditorialReview
-- Studio 业务层「提交运营审核」的冻结稿件快照（private 隔离层）
--
-- 阶段口径：ST-08 属于 M5 Studio 业务任务轴（KAD2 §7 第 8 个业务动作），不是 D 轴新阶段。
--   设计原文（KAD2 §7 / AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT §6.2）：
--     ST-08 SubmitForEditorialReview｜明确提交冻结稿件｜
--     确认当前 revision / 媒体权利 / 知识资格缺口、版本快照｜
--     产出 `submission_snapshot`；**投稿不代表公开、也不代表合格知识**。
--
-- 设计取舍（按原文，不自行发挥）：
--   1) 不可变修订行 studio.work_revisions 不被修改：投稿是「另存一份冻结快照」，
--      不是改写稿件本身（KAD2 §8「WorkRevision@rev 不得被互相覆盖」、
--      KALC「不可变 revision」）。因此本迁移不 UPDATE work_revisions，
--      提交事实由 append-only 的 studio.submission_snapshots 承载。
--   2) 快照冻结的是「精确修订身份 + 当时的知识资格 + 版本快照 + 逐动作媒体权利 + 缺口」，
--      运营后续只审核这一份精确修订（ST-09 使用）。
--   3) 投稿前置必须对精确修订做**当前资格复核**：G5 PASS、current、未过期，
--      且签发时的 artifact_revision 必须仍等于当前内容；任一不满足即失败关闭。
--   4) 逐动作媒体权利只认显式 allowed（与 packages/data-access/src/rights-actions.mjs 同口径）；
--      未 allowed 的动作如实记入 gaps，不自动推断许可、不把投稿当公开许可。
begin;

-- ============== 1) studio.submission_snapshots（append-only 冻结快照） ==============
create table if not exists studio.submission_snapshots (
  snapshot_id             uuid primary key,
  work_id                 uuid not null,
  revision_id             uuid not null references studio.work_revisions(revision_id),
  revision_no             integer not null check (revision_no >= 1),
  project_id              uuid not null references studio.projects(project_id),
  content_hash            text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  artifact_revision       text not null check (artifact_revision ~ '^[0-9a-f]{64}$'),
  knowledge_gate_audit_id uuid not null,
  submitted_by            text not null default '',
  payload                 jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  -- 一个不可变修订只接受一次投稿冻结；退修改稿后重投须产生新修订（KALC 不可变修订）。
  unique (revision_id)
);

alter table studio.submission_snapshots enable row level security;

drop policy if exists submission_snapshots_app_runtime_rw on studio.submission_snapshots;
create policy submission_snapshots_app_runtime_rw on studio.submission_snapshots
  for all to mohen_app_runtime using (true) with check (true);

drop policy if exists submission_snapshots_gate_authority_read on studio.submission_snapshots;
create policy submission_snapshots_gate_authority_read on studio.submission_snapshots
  for select to mohen_gate_authority using (true);

revoke all on studio.submission_snapshots
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select, insert on studio.submission_snapshots to mohen_app_runtime;
grant select on studio.submission_snapshots to mohen_gate_authority;

-- 冻结快照不可改写、不可删除：投稿事实是历史，不是可编辑状态。
create or replace function studio.submission_snapshots_immutable() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'SUBMISSION_SNAPSHOT_IMMUTABLE';
end $$;

drop trigger if exists submission_snapshots_immutable on studio.submission_snapshots;
create trigger submission_snapshots_immutable
  before update or delete on studio.submission_snapshots
  for each row execute function studio.submission_snapshots_immutable();

-- ============== 2) persist_private_submission_snapshot ==============
create or replace function studio.persist_private_submission_snapshot(
 p_snapshot_id uuid,
 p_revision_id uuid,
 p_project_id uuid,
 p_submitted_by text
)
returns jsonb language plpgsql security definer
set search_path=public,studio,read_model,meaning,world,control set jit=off as $$
declare
 wr studio.work_revisions;
 ss studio.submission_snapshots;
 g5 record;
 latest_no integer;
 current_rev text;
 original_ids uuid[];
 oid uuid;
 orig_state text;
 src_id uuid;
 rights_obj jsonb;
 rights_ev jsonb;
 orig_entry jsonb;
 original_rights jsonb := '[]'::jsonb;
 gaps jsonb := '[]'::jsonb;
 gap_actions text[] := array['display','quote','download','adapt','redistribute','external_processing'];
 required_actions text[] := array['machine_read','retain'];
 act text;
 act_value text;
 version_snapshot jsonb;
 new_payload jsonb;
begin
 if p_snapshot_id is null or p_revision_id is null or p_project_id is null then
  raise exception 'PRIVATE_SUBMISSION_INVALID';
 end if;

 -- 1) 精确修订必须存在，且属于同一项目
 select * into wr from studio.work_revisions
  where revision_id = p_revision_id and project_id = p_project_id
  for share;
 if not found then raise exception 'PRIVATE_SUBMISSION_REVISION_NOT_FOUND'; end if;

 -- 2) 冻结稿件只能提交该作品当前最新修订：旧修订不得越过新修订被送审
 select max(revision_no) into latest_no from studio.work_revisions where work_id = wr.work_id;
 if coalesce(latest_no, 0) <> wr.revision_no then
  raise exception 'PRIVATE_SUBMISSION_NOT_LATEST_REVISION';
 end if;

 -- 3) 知识资格：对精确修订的当前 G5（PASS + current + 未过期 + 内容未变）
 select ga.gate_audit_id, ga.artifact_revision, ga.qualification_digest,
        ga.purpose_namespace, ga.purpose_code, ga.purpose_version,
        ga.consumer, ga.rule_version, ga.valid_until
   into g5
 from control.gate_audits ga
  where ga.object_type = 'work_revision'
    and ga.object_id = p_revision_id
    and ga.gate_code = 'G5'
    and ga.result = 'PASS'
    and ga.current_valid
    and (ga.valid_until is null or now() < ga.valid_until)
  order by ga.signed_at desc
  limit 1;
 if not found then
  raise exception 'PRIVATE_SUBMISSION_KNOWLEDGE_NOT_QUALIFIED:no_current_g5';
 end if;

 current_rev := control.artifact_revision_for('work_revision', p_revision_id);
 if current_rev is null or current_rev is distinct from g5.artifact_revision then
  raise exception 'PRIVATE_SUBMISSION_KNOWLEDGE_NOT_QUALIFIED:artifact_revision_moved';
 end if;

 -- 4) 幂等：同一精确修订已有冻结快照即返回原快照，不产生第二份
 perform pg_advisory_xact_lock(hashtextextended('private-submission-snapshot:'||p_revision_id::text,0));
 select * into ss from studio.submission_snapshots where revision_id = p_revision_id;
 if found then
  return jsonb_build_object(
   'snapshot_id', ss.snapshot_id,
   'work_id', ss.work_id,
   'revision_id', ss.revision_id,
   'revision_no', ss.revision_no,
   'artifact_revision', ss.artifact_revision,
   'knowledge_gate_audit_id', ss.knowledge_gate_audit_id,
   'idempotent', true,
   'gaps', coalesce(ss.payload->'gaps','[]'::jsonb),
   'publication_eligible', coalesce((ss.payload->'statements'->>'publication_eligible')::boolean, false)
  );
 end if;

 -- 5) 媒体权利逐原件解析：不可解析 / 未核验 / 必检动作未显式 allowed 一律失败关闭
 select array_agg(distinct t.value::uuid)
   into original_ids
 from jsonb_array_elements_text(coalesce(wr.payload->'original_ids','[]'::jsonb)) as t(value);
 if original_ids is null or cardinality(original_ids) = 0 then
  raise exception 'PRIVATE_SUBMISSION_ORIGINAL_REFS_MISSING';
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
  if not found then
   raise exception 'PRIVATE_SUBMISSION_ORIGINAL_NOT_RESOLVED:%', oid;
  end if;
  if orig_state is distinct from 'STORED_VERIFIED' then
   raise exception 'PRIVATE_SUBMISSION_ORIGINAL_NOT_VERIFIED:%:%', oid, coalesce(orig_state,'unknown');
  end if;
  -- G5 必检动作（machine_read / retain）必须显式 allowed，否则资格基础已不成立
  if coalesce(rights_obj->>'machine_read','unknown') <> 'allowed'
     or coalesce(rights_obj->>'retain','unknown') <> 'allowed' then
   raise exception 'PRIVATE_SUBMISSION_RIGHTS_NOT_ALLOWED:%', oid;
  end if;

  orig_entry := jsonb_build_object(
   'original_id', oid,
   'source_id', src_id,
   'basis', coalesce(rights_ev->>'basis',''),
   'actions', coalesce(rights_obj,'{}'::jsonb),
   'blocked_actions', '[]'::jsonb
  );
  foreach act in array gap_actions loop
   act_value := coalesce(rights_obj->>act,'unknown');
   if act_value <> 'allowed' then
    orig_entry := jsonb_set(orig_entry,'{blocked_actions}',
      (orig_entry->'blocked_actions') || to_jsonb(act));
    gaps := gaps || jsonb_build_array(jsonb_build_object(
      'code','rights_action_not_allowed:'||act,
      'scope','media_rights','original_id',oid,'value',act_value));
   end if;
  end loop;
  original_rights := original_rights || jsonb_build_array(orig_entry);
 end loop;

 -- 6) 知识资格缺口如实记账：本次 G5 用途若属生产用途，则不构成公开发布资格
 if coalesce(g5.purpose_namespace,'') = 'data-production' then
  gaps := gaps || jsonb_build_array(jsonb_build_object(
   'code','knowledge_purpose_is_production_not_publication',
   'scope','knowledge_qualification',
   'purpose_namespace',g5.purpose_namespace,
   'purpose_code',g5.purpose_code,
   'purpose_version',g5.purpose_version));
 end if;

 -- 7) 版本快照：上游对象身份 + 当前 artifact_revision + 各自当前 G5
 version_snapshot := jsonb_build_object(
  'director_plan', (
    select jsonb_build_object(
      'plan_id', dp.plan_id,
      'artifact_revision', control.artifact_revision_for('director_plan', dp.plan_id),
      'g5_audit_id', (
        select ga.gate_audit_id from control.gate_audits ga
        where ga.object_type='director_plan' and ga.object_id=dp.plan_id
          and ga.gate_code='G5' and ga.result='PASS' and ga.current_valid
        order by ga.signed_at desc limit 1))
    from studio.director_plans dp where dp.plan_id = wr.depends_on_director_plan),
  'story_seeds', coalesce((
    select jsonb_agg(jsonb_build_object('story_seed_id', s,
      'artifact_revision', control.artifact_revision_for('story_seed', s)))
    from unnest(wr.depends_on_story_seeds) as s), '[]'::jsonb),
  'agent_contexts', coalesce((
    select jsonb_agg(jsonb_build_object('agent_context_id', s,
      'artifact_revision', control.artifact_revision_for('agent_context', s)))
    from unnest(wr.depends_on_agent_contexts) as s), '[]'::jsonb),
  'world_projections', coalesce((
    select jsonb_agg(jsonb_build_object('projection_id', s,
      'artifact_revision', control.artifact_revision_for('world_projection', s)))
    from unnest(wr.depends_on_projections) as s), '[]'::jsonb)
 );

 new_payload := jsonb_build_object(
  'schema','mohen.submission-snapshot.v1',
  'statements', jsonb_build_object(
    'submission_is_not_publication', true,
    'submission_is_not_knowledge_qualification', true,
    'publication_eligible', (jsonb_array_length(gaps) = 0)
  ),
  'work_revision', jsonb_build_object(
    'work_id', wr.work_id,
    'revision_id', wr.revision_id,
    'revision_no', wr.revision_no,
    'title', wr.title,
    'content_hash', wr.content_hash,
    'artifact_revision', current_rev
  ),
  'knowledge_qualification', jsonb_build_object(
    'gate_code','G5',
    'gate_audit_id', g5.gate_audit_id,
    'artifact_revision', g5.artifact_revision,
    'qualification_digest', g5.qualification_digest,
    'purpose_namespace', g5.purpose_namespace,
    'purpose_code', g5.purpose_code,
    'purpose_version', g5.purpose_version,
    'consumer', g5.consumer,
    'rule_version', g5.rule_version,
    'valid_until', g5.valid_until
  ),
  'version_snapshot', version_snapshot,
  'rights', jsonb_build_object(
    'originals', original_rights,
    'required_actions', to_jsonb(required_actions)
  ),
  'gaps', gaps,
  'submitted_by', coalesce(p_submitted_by,''),
  'submitted_at', now()
 );

 -- 8) 冻结快照落库（append-only）
 insert into studio.submission_snapshots(
  snapshot_id, work_id, revision_id, revision_no, project_id,
  content_hash, artifact_revision, knowledge_gate_audit_id, submitted_by, payload
 ) values (
  p_snapshot_id, wr.work_id, wr.revision_id, wr.revision_no, wr.project_id,
  wr.content_hash, current_rev, g5.gate_audit_id, coalesce(p_submitted_by,''), new_payload
 );

 return jsonb_build_object(
  'snapshot_id', p_snapshot_id,
  'work_id', wr.work_id,
  'revision_id', p_revision_id,
  'revision_no', wr.revision_no,
  'artifact_revision', current_rev,
  'knowledge_gate_audit_id', g5.gate_audit_id,
  'idempotent', false,
  'gaps', gaps,
  'publication_eligible', (jsonb_array_length(gaps) = 0)
 );
end $$;

revoke all on function studio.persist_private_submission_snapshot(uuid,uuid,uuid,text)
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant execute on function studio.persist_private_submission_snapshot(uuid,uuid,uuid,text)
  to mohen_app_runtime;

commit;
