-- M5 additive repair of the unapplied 20261107160000 producer-run-progress
-- migration. No direct Producer SELECT/UPDATE on control.production_runs.
-- Existing Runner uses one Owner-scoped, pre-claimed, append-only terminal RPC.
-- This file is for the current authorized development integration database.
begin;
revoke all on control.production_runs from mohen_producer;
-- The historical M2.1 migration also granted COLUMN-level UPDATE; table REVOKE alone
-- does not remove those column grants, even after its unsafe RLS policy is dropped.
revoke update (current_stage,status,finished_at) on control.production_runs from mohen_producer;
drop policy if exists producer_run_progress on control.production_runs;
create or replace function control.m5_write_production_progress(
 p_run_id uuid,p_owner_token text,p_action text,p_stage text,p_status text,p_terminal jsonb
) returns uuid language plpgsql security definer
set search_path=pg_catalog set jit=off as $m5$
declare
  identity pg_roles%rowtype;
  actor uuid;
  r control.production_runs%rowtype;
  proj text;
  root text;
  audit_ref text;
begin
  select * into identity from pg_roles where rolname=session_user;
  if identity.rolcanlogin is distinct from true or identity.rolsuper is distinct from false
     or identity.rolbypassrls is distinct from false or identity.rolcreaterole is distinct from false
     or identity.rolcreatedb is distinct from false or identity.rolreplication is distinct from false
     or session_user::text in ('postgres','supabase_admin','mohen_producer','mohen_app_runtime',
                              'mohen_gate_signer','mohen_gate_reader','mohen_gate_authority')
     or not pg_has_role(session_user,'mohen_producer','MEMBER')
     or pg_has_role(session_user,'mohen_app_runtime','MEMBER')
     or pg_has_role(session_user,'mohen_gate_signer','MEMBER')
     or pg_has_role(session_user,'mohen_gate_reader','MEMBER')
     or pg_has_role(session_user,'mohen_gate_authority','MEMBER')
     or pg_has_role(session_user,'pg_read_all_data','MEMBER')
     or pg_has_role(session_user,'pg_write_all_data','MEMBER') then
       raise exception 'M5_PRODUCER_LOGIN_DENIED';
  end if;
  if p_owner_token is null or length(p_owner_token) not between 3 and 8192
     or p_run_id is null or p_stage !~ '^D0[0-5]$' then
    raise exception 'M5_PRODUCER_INPUT_INVALID';
  end if;
  perform set_config('mohen.session_token',p_owner_token,true);
  actor:=control.current_app_user_id();
  if actor is null then raise exception 'M5_PRODUCER_OWNER_DENIED';end if;
  select * into r from control.production_runs where run_id=p_run_id for update;
  if not found or r.architecture_generation<>'mohen.six-stage.v1'
     or r.status<>'RUNNING' or r.metadata->'cloud_dispatch'->>'claimed_at' is null then
    raise exception 'M5_PRODUCER_RUN_NOT_CLAIMED';
  end if;
  proj:=r.scope->>'project_id';root:=r.scope->>'root_task_id';
  if proj is null or root is null
     or proj !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or root !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or not exists(
       select 1 from studio.projects p join public.research_tasks t on t.task_id=root::uuid
       where p.project_id=proj::uuid and p.owner_user_id=actor
         and p.lifecycle_status='ACTIVE' and t.owner_user_id=actor
         and t.checkpoint->'studio'->>'project_id'=proj
     ) then raise exception 'M5_PRODUCER_ROOT_DENIED';
  end if;
  if p_action='stage' then
    if p_status is not null or p_terminal is not null
       or (r.current_stage is null and p_stage<>'D00')
       or (r.current_stage is not null and
          (p_stage<r.current_stage or right(p_stage,1)::int>right(r.current_stage,1)::int+1))
       then raise exception 'M5_PRODUCER_STAGE_DENIED';end if;
    update control.production_runs set current_stage=p_stage
      where run_id=p_run_id;
  elsif p_action='terminal' then
    if p_status is null or p_status not in ('PASS','HOLD','REJECT','FAILED')
       or r.current_stage is distinct from p_stage
       or p_terminal is null or jsonb_typeof(p_terminal)<>'object'
       or octet_length(p_terminal::text)>2048
       or p_terminal->>'stage' is distinct from p_stage
       or p_terminal->>'disposition' is distinct from p_status
       or p_terminal->>'gate_code' is distinct from 'G'||right(p_stage,1)
       or exists(select 1 from jsonb_object_keys(p_terminal) k where k not in
         ('stage','gate_code','disposition','independent_gate_audit_id','reason_code','verification_error'))
       then raise exception 'M5_PRODUCER_TERMINAL_DENIED';end if;
    if p_status='PASS' then
      audit_ref:=p_terminal->>'independent_gate_audit_id';
      if audit_ref is null
         or audit_ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then raise exception 'M5_PRODUCER_GATE_REQUIRED';end if;
      if not exists(
        select 1 from control.gate_audits a
        join control.qualification_current q on q.gate_audit_id=a.gate_audit_id
        where a.gate_audit_id=audit_ref::uuid and a.run_id=p_run_id
          and a.architecture_generation='mohen.six-stage.v1'
          and a.stage=p_stage and a.gate_code='G'||right(p_stage,1)
          and a.result::text='PASS' and a.current_valid=true
          and now()>=q.valid_from and now()<q.valid_until
      ) then raise exception 'M5_PRODUCER_GATE_NOT_CURRENT';end if;
    end if;
    update control.production_runs set status=p_status,finished_at=now(),
      metadata=coalesce(metadata,'{}'::jsonb)||
        jsonb_build_object('m5_terminal',p_terminal)
      where run_id=p_run_id;
  else
    raise exception 'M5_PRODUCER_ACTION_INVALID';
  end if;
  return p_run_id;
end $m5$;
revoke all on function control.m5_write_production_progress(uuid,text,text,text,text,jsonb)
 from public,anon,authenticated,service_role,mohen_app_runtime,
      mohen_gate_signer,mohen_gate_reader,mohen_gate_authority;
grant execute on function control.m5_write_production_progress(uuid,text,text,text,text,jsonb)
 to mohen_producer;
do $verify$ begin
 if has_table_privilege('mohen_producer','control.production_runs','UPDATE')
   or has_table_privilege('mohen_producer','control.production_runs','SELECT')
   or has_function_privilege('anon',
        'control.m5_write_production_progress(uuid,text,text,text,text,jsonb)','EXECUTE')
   or has_function_privilege('mohen_gate_signer',
        'control.m5_write_production_progress(uuid,text,text,text,text,jsonb)','EXECUTE')
   or not has_function_privilege('mohen_producer',
        'control.m5_write_production_progress(uuid,text,text,text,text,jsonb)','EXECUTE') then
   raise exception 'M5_PRODUCER_RUN_PRIVILEGE_LEAK';
 end if;
end $verify$;
commit;
