-- M5 development environment: distinct, inactive-at-install login identities.
-- Existing NOLOGIN role groups remain the only privilege owners. No credential
-- is written to Git; a separate secure rotation must happen before live use.
-- Producer is a Runner only; private Worker can SET ROLE app_runtime for Owner-scoped reads and mohen_private_worker for D00/Gate-candidate operations.
-- Independent Gate signer/reader and their authorizations are NOT activated.
begin;
do $create$
begin
  if not exists(select 1 from pg_roles where rolname='mohen_m5_producer_login') then
    create role mohen_m5_producer_login login inherit nosuperuser nocreatedb nocreaterole
      noreplication nobypassrls password null connection limit 5;
  end if;
  if not exists(select 1 from pg_roles where rolname='mohen_m5_worker_login') then
    create role mohen_m5_worker_login login noinherit nosuperuser nocreatedb nocreaterole
      noreplication nobypassrls password null connection limit 5;
  end if;
end $create$;
-- PG17 per-membership options: Producer inherits its limited RPC rights and
-- cannot SET ROLE to hide session identity; Worker can SET LOCAL ROLE only.
grant mohen_producer to mohen_m5_producer_login with inherit true,set false;
grant mohen_app_runtime to mohen_m5_worker_login with inherit false,set true;
grant mohen_private_worker to mohen_m5_worker_login with inherit false,set true;
do $verify$
declare bad boolean;
begin
  select exists(
    select 1 from pg_roles
    where rolname in ('mohen_m5_producer_login','mohen_m5_worker_login')
      and (not rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication)
  ) into bad;
  if bad or (select count(*) from pg_roles
      where rolname in ('mohen_m5_producer_login','mohen_m5_worker_login'))<>2 then
    raise exception 'M5_MACHINE_LOGIN_PRIVILEGES_UNSAFE';
  end if;
  if not pg_has_role('mohen_m5_producer_login','mohen_producer','MEMBER')
    or not pg_has_role('mohen_m5_producer_login','mohen_producer','USAGE')
    or pg_has_role('mohen_m5_producer_login','mohen_producer','SET')
    or pg_has_role('mohen_m5_producer_login','mohen_app_runtime','MEMBER')
    or pg_has_role('mohen_m5_producer_login','mohen_gate_signer','MEMBER')
    or pg_has_role('mohen_m5_producer_login','mohen_gate_authority','MEMBER')
    or pg_has_role('mohen_m5_producer_login','mohen_private_worker','MEMBER')
    or pg_has_role('mohen_m5_producer_login','pg_write_all_data','MEMBER') then
    raise exception 'M5_MACHINE_PRODUCER_MEMBERSHIP_UNSAFE';
  end if;
  if not pg_has_role('mohen_m5_worker_login','mohen_app_runtime','MEMBER')
    or not pg_has_role('mohen_m5_worker_login','mohen_app_runtime','SET')
    or pg_has_role('mohen_m5_worker_login','mohen_app_runtime','USAGE')
    or not pg_has_role('mohen_m5_worker_login','mohen_private_worker','MEMBER')
    or not pg_has_role('mohen_m5_worker_login','mohen_private_worker','SET')
    or pg_has_role('mohen_m5_worker_login','mohen_producer','MEMBER')
    or pg_has_role('mohen_m5_worker_login','mohen_gate_signer','MEMBER')
    or pg_has_role('mohen_m5_worker_login','mohen_gate_authority','MEMBER')
    or pg_has_role('mohen_m5_worker_login','pg_read_all_data','MEMBER') then
    raise exception 'M5_MACHINE_WORKER_MEMBERSHIP_UNSAFE';
  end if;
  if has_table_privilege('mohen_m5_producer_login','control.production_runs','UPDATE')
     or has_table_privilege('mohen_m5_producer_login','control.production_runs','SELECT')
     or not has_function_privilege('mohen_m5_producer_login',
           'control.m5_write_production_progress(uuid,text,text,text,text,jsonb)','EXECUTE')
     or has_function_privilege('mohen_m5_worker_login',
           'control.m5_write_production_progress(uuid,text,text,text,text,jsonb)','EXECUTE')
     or has_function_privilege('mohen_m5_producer_login',
           'control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
     or has_function_privilege('mohen_m5_worker_login',
           'control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE') then
    raise exception 'M5_MACHINE_FUNCTION_ACL_UNSAFE';
  end if;
end $verify$;
commit;
