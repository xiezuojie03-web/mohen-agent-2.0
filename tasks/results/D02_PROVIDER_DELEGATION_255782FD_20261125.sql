-- D02 Provider 委托与来源外发许可（本地 mohen_dev，Owner 2026-11-25 常设授权延续）
-- 授权口径：为项目 255782fd（静安寺受托研究）开一份模型委托，封顶 0.05 USD（约 ¥0.36），
-- 只含 D02 材料观察一个动作、只含本条来源（上海图书馆开放数据·地名志·静安寺），
-- 实际按次扣费并以真实回执对账。
-- 依据：Owner 2026-11-25 常设授权「实现网页端的真正创作，费用按老规矩授权」，
-- 老规矩 = 2026-11-24 金泽 D02 委托先例（同 provider/同动作/同 0.05 USD 封顶/单次调用）。
-- 幂等键 352c8498-08a9-4d37-9c96-34cb901b557d；重复执行不会新增第二条委托。
-- 本文件只登记授权与权利，绝不代签任何 Gate PASS；G2 独立资格仍由独立门验证。

insert into studio.delegations(
  delegation_id, project_id, root_task_ref, root_task_id, subtask_ref, delegation_series_id,
  delegation_revision_no, requester, executor, provider, engine_version, input_manifest,
  allowed_actions, transfer_rights_decision, policy_version, expires_at, budget_limit, currency,
  request_hash, idempotency_key, output_schema)
select
  'bf2d6821-89fe-4afa-9034-96c7f4adf3b4'::uuid,
  '255782fd-abcc-4e10-a34f-61ac574029d7'::uuid,
  'plan-3.5C-d02-local-20261125',
  '4501eb4b-60dc-4260-a1d6-79fe85ac8c7c'::uuid,
  'd02-material-observation',
  '74d6a417-f859-4be7-8725-31176a03e157'::uuid,
  1,
  '270bcecf-9bfb-4865-9432-a0ac9db8df75'::uuid,
  'mohen-d02-private-worker',
  'deepseek',
  'deepseek/2026-11-07',
  '{"actions":["d02_material_observation"],"source_ids":["14fe1fef-cc34-486a-bbba-d69d9a4833f8"],"max_calls":1,"owner_authorization":"2026-11-25","budget_cap_usd":0.05,"run_id":"e411b2bb-8f40-44b6-8a34-d5f159da2375"}'::jsonb,
  array['d02_material_observation']::text[],
  '{"external_processing":"GRANTED","decided_by":"owner","decided_at":"2026-11-25","scope":"local run e411b2bb / D02 material observation / single call","budget_cap_usd":0.05}'::jsonb,
  'm5.d02.provider-authorization.2026-11-25',
  now() + interval '7 days',
  0.05,
  'USD',
  'bfeafbc5661cdfa24baf798a15d3cc3ecd8f6d07cdd9a14cec121c5674f69be9',
  '352c8498-08a9-4d37-9c96-34cb901b557d',
  'mohen.private-material-observation.v1'
where not exists (select 1 from studio.delegations where idempotency_key = '352c8498-08a9-4d37-9c96-34cb901b557d');

-- 来源外发许可：原为 held（external_processing 在 held_actions 内、未授予）。
-- 本次按 Owner 2026-11-25 常设授权把 external_processing 置为 allowed（仅限本次单次调用），
-- 保留原 held_actions 快照与解除记录，不改其他动作；版本快照 pin 未被改写。
update source.sources
set rights_by_action = rights_by_action || '{"external_processing":"allowed"}'::jsonb,
    rights_evidence = (rights_evidence - 'held_actions') || jsonb_build_object(
      'held_actions', coalesce((select jsonb_agg(value) from jsonb_array_elements_text(rights_evidence->'held_actions') value
                                where value <> 'external_processing'), '[]'::jsonb),
      'held_actions_before_2026_11_25', rights_evidence->'held_actions',
      'released_actions', jsonb_build_array('external_processing'),
      'external_processing_decision', jsonb_build_object(
        'decision', 'allowed', 'decided_by', 'owner', 'decided_at', '2026-11-25',
        'provider', 'deepseek', 'engine_version', 'deepseek/2026-11-07',
        'scope', 'local run e411b2bb / D02 material observation / single call',
        'budget_cap_usd', 0.05,
        'recorded_by', 'tasks/results/D02_PROVIDER_DELEGATION_255782FD_20261125.sql'))
where source_id = '14fe1fef-cc34-486a-bbba-d69d9a4833f8'::uuid
  and rights_by_action->>'external_processing' is null;

-- 后置校验（应各返回 1 行；external_processing 应为 allowed）
select count(*) as delegations,
       min(budget_limit) as budget_limit, min(currency) as currency, min(expires_at)::text as expires_at
from studio.delegations where idempotency_key = '352c8498-08a9-4d37-9c96-34cb901b557d';
select rights_by_action->>'external_processing' as external_processing,
       rights_evidence->>'external_processing_decision' as decision,
       rights_evidence->'held_actions' as held
from source.sources where source_id = '14fe1fef-cc34-486a-bbba-d69d9a4833f8'::uuid;
select source.effective_rights_by_action(v.rights_snapshot, s.rights_by_action, s.rights_evidence) ->> 'external_processing'
         as effective_external_processing
from source.source_versions v join source.sources s using (source_id)
where v.source_version_id = '727e837b-22e1-4c6b-8f06-9fadd8b0d956'::uuid;
