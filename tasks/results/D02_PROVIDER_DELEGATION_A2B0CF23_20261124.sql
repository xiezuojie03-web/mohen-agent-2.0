-- D02 Provider 委托与来源外发许可（本地 mohen_dev，Owner 2026-11-24 批准）
-- 授权口径：为项目 a2b0cf23 开一份模型委托，封顶 0.05 USD（约 ¥0.36），
-- 只含 D02 材料观察一个动作、只含本条来源（金泽条目），实际按次扣费并以真实回执对账。
-- 依据：本轮 Owner 明确批准「生产链 D00→D02 含一次真实模型调用，上限 0.36 元」。
-- 幂等键 d14a5ad9-07cc-496e-9e1d-20a068e28f0f；重复执行不会新增第二条委托。

insert into studio.delegations(
  delegation_id, project_id, root_task_ref, root_task_id, subtask_ref, delegation_series_id,
  delegation_revision_no, requester, executor, provider, engine_version, input_manifest,
  allowed_actions, transfer_rights_decision, policy_version, expires_at, budget_limit, currency,
  request_hash, idempotency_key, output_schema)
select
  'c5788552-db4e-43ba-bb10-4d537a63cbf3'::uuid,
  'a2b0cf23-edba-42ec-8c44-0911eb52855e'::uuid,
  'plan-3.5C-d02-local-20261124',
  'bca52162-5354-4faa-8b28-17bca1bb64f1'::uuid,
  'd02-material-observation',
  '82cf2440-a575-4755-9c7f-e37a91fdcad5'::uuid,
  1,
  '270bcecf-9bfb-4865-9432-a0ac9db8df75'::uuid,
  'mohen-d02-private-worker',
  'deepseek',
  'deepseek/2026-11-07',
  '{"actions":["d02_material_observation"],"source_ids":["f889a887-1320-43bb-b505-01106e881abb"],"max_calls":1,"owner_authorization":"2026-11-24","budget_cap_usd":0.05,"run_id":"21d9603f-ee28-4d2c-91f9-bd246d382ea9"}'::jsonb,
  array['d02_material_observation']::text[],
  '{"external_processing":"GRANTED","decided_by":"owner","decided_at":"2026-11-24","scope":"local run 21d9603f / D02 material observation / single call","budget_cap_usd":0.05}'::jsonb,
  'm5.d02.provider-authorization.2026-11-24',
  now() + interval '7 days',
  0.05,
  'USD',
  '7a18d7b6dadbe3be3af7f916e9e0061647899565433b3e36abb560bdba1553e2',
  'd14a5ad9-07cc-496e-9e1d-20a068e28f0f',
  'mohen.private-material-observation.v1'
where not exists (select 1 from studio.delegations where idempotency_key = 'd14a5ad9-07cc-496e-9e1d-20a068e28f0f');

-- 来源外发许可：原为 held（external_processing 在 held_actions 内、未授予）。
-- 本次按 Owner 2026-11-24 批准把 external_processing 置为 allowed（仅限本次单次调用），
-- 保留原 held_actions 快照与解除记录，不改其他动作；版本快照 pin 未被改写。
update source.sources
set rights_by_action = rights_by_action || '{"external_processing":"allowed"}'::jsonb,
    rights_evidence = (rights_evidence - 'held_actions') || jsonb_build_object(
      'held_actions', coalesce((select jsonb_agg(value) from jsonb_array_elements_text(rights_evidence->'held_actions') value
                                where value <> 'external_processing'), '[]'::jsonb),
      'held_actions_before_2026_11_24', rights_evidence->'held_actions',
      'released_actions', jsonb_build_array('external_processing'),
      'external_processing_decision', jsonb_build_object(
        'decision', 'allowed', 'decided_by', 'owner', 'decided_at', '2026-11-24',
        'provider', 'deepseek', 'engine_version', 'deepseek/2026-11-07',
        'scope', 'local run 21d9603f / D02 material observation / single call',
        'budget_cap_usd', 0.05,
        'recorded_by', 'tasks/results/D02_PROVIDER_DELEGATION_A2B0CF23_20261124.sql'))
where source_id = 'f889a887-1320-43bb-b505-01106e881abb'::uuid
  and rights_by_action->>'external_processing' is null;

-- 后置校验（应各返回 1 行；external_processing 应为 allowed）
select count(*) as delegations,
       min(budget_limit) as budget_limit, min(currency) as currency, min(expires_at)::text as expires_at
from studio.delegations where idempotency_key = 'd14a5ad9-07cc-496e-9e1d-20a068e28f0f';
select rights_by_action->>'external_processing' as external_processing,
       rights_evidence->>'external_processing_decision' as decision,
       rights_evidence->'held_actions' as held
from source.sources where source_id = 'f889a887-1320-43bb-b505-01106e881abb'::uuid;
select source.effective_rights_by_action(v.rights_snapshot, s.rights_by_action, s.rights_evidence) ->> 'external_processing'
         as effective_external_processing
from source.source_versions v join source.sources s using (source_id)
where v.source_version_id = 'c20023b2-e631-4e4d-8319-bb9a7e56149a'::uuid;