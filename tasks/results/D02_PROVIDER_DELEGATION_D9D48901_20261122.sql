-- D02 Provider 委托与来源外发许可（Owner 2026-11-22 批准）
-- 授权口径：为项目 d9d48901（朱家角）开一份模型委托，封顶 0.05 USD（约 ¥0.36），
-- 只含 D02 材料观察一个动作、只含本条来源，实际按次扣费并以真实回执对账。
-- 幂等键 2a07f335-45b0-41ad-b603-395721c848b2；重复执行不会新增第二条委托。

insert into studio.delegations(
  delegation_id, project_id, root_task_ref, root_task_id, subtask_ref, delegation_series_id,
  delegation_revision_no, requester, executor, provider, engine_version, input_manifest,
  allowed_actions, transfer_rights_decision, policy_version, expires_at, budget_limit, currency,
  request_hash, idempotency_key, output_schema)
select
  '3f5585d0-33c6-404d-8fb5-7b43ae6f10ff'::uuid,
  'd9d48901-3aa3-4424-b50f-965d6749ee8e'::uuid,
  'plan-3.5C-d02-d05-provider',
  'b2143002-5867-4873-9cae-21e0aebccb51'::uuid,
  'd02-material-observation',
  'acd926d1-1cb6-46a7-b517-c297f65fe88c'::uuid,
  1,
  '270bcecf-9bfb-4865-9432-a0ac9db8df75'::uuid,
  'mohen-d02-private-worker',
  'deepseek',
  'deepseek/2026-11-07',
  '{"actions":["d02_material_observation"],"source_ids":["9aa03207-6d60-4984-8c1f-347df2532842"],"max_calls":1,"owner_authorization":"2026-11-22","budget_cap_usd":0.05}'::jsonb,
  array['d02_material_observation']::text[],
  '{"external_processing":"GRANTED","decided_by":"owner","decided_at":"2026-11-22","scope":"project d9d48901 / D02 material observation / single batch","budget_cap_usd":0.05}'::jsonb,
  'm5.d02.provider-authorization.2026-11-22',
  now() + interval '7 days',
  0.05,
  'USD',
  '9f03e9bf18997fb6d13b9f52791d4bc365ed6533e92203db0e8db7e2276b096f',
  '2a07f335-45b0-41ad-b603-395721c848b2',
  'mohen.private-material-observation.v1'
where not exists (select 1 from studio.delegations where idempotency_key = '2a07f335-45b0-41ad-b603-395721c848b2');

-- 来源外发许可：原为 unknown（rights_evidence 记「external_processing remain HOLD pending explicit owner decision」）。
-- 本次按 Owner 2026-11-22 决定把它置为 allowed，同时保留原 held_actions 快照与解除记录，不改其他动作。
update source.sources
set rights_by_action = rights_by_action || '{"external_processing":"allowed"}'::jsonb,
    rights_evidence = (rights_evidence - 'held_actions') || jsonb_build_object(
      'held_actions', coalesce((select jsonb_agg(value) from jsonb_array_elements_text(rights_evidence->'held_actions') value
                                where value <> 'external_processing'), '[]'::jsonb),
      'held_actions_before_2026_11_22', rights_evidence->'held_actions',
      'released_actions', jsonb_build_array('external_processing'),
      'external_processing_decision', jsonb_build_object(
        'decision', 'allowed', 'decided_by', 'owner', 'decided_at', '2026-11-22',
        'provider', 'deepseek', 'engine_version', 'deepseek/2026-11-07',
        'scope', 'project d9d48901 / D02 material observation / single batch',
        'budget_cap_usd', 0.05,
        'recorded_by', 'tasks/results/D02_PROVIDER_DELEGATION_D9D48901_20261122.sql'))
where source_id = '9aa03207-6d60-4984-8c1f-347df2532842'::uuid
  and rights_by_action->>'external_processing' = 'unknown';

-- 后置校验（应各返回 1 行；external_processing 应为 allowed）
select count(*) as delegations,
       min(budget_limit) as budget_limit, min(currency) as currency, min(expires_at)::text as expires_at
from studio.delegations where idempotency_key = '2a07f335-45b0-41ad-b603-395721c848b2';
select rights_by_action->>'external_processing' as external_processing,
       rights_evidence->'released_actions' as released, held_cnt
from (select rights_by_action, rights_evidence,
        jsonb_array_length(rights_evidence->'held_actions') as held_cnt
      from source.sources where source_id = '9aa03207-6d60-4984-8c1f-347df2532842'::uuid) s;
