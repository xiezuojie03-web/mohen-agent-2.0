-- M5 Batch-04: fix function ACL on the already installed managed PG17 K3
-- authority schema. No Gate, Reviewer or policy activated; no data backfill.
-- Idempotent permissions correction only. Existing historical audits untouched.
begin;
do $$ begin
 if to_regrole('mohen_gate_authority') is null or
    exists(select from pg_roles where rolname='mohen_gate_authority' and
      (rolcanlogin or rolsuper or rolbypassrls or rolinherit or rolcreaterole or rolcreatedb or rolreplication))
 then raise exception 'UNSAFE_GATE_AUTHORITY_ROLE';end if;
 if exists(select from pg_auth_members m where m.member='mohen_gate_authority'::regrole
   or (m.roleid='mohen_gate_authority'::regrole and not
     (m.member=(select oid from pg_roles where rolname=current_user)
      and m.admin_option and not m.inherit_option and not m.set_option)))
 then raise exception 'UNSAFE_GATE_AUTHORITY_MEMBERSHIP';end if;
 if not (select rolsuper from pg_roles where rolname=current_user) then
   execute format('grant mohen_gate_authority to %I with admin false, inherit false, set true',current_user);
 end if;
end $$;
-- The migration caller has transferred ownership to mohen_gate_authority.
-- Managed PG17 postgres is not superuser: GRANT/REVOKE after ALTER OWNER
-- without SET ROLE can silently warn and leave PUBLIC EXECUTE in place.
-- Execute the final function ACL as the actual function owner.
set local role mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer;
revoke all on function control.current_qualification_is_valid(uuid) from public;
grant execute on function control.current_qualification_is_valid(uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;
revoke all on function control.qualification_allows(uuid,text,text,text,text,jsonb) from public;
grant execute on function control.qualification_allows(uuid,text,text,text,text,jsonb) to mohen_producer,mohen_gate_signer,mohen_app_runtime;
revoke all on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) from public;
grant execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) to mohen_gate_signer;
revoke all on function control.revoke_gate_qualification(uuid,uuid,text) from public;
grant execute on function control.revoke_gate_qualification(uuid,uuid,text) to mohen_gate_signer;
reset role;

do $$ begin
 if not (select rolsuper from pg_roles where rolname=current_user) then
   execute format('revoke mohen_gate_authority from %I granted by %I',current_user,current_user);
 end if;
 if exists(select from pg_auth_members m where m.member='mohen_gate_authority'::regrole
   or (m.roleid='mohen_gate_authority'::regrole and not
     (m.member=(select oid from pg_roles where rolname=current_user)
      and m.admin_option and not m.inherit_option and not m.set_option)))
 then raise exception 'GATE_AUTHORITY_MEMBERSHIP_LEAK';end if;
end $$;
-- Fail the entire transaction if any PUBLIC/Producer function execute
-- privilege survives or the intended signer/reader cannot execute.
do $$ begin
 if has_function_privilege('anon','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
 or has_function_privilege('mohen_producer','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
 or has_function_privilege('mohen_app_runtime','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
 or has_function_privilege('anon','control.artifact_revision_for(text,uuid)','EXECUTE')
 or has_function_privilege('anon','control.current_qualification_is_valid(uuid)','EXECUTE')
 or has_function_privilege('anon','control.qualification_allows(uuid,text,text,text,text,jsonb)','EXECUTE')
 or has_function_privilege('anon','control.revoke_gate_qualification(uuid,uuid,text)','EXECUTE')
 or has_function_privilege('mohen_producer','control.revoke_gate_qualification(uuid,uuid,text)','EXECUTE')
 or not has_function_privilege('mohen_gate_signer','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE')
 or not has_function_privilege('mohen_gate_signer','control.revoke_gate_qualification(uuid,uuid,text)','EXECUTE')
 or not has_function_privilege('mohen_producer','control.qualification_allows(uuid,text,text,text,text,jsonb)','EXECUTE')
 then raise exception 'GATE_AUTHORITY_EXECUTE_ACL_LEAK';end if;
end $$;
commit;
