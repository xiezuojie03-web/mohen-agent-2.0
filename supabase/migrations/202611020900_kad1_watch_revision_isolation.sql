-- KAD1 DESIGN TARGET, NOT APPLIED. Requires the three existing K3 migrations.
-- Reuses watch_sessions, preserves legacy rows, never assigns them to an arbitrary user.
begin;
lock table public.watch_sessions in access exclusive mode;
alter table public.watch_sessions add column if not exists watch_session_id uuid default gen_random_uuid();
alter table public.watch_sessions add column if not exists owner_user_id uuid references public.users(user_id);
alter table public.watch_sessions add column if not exists revision_id uuid references publication.work_revisions(revision_id);
do $$ declare k record;begin
 for k in select conname from pg_constraint where conrelid='public.watch_sessions'::regclass and contype='p' loop
  execute format('alter table public.watch_sessions drop constraint %I',k.conname);
 end loop;
end $$;
alter table public.watch_sessions alter column watch_session_id set not null;
alter table public.watch_sessions add primary key(watch_session_id);
create unique index if not exists kad1_watch_owner_revision on public.watch_sessions(owner_user_id,work_id,revision_id)
 where owner_user_id is not null and revision_id is not null;
alter table public.watch_sessions enable row level security;
revoke all on public.watch_sessions from public;
do $$ declare n text;begin foreach n in array array['anon','authenticated'] loop
 if exists(select from pg_roles where rolname=n) then execute format('revoke all on public.watch_sessions from %I',n);end if;
end loop;end $$;
grant select,insert,update on public.watch_sessions to mohen_app_runtime;
drop policy if exists kad1_watch_owner on public.watch_sessions;
create policy kad1_watch_owner on public.watch_sessions to mohen_app_runtime
 using(owner_user_id=control.current_app_user_id()) with check(owner_user_id=control.current_app_user_id());
drop policy if exists kad1_watch_boundary on public.watch_sessions;
create policy kad1_watch_boundary on public.watch_sessions as restrictive to mohen_app_runtime
 using(owner_user_id=control.current_app_user_id()) with check(owner_user_id=control.current_app_user_id());
commit;
