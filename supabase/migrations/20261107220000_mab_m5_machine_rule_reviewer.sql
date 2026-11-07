-- MAB M5 (LOCAL ISOLATED ONLY): machine rule-reviewer identity for G0..G5.
-- Scope: one deterministic, independent reviewer account plus one dedicated
-- NOINHERIT signer login. It may READ the exact artifacts it must verify and
-- EXECUTE the existing signing functions; it may never write gate rows itself.
-- No second Gate/audit write path is introduced: signing still goes through
-- control.sign_gate_candidate only. Production Gate enablement is NOT granted.
begin;

-- 1) Machine reviewer account. Fixed id keeps tooling and bindings deterministic.
do $$ begin
  if exists(select from public.users where email='machine-reviewer@mohen.local'
      and user_id<>'b0a11000-0000-4000-8000-0000000000a1'::uuid)
    then raise exception 'MACHINE_REVIEWER_EMAIL_CONFLICT'; end if;
  if not exists(select from public.users where user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid) then
    insert into public.users(user_id,email,username,password_hash,roles,status)
    values ('b0a11000-0000-4000-8000-0000000000a1'::uuid,'machine-reviewer@mohen.local',
      'machine rule reviewer','machine-reviewer-has-no-interactive-login',array['reviewer'],'active');
  end if;
  if not exists(select from public.users where user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid
      and status='active' and roles @> array['reviewer']::text[])
    then raise exception 'MACHINE_REVIEWER_USER_INVALID'; end if;
end $$;

-- 2) Dedicated independent login: exactly mohen_gate_signer, never the
--    producer/runtime/authority identities and never a privileged role.
do $$ begin
  if not exists(select from pg_roles where rolname='mohen_gate_signer_m5_machine') then
    create role mohen_gate_signer_m5_machine login nocreatedb nocreaterole nosuperuser nobypassrls noinherit;
  end if;
  if exists(select from pg_roles where rolname='mohen_gate_signer_m5_machine'
      and (rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication))
    then raise exception 'UNSAFE_MACHINE_SIGNER_ROLE'; end if;
  if exists(select from pg_auth_members m where m.member='mohen_gate_signer_m5_machine'::regrole
      and m.roleid in ('mohen_producer'::regrole,'mohen_app_runtime'::regrole,'mohen_gate_authority'::regrole))
    then raise exception 'MACHINE_SIGNER_MEMBERSHIP_INVALID'; end if;
end $$;
grant mohen_gate_signer to mohen_gate_signer_m5_machine;

-- 3) Schema usage and the two existing SECURITY DEFINER signer functions.
--    NOINHERIT means inherited grants are unusable, so every needed privilege
--    is granted to the login itself; Gate tables stay write-denied.
grant usage on schema control, public, studio, source, evidence, world, meaning, read_model
  to mohen_gate_signer_m5_machine;
grant execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)
  to mohen_gate_signer_m5_machine;
grant execute on function control.revoke_gate_qualification(uuid,uuid,text)
  to mohen_gate_signer_m5_machine;
grant execute on function control.artifact_revision_for(text,uuid)
  to mohen_gate_signer_m5_machine;
grant execute on function control.current_qualification_is_valid(uuid)
  to mohen_gate_signer_m5_machine;
grant execute on function control.current_app_user_id()
  to mohen_gate_signer_m5_machine;
revoke all on control.gate_audits, control.gate_candidates, control.qualification_current,
  control.invalidation_events, control.gate_policy_versions, control.gate_reviewer_bindings,
  control.gate_service_credentials, control.session_verification_keys
  from mohen_gate_signer_m5_machine;

-- 4) Read-only verification rights. The reviewer must be able to recompute the
--    exact byte/version/evidence chain it signs; nothing here is mutable.
grant select on control.gate_candidates, control.gate_audits, control.qualification_current,
  control.gate_policy_versions, control.gate_reviewer_bindings, control.original_bridge_verification_keys,
  control.production_runs
  to mohen_gate_signer_m5_machine;
grant select on source.sources, source.source_versions, source.raw_items, source.read_units, source.read_runs,
  evidence.material_evidence, evidence.reading_units, evidence.read_unit_evidence_links,
  world.claim_revisions, world.claim_evidence_links, meaning.findings,
  read_model.world_projections
  to mohen_gate_signer_m5_machine;
grant select on studio.private_originals to mohen_gate_signer_m5_machine;

do $$ declare t text; begin
  foreach t in array array[
    'control.gate_candidates','control.gate_audits','control.qualification_current',
    'control.gate_policy_versions','control.gate_reviewer_bindings','control.original_bridge_verification_keys',
    'control.production_runs','source.sources','source.source_versions','source.raw_items','source.read_units',
    'source.read_runs','evidence.material_evidence','evidence.reading_units','evidence.read_unit_evidence_links',
    'world.claim_revisions','world.claim_evidence_links','meaning.findings','read_model.world_projections']
  loop
    execute format('drop policy if exists m5_machine_reviewer_read on %s', t);
    execute format('create policy m5_machine_reviewer_read on %s for select to mohen_gate_signer_m5_machine using(true)', t);
  end loop;
end $$;

-- Private originals stay limited to the single isolated M5 project.
drop policy if exists m5_machine_reviewer_read on studio.private_originals;
create policy m5_machine_reviewer_read on studio.private_originals for select to mohen_gate_signer_m5_machine
  using (project_id = 'b0a11000-0000-4000-8000-000000000001'::uuid);

-- 5) Post-condition: the login must still be unable to mutate Gate state.
do $$ begin
  if has_table_privilege('mohen_gate_signer_m5_machine','control.gate_audits','INSERT,UPDATE,DELETE')
   or has_table_privilege('mohen_gate_signer_m5_machine','control.gate_candidates','INSERT,UPDATE,DELETE')
   or has_table_privilege('mohen_gate_signer_m5_machine','control.qualification_current','INSERT,UPDATE,DELETE')
   or has_table_privilege('mohen_gate_signer_m5_machine','control.invalidation_events','INSERT,UPDATE,DELETE')
    then raise exception 'MACHINE_SIGNER_WRITE_PRIVILEGE_LEAK'; end if;
  if not has_function_privilege('mohen_gate_signer_m5_machine',
      'control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
    then raise exception 'MACHINE_SIGNER_EXECUTE_MISSING'; end if;
  if exists(select from pg_auth_members m where m.member='mohen_gate_signer_m5_machine'::regrole
      and m.roleid in ('mohen_producer'::regrole,'mohen_app_runtime'::regrole,'mohen_gate_authority'::regrole))
    then raise exception 'MACHINE_SIGNER_MEMBERSHIP_INVALID'; end if;
end $$;
commit;
