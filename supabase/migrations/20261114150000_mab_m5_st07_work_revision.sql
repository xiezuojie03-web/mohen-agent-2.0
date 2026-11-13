-- M5 / ST-07 / SaveWorkRevision
-- Studio 业务层作品不可变修订持久化（private 隔离层）
-- 阶段口径：ST-07 属于 M5 Studio 业务任务轴，不是 D 轴新阶段；
--           作品修订上游引用 ST-05 director_plan (G5 PASS) + D05 P04 story_seed/agent_context + D04 finding；
--           由 G5（stage=D05, layer=L5）签发消费资格；
--           对应 KAD2 §7 ST-07 定义：修改某段文字/顺序/画面并保存恢复，
--           影响范围、差异、CAS 与重试；不能丢掉其他节拍。
-- 参考 persist_private_director_plan / persist_private_story_seed / persist_private_world_projection 模式。
-- work_revision 放在 studio schema（Studio 私有不可变修订层），
-- publication schema 留给 ST-08/09 EditorialDecision/Publish/Withdraw（运营层）。

begin;

-- ============== 1) studio.work_revisions 表 ==============
-- 注意：旧 publication.work_revisions (202610280900) 是简化版，缺 project_id/creator_id/content_hash/CAS/depends_on/qualification。
--       新表放在 studio schema，按 ST-05 director_plan 已验证的模式建。
create table if not exists studio.work_revisions (
  work_id               uuid not null,
  revision_id           uuid primary key,
  revision_no           integer not null,
  project_id            uuid not null references studio.projects(project_id),
  creator_id            text not null default '',
  title                 text not null,
  content_hash          text not null,                           -- sha256(content + beats)
  content               jsonb not null default '{}',            -- 作品母本正文
  beats                 jsonb not null default '[]',             -- 节拍序列（来自 director_plan.h3_beats + Creator 局部修改）
  source_and_rights_refs jsonb not null default '{}',           -- 原件引用与权利快照
  depends_on_director_plan uuid not null,                       -- → studio.director_plans (G5 PASS)
  depends_on_story_seeds    uuid[] not null default '{}',       -- → read_model.story_seeds
  depends_on_agent_contexts uuid[] not null default '{}',       -- → read_model.agent_contexts
  depends_on_projections    uuid[] not null default '{}',       -- → read_model.world_projections
  publication_status    text not null default 'draft'
                        check (publication_status in ('draft','submitted','rejected','accepted')),
  qualification         text not null default 'UNASSESSED'
                        check (qualification in ('UNASSESSED','SUBMITTED','PASS','HOLD','REJECT','REVOKED')),
  payload               jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  unique (work_id, revision_no)
);

alter table studio.work_revisions enable row level security;

drop policy if exists work_revisions_app_runtime_rw on studio.work_revisions;
create policy work_revisions_app_runtime_rw on studio.work_revisions
  for all to mohen_app_runtime using (true) with check (true);

drop policy if exists work_revisions_gate_authority_read on studio.work_revisions;
create policy work_revisions_gate_authority_read on studio.work_revisions
  for select to mohen_gate_authority using (true);

revoke all on studio.work_revisions
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select, insert, update, delete on studio.work_revisions to mohen_app_runtime;
grant select on studio.work_revisions to mohen_gate_authority;

-- ============== 2) persist_private_work_revision ==============
create or replace function studio.persist_private_work_revision(
 p_work_id uuid, p_revision_id uuid, p_revision_no integer,
 p_expected_revision_no integer,  -- CAS: 上一版本号，首次修订传 0
 p_project_id uuid, p_creator_id text, p_title text,
 p_content jsonb, p_beats jsonb, p_source_and_rights_refs jsonb,
 p_depends_on_director_plan uuid
)
returns jsonb language plpgsql security definer set search_path=public,studio,read_model,meaning,world,control set jit=off as $$
declare
 wr studio.work_revisions; new_payload jsonb;
 original_ids uuid[] := '{}'::uuid[];
 content_hash_val text;
 computed_no integer;
begin
 -- 1) 基础校验
 if p_work_id is null or p_revision_id is null
  or p_revision_no is null or p_revision_no < 1
  or p_project_id is null or p_title is null
  or octet_length(p_title) not between 1 and 500
  or p_depends_on_director_plan is null
  or jsonb_typeof(p_content) is distinct from 'object'
  or jsonb_typeof(p_beats) is distinct from 'array'
  then raise exception 'PRIVATE_WORK_REVISION_INVALID'; end if;

 -- 2) project 存在且活跃
 perform 1 from studio.projects
  where project_id = p_project_id and lifecycle_status = 'ACTIVE'
  for share;
 if not found then raise exception 'PRIVATE_WORK_REVISION_PROJECT_NOT_ACTIVE'; end if;

 -- 3) director_plan 存在 + G5 PASS current
 perform 1 from studio.director_plans dp
  where dp.plan_id = p_depends_on_director_plan
    and dp.project_id = p_project_id;
 if not found then raise exception 'PRIVATE_WORK_REVISION_DIRECTOR_PLAN_NOT_FOUND'; end if;

 -- 校验 director_plan 的 G5 current 审计存在（隔离环境，直接查 control.gate_audits）
 perform 1 from control.gate_audits ga
  where ga.object_type = 'director_plan'
    and ga.object_id = p_depends_on_director_plan
    and ga.gate_code = 'G5'
    and ga.result = 'PASS'
    and ga.current_valid
    and (ga.valid_until is null or now() < ga.valid_until);
 if not found then raise exception 'PRIVATE_WORK_REVISION_DIRECTOR_PLAN_NOT_QUALIFIED'; end if;

 -- 4) CAS 乐观锁：(work_id, revision_no) 不存在
 --    expected_revision_no 必须 = 已有最高 revision_no 或 0（首次）
 select max(revision_no) into computed_no from studio.work_revisions where work_id = p_work_id;
 if coalesce(computed_no, 0) != coalesce(p_expected_revision_no, 0) then
  raise exception 'PRIVATE_WORK_REVISION_VERSION_CONFLICT';
 end if;

 -- 5) content_hash = sha256(content::text || beats::text)
 select encode(control.sha256_bytes(convert_to(to_jsonb(jsonb_build_object('c', p_content, 'b', p_beats))::text,'UTF8')),'hex')
  into content_hash_val;

 -- 6) 回溯 original_ids：从 director_plan.payload.original_ids 取
 select array_agg(distinct uid) into original_ids from (
  select jsonb_array_elements_text(dp.payload->'original_ids')::uuid as uid
  from studio.director_plans dp where dp.plan_id = p_depends_on_director_plan
 ) sub where uid is not null;

 -- 7) 读取 director_plan 的 depends_on 数组
 declare
  v_story_seeds uuid[]; v_agent_contexts uuid[]; v_projections uuid[];
 begin
  select depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections
   into v_story_seeds, v_agent_contexts, v_projections
   from studio.director_plans where plan_id = p_depends_on_director_plan;

  -- 校验 story_seeds 存在
  if v_story_seeds is not null and array_length(v_story_seeds, 1) > 0 then
   perform 1 from read_model.story_seeds where story_seed_id = any(v_story_seeds) for share;
   if not found then raise exception 'PRIVATE_WORK_REVISION_STORY_SEED_NOT_FOUND'; end if;
  end if;
  if v_agent_contexts is not null and array_length(v_agent_contexts, 1) > 0 then
   perform 1 from read_model.agent_contexts where agent_context_id = any(v_agent_contexts) for share;
   if not found then raise exception 'PRIVATE_WORK_REVISION_AGENT_CONTEXT_NOT_FOUND'; end if;
  end if;
  if v_projections is not null and array_length(v_projections, 1) > 0 then
   perform 1 from read_model.world_projections where projection_id = any(v_projections) for share;
   if not found then raise exception 'PRIVATE_WORK_REVISION_PROJECTION_NOT_FOUND'; end if;
  end if;

  -- 8) 构造 payload
  new_payload := jsonb_build_object(
   'schema', 'mohen.private-work-revision.v1',
   'qualification', 'UNASSESSED',
   'method_id', 'H1H2H3',
   'original_ids', original_ids,
   'body', jsonb_build_object(
     'content_hash', content_hash_val,
     'depends_on_director_plan', p_depends_on_director_plan,
     'expected_revision_no', p_expected_revision_no
   )
  );

  -- 9) 幂等保护
  perform pg_advisory_xact_lock(hashtextextended('private-work-revision:'||p_revision_id::text,0));
  select * into wr from studio.work_revisions where revision_id = p_revision_id;
  if not found then
   insert into studio.work_revisions(
    work_id, revision_id, revision_no, project_id, creator_id, title,
    content_hash, content, beats, source_and_rights_refs,
    depends_on_director_plan, depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections,
    payload
   ) values(
    p_work_id, p_revision_id, p_revision_no, p_project_id,
    coalesce(p_creator_id,''), p_title, content_hash_val, p_content, p_beats,
    coalesce(p_source_and_rights_refs,'{}'::jsonb),
    p_depends_on_director_plan,
    coalesce(v_story_seeds,'{}'::uuid[]),
    coalesce(v_agent_contexts,'{}'::uuid[]),
    coalesce(v_projections,'{}'::uuid[]),
    new_payload
   );
  end if;
  select * into wr from studio.work_revisions where revision_id = p_revision_id;
  if wr.revision_id is null
   or wr.project_id is distinct from p_project_id
   or wr.title is distinct from p_title
   or wr.content_hash is distinct from content_hash_val
   or wr.payload is distinct from new_payload
   then raise exception 'PRIVATE_WORK_REVISION_IDEMPOTENCY_CONFLICT'; end if;
 end;

 return jsonb_build_object(
  'work_id', p_work_id, 'revision_id', p_revision_id,
  'revision_no', p_revision_no,
  'artifact_revision', control.artifact_revision_for('work_revision', p_revision_id),
  'content_hash', content_hash_val,
  'derived_original_ids', original_ids
 );
end $$;

revoke all on function studio.persist_private_work_revision(
  uuid,uuid,integer,integer,uuid,text,text,jsonb,jsonb,jsonb,uuid
) from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant execute on function studio.persist_private_work_revision(
  uuid,uuid,integer,integer,uuid,text,text,jsonb,jsonb,jsonb,uuid
) to mohen_app_runtime;

-- ============== 3) 扩展 artifact_revision_for 加 work_revision kind ==============
create or replace function control.artifact_revision_for(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare ns text; tbl text; key_col text; revision text;
begin
 select m.ns,m.tbl,m.key_col into ns,tbl,key_col from (values
    ('source','source','sources','source_id'),
    ('source_version','source','source_versions','source_version_id'),
    ('raw_item','source','raw_items','raw_item_id'),
    ('read_unit','source','read_units','read_unit_id'),
    ('reading_unit','source','read_units','read_unit_id'),
    ('read_run','source','read_runs','read_run_id'),
    ('material_evidence','evidence','material_evidence','evidence_id'),
    ('entity','world','entities','entity_id'),
    ('event','world','events','event_id'),
    ('relation_claim','world','relation_claims','relation_claim_id'),
    ('change','world','changes','change_id'),
    ('historical_space_claim','world','historical_space_claims','historical_space_claim_id'),
    ('visual_object','world','visual_objects','visual_object_id'),
    ('finding','meaning','findings','finding_id'),
    ('present_connection','meaning','present_connections','present_connection_id'),
    ('open_question','meaning','open_questions','open_question_id'),
    ('world_projection','read_model','world_projections','projection_id'),
    ('agent_context','read_model','agent_contexts','agent_context_id'),
    ('story_seed','read_model','story_seeds','story_seed_id'),
    ('discovery_path','read_model','discovery_paths','discovery_path_id'),
    ('map_timeline_projection','read_model','map_timeline_projections','map_timeline_projection_id'),
    ('evidence_pointer','read_model','evidence_pointers','evidence_pointer_id'),
    ('director_plan','studio','director_plans','plan_id'),
    ('work_revision','studio','work_revisions','revision_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
 if not found then return null; end if;
 execute format('select encode(control.sha256_bytes(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id;
 return revision;
end $$;
alter function control.artifact_revision_for(text,uuid) owner to mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

-- mohen_gate_authority 运行 artifact_revision_for 时需要对 studio.work_revisions SELECT 权限
grant select on studio.work_revisions to mohen_gate_authority;

commit;
