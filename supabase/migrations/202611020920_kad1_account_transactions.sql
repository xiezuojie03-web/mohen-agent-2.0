-- KAD1 design target: transactionally serialize role/status changes. No new identity system.
begin;
create or replace function control.kad1_change_account(p_actor uuid,p_id uuid,p_roles text[],p_status text) returns text
language plpgsql security definer set search_path=pg_catalog as $$
declare actor_roles text[];old_roles text[];old_status text;role_name text;
begin
 perform pg_advisory_xact_lock(hashtextextended('mohen.account-role-change',0));
 if control.current_app_user_id() is distinct from p_actor then return 'forbidden';end if;
 select roles into actor_roles from public.users where user_id=p_actor and status='active' for update;
 if actor_roles is null or not ('operator'=any(actor_roles)) then return 'operator_required';end if;
 if p_actor=p_id then return 'self_change_forbidden';end if;
 select roles,status into old_roles,old_status from public.users where user_id=p_id for update;
 if not found then return 'not_found';end if;
 if p_roles is not null then
  if cardinality(p_roles)=0 or not p_roles <@ array['member','creator','operator','reviewer']::text[] then return 'invalid_roles';end if;
  if ('reviewer'=any(old_roles)) is distinct from ('reviewer'=any(p_roles)) and not 'reviewer'=any(actor_roles) then return 'reviewer_change_requires_reviewer';end if;
 end if;
 if p_status is not null and p_status not in ('active','disabled') then return 'invalid_status';end if;
 if p_status='disabled' and 'reviewer'=any(old_roles) and not 'reviewer'=any(actor_roles) then return 'reviewer_change_requires_reviewer';end if;
 foreach role_name in array array['operator','reviewer'] loop
  if old_status='active' and role_name=any(old_roles) and (p_status='disabled' or (p_roles is not null and not role_name=any(p_roles)))
   and (select count(*) from public.users where status='active' and role_name=any(roles))<=1 then return 'last_'||role_name;end if;
 end loop;
 update public.users set roles=coalesce(p_roles,roles),status=coalesce(p_status,status),updated_at=now() where user_id=p_id;
 return 'ok';
end $$;
alter function control.kad1_change_account(uuid,uuid,text[],text) owner to mohen_gate_authority;
grant update on public.users to mohen_gate_authority;
revoke all on function control.kad1_change_account(uuid,uuid,text[],text) from public;
grant execute on function control.kad1_change_account(uuid,uuid,text[],text) to mohen_app_runtime;
commit;
