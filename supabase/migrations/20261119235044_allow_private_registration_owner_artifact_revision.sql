do $temporary_authority_membership$
begin
  if not (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant mohen_gate_authority to %I with admin false, inherit false, set true',current_user);
  end if;
end $temporary_authority_membership$;

set local role mohen_gate_authority;
grant execute on function control.artifact_revision_for(text, uuid) to postgres;
reset role;

do $restore_authority_membership$
begin
  if not (select rolsuper from pg_roles where rolname=current_user) then
    execute format('revoke mohen_gate_authority from %I granted by %I',current_user,current_user);
  end if;
end $restore_authority_membership$;

do $verify_private_registration_acl$
begin
  if not has_function_privilege('postgres','control.artifact_revision_for(text,uuid)','EXECUTE')
    or has_function_privilege('mohen_app_runtime','control.artifact_revision_for(text,uuid)','EXECUTE')
    or has_function_privilege('anon','control.artifact_revision_for(text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','control.artifact_revision_for(text,uuid)','EXECUTE') then
    raise exception 'PRIVATE_REGISTRATION_ARTIFACT_REVISION_ACL_UNSAFE';
  end if;
end $verify_private_registration_acl$;
