-- HP02 candidate only. Requires explicit production authorization before apply.
begin;
alter table public.users add column if not exists session_not_before bigint not null default 0
 check(session_not_before>=0);
create table if not exists control.web_session_revocations (
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid not null references public.users(user_id),
 expires_at timestamptz not null,
 revoked_at timestamptz not null default clock_timestamp()
);
create index if not exists web_session_revocations_user on control.web_session_revocations(user_id);
create index if not exists web_session_revocations_expiry on control.web_session_revocations(expires_at);
alter table control.web_session_revocations enable row level security;
revoke all on control.web_session_revocations from public,mohen_producer,mohen_gate_signer,mohen_app_runtime;
do $$declare role_name text;begin
 foreach role_name in array array['anon','authenticated'] loop
  if exists(select from pg_roles where rolname=role_name) then
   execute format('revoke all on control.web_session_revocations from %I',role_name);
  end if;
 end loop;
end $$;
grant select,insert on control.web_session_revocations to mohen_app_runtime;
drop policy if exists web_session_revocation_owner on control.web_session_revocations;
create policy web_session_revocation_owner on control.web_session_revocations to mohen_app_runtime
 using(user_id=(select control.current_app_user_id()))
 with check(user_id=(select control.current_app_user_id()));

-- Security changes invalidate every earlier browser session, even after re-enable.
-- Invoker trigger adds no new privileged execution surface.
create or replace function control.invalidate_web_sessions_on_account_change() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
 if old.status is distinct from new.status or old.roles is distinct from new.roles
    or old.password_hash is distinct from new.password_hash then
  new.session_not_before=greatest(old.session_not_before+1,
    floor(extract(epoch from clock_timestamp())*1000)::bigint);
 else
  new.session_not_before=greatest(old.session_not_before,new.session_not_before);
 end if;
 return new;
end $$;
revoke all on function control.invalidate_web_sessions_on_account_change() from public;
drop trigger if exists invalidate_web_sessions_on_account_change on public.users;
create trigger invalidate_web_sessions_on_account_change before update on public.users
 for each row execute function control.invalidate_web_sessions_on_account_change();
commit;
