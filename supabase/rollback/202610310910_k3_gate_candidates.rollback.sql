-- Fail-closed rollback retains candidates, legacy audits and every decision.
begin;
revoke all on control.gate_candidates,control.qualification_current from mohen_producer,mohen_gate_signer,mohen_app_runtime;
revoke insert,update,delete,truncate on control.gate_audits from mohen_producer,mohen_gate_signer,mohen_app_runtime;
commit;
