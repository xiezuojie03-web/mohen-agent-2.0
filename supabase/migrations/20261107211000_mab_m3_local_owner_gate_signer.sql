-- M5 (MAB 3): a dedicated LOCAL-ONLY login the Owner may use as the independent
-- Gate signer for G0..G5. The login is a member of mohen_gate_signer (so the
-- signer identity guard accepts it) but NOINHERIT, so it inherits nothing: the
-- two Gate functions are granted to it explicitly and nothing else.
--
-- Deliberate exclusions: no membership in mohen_producer, mohen_app_runtime or
-- mohen_gate_authority (gate-authority-repository.mjs rejects such connections),
-- no direct write privilege on control.gate_audits / control.invalidation_events.
-- Signing only ever happens through the SECURITY DEFINER function
-- control.sign_gate_candidate, and revocation only through
-- control.revoke_gate_qualification. The password is set later by
-- tools/provision-3-gate-authority.mjs and is never stored in this file.
begin;

do $$ begin
  if not exists(select from pg_roles where rolname = 'mohen_gate_signer_m5_owner') then
    create role mohen_gate_signer_m5_owner login nocreatedb nocreaterole nosuperuser noinherit;
  end if;
  if exists(select from pg_roles where rolname = 'mohen_gate_signer_m5_owner'
    and (rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication)) then
    raise exception 'UNSAFE_OWNER_SIGNER_ROLE';
  end if;
  if exists(select from pg_auth_members where member = 'mohen_gate_signer_m5_owner'::regrole
    and roleid in ('mohen_producer'::regrole,'mohen_app_runtime'::regrole,'mohen_gate_authority'::regrole)) then
    raise exception 'OWNER_SIGNER_MEMBERSHIP_INVALID';
  end if;
end $$;

-- Membership is the identity signal only (pg_has_role(...,'MEMBER')); NOINHERIT
-- means it confers no privilege by itself.
grant mohen_gate_signer to mohen_gate_signer_m5_owner;

grant usage on schema control, public to mohen_gate_signer_m5_owner;

revoke all on control.gate_audits, control.invalidation_events, control.gate_candidates,
  control.qualification_current, control.gate_policy_versions, control.gate_reviewer_bindings,
  control.gate_service_credentials from mohen_gate_signer_m5_owner;

grant execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)
  to mohen_gate_signer_m5_owner;
grant execute on function control.revoke_gate_qualification(uuid,uuid,text)
  to mohen_gate_signer_m5_owner;

commit;
