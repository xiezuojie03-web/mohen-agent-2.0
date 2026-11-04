-- M4 candidate: Owner execution coordination only. No dispatch, spend grant,
-- receipt acceptance, Gate qualification, or production enablement.
begin;

-- A dedicated, unassumable owner keeps the definer entry point off the
-- migration superuser. No runtime/Producer/Signer membership is introduced.
do $$ begin
 if not exists(select from pg_roles where rolname='mohen_execution_authority') then
  create role mohen_execution_authority nologin noinherit nosuperuser nobypassrls;
 end if;
 if exists(select from pg_roles where rolname='mohen_execution_authority'
  and (rolcanlogin or rolinherit or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication))
  or exists(select from pg_auth_members where roleid='mohen_execution_authority'::regrole
   or member='mohen_execution_authority'::regrole) then
  raise exception 'STUDIO_EXECUTION_ROLE_PREFLIGHT_FAILED';
 end if;
 if exists(select from pg_namespace where nspname='studio' and nspowner='mohen_execution_authority'::regrole)
  or exists(select from pg_class where relnamespace='studio'::regnamespace
   and relowner='mohen_execution_authority'::regrole) then
  raise exception 'STUDIO_EXECUTION_OWNERSHIP_PREFLIGHT_FAILED';
 end if;
end $$;

create table if not exists studio.execution_controls (
 delegation_id uuid primary key references studio.delegations(delegation_id) on delete restrict,
 version bigint not null default 0 check(version between 0 and 9007199254740991),
 state text not null default 'READY' check(state in ('READY','LEASED','IN_FLIGHT','HOLD','COMPLETED','REVOKED')),
 revoked_at timestamptz, revoke_reason text,
 lease_id uuid, lease_owner text, lease_expires_at timestamptz,
 input_digest text not null check(input_digest ~ '^[a-f0-9]{64}$'), policy_version text not null,
 external_attempted boolean not null default false, unknown_cost boolean not null default false,
 reserved_cost numeric(14,6) not null default 0 check(reserved_cost>=0),
 spent_cost numeric(14,6) not null default 0 check(spent_cost>=0),
 checkpoint_payload jsonb not null default '{}' check(jsonb_typeof(checkpoint_payload)='object'),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 check((revoked_at is not null)=(state='REVOKED')),
 check((revoked_at is null)=(revoke_reason is null)),
 check((lease_id is null)=(lease_owner is null) and (lease_id is null)=(lease_expires_at is null))
);
create table if not exists studio.execution_control_events (
 event_id uuid primary key default gen_random_uuid(),
 delegation_id uuid not null references studio.execution_controls(delegation_id) on delete restrict,
 request_id uuid not null unique,
 actor_id uuid not null references public.users(user_id) on delete restrict,
 operation text not null check(operation in ('CLAIM','CHECKPOINT','REVOKE')),
 request_payload jsonb not null check(jsonb_typeof(request_payload)='object'),
 result_state jsonb not null check(jsonb_typeof(result_state)='object'),
 created_at timestamptz not null default clock_timestamp()
);
create index if not exists studio_execution_events_delegation on studio.execution_control_events(delegation_id,created_at,event_id);
alter table studio.execution_controls enable row level security;
alter table studio.execution_control_events enable row level security;
revoke all on studio.execution_controls,studio.execution_control_events
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
grant usage on schema studio,control,public to mohen_execution_authority;
grant execute on function control.current_app_user_id() to mohen_execution_authority;
grant select on studio.delegations,studio.projects,studio.execution_receipts to mohen_execution_authority;
grant select(user_id,status),update(status) on public.users to mohen_execution_authority;
-- UPDATE on one column permits FOR SHARE, so account disabling, project archive,
-- or Owner transfer cannot commit between authorization and the state change.
grant update(lifecycle_status) on studio.projects to mohen_execution_authority;
grant select,insert,update on studio.execution_controls to mohen_execution_authority;
grant select,insert on studio.execution_control_events to mohen_execution_authority;
grant select on studio.execution_controls,studio.execution_control_events to mohen_app_runtime;
drop policy if exists studio_execution_identity on public.users;
create policy studio_execution_identity on public.users to mohen_execution_authority using(true) with check(true);
drop policy if exists studio_execution_project on studio.projects;
create policy studio_execution_project on studio.projects to mohen_execution_authority using(true) with check(true);
drop policy if exists studio_execution_delegation on studio.delegations;
create policy studio_execution_delegation on studio.delegations for select to mohen_execution_authority using(true);
drop policy if exists studio_execution_receipt on studio.execution_receipts;
create policy studio_execution_receipt on studio.execution_receipts for select to mohen_execution_authority using(true);
drop policy if exists studio_execution_authority on studio.execution_controls;
create policy studio_execution_authority on studio.execution_controls to mohen_execution_authority using(true) with check(true);
drop policy if exists studio_execution_event_authority on studio.execution_control_events;
create policy studio_execution_event_authority on studio.execution_control_events to mohen_execution_authority using(true) with check(true);
drop policy if exists studio_execution_owner on studio.execution_controls;
create policy studio_execution_owner on studio.execution_controls for select to mohen_app_runtime using(
 exists(select from studio.delegations d join studio.projects p using(project_id)
  where d.delegation_id=execution_controls.delegation_id and p.owner_user_id=(select control.current_app_user_id())
   and p.lifecycle_status='ACTIVE'));
drop policy if exists studio_execution_event_owner on studio.execution_control_events;
create policy studio_execution_event_owner on studio.execution_control_events for select to mohen_app_runtime using(
 exists(select from studio.execution_controls c where c.delegation_id=execution_control_events.delegation_id));

create or replace function studio.protect_execution_control() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op in ('DELETE','TRUNCATE') then raise exception 'PERMANENT_RECEIPT_IMMUTABLE';end if;
 if old.revoked_at is not null and new is distinct from old then
  raise exception 'STUDIO_EXECUTION_REVOCATION_PERMANENT';end if;
 if new.spent_cost<old.spent_cost or new.reserved_cost<old.reserved_cost
  or (old.external_attempted and not new.external_attempted) or (old.unknown_cost and not new.unknown_cost) then
  raise exception 'STUDIO_EXECUTION_COST_PERMANENT';end if;
 if new.delegation_id is distinct from old.delegation_id or new.input_digest is distinct from old.input_digest
  or new.policy_version is distinct from old.policy_version or new.created_at is distinct from old.created_at then
  raise exception 'STUDIO_EXECUTION_BINDING_PERMANENT';end if;
 return new;
end $$;
revoke all on function studio.protect_execution_control() from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
drop trigger if exists studio_execution_control_permanent on studio.execution_controls;
create trigger studio_execution_control_permanent before update or delete on studio.execution_controls
 for each row execute function studio.protect_execution_control();
drop trigger if exists studio_execution_control_no_truncate on studio.execution_controls;
create trigger studio_execution_control_no_truncate before truncate on studio.execution_controls
 for each statement execute function studio.protect_execution_control();
drop trigger if exists studio_execution_event_permanent on studio.execution_control_events;
create trigger studio_execution_event_permanent before update or delete on studio.execution_control_events
 for each row execute function studio.protect_permanent_receipt();
drop trigger if exists studio_execution_event_no_truncate on studio.execution_control_events;
create trigger studio_execution_event_no_truncate before truncate on studio.execution_control_events
 for each statement execute function studio.protect_permanent_receipt();

create or replace function studio.apply_execution_control(p_operation text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 actor uuid; target uuid; request_uuid uuid; delegation studio.delegations;
 project studio.projects; current_state studio.execution_controls; prior studio.execution_control_events;
 response jsonb; expected bigint; requested_state text; lease_seconds integer; account_status text;
begin
 actor:=control.current_app_user_id();
 if actor is null then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 if p_operation is null or p_operation not in ('GET','CLAIM','CHECKPOINT','REVOKE')
  or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>1000000
  or coalesce(p_input->>'delegationId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
  raise exception 'STUDIO_EXECUTION_INVALID';end if;
 target:=(p_input->>'delegationId')::uuid;
 if p_operation<>'GET' then
  if coalesce(p_input->>'requestId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
   raise exception 'STUDIO_EXECUTION_INVALID';end if;
  request_uuid:=(p_input->>'requestId')::uuid;
  -- Global UUID serialization also makes cross-delegation request reuse a
  -- deterministic conflict instead of a racing unique-constraint error.
  perform pg_advisory_xact_lock(hashtextextended(request_uuid::text,0));
 end if;
 select u.status into account_status from public.users u where u.user_id=actor for share;
 if account_status is distinct from 'active' then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 select * into delegation from studio.delegations where delegation_id=target;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into project from studio.projects p where p.project_id=delegation.project_id for share;
 if project.owner_user_id is distinct from actor or project.lifecycle_status is distinct from 'ACTIVE' then
  raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 insert into studio.execution_controls(delegation_id,input_digest,policy_version)
 values(target,delegation.request_hash,delegation.policy_version) on conflict(delegation_id) do nothing;
 select * into current_state from studio.execution_controls where delegation_id=target for update;
 if p_operation='GET' then
  return to_jsonb(current_state)||jsonb_build_object('reserved_cost',current_state.reserved_cost::text,'spent_cost',current_state.spent_cost::text);
 end if;
 -- A historic successful claim/checkpoint cannot override a later revocation.
 if current_state.revoked_at is not null and p_operation<>'REVOKE' then raise exception 'STUDIO_EXECUTION_REVOKED';end if;
 select * into prior from studio.execution_control_events where request_id=request_uuid;
 if found and (prior.delegation_id<>target or prior.actor_id<>actor
  or prior.operation<>p_operation or prior.request_payload<>p_input) then
  raise exception 'STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT';end if;
 if p_operation='REVOKE' then
  if jsonb_typeof(p_input->'reason') is distinct from 'string'
   or length(btrim(p_input->>'reason')) not between 1 and 500 then raise exception 'STUDIO_EXECUTION_INVALID';end if;
  if prior.event_id is not null then return prior.result_state;end if;
  if current_state.revoked_at is null then
   update studio.execution_controls set state='REVOKED',revoked_at=clock_timestamp(),revoke_reason=p_input->>'reason',
    lease_id=null,lease_owner=null,lease_expires_at=null,version=version+1,updated_at=clock_timestamp()
    where delegation_id=target returning * into current_state;
  end if;
 else
  if delegation.expires_at<=clock_timestamp() then raise exception 'STUDIO_EXECUTION_EXPIRED';end if;
  if jsonb_typeof(p_input->'expectedVersion') is distinct from 'number'
   or coalesce(p_input->>'expectedVersion','') !~ '^[0-9]{1,16}$'
   or (p_input->>'expectedVersion')::numeric>9007199254740991
   or p_input->>'inputDigest' is distinct from delegation.request_hash
   or p_input->>'policyVersion' is distinct from delegation.policy_version then
   raise exception 'STUDIO_EXECUTION_BINDING_MISMATCH';end if;
  expected:=(p_input->>'expectedVersion')::bigint;
  if p_operation='CHECKPOINT' then
   if current_state.lease_id is null or p_input->>'leaseId' is distinct from current_state.lease_id::text
    or current_state.lease_expires_at<=clock_timestamp() then raise exception 'STUDIO_EXECUTION_LEASE_STALE';end if;
   requested_state:=p_input->>'state';
   if requested_state is null or requested_state not in ('HOLD','IN_FLIGHT','COMPLETED')
    or jsonb_typeof(p_input->'payload') is distinct from 'object' then raise exception 'STUDIO_EXECUTION_INVALID';end if;
   if prior.event_id is not null then
    -- Returning an old snapshot after another checkpoint could conceal a newer
    -- external attempt/unknown cost. Retries are stable only at that version.
    if current_state.version<>(prior.result_state->>'version')::bigint then
     raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
    return prior.result_state;
   end if;
   if current_state.version<>expected then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
   if current_state.state='COMPLETED' then raise exception 'STUDIO_EXECUTION_COMPLETED';end if;
   -- A new external attempt cannot hide inside a still-live old lease. Exact
   -- request replay was handled above; only verified reconciliation elsewhere
   -- may settle uncertainty, never an ordinary checkpoint payload.
   if requested_state='IN_FLIGHT' and (current_state.external_attempted or current_state.unknown_cost
    or current_state.spent_cost>0 or current_state.reserved_cost>0
    or exists(select from studio.execution_receipts where delegation_id=target)) then
    raise exception 'STUDIO_EXECUTION_RECONCILIATION_REQUIRED';end if;
   update studio.execution_controls set state=requested_state,version=version+1,updated_at=clock_timestamp(),
    checkpoint_payload=p_input->'payload',external_attempted=external_attempted or requested_state='IN_FLIGHT',
    unknown_cost=unknown_cost or requested_state='IN_FLIGHT'
    where delegation_id=target returning * into current_state;
  else
   if jsonb_typeof(p_input->'ownerRef') is distinct from 'string'
    or length(btrim(p_input->>'ownerRef')) not between 1 and 500
    or jsonb_typeof(p_input->'leaseSeconds') is distinct from 'number'
    or coalesce(p_input->>'leaseSeconds','') !~ '^[0-9]{1,3}$'
    or (p_input->>'leaseSeconds')::integer not between 1 and 300 then raise exception 'STUDIO_EXECUTION_INVALID';end if;
   -- A lease timeout does not establish that an external action did not happen.
   -- There is deliberately no reconciliation/uncertainty-clearing path here.
   if current_state.external_attempted or current_state.unknown_cost
    or current_state.spent_cost>0 or current_state.reserved_cost>0
    or exists(select from studio.execution_receipts where delegation_id=target) then
    raise exception 'STUDIO_EXECUTION_RECONCILIATION_REQUIRED';end if;
   if prior.event_id is not null then
    if current_state.lease_id is null or current_state.lease_id::text is distinct from prior.result_state->>'lease_id'
     or current_state.lease_expires_at<=clock_timestamp() or current_state.state<>'LEASED' then
     raise exception 'STUDIO_EXECUTION_LEASE_STALE';end if;
    return prior.result_state;
   end if;
   if current_state.version<>expected then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
   if current_state.state='COMPLETED' then raise exception 'STUDIO_EXECUTION_COMPLETED';end if;
   if current_state.state<>'HOLD' and current_state.lease_expires_at>clock_timestamp() then
    raise exception 'STUDIO_EXECUTION_LEASE_BUSY';end if;
   lease_seconds:=(p_input->>'leaseSeconds')::integer;
   update studio.execution_controls set state='LEASED',version=version+1,lease_id=gen_random_uuid(),
    lease_owner=p_input->>'ownerRef',lease_expires_at=least(delegation.expires_at,clock_timestamp()+make_interval(secs=>lease_seconds)),
    updated_at=clock_timestamp() where delegation_id=target returning * into current_state;
  end if;
 end if;
 response:=to_jsonb(current_state)||jsonb_build_object('reserved_cost',current_state.reserved_cost::text,'spent_cost',current_state.spent_cost::text);
 insert into studio.execution_control_events(delegation_id,request_id,actor_id,operation,request_payload,result_state)
 values(target,request_uuid,actor,p_operation,p_input,response);
 return response;
end $$;
alter function studio.apply_execution_control(text,jsonb) owner to mohen_execution_authority;
revoke all on function studio.apply_execution_control(text,jsonb)
 from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
grant execute on function studio.apply_execution_control(text,jsonb) to mohen_app_runtime;
commit;
