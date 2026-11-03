-- Keep immutable evidence/history and exact revision IDs. Do not recreate the
-- old uniqueness rule: distinct verified revisions may now share evidence.
begin;
-- Never reopen source-wide SELECT; explicitly close the new narrow helper on rollback.
revoke all on function studio.private_source_binding_matches(uuid,uuid,uuid,text) from mohen_app_runtime,public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
revoke all on function studio.bind_private_read_evidence(uuid,uuid,uuid,jsonb,text,integer,text) from mohen_app_runtime,public,anon,authenticated,service_role;
revoke all on function studio.bind_private_claim_evidence(uuid,uuid,uuid,text) from mohen_app_runtime,public,anon,authenticated,service_role;
commit;
