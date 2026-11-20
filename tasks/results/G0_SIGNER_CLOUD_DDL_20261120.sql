-- G0 machine signer install for mohen-cloud (real task e03c4ba8).
-- Source: supabase/migrations/20261107220000_mab_m5_machine_rule_reviewer.sql
-- Change vs original: private_originals RLS policy scoped to the REAL project
--   e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5 instead of the synthetic b0a11000...0001.
-- Idempotent. Contains NO credentials. Run in Supabase SQL Editor on mohen-cloud.
begin;

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

drop policy if exists m5_machine_reviewer_read on studio.private_originals;
create policy m5_machine_reviewer_read on studio.private_originals for select to mohen_gate_signer_m5_machine
  using (project_id = 'e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5'::uuid);

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
