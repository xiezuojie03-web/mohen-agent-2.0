-- Retain immutable decisions/control events; disable entrypoints, never revive qualification.
begin;
revoke all on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) from public,mohen_gate_signer;
revoke all on function control.revoke_gate_qualification(uuid,uuid,text) from public,mohen_gate_signer;
revoke all on function control.current_qualification_is_valid(uuid) from public,mohen_producer,mohen_app_runtime,mohen_gate_signer;
revoke insert,update,delete on control.qualification_current from mohen_gate_authority;
commit;
