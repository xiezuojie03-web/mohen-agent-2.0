-- Close service entry points. Preserve immutable credentials/revocations and all Gate history.
begin;
revoke all on function control.authenticate_gate_service(text,text)from public,mohen_gate_signer,mohen_gate_reader;
revoke all on function control.gate_service_target_allows(text,text,uuid,jsonb)from public,mohen_gate_signer,mohen_gate_reader;
revoke all on function control.read_gate_stage_qualification(text,jsonb)from public,mohen_gate_signer,mohen_gate_reader;
commit;
