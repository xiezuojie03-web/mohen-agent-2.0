-- M4 incremental: controlled spend reservation and usage-based estimate settlement.
-- Extends the existing delegation/control/receipt ledger. No provider dispatch,
-- actual invoice claim, Gate qualification, or production enablement is granted here.
begin;

alter table studio.execution_control_events drop constraint if exists execution_control_events_operation_check;
alter table studio.execution_control_events add constraint execution_control_events_operation_check
 check(operation in ('CLAIM','CHECKPOINT','REVOKE','RESERVE','RELEASE','RECONCILE'));

create or replace function studio.protect_execution_control() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare action text; trusted boolean; trusted_release boolean; trusted_reconcile boolean;
begin
 if tg_op in ('DELETE','TRUNCATE') then raise exception 'PERMANENT_RECEIPT_IMMUTABLE';end if;
 action:=coalesce(current_setting('mohen.execution_cost_action',true),'');
 trusted:=current_user='mohen_execution_authority' and action in ('RELEASE','RECONCILE');
 trusted_release:=current_user='mohen_execution_authority' and action='RELEASE';
 trusted_reconcile:=current_user='mohen_execution_authority' and action='RECONCILE';
 if old.revoked_at is not null and new is distinct from old then
  if not (trusted and new.revoked_at is not distinct from old.revoked_at
   and new.revoke_reason is not distinct from old.revoke_reason and new.state='REVOKED'
   and new.lease_id is null and new.lease_owner is null and new.lease_expires_at is null
   and new.delegation_id is not distinct from old.delegation_id
   and new.input_digest is not distinct from old.input_digest
   and new.policy_version is not distinct from old.policy_version
   and new.created_at is not distinct from old.created_at
   and new.external_attempted is not distinct from old.external_attempted
   and new.version=old.version+1 and new.updated_at>=old.updated_at
   and new.spent_cost>=old.spent_cost and new.reserved_cost<=old.reserved_cost
   and (not old.unknown_cost or new.unknown_cost or trusted_reconcile)) then
   raise exception 'STUDIO_EXECUTION_REVOCATION_PERMANENT';end if;
 end if;
 if new.spent_cost<old.spent_cost
  or (new.reserved_cost<old.reserved_cost and not trusted)
  or (old.external_attempted and not new.external_attempted)
  or (old.unknown_cost and not new.unknown_cost and not trusted_reconcile)
  or new.version<old.version then
  raise exception 'STUDIO_EXECUTION_COST_PERMANENT';end if;
 if new.delegation_id is distinct from old.delegation_id or new.input_digest is distinct from old.input_digest
  or new.policy_version is distinct from old.policy_version or new.created_at is distinct from old.created_at then
  raise exception 'STUDIO_EXECUTION_BINDING_PERMANENT';end if;
 return new;
end $$;

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
     or current_state.spent_cost>0
     or exists(select from studio.execution_receipts where delegation_id=target)) then
     raise exception 'STUDIO_EXECUTION_RECONCILIATION_REQUIRED';end if;
    if requested_state='IN_FLIGHT' and current_state.reserved_cost<=0 then
     raise exception 'STUDIO_EXECUTION_RESERVATION_REQUIRED';end if;
    if requested_state='COMPLETED' and (current_state.unknown_cost or current_state.reserved_cost>0) then
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

create or replace function studio.reserve_execution_budget(p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 actor uuid; target uuid; request_uuid uuid; delegation studio.delegations; project studio.projects;
 current_state studio.execution_controls; prior studio.execution_control_events; decision jsonb; source_ref jsonb;
 expected bigint; amount numeric(14,6); response jsonb; account_status text;
begin
 actor:=control.current_app_user_id();
 if actor is null then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 if jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>32768
  or jsonb_object_length(p_input)<>9
  or not (p_input ?& array['delegationId','requestId','expectedVersion','leaseId','inputDigest','policyVersion','amount','currency','pricingPolicyVersion'])
  or coalesce(p_input->>'delegationId','') !~* '^[a-f0-9-]{36}$'
  or coalesce(p_input->>'requestId','') !~* '^[a-f0-9-]{36}$'
  or coalesce(p_input->>'leaseId','') !~* '^[a-f0-9-]{36}$'
  or jsonb_typeof(p_input->'expectedVersion') is distinct from 'number'
  or coalesce(p_input->>'expectedVersion','') !~ '^[0-9]{1,16}$'
  or (p_input->>'expectedVersion')::numeric>9007199254740991
  or coalesce(p_input->>'inputDigest','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_input->>'policyVersion','')='' or length(p_input->>'policyVersion')>128
  or coalesce(p_input->>'amount','') !~ '^(0|[1-9][0-9]{0,7})(\.[0-9]{1,6})?$'
  or coalesce(p_input->>'currency','') !~ '^[A-Z]{3}$'
  or coalesce(p_input->>'pricingPolicyVersion','')='' or length(p_input->>'pricingPolicyVersion')>128 then
  raise exception 'STUDIO_EXECUTION_INVALID';end if;
 target:=(p_input->>'delegationId')::uuid;request_uuid:=(p_input->>'requestId')::uuid;
 expected:=(p_input->>'expectedVersion')::bigint;amount:=(p_input->>'amount')::numeric;
 perform pg_advisory_xact_lock(hashtextextended(request_uuid::text,0));
 select u.status into account_status from public.users u where u.user_id=actor for share;
 if account_status is distinct from 'active' then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 select * into delegation from studio.delegations where delegation_id=target;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into project from studio.projects p where p.project_id=delegation.project_id for share;
 if project.owner_user_id is distinct from actor or delegation.requester is distinct from actor
  or project.lifecycle_status is distinct from 'ACTIVE' then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 if delegation.expires_at<=clock_timestamp() then raise exception 'STUDIO_EXECUTION_EXPIRED';end if;
 select * into current_state from studio.execution_controls where delegation_id=target for update;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into prior from studio.execution_control_events where request_id=request_uuid;
 if found then
  if prior.delegation_id<>target or prior.actor_id<>actor or prior.operation<>'RESERVE' or prior.request_payload<>p_input then
   raise exception 'STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT';end if;
  if current_state.version<>(prior.result_state->>'version')::bigint then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
  return prior.result_state;
 end if;
 if current_state.version<>expected then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
 if current_state.state<>'LEASED' or current_state.lease_id is distinct from (p_input->>'leaseId')::uuid
  or current_state.lease_expires_at is null or current_state.lease_expires_at<=clock_timestamp() then
  raise exception 'STUDIO_EXECUTION_LEASE_STALE';end if;
 if current_state.external_attempted or current_state.unknown_cost or current_state.spent_cost>0
  or current_state.reserved_cost>0 or exists(select from studio.execution_receipts where delegation_id=target) then
  raise exception 'STUDIO_EXECUTION_RECONCILIATION_REQUIRED';end if;
 if p_input->>'inputDigest' is distinct from delegation.request_hash
  or p_input->>'policyVersion' is distinct from delegation.policy_version then raise exception 'STUDIO_EXECUTION_BINDING_MISMATCH';end if;
 if amount<=0 or amount>delegation.budget_limit or p_input->>'currency' is distinct from delegation.currency then
  raise exception 'STUDIO_EXECUTION_BUDGET_INVALID';end if;
 decision:=delegation.transfer_rights_decision;
 if decision->>'schema' is distinct from 'mohen.transfer-rights-decision.v1'
  or decision->>'status' is distinct from 'ALLOWED'
  or decision->>'decision_method' is distinct from 'OWNER_ATTESTATION'
  or decision->>'external_processing' is distinct from 'ALLOWED'
  or coalesce(decision->>'decision_id','') !~* '^[a-f0-9-]{36}$'
  or decision->>'owner_user_id' is distinct from actor::text
  or decision->>'project_id' is distinct from delegation.project_id::text
  or coalesce(decision->>'purpose','')='' or decision->>'purpose' is distinct from delegation.input_manifest->>'purpose'
  or decision->>'provider' is distinct from delegation.provider
  or decision->>'engine_version' is distinct from delegation.engine_version
  or decision->>'pricing_policy_version' is distinct from p_input->>'pricingPolicyVersion'
  or coalesce(decision->>'issued_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
  or coalesce(decision->>'expires_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
  or (decision->>'issued_at')::timestamptz>clock_timestamp()
  or (decision->>'expires_at')::timestamptz<=clock_timestamp()
  or jsonb_typeof(decision->'source_refs') is distinct from 'array'
  or jsonb_typeof(delegation.input_manifest->'source_refs') is distinct from 'array'
  or jsonb_array_length(decision->'source_refs')<1
  or jsonb_array_length(decision->'source_refs')<>jsonb_array_length(delegation.input_manifest->'source_refs')
  or not ('external_processing'=any(delegation.allowed_actions)) then
  raise exception 'STUDIO_EXECUTION_TRANSFER_DENIED';end if;
 for source_ref in select value from jsonb_array_elements(decision->'source_refs') loop
  if coalesce(source_ref->>'ref','')='' or coalesce(source_ref->>'revision','')=''
   or source_ref->>'action' is distinct from 'external_processing'
   or source_ref->>'decision' is distinct from 'ALLOW'
   or coalesce(source_ref->>'rights_basis','')=''
   or coalesce(source_ref->>'evidence_ref','')=''
   or not exists(select from jsonb_array_elements(delegation.input_manifest->'source_refs') s
    where s->>'ref'=source_ref->>'ref' and s->>'revision'=source_ref->>'revision') then
   raise exception 'STUDIO_EXECUTION_TRANSFER_DENIED';end if;
 end loop;
 for source_ref in select value from jsonb_array_elements(delegation.input_manifest->'source_refs') loop
  if not exists(select from jsonb_array_elements(decision->'source_refs') d
   where d->>'ref'=source_ref->>'ref' and d->>'revision'=source_ref->>'revision'
    and d->>'action'='external_processing' and d->>'decision'='ALLOW') then
   raise exception 'STUDIO_EXECUTION_TRANSFER_DENIED';end if;
 end loop;
 if amount>delegation.budget_limit-current_state.spent_cost-current_state.reserved_cost then
  raise exception 'STUDIO_EXECUTION_BUDGET_EXHAUSTED';end if;
 update studio.execution_controls set reserved_cost=reserved_cost+amount,version=version+1,updated_at=clock_timestamp(),
  checkpoint_payload=checkpoint_payload||jsonb_build_object('budget_reservation',jsonb_build_object(
   'amount',amount::text,'currency',delegation.currency,'pricing_policy_version',p_input->>'pricingPolicyVersion',
   'request_id',request_uuid,'reserved_at',clock_timestamp()))
  where delegation_id=target returning * into current_state;
 response:=to_jsonb(current_state)||jsonb_build_object('reserved_cost',current_state.reserved_cost::text,'spent_cost',current_state.spent_cost::text);
 insert into studio.execution_control_events(delegation_id,request_id,actor_id,operation,request_payload,result_state)
 values(target,request_uuid,actor,'RESERVE',p_input,response);
 return response;
end $$;
alter function studio.reserve_execution_budget(jsonb) owner to mohen_execution_authority;
revoke all on function studio.reserve_execution_budget(jsonb) from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
grant execute on function studio.reserve_execution_budget(jsonb) to mohen_app_runtime;

create or replace function studio.release_execution_budget(p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 actor uuid; target uuid; request_uuid uuid; delegation studio.delegations; project studio.projects;
 current_state studio.execution_controls; prior studio.execution_control_events; expected bigint; response jsonb; account_status text;
begin
 actor:=control.current_app_user_id();
 if actor is null then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 if jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>8192
  or jsonb_object_length(p_input)<>7
  or not (p_input ?& array['delegationId','requestId','expectedVersion','leaseId','inputDigest','policyVersion','reason'])
  or coalesce(p_input->>'delegationId','') !~* '^[a-f0-9-]{36}$'
  or coalesce(p_input->>'requestId','') !~* '^[a-f0-9-]{36}$'
  or (p_input->'leaseId' is not null and jsonb_typeof(p_input->'leaseId') not in ('string','null'))
  or (p_input->>'leaseId' is not null and p_input->>'leaseId' !~* '^[a-f0-9-]{36}$')
  or jsonb_typeof(p_input->'expectedVersion') is distinct from 'number'
  or coalesce(p_input->>'expectedVersion','') !~ '^[0-9]{1,16}$'
  or (p_input->>'expectedVersion')::numeric>9007199254740991
  or coalesce(p_input->>'inputDigest','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_input->>'policyVersion','')='' or length(p_input->>'policyVersion')>128
  or jsonb_typeof(p_input->'reason') is distinct from 'string'
  or length(btrim(p_input->>'reason')) not between 1 and 500 then
  raise exception 'STUDIO_EXECUTION_INVALID';end if;
 target:=(p_input->>'delegationId')::uuid;request_uuid:=(p_input->>'requestId')::uuid;
 expected:=(p_input->>'expectedVersion')::bigint;
 perform pg_advisory_xact_lock(hashtextextended(request_uuid::text,0));
 select u.status into account_status from public.users u where u.user_id=actor for share;
 if account_status is distinct from 'active' then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 select * into delegation from studio.delegations where delegation_id=target;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into project from studio.projects where project_id=delegation.project_id;
 select * into current_state from studio.execution_controls where delegation_id=target for update;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 if actor is distinct from delegation.requester and actor is distinct from project.owner_user_id then
  raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into prior from studio.execution_control_events where request_id=request_uuid;
 if found then
  if prior.delegation_id<>target or prior.actor_id<>actor or prior.operation<>'RELEASE' or prior.request_payload<>p_input then
   raise exception 'STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT';end if;
  if current_state.version<>(prior.result_state->>'version')::bigint then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
  return prior.result_state;
 end if;
 if current_state.version<>expected then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
 if p_input->>'inputDigest' is distinct from delegation.request_hash
  or p_input->>'policyVersion' is distinct from delegation.policy_version then raise exception 'STUDIO_EXECUTION_BINDING_MISMATCH';end if;
 if current_state.external_attempted or current_state.unknown_cost or current_state.spent_cost>0
  or current_state.reserved_cost<=0 or exists(select from studio.execution_receipts where delegation_id=target) then
  raise exception 'STUDIO_EXECUTION_RECONCILIATION_REQUIRED';end if;
 if current_state.revoked_at is null then
  if current_state.state<>'LEASED' or p_input->>'leaseId' is distinct from current_state.lease_id::text then
   raise exception 'STUDIO_EXECUTION_LEASE_STALE';end if;
 else
  if current_state.state<>'REVOKED' or p_input->>'leaseId' is not null then
   raise exception 'STUDIO_EXECUTION_REVOKED';end if;
 end if;
 perform set_config('mohen.execution_cost_action','RELEASE',true);
 update studio.execution_controls set reserved_cost=0,
  state=case when revoked_at is not null then 'REVOKED' else 'HOLD' end,
  lease_id=null,lease_owner=null,lease_expires_at=null,version=version+1,updated_at=clock_timestamp(),
  checkpoint_payload=checkpoint_payload||jsonb_build_object('budget_release',jsonb_build_object('reason',p_input->>'reason','request_id',request_uuid,'released_at',clock_timestamp()))
  where delegation_id=target returning * into current_state;
 perform set_config('mohen.execution_cost_action','',true);
 response:=to_jsonb(current_state)||jsonb_build_object('reserved_cost',current_state.reserved_cost::text,'spent_cost',current_state.spent_cost::text);
 insert into studio.execution_control_events(delegation_id,request_id,actor_id,operation,request_payload,result_state)
 values(target,request_uuid,actor,'RELEASE',p_input,response);
 return response;
end $$;
alter function studio.release_execution_budget(jsonb) owner to mohen_execution_authority;
revoke all on function studio.release_execution_budget(jsonb) from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
grant execute on function studio.release_execution_budget(jsonb) to mohen_app_runtime;

create or replace function studio.reconcile_execution_cost(p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 actor uuid; target uuid; request_uuid uuid; receipt_uuid uuid; delegation studio.delegations; project studio.projects;
 current_state studio.execution_controls; prior studio.execution_control_events; receipt studio.execution_receipts;
 expected bigint; manifest jsonb; decision jsonb; usage jsonb; pricing jsonb; estimate jsonb; account_status text;
 prompt_tokens bigint; completion_tokens bigint; total_tokens bigint; input_rate numeric; output_rate numeric;
 calculated numeric(14,6); overrun boolean; response jsonb;
begin
 actor:=control.current_app_user_id();
 if actor is null then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 if jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>16384
  or jsonb_object_length(p_input)<>6
  or not (p_input ?& array['delegationId','requestId','expectedVersion','inputDigest','policyVersion','receiptId'])
  or coalesce(p_input->>'delegationId','') !~* '^[a-f0-9-]{36}$'
  or coalesce(p_input->>'requestId','') !~* '^[a-f0-9-]{36}$'
  or coalesce(p_input->>'receiptId','') !~* '^[a-f0-9-]{36}$'
  or jsonb_typeof(p_input->'expectedVersion') is distinct from 'number'
  or coalesce(p_input->>'expectedVersion','') !~ '^[0-9]{1,16}$'
  or (p_input->>'expectedVersion')::numeric>9007199254740991
  or coalesce(p_input->>'inputDigest','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_input->>'policyVersion','')='' or length(p_input->>'policyVersion')>128 then
  raise exception 'STUDIO_EXECUTION_INVALID';end if;
 target:=(p_input->>'delegationId')::uuid;request_uuid:=(p_input->>'requestId')::uuid;
 receipt_uuid:=(p_input->>'receiptId')::uuid;expected:=(p_input->>'expectedVersion')::bigint;
 perform pg_advisory_xact_lock(hashtextextended(request_uuid::text,0));
 select u.status into account_status from public.users u where u.user_id=actor for share;
 if account_status is distinct from 'active' then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 select * into delegation from studio.delegations where delegation_id=target;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into project from studio.projects where project_id=delegation.project_id;
 select * into current_state from studio.execution_controls where delegation_id=target for update;
 if not found then raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 if actor is distinct from delegation.requester and actor is distinct from project.owner_user_id then
  raise exception 'STUDIO_EXECUTION_NOT_FOUND';end if;
 select * into prior from studio.execution_control_events where request_id=request_uuid;
 if found then
  if prior.delegation_id<>target or prior.actor_id<>actor or prior.operation<>'RECONCILE' or prior.request_payload<>p_input then
   raise exception 'STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT';end if;
  if current_state.version<>(prior.result_state->>'version')::bigint then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
  return prior.result_state;
 end if;
 if current_state.version<>expected then raise exception 'STUDIO_EXECUTION_VERSION_CONFLICT';end if;
 if p_input->>'inputDigest' is distinct from delegation.request_hash
  or p_input->>'policyVersion' is distinct from delegation.policy_version then raise exception 'STUDIO_EXECUTION_BINDING_MISMATCH';end if;
 if not current_state.external_attempted or not current_state.unknown_cost or current_state.reserved_cost<=0
  or current_state.state not in ('IN_FLIGHT','HOLD','REVOKED') then
  raise exception 'STUDIO_EXECUTION_RECONCILIATION_REQUIRED';end if;
 select * into receipt from studio.execution_receipts where receipt_id=receipt_uuid and delegation_id=target;
 if not found then raise exception 'STUDIO_EXECUTION_RECEIPT_REQUIRED';end if;
 manifest:=receipt.result_manifest;decision:=delegation.transfer_rights_decision;
 usage:=manifest->'usage';pricing:=manifest->'pricing';estimate:=manifest->'cost_estimate';
 if receipt.request_hash is distinct from delegation.request_hash or receipt.result_hash is null
  or receipt.acceptance_state is distinct from 'HOLD'
  or receipt.cost_confidence is distinct from 'ESTIMATED'
  or receipt.cost is null or receipt.currency is distinct from delegation.currency
  or receipt.actual_provider is distinct from delegation.provider
  or receipt.actual_engine_version is distinct from delegation.engine_version
  or receipt.started_at is null or receipt.finished_at is null
  or manifest->>'schema' is distinct from 'mohen.provider-execution-result.v1'
  or manifest->>'delegation_request_hash' is distinct from delegation.request_hash
  or manifest->>'provider' is distinct from delegation.provider
  or manifest->>'engine_version' is distinct from delegation.engine_version
  or manifest->>'purpose' is distinct from decision->>'purpose'
  or manifest->>'pricing_policy_version' is distinct from decision->>'pricing_policy_version'
  or coalesce(manifest->>'input_digest','') !~ '^[a-f0-9]{64}$'
  or coalesce(manifest->>'output_digest','') !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(usage) is distinct from 'object'
  or coalesce(usage->>'prompt_tokens','') !~ '^[0-9]{1,12}$'
  or coalesce(usage->>'completion_tokens','') !~ '^[0-9]{1,12}$'
  or coalesce(usage->>'total_tokens','') !~ '^[0-9]{1,12}$'
  or jsonb_typeof(pricing) is distinct from 'object'
  or pricing->>'version' is distinct from decision->>'pricing_policy_version'
  or pricing->>'currency' is distinct from delegation.currency
  or pricing->>'provider' is distinct from delegation.provider
  or pricing->>'model' is distinct from delegation.engine_version
  or coalesce(pricing->>'input_per_million','') !~ '^(0|[1-9][0-9]{0,7})(\.[0-9]{1,12})?$'
  or coalesce(pricing->>'output_per_million','') !~ '^(0|[1-9][0-9]{0,7})(\.[0-9]{1,12})?$'
  or jsonb_typeof(estimate) is distinct from 'object'
  or coalesce(estimate->>'amount','') !~ '^(0|[1-9][0-9]{0,7})(\.[0-9]{1,6})?$'
  or estimate->>'currency' is distinct from delegation.currency then
  raise exception 'STUDIO_EXECUTION_COST_UNVERIFIED';end if;
 prompt_tokens:=(usage->>'prompt_tokens')::bigint;
 completion_tokens:=(usage->>'completion_tokens')::bigint;
 total_tokens:=(usage->>'total_tokens')::bigint;
 if total_tokens<>prompt_tokens+completion_tokens then raise exception 'STUDIO_EXECUTION_COST_UNVERIFIED';end if;
 input_rate:=(pricing->>'input_per_million')::numeric;
 output_rate:=(pricing->>'output_per_million')::numeric;
 calculated:=round((prompt_tokens*input_rate+completion_tokens*output_rate)/1000000,6);
 if calculated is distinct from receipt.cost or calculated is distinct from (estimate->>'amount')::numeric then
  raise exception 'STUDIO_EXECUTION_COST_UNVERIFIED';end if;
 overrun:=receipt.cost>current_state.reserved_cost or current_state.spent_cost+receipt.cost>delegation.budget_limit;
 perform set_config('mohen.execution_cost_action','RECONCILE',true);
 update studio.execution_controls set state=case when revoked_at is not null then 'REVOKED' else 'HOLD' end,
  unknown_cost=false,reserved_cost=0,spent_cost=spent_cost+receipt.cost,
  lease_id=null,lease_owner=null,lease_expires_at=null,version=version+1,updated_at=clock_timestamp(),
  checkpoint_payload=checkpoint_payload||jsonb_build_object('cost_reconciliation',jsonb_build_object(
   'receipt_id',receipt.receipt_id,'cost',receipt.cost::text,'currency',receipt.currency,
   'cost_confidence','ESTIMATED','pricing_policy_version',decision->>'pricing_policy_version',
   'budget_overrun',overrun,'reconciled_at',clock_timestamp()))
  where delegation_id=target returning * into current_state;
 perform set_config('mohen.execution_cost_action','',true);
 response:=to_jsonb(current_state)||jsonb_build_object('reserved_cost',current_state.reserved_cost::text,
  'spent_cost',current_state.spent_cost::text,'budget_overrun',overrun,'reconciled_receipt_id',receipt.receipt_id);
 insert into studio.execution_control_events(delegation_id,request_id,actor_id,operation,request_payload,result_state)
 values(target,request_uuid,actor,'RECONCILE',p_input,response);
 return response;
end $$;
alter function studio.reconcile_execution_cost(jsonb) owner to mohen_execution_authority;
revoke all on function studio.reconcile_execution_cost(jsonb) from public,mohen_app_runtime,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
grant execute on function studio.reconcile_execution_cost(jsonb) to mohen_app_runtime;

commit;
