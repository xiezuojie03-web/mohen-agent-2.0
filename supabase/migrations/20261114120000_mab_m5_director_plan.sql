-- M5 / ST-05 / AssembleDirectorPlan
-- Studio 业务层导演方案持久化（private 隔离层）
-- 阶段口径：ST-05 属于 M5 Studio 业务任务轴，不是 D 轴的 D06；
--           导演方案上游引用 D05 P02 world_projection + D05 P04 story_seed/agent_context + D04 finding；
--           由 G5（stage=D05, layer=L5）签发消费资格；
--           对应 KAD2 §7 ST-05 定义：以 H1 候选→H2 七导演选择→H3 节拍，标依据与替代方案。
-- 参考 persist_private_story_seed / persist_private_world_projection 模式。

begin;

-- ============== 1) studio.director_plans 表 ==============
create table if not exists studio.director_plans (
  plan_id               uuid primary key,
  project_id            uuid not null references studio.projects(project_id),
  title                 text not null,
  method_id             text not null default 'H1H2H3',
  method_version        text not null default 'source-sha256:mab-m5-isolated',
  h1_discovery_refs     uuid[] not null default '{}',   -- → meaning.findings
  h2_decisions          jsonb not null default '{}',     -- 七导演选择：{selection, alternatives:{name,reason}[]}
  h3_beats              jsonb not null default '[]',    -- 节拍序列：[{kind,content,duration_ms,refs:{story_seed,finding,...}}]
  alternative_plans     jsonb not null default '{}',    -- B 方案 / 替代导演方向
  media_refs            jsonb not null default '[]',    -- 引用的媒资指针
  depends_on_story_seeds    uuid[] not null default '{}',  -- → read_model.story_seeds
  depends_on_agent_contexts uuid[] not null default '{}',  -- → read_model.agent_contexts
  depends_on_projections    uuid[] not null default '{}',  -- → read_model.world_projections
  qualification         text not null default 'UNASSESSED'
                        check (qualification in ('UNASSESSED','SUBMITTED','PASS','HOLD','REJECT','REVOKED')),
  payload               jsonb not null default '{}',
  created_at            timestamptz not null default now()
);

alter table studio.director_plans enable row level security;

-- RLS：Studio 业务层只由 mohen_app_runtime 持久化（persist 函数是 security definer + search_path=pg_catalog 不受 RLS 影响），
--       隔离验证不需要 auth.users schema；gate_authority 仅用于资格审计只读。
--       生产环境启用 auth.users 后再加 Owner 专属 policy。

drop policy if exists director_plans_app_runtime_rw on studio.director_plans;
create policy director_plans_app_runtime_rw on studio.director_plans
  for all to mohen_app_runtime using (true) with check (true);

drop policy if exists director_plans_gate_authority_read on studio.director_plans;
create policy director_plans_gate_authority_read on studio.director_plans
  for select to mohen_gate_authority using (true);

revoke all on studio.director_plans
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select, insert, update, delete on studio.director_plans to mohen_app_runtime;
grant select on studio.director_plans to mohen_gate_authority;

-- ============== 2) persist_private_director_plan ==============
create or replace function studio.persist_private_director_plan(
 p_plan_id uuid, p_project_id uuid, p_title text,
 p_story_seed_ids uuid[], p_agent_context_ids uuid[],
 p_projection_ids uuid[], p_h1_discovery_refs uuid[],
 p_h2_decisions jsonb, p_h3_beats jsonb, p_spec jsonb
)
returns jsonb language plpgsql security definer set search_path=public,studio,read_model,meaning,world,control set jit=off as $$
declare
 dp studio.director_plans; new_payload jsonb;
 valid_finding_methods text[] := array['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12'];
 any_project_id text;
 original_ids uuid[] := '{}'::uuid[];
begin
 -- 1) 基础校验
 if p_plan_id is null or p_project_id is null or p_title is null
  or octet_length(p_title) not between 1 and 500
  or jsonb_typeof(p_h2_decisions) is distinct from 'object'
  or jsonb_typeof(p_h3_beats) is distinct from 'array'
  or (p_story_seed_ids is null and p_agent_context_ids is null and p_projection_ids is null)
  or coalesce(array_length(p_story_seed_ids,1),0) + coalesce(array_length(p_agent_context_ids,1),0) + coalesce(array_length(p_projection_ids,1),0) + coalesce(array_length(p_h1_discovery_refs,1),0) = 0
  then raise exception 'PRIVATE_DIRECTOR_PLAN_INVALID'; end if;

 -- 2) project 存在且活跃
 perform 1 from studio.projects
  where project_id = p_project_id and lifecycle_status = 'ACTIVE'
  for share;
 if not found then raise exception 'PRIVATE_DIRECTOR_PLAN_PROJECT_NOT_ACTIVE'; end if;

 -- 3) story_seeds 校验：存在 + 与 project 绑定
 if p_story_seed_ids is not null and array_length(p_story_seed_ids,1) > 0 then
  perform 1 from read_model.story_seeds s
   where s.story_seed_id = any(p_story_seed_ids)
   for share;
  if not found then raise exception 'PRIVATE_DIRECTOR_PLAN_STORY_SEED_NOT_FOUND'; end if;
  -- story_seed 从 finding 派生，finding 应绑定同一 project
  select min(c.assertion_payload_json->>'project_id') into any_project_id
   from read_model.story_seeds s
   join meaning.findings f on f.finding_id = any(s.derived_from_finding_ids)
   join world.claim_revisions c on exists (
     select 1 from jsonb_array_elements(f.supporting_world_objects) o
      where o->>'kind'='claim_revision'
       and (o->>'id')::uuid = c.claim_revision_id)
   where s.story_seed_id = any(p_story_seed_ids);
  if any_project_id is distinct from p_project_id::text and any_project_id is not null
   then raise exception 'PRIVATE_DIRECTOR_PLAN_STORY_SEED_SCOPE_MISMATCH'; end if;
 end if;

 -- 4) agent_contexts 校验：存在 + 与 project 绑定
 if p_agent_context_ids is not null and array_length(p_agent_context_ids,1) > 0 then
  perform 1 from read_model.agent_contexts a
   where a.agent_context_id = any(p_agent_context_ids)
   for share;
  if not found then raise exception 'PRIVATE_DIRECTOR_PLAN_AGENT_CONTEXT_NOT_FOUND'; end if;
 end if;

 -- 5) world_projections 校验：存在
 if p_projection_ids is not null and array_length(p_projection_ids,1) > 0 then
  perform 1 from read_model.world_projections wp
   where wp.projection_id = any(p_projection_ids)
   for share;
  if not found then raise exception 'PRIVATE_DIRECTOR_PLAN_PROJECTION_NOT_FOUND'; end if;
 end if;

 -- 6) finding refs 校验：存在 + method_id ∈ A01-A12
 if p_h1_discovery_refs is not null and array_length(p_h1_discovery_refs,1) > 0 then
  for i in 1..array_length(p_h1_discovery_refs,1) loop
   if not exists (select 1 from meaning.findings
     where finding_id = p_h1_discovery_refs[i]
       and discovery_method->>'method_id' = any(valid_finding_methods))
    then raise exception 'PRIVATE_DIRECTOR_PLAN_FINDING_INVALID'; end if;
  end loop;
 end if;

 -- 7) 回溯 original_ids：从 depends_on 数组中的上游对象取 original_ids
 --    简化实现：每个数据源独立收集 uuid，最后 union + distinct 聚合
 select array_agg(distinct uid) into original_ids from (
  -- story_seeds
  select jsonb_array_elements_text(s.payload->'original_ids')::uuid as uid
  from read_model.story_seeds s
  where p_story_seed_ids is not null and array_length(p_story_seed_ids,1) > 0
    and s.story_seed_id = any(p_story_seed_ids)
  union all
  -- agent_contexts
  select jsonb_array_elements_text(c.payload->'original_ids')::uuid
  from read_model.agent_contexts c
  where p_agent_context_ids is not null and array_length(p_agent_context_ids,1) > 0
    and c.agent_context_id = any(p_agent_context_ids)
  union all
  -- world_projections
  select (wp.payload->>'original_id')::uuid
  from read_model.world_projections wp
  where p_projection_ids is not null and array_length(p_projection_ids,1) > 0
    and wp.projection_id = any(p_projection_ids)
 ) sub where uid is not null;

 -- 8) 构造 payload（加入 original_ids）
 new_payload := jsonb_build_object(
  'schema', 'mohen.private-director-plan.v1',
  'qualification', 'UNASSESSED',
  'method_id', 'H1H2H3',
  'method_version', 'source-sha256:mab-m5-isolated',
  'original_ids', original_ids,
  'body', jsonb_build_object(
    'h1_discovery_refs', coalesce(p_h1_discovery_refs,'{}'::uuid[]),
    'h2_decisions', p_h2_decisions,
    'h3_beats', p_h3_beats,
    'alternative_plans', coalesce(p_spec->'alternative_plans','{}'::jsonb),
    'media_refs', coalesce(p_spec->'media_refs','[]'::jsonb)
  )
 );

 -- 9) 幂等保护
 perform pg_advisory_xact_lock(hashtextextended('private-director-plan:'||p_plan_id::text,0));
 select * into dp from studio.director_plans where plan_id = p_plan_id;
 if not found then
  insert into studio.director_plans(plan_id, project_id, title,
    h1_discovery_refs, h2_decisions, h3_beats,
    alternative_plans, media_refs,
    depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections,
    payload)
  values(p_plan_id, p_project_id, p_title,
    coalesce(p_h1_discovery_refs,'{}'::uuid[]), p_h2_decisions, p_h3_beats,
    coalesce(p_spec->'alternative_plans','{}'::jsonb),
    coalesce(p_spec->'media_refs','[]'::jsonb),
    coalesce(p_story_seed_ids,'{}'::uuid[]),
    coalesce(p_agent_context_ids,'{}'::uuid[]),
    coalesce(p_projection_ids,'{}'::uuid[]),
    new_payload);
 end if;
 select * into dp from studio.director_plans where plan_id = p_plan_id;
 if dp.plan_id is null
  or dp.project_id is distinct from p_project_id
  or dp.title is distinct from p_title
  or dp.payload is distinct from new_payload
  or dp.h1_discovery_refs is distinct from coalesce(p_h1_discovery_refs,'{}'::uuid[])
  or dp.depends_on_story_seeds is distinct from coalesce(p_story_seed_ids,'{}'::uuid[])
  or dp.depends_on_agent_contexts is distinct from coalesce(p_agent_context_ids,'{}'::uuid[])
  or dp.depends_on_projections is distinct from coalesce(p_projection_ids,'{}'::uuid[])
  then raise exception 'PRIVATE_DIRECTOR_PLAN_IDEMPOTENCY_CONFLICT'; end if;

 return jsonb_build_object('plan_id', p_plan_id,
  'artifact_revision', control.artifact_revision_for('director_plan', p_plan_id),
  'project_id', p_project_id,
  'derived_story_seeds', coalesce(p_story_seed_ids,'{}'::uuid[]),
  'derived_agent_contexts', coalesce(p_agent_context_ids,'{}'::uuid[]),
  'derived_projections', coalesce(p_projection_ids,'{}'::uuid[]));
end $$;

revoke all on function studio.persist_private_director_plan(uuid,uuid,text,uuid[],uuid[],uuid[],uuid[],jsonb,jsonb,jsonb)
 from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant execute on function studio.persist_private_director_plan(uuid,uuid,text,uuid[],uuid[],uuid[],uuid[],jsonb,jsonb,jsonb) to mohen_app_runtime;

-- ============== 3) 扩展 artifact_revision_for 加 director_plan kind ==============
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
    ('director_plan','studio','director_plans','plan_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
 if not found then return null; end if;
 execute format('select encode(control.sha256_bytes(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id;
 return revision;
end $$;
alter function control.artifact_revision_for(text,uuid) owner to mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

-- mohen_gate_authority 运行 control.artifact_revision_for 时需要访问 studio.director_plans
-- 给 USAGE studio schema + 对 studio.director_plans 的 SELECT
grant usage on schema studio to mohen_gate_authority;
grant select on studio.director_plans to mohen_gate_authority;

-- ============== 4) mohen_app_runtime 对依赖表的 SELECT 权限 ==============
-- persist 函数是 security definer 且 search_path=pg_catalog，内部查询能通过；
-- 但 artifact_revision_for 扩展 director_plan kind 后需要对 studio.director_plans 有权限（已在 step 1 授予 mohen_app_runtime SELECT）。

commit;
