-- M3 candidate only. No live credential, policy, LOGIN or activation is issued.
begin;
-- Supabase managed PG17: postgres is CREATEROLE but not superuser.
-- Reuse the K3 migration's already validated temporary SET membership
-- and schema CREATE contract for ALTER FUNCTION ... OWNER. All elevated
-- grants are removed in this same transaction before COMMIT.
do $ begin
 if not (select rolsuper from pg_roles where rolname=current_user) then
   execute format('grant mohen_gate_authority to %I with admin false, inherit false, set true',current_user);
   grant create on schema control to mohen_gate_authority;
 end if;
end $;
do $begin
 if not exists(select from pg_roles where rolname='mohen_gate_reader')then
  create role mohen_gate_reader nologin noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
 end if;
 if exists(select from pg_roles where rolname='mohen_gate_reader' and (rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication))
  then raise exception 'UNSAFE_GATE_READER_ROLE';end if;
end$$;
grant usage on schema control to mohen_gate_reader;
create table if not exists control.gate_service_credentials(
 credential_id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 capability text not null check(capability in ('review','consume')),
 principal_user_id uuid not null references public.users(user_id),
 db_identity name not null,
 reviewer_binding_id uuid not null references control.gate_reviewer_bindings(binding_id),
 job_id text not null check(length(job_id) between 1 and 128),
 reviewer_binding_ref text not null check(length(reviewer_binding_ref) between 1 and 128),
 gate_code text not null check(gate_code in ('G0','G1','G2','G3','G4','G5')),
 purpose_namespace text not null check(length(purpose_namespace) between 1 and 128),
 purpose_code text not null check(length(purpose_code) between 1 and 128),
 purpose_version text not null check(length(purpose_version) between 1 and 128),
 consumer text not null check(consumer='producer'),
 allowed_scope jsonb not null check(jsonb_typeof(allowed_scope)='object' and allowed_scope<>'{}'::jsonb and octet_length(allowed_scope::text)<=4096),
 valid_from timestamptz not null default now(),valid_until timestamptz not null,
 revoked_at timestamptz,source_ref text not null check(length(source_ref) between 1 and 512),
 created_at timestamptz not null default now(),check(valid_until>valid_from)
);
alter table control.gate_service_credentials enable row level security;
revoke all on control.gate_service_credentials from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer,mohen_gate_reader;
grant select,update(revoked_at) on control.gate_service_credentials to mohen_gate_authority;
drop policy if exists gate_service_authority on control.gate_service_credentials;
create policy gate_service_authority on control.gate_service_credentials to mohen_gate_authority using(true) with check(true);
create or replace function control.protect_gate_service_credential()returns trigger
language plpgsql set search_path=pg_catalog as $$begin
 if tg_op='UPDATE' then
  if to_jsonb(old)=to_jsonb(new) then return new;end if;
  if old.revoked_at is null and new.revoked_at is not null
   and (to_jsonb(old)-'revoked_at')=(to_jsonb(new)-'revoked_at')then return new;end if;
 end if;
 raise exception 'GATE_SERVICE_CREDENTIAL_IMMUTABLE';
end$$;
revoke all on function control.protect_gate_service_credential()from public;
drop trigger if exists gate_service_credential_immutable on control.gate_service_credentials;
create trigger gate_service_credential_immutable before update or delete on control.gate_service_credentials
 for each row execute function control.protect_gate_service_credential();

create or replace function control.gate_service_login_valid(p_capability text)returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select p_capability in ('review','consume')
 and coalesce(nullif(nullif(current_setting('role',true),'none'),''),session_user::text)=session_user::text
 and exists(select from pg_roles r where r.rolname=session_user and r.rolcanlogin)
 and session_user::text not in ('mohen_gate_reader','mohen_gate_signer','mohen_gate_authority','mohen_app_runtime','mohen_producer')
 and pg_has_role(session_user,case when p_capability='review' then 'mohen_gate_signer' else 'mohen_gate_reader' end,'MEMBER')
 and not exists(select from pg_roles r where pg_has_role(session_user,r.oid,'MEMBER')
  and (r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolreplication
    or r.rolname in ('mohen_app_runtime','mohen_producer','mohen_gate_authority','pg_read_all_data','pg_write_all_data','pg_execute_server_program','pg_read_server_files','pg_write_server_files')
    or r.rolname=case when p_capability='review' then 'mohen_gate_reader' else 'mohen_gate_signer' end))
$$;
alter function control.gate_service_login_valid(text)owner to mohen_gate_authority;
revoke all on function control.gate_service_login_valid(text)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer,mohen_gate_reader;

create or replace function control.authenticate_gate_service(p_hash text,p_capability text)returns jsonb
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare c control.gate_service_credentials;b control.gate_reviewer_bindings;t timestamptz:=clock_timestamp();
begin
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or not control.gate_service_login_valid(p_capability)then return null;end if;
 select * into c from control.gate_service_credentials where token_hash=p_hash and capability=p_capability and db_identity=session_user for share;
 t:=clock_timestamp();
 if not found or c.revoked_at is not null or t<c.valid_from or t>=c.valid_until then return null;end if;
 if not exists(select from public.users where user_id=c.principal_user_id and status='active')then return null;end if;
 select * into b from control.gate_reviewer_bindings where binding_id=c.reviewer_binding_id;
 if not found or not b.active or t<b.valid_from or t>=b.valid_until
  or b.gate_code<>c.gate_code or b.purpose_namespace<>c.purpose_namespace or b.purpose_code<>c.purpose_code
  or b.purpose_version<>c.purpose_version or b.consumer<>c.consumer or not b.allowed_scope @> c.allowed_scope
  or not exists(select from public.users where user_id=b.reviewer_user_id and status='active')
  or (p_capability='review' and (b.reviewer_user_id<>c.principal_user_id or b.db_identity<>session_user))then return null;end if;
 return jsonb_build_object('credential_id',c.credential_id,'principal_user_id',c.principal_user_id,
  'job_id',c.job_id,'reviewer_binding_ref',c.reviewer_binding_ref,'gate_code',c.gate_code,
  'purpose_namespace',c.purpose_namespace,'purpose_code',c.purpose_code,'purpose_version',c.purpose_version,
  'consumer',c.consumer,'allowed_scope',c.allowed_scope,'valid_until',least(c.valid_until,b.valid_until));
end$$;
alter function control.authenticate_gate_service(text,text)owner to mohen_gate_authority;
revoke all on function control.authenticate_gate_service(text,text)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer;
grant execute on function control.authenticate_gate_service(text,text)to mohen_gate_signer,mohen_gate_reader;

create or replace function control.gate_service_target_allows(p_hash text,p_action text,p_target uuid,p_receipt jsonb)returns boolean
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare c jsonb;target_gate text;ns text;code text;version text;target_consumer text;scope jsonb;fingerprint text;binding jsonb;
begin
 c:=control.authenticate_gate_service(p_hash,'review');
 if c is null then return false;end if;
 if p_action='decide' then
  select gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,input_fingerprint
   into target_gate,ns,code,version,target_consumer,scope,fingerprint from control.gate_candidates where candidate_id=p_target;
  if not found or p_receipt->'stage_binding'->>'input_digest' is distinct from fingerprint
   or p_receipt->'stage_binding'->>'job_id' is distinct from c->>'job_id'
   or p_receipt->'stage_binding'->>'reviewer_binding_ref' is distinct from c->>'reviewer_binding_ref'
   or p_receipt->'stage_binding'->>'consumer' is distinct from c->>'consumer' then return false;end if;
 elsif p_action='revoke' then
  select gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,details->'stage_binding'
   into target_gate,ns,code,version,target_consumer,scope,binding from control.gate_audits
   where gate_audit_id=p_target and decision_origin='independent_gate';
  if not found or binding->>'job_id' is distinct from c->>'job_id'
   or binding->>'reviewer_binding_ref' is distinct from c->>'reviewer_binding_ref'
   or binding->>'consumer' is distinct from c->>'consumer' then return false;end if;
 else return false;end if;
 return target_gate=c->>'gate_code' and ns=c->>'purpose_namespace' and code=c->>'purpose_code'
  and version=c->>'purpose_version' and target_consumer=c->>'consumer' and (c->'allowed_scope') @> scope;
end$$;
alter function control.gate_service_target_allows(text,text,uuid,jsonb)owner to mohen_gate_authority;
revoke all on function control.gate_service_target_allows(text,text,uuid,jsonb)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_reader;
grant execute on function control.gate_service_target_allows(text,text,uuid,jsonb)to mohen_gate_signer;

create or replace function control.read_gate_stage_qualification(p_hash text,p_request jsonb)returns jsonb
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare c jsonb;receipts jsonb;
begin
 c:=control.authenticate_gate_service(p_hash,'consume');
 if c is null or jsonb_typeof(p_request) is distinct from 'object'then return null;end if;
 if p_request->>'schema' is distinct from 'mohen.independent-gate-current-check.v1'
  or p_request->>'job_id' is distinct from c->>'job_id' or p_request->>'reviewer_binding_ref' is distinct from c->>'reviewer_binding_ref'
  or p_request->>'consumer' is distinct from c->>'consumer' or p_request->>'gate_code' is distinct from c->>'gate_code'
  or p_request->>'stage' is distinct from 'D0'||substring(c->>'gate_code',2)
  or coalesce(p_request->>'input_digest','') !~ '^[a-f0-9]{64}$' or coalesce(p_request->>'output_digest','') !~ '^[a-f0-9]{64}$'
  or exists(select from jsonb_object_keys(p_request)k where k not in('schema','job_id','reviewer_binding_ref','consumer','gate_code','stage','run_id','input_digest','output_digest'))
  then return null;end if;
 select jsonb_agg(jsonb_build_object('schema','mohen.independent-gate-current-receipt.v1',
  'qualification_current',true,'decision_origin','independent_gate','result','PASS',
  'run_id',a.run_id,'stage',a.stage,'gate_code',a.gate_code,'job_id',c->>'job_id',
  'reviewer_binding_ref',c->>'reviewer_binding_ref','consumer',c->>'consumer',
  'input_digest',p_request->>'input_digest','output_digest',p_request->>'output_digest',
  'gate_audit_id',a.gate_audit_id,'object_type',a.object_type,'object_id',a.object_id,
  'artifact_revision',a.artifact_revision,'qualification_digest',a.qualification_digest,'valid_until',a.valid_until)) into receipts
 from(select g.* from control.gate_audits g where g.architecture_generation='mohen.six-stage.v1'
  and g.decision_origin='independent_gate' and g.result='PASS' and g.run_id=(p_request->>'run_id')::uuid
  and g.stage=p_request->>'stage' and g.gate_code=c->>'gate_code'
  and g.input_fingerprint=p_request->>'input_digest'
  and g.details->'stage_binding'->>'input_digest'=p_request->>'input_digest'
  and g.details->'stage_binding'->>'output_digest'=p_request->>'output_digest'
  and g.details->'stage_binding'->>'job_id'=c->>'job_id'
  and g.details->'stage_binding'->>'reviewer_binding_ref'=c->>'reviewer_binding_ref'
  and g.details->'stage_binding'->>'consumer'=c->>'consumer'
  and g.valid_until>clock_timestamp()
  and control.qualification_allows(g.gate_audit_id,c->>'consumer',c->>'purpose_namespace',c->>'purpose_code',c->>'purpose_version',c->'allowed_scope')
  limit 2)a;
 if jsonb_array_length(receipts)=1 then return receipts->0;end if;return null;
end$$;
alter function control.read_gate_stage_qualification(text,jsonb)owner to mohen_gate_authority;
revoke all on function control.read_gate_stage_qualification(text,jsonb)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer;
grant execute on function control.read_gate_stage_qualification(text,jsonb)to mohen_gate_reader;
-- PG17 managed non-superuser cannot perform effective REVOKE/GRANT on a
-- function after ALTER OWNER without assuming the new owner's identity.
-- As proven by existing K3 ACL repair, finalize the ACL as actual owner.
set local role mohen_gate_authority;
revoke all on function control.gate_service_login_valid(text)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer,mohen_gate_reader;
revoke all on function control.authenticate_gate_service(text,text)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer;
grant execute on function control.authenticate_gate_service(text,text)to mohen_gate_signer,mohen_gate_reader;
revoke all on function control.gate_service_target_allows(text,text,uuid,jsonb)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_reader;
grant execute on function control.gate_service_target_allows(text,text,uuid,jsonb)to mohen_gate_signer;
revoke all on function control.read_gate_stage_qualification(text,jsonb)from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer;
grant execute on function control.read_gate_stage_qualification(text,jsonb)to mohen_gate_reader;
reset role;
-- Remove temporary role/schema grants; the original K3 ADMIN-only bootstrap
-- membership may remain but must not carry usable SET or inherited access.
do $ begin
 if not (select rolsuper from pg_roles where rolname=current_user) then
   revoke create on schema control from mohen_gate_authority;
   execute format('revoke mohen_gate_authority from %I granted by %I',current_user,current_user);
 end if;
 if not (select rolsuper from pg_roles where rolname=current_user)
    and has_schema_privilege('mohen_gate_authority','control','CREATE')
 then raise exception 'GATE_SERVICE_AUTHORITY_CREATE_LEAK';end if;
 if exists(select from pg_auth_members m where
   m.member='mohen_gate_authority'::regrole or
   (m.roleid='mohen_gate_authority'::regrole and not
      (m.member=(select oid from pg_roles where rolname=current_user)
       and m.admin_option and not m.inherit_option and not m.set_option)))
 then raise exception 'GATE_SERVICE_AUTHORITY_MEMBERSHIP_LEAK';end if;
end $;
-- Fail the migration if PUBLIC or Producer still executes privileged Gate API.
do $ begin
 if has_function_privilege('anon','control.authenticate_gate_service(text,text)','EXECUTE')
 or has_function_privilege('anon','control.read_gate_stage_qualification(text,jsonb)','EXECUTE')
 or has_function_privilege('mohen_producer','control.authenticate_gate_service(text,text)','EXECUTE')
 or has_function_privilege('mohen_app_runtime','control.gate_service_target_allows(text,text,uuid,jsonb)','EXECUTE')
 or has_function_privilege('mohen_producer','control.read_gate_stage_qualification(text,jsonb)','EXECUTE')
 or not has_function_privilege('mohen_gate_reader','control.read_gate_stage_qualification(text,jsonb)','EXECUTE')
 or not has_function_privilege('mohen_gate_signer','control.authenticate_gate_service(text,text)','EXECUTE')
 then raise exception 'GATE_SERVICE_EXECUTE_ACL_UNSAFE';end if;
end $;
commit;
