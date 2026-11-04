-- Fail closed. Preserve every revocation tombstone, lease, sticky cost flag,
-- checkpoint and append-only event; rollback never resurrects a delegation.
begin;
revoke all on function studio.apply_execution_control(text,jsonb)
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
revoke all on studio.execution_controls,studio.execution_control_events
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role,mohen_execution_authority;
commit;
