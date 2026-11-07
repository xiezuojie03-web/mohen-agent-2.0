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

do $$ begin
  if to_regrole('mohen_private_worker') is null then
    create role mohen_private_worker nologin inherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
  end if;
  if exists(select from pg_roles where rolname = 'mohen_private_worker' and (rolsuper or rolbypassrls)) then
    raise exception 'UNSAFE_PRIVATE_WORKER_ROLE';
  end if;
end $$;

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

grant execute on function control.current_qualification_is_valid(uuid) to mohen_private_worker;
grant execute on function control.qualification_allows(uuid,text,text,text,text,jsonb) to mohen_private_worker;
revoke execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)
  from mohen_private_worker;
revoke execute on function control.revoke_gate_qualification(uuid,uuid,text) from mohen_private_worker;

commit;
