-- D05 / L5 / P04 有界解释组合：story_seed + agent_context persist functions
-- 阶段口径：数据生产阶段止于 D00—D05，不存在 D06；P04 属于 D05 阶段内专业方法，
--           产出 story_seeds / agent_contexts，由 G5（stage=D05, layer=L5）签发资格。
-- 参考 persist_private_world_projection，简化：
--   上游是 finding（G4 PASS），不是 original；
--   不需要 production_run 强绑定（由 persist 函数自己从 finding 的 claim_revision 推导 project_id）；
--   seed_key/context_key 格式 + payload schema + derived_from 数组 + 幂等性。
-- G5 reviewer 的 checkWorkRevisionBinding 需同时覆盖 story_seed（JS 层修改，不在本迁移）。

begin;

-- ============== persist_private_story_seed ==============
create or replace function studio.persist_private_story_seed(
 p_story_seed uuid, p_seed_key text, p_finding_ids uuid[], p_seed_spec jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 f meaning.findings; s read_model.story_seeds; payload jsonb;
 valid_methods text[] := array['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12'];
 project_id uuid;
begin
 -- 1) 基础校验
 if p_story_seed is null or p_seed_key is null or octet_length(p_seed_key) not between 1 and 200
  or jsonb_typeof(p_seed_spec) is distinct from 'object'
  or p_finding_ids is null or array_length(p_finding_ids,1) = 0
  then raise exception 'PRIVATE_STORY_SEED_INVALID'; end if;

 -- 2) 所有 finding 必须存在 + method_id ∈ A01-A12 + 绑定同一 project
 for i in 1..array_length(p_finding_ids,1) loop
  select * into f from meaning.findings where finding_id = p_finding_ids[i] for share;
  if f.finding_id is null or f.discovery_method->>'method_id' is null
     or not (f.discovery_method->>'method_id' = any(valid_methods))
    then raise exception 'PRIVATE_STORY_SEED_FINDING_INVALID'; end if;
  -- 从 finding 的 supporting_world_objects 里找 claim_revision → 得到 project_id
  select c.assertion_payload_json->>'project_id' into project_id
    from world.claim_revisions c
    where exists (select 1 from jsonb_array_elements(f.supporting_world_objects) o
      where o->>'kind'='claim_revision' and o->>'id'~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (o->>'id')::uuid = c.claim_revision_id)
    limit 1;
  if project_id is null then raise exception 'PRIVATE_STORY_SEED_FINDING_NOT_BOUND_TO_PROJECT'; end if;
 end loop;

 -- 3) 构造 payload（带 original_ids 供 G5 checkRightsByOperation 检查）
 payload := jsonb_build_object(
  'schema', 'mohen.private-story-seed.v1',
  'qualification', 'UNASSESSED',
  'title', p_seed_spec->>'title',
  'narrative_question', p_seed_spec->>'narrative_question',
  'method_id', 'P04',
  'method_version', 'source-sha256:mab-m5-isolated',
  'original_ids', coalesce(p_seed_spec->'original_ids','[]'::jsonb),
  'body', p_seed_spec->'payload'
 );

 -- 4) 幂等保护
 perform pg_advisory_xact_lock(hashtextextended('private-story-seed:'||p_story_seed::text,0));
 select * into s from read_model.story_seeds where story_seed_id = p_story_seed;
 if not found then
  insert into read_model.story_seeds(story_seed_id, seed_key, title, narrative_question,
    payload, derived_from_finding_ids, evidence_pointer_ids, generated_at)
  values(p_story_seed, p_seed_key, p_seed_spec->>'title', p_seed_spec->>'narrative_question',
    payload, p_finding_ids, array[]::uuid[], now());
 end if;
 select * into s from read_model.story_seeds where story_seed_id = p_story_seed;
 if s.story_seed_id is null
  or s.seed_key is distinct from p_seed_key
  or s.payload is distinct from payload
  or s.derived_from_finding_ids is distinct from p_finding_ids
  then raise exception 'PRIVATE_STORY_SEED_IDEMPOTENCY_CONFLICT'; end if;

 return jsonb_build_object('story_seed_id', p_story_seed,
   'artifact_revision', control.artifact_revision_for('story_seed', p_story_seed),
   'derived_from', p_finding_ids, 'project_id', project_id);
end $$;

revoke all on function studio.persist_private_story_seed(uuid,text,uuid[],jsonb)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_story_seed(uuid,text,uuid[],jsonb) to mohen_app_runtime;

-- ============== persist_private_agent_context ==============
create or replace function studio.persist_private_agent_context(
 p_context uuid, p_context_key text, p_finding_ids uuid[], p_context_spec jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 f meaning.findings; a read_model.agent_contexts; payload jsonb;
 valid_methods text[] := array['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12'];
 project_id uuid;
begin
 -- 1) 基础校验
 if p_context is null or p_context_key is null or octet_length(p_context_key) not between 1 and 200
  or jsonb_typeof(p_context_spec) is distinct from 'object'
  or p_finding_ids is null or array_length(p_finding_ids,1) = 0
  then raise exception 'PRIVATE_AGENT_CONTEXT_INVALID'; end if;

 -- 2) finding 校验
 for i in 1..array_length(p_finding_ids,1) loop
  select * into f from meaning.findings where finding_id = p_finding_ids[i] for share;
  if f.finding_id is null or f.discovery_method->>'method_id' is null
     or not (f.discovery_method->>'method_id' = any(valid_methods))
    then raise exception 'PRIVATE_AGENT_CONTEXT_FINDING_INVALID'; end if;
  select c.assertion_payload_json->>'project_id' into project_id
    from world.claim_revisions c
    where exists (select 1 from jsonb_array_elements(f.supporting_world_objects) o
      where o->>'kind'='claim_revision' and o->>'id'~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (o->>'id')::uuid = c.claim_revision_id)
    limit 1;
  if project_id is null then raise exception 'PRIVATE_AGENT_CONTEXT_FINDING_NOT_BOUND_TO_PROJECT'; end if;
 end loop;

 -- 3) 构造 payload（带 original_ids 供 G5 checkRightsByOperation 检查）
 payload := jsonb_build_object(
  'schema', 'mohen.private-agent-context.v1',
  'qualification', 'UNASSESSED',
  'method_id', 'P04',
  'method_version', 'source-sha256:mab-m5-isolated',
  'original_ids', coalesce(p_context_spec->'original_ids','[]'::jsonb),
  'body', p_context_spec->'payload'
 );

 -- 4) 幂等保护
 perform pg_advisory_xact_lock(hashtextextended('private-agent-context:'||p_context::text,0));
 select * into a from read_model.agent_contexts where agent_context_id = p_context;
 if not found then
  insert into read_model.agent_contexts(agent_context_id, context_key, payload, derived_from_finding_ids, generated_at)
  values(p_context, p_context_key, payload, p_finding_ids, now());
 end if;
 select * into a from read_model.agent_contexts where agent_context_id = p_context;
 if a.agent_context_id is null
  or a.context_key is distinct from p_context_key
  or a.payload is distinct from payload
  or a.derived_from_finding_ids is distinct from p_finding_ids
  then raise exception 'PRIVATE_AGENT_CONTEXT_IDEMPOTENCY_CONFLICT'; end if;

 return jsonb_build_object('agent_context_id', p_context,
   'artifact_revision', control.artifact_revision_for('agent_context', p_context),
   'derived_from', p_finding_ids, 'project_id', project_id);
end $$;

revoke all on function studio.persist_private_agent_context(uuid,text,uuid[],jsonb)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_agent_context(uuid,text,uuid[],jsonb) to mohen_app_runtime;

commit;
