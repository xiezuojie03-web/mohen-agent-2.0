-- Close the new entry, preserve all immutable candidate rows and source pins.
begin;
revoke all on function studio.persist_private_text_reading(uuid,uuid,uuid,text,uuid,jsonb,text,text)
 from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer;
commit;
