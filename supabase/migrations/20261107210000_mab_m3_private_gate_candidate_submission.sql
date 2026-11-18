-- M5 (MAB 3): the dedicated private producer worker may SUBMIT Gate candidates
-- and READ current qualification. This is Producer-side candidate submission and
-- a read-only qualification projection only.
--
-- It confers NO Gate power: writer rights on control.gate_audits,
-- control.invalidation_events, control.gate_policy_versions and
-- control.gate_reviewer_bindings stay with mohen_gate_authority, and signing
-- remains exclusively behind control.sign_gate_candidate executed by an
-- independent mohen_gate_signer identity (never mohen_private_worker).
begin;

do $private_worker_role$ begin
  if to_regrole('mohen_private_worker') is null then
    create role mohen_private_worker nologin inherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
  end if;
  if exists(select from pg_roles where rolname = 'mohen_private_worker' and (rolsuper or rolbypassrls)) then
    raise exception 'UNSAFE_PRIVATE_WORKER_ROLE';
  end if;
end $private_worker_role$;

-- In the M5 development project the dedicated login may already exist because
-- machine-login activation was applied before this previously-missing role migration.
-- Keep privileges on the NOLOGIN group; the login receives SET-only membership.
do $worker_membership$
begin
  if to_regrole('mohen_m5_worker_login') is not null then
    execute 'grant mohen_private_worker to mohen_m5_worker_login with inherit false, set true';
  end if;
end $worker_membership$;

grant usage on schema control to mohen_private_worker;

-- Candidate submission: INSERT only, and only as itself, and only SUBMITTED.
-- No UPDATE/DELETE: a Producer cannot consume, reject or rewrite a candidate.
revoke insert, update, delete, truncate, references, trigger, select on control.gate_candidates
  from mohen_private_worker;
grant insert on control.gate_candidates to mohen_private_worker;
grant select (candidate_id, producer_identity) on control.gate_candidates to mohen_private_worker;
revoke update, delete, truncate on control.gate_candidates from mohen_private_worker;

-- Read-only qualification projection for dependency snapshots.
revoke all on control.gate_audits, control.qualification_current, control.invalidation_events,
  control.gate_policy_versions, control.gate_reviewer_bindings, control.gate_service_credentials
  from mohen_private_worker;
grant select on control.gate_audits, control.qualification_current to mohen_private_worker;

-- Row level security: the existing producer/authority policies do not cover this
-- role, so explicit least-privilege policies are required for the grants above.
drop policy if exists k3_private_worker_candidate_submission on control.gate_candidates;
create policy k3_private_worker_candidate_submission on control.gate_candidates
  for insert to mohen_private_worker
  with check (producer_identity = current_user and candidate_status = 'SUBMITTED');

drop policy if exists k3_private_worker_candidate_read on control.gate_candidates;
create policy k3_private_worker_candidate_read on control.gate_candidates
  for select to mohen_private_worker
  using (producer_identity = current_user);

drop policy if exists k3_private_worker_gate_audit_read on control.gate_audits;
create policy k3_private_worker_gate_audit_read on control.gate_audits
  for select to mohen_private_worker
  using (consumer = 'producer' and decision_origin = 'independent_gate');

drop policy if exists k3_private_worker_qualification_read on control.qualification_current;
create policy k3_private_worker_qualification_read on control.qualification_current
  for select to mohen_private_worker
  using (consumer = 'producer');

-- Function ACL is owned by mohen_gate_authority on managed PG17. Temporarily
-- SET ROLE to that owner exactly as the existing M5 K3 ACL repair does; never
-- broaden PUBLIC or grant signing/revocation to the private worker.
do $temporary_authority_membership$
begin
  if not (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant mohen_gate_authority to %I with admin false, inherit false, set true',current_user);
  end if;
end $temporary_authority_membership$;
set local role mohen_gate_authority;
grant execute on function control.current_qualification_is_valid(uuid) to mohen_private_worker;
grant execute on function control.qualification_allows(uuid,text,text,text,text,jsonb) to mohen_private_worker;
revoke execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) from mohen_private_worker;
revoke execute on function control.revoke_gate_qualification(uuid,uuid,text) from mohen_private_worker;
reset role;
do $restore_authority_membership$
begin
  if not (select rolsuper from pg_roles where rolname=current_user) then
    execute format('revoke mohen_gate_authority from %I granted by %I',current_user,current_user);
  end if;
end $restore_authority_membership$;
do $verify_private_worker_acl$
begin
  if not has_function_privilege('mohen_private_worker','control.current_qualification_is_valid(uuid)','EXECUTE')
    or not has_function_privilege('mohen_private_worker','control.qualification_allows(uuid,text,text,text,text,jsonb)','EXECUTE')
    or has_function_privilege('mohen_private_worker','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
    or has_function_privilege('mohen_private_worker','control.revoke_gate_qualification(uuid,uuid,text)','EXECUTE')
    or pg_has_role('mohen_private_worker','mohen_gate_authority','MEMBER')
    or pg_has_role('mohen_private_worker','mohen_gate_signer','MEMBER') then
    raise exception 'M5_PRIVATE_WORKER_FUNCTION_ACL_UNSAFE';
  end if;
end $verify_private_worker_acl$;

do $verify_worker_membership$
begin
  if to_regrole('mohen_m5_worker_login') is not null and
    (not pg_has_role('mohen_m5_worker_login','mohen_private_worker','MEMBER')
     or not pg_has_role('mohen_m5_worker_login','mohen_private_worker','SET')) then
    raise exception 'M5_PRIVATE_WORKER_ROLE_MEMBERSHIP_INVALID';
  end if;
end $verify_worker_membership$;

commit;
