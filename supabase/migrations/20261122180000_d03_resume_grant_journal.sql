begin;

-- Independent one-use journal for resumed D03 execution grants. Same additive
-- pattern as control.d02_resume_grant_journal: its own table, its own stage
-- check, the same dedicated journal login (a login per stage would add a secret
-- without adding isolation — the table and stage binding already separate them).
create table if not exists control.d03_resume_grant_journal (
  run_id uuid primary key,
  binding jsonb not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (jsonb_typeof(binding) = 'object'),
  check ((binding->>'run_id' = run_id::text
      and binding->>'stage' = 'D03'
      and binding->>'mode' = 'attended') is true)
);

revoke all on control.d03_resume_grant_journal from public, anon, authenticated, service_role;
alter table control.d03_resume_grant_journal enable row level security;
grant select on control.d03_resume_grant_journal to mohen_d00_grant_journal;
grant insert (run_id, binding, expires_at) on control.d03_resume_grant_journal to mohen_d00_grant_journal;
grant update (consumed_at) on control.d03_resume_grant_journal to mohen_d00_grant_journal;
-- Retry support: a consumed grant may be re-issued (mirrors the D02 journal).
grant update (binding, expires_at) on control.d03_resume_grant_journal to mohen_d00_grant_journal;

create policy d03_resume_grant_journal_read on control.d03_resume_grant_journal
  for select to mohen_d00_grant_journal using (true);
create policy d03_resume_grant_journal_issue on control.d03_resume_grant_journal
  for insert to mohen_d00_grant_journal with check (
    consumed_at is null and expires_at > statement_timestamp()
    and expires_at <= statement_timestamp() + interval '5 minutes'
  );
create policy d03_resume_grant_journal_consume on control.d03_resume_grant_journal
  for update to mohen_d00_grant_journal using (
    consumed_at is null and expires_at > statement_timestamp()
  ) with check (consumed_at = statement_timestamp());
create policy d03_resume_grant_journal_reissue on control.d03_resume_grant_journal
  for update to mohen_d00_grant_journal
  using (consumed_at is not null or expires_at <= statement_timestamp())
  with check (consumed_at is null and expires_at > statement_timestamp()
    and expires_at <= statement_timestamp() + interval '5 minutes');

commit;
