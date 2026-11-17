-- Roll back the dev M5 Producer progress RPC without re-enabling broad RLS.
begin;
revoke all on function control.m5_write_production_progress(uuid,text,text,text,text,jsonb)
  from public,anon,authenticated,service_role,mohen_producer,mohen_app_runtime,
       mohen_gate_signer,mohen_gate_reader,mohen_gate_authority;
drop function if exists control.m5_write_production_progress(uuid,text,text,text,text,jsonb);
revoke all on control.production_runs from mohen_producer;
drop policy if exists producer_run_progress on control.production_runs;
commit;
