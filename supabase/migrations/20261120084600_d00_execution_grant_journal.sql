begin;

create role mohen_d00_grant_journal nologin noinherit nosuperuser nobypassrls;

create table control.d00_execution_grant_journal (
  run_id uuid primary key,
  binding jsonb not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (jsonb_typeof(binding) = 'object'),
  check ((binding->>'run_id' = run_id::text
      and binding->>'stage' = 'D00'
      and binding->>'job_id' = 'd00.source-intake'
      and binding->>'mode' = 'attended') is true)
);

revoke all on control.d00_execution_grant_journal from public, anon, authenticated, service_role;
alter table control.d00_execution_grant_journal enable row level security;
grant usage on schema control to mohen_d00_grant_journal;
grant select on control.d00_execution_grant_journal to mohen_d00_grant_journal;
grant insert (run_id, binding, expires_at)
  on control.d00_execution_grant_journal to mohen_d00_grant_journal;
grant update (consumed_at) on control.d00_execution_grant_journal to mohen_d00_grant_journal;

create policy d00_grant_journal_read on control.d00_execution_grant_journal
  for select to mohen_d00_grant_journal using (true);
create policy d00_grant_journal_issue on control.d00_execution_grant_journal
  for insert to mohen_d00_grant_journal with check (
    consumed_at is null and expires_at > statement_timestamp()
    and expires_at <= statement_timestamp() + interval '5 minutes'
  );
create policy d00_grant_journal_consume on control.d00_execution_grant_journal
  for update to mohen_d00_grant_journal using (
    consumed_at is null and expires_at > statement_timestamp()
  ) with check (consumed_at = statement_timestamp());

commit;
