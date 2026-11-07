-- Fail closed: revoke new spend-control entry points without deleting reservations,
-- estimates, receipts, reconciliation events, revocations or audit history.
-- The existing Runner remains unable to enter IN_FLIGHT without a live reservation.
begin;
revoke all on function studio.reserve_execution_budget(jsonb)
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
revoke all on function studio.release_execution_budget(jsonb)
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
revoke all on function studio.reconcile_execution_cost(jsonb)
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
commit;
