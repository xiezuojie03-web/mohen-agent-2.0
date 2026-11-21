begin;

-- Retry support for resumed D01 grants. The issue statement now performs
-- "on conflict (run_id) do update" to overwrite a previously-consumed grant,
-- which needs UPDATE on binding/expires_at plus a dedicated reissue policy
-- (the consume policy's with_check pins consumed_at = now() and would reject
-- a re-issue that clears it).
grant update (binding, expires_at) on control.d01_resume_grant_journal to mohen_d00_grant_journal;

create policy d01_resume_grant_journal_reissue on control.d01_resume_grant_journal
  for update to mohen_d00_grant_journal
  using (consumed_at is not null)
  with check (consumed_at is null and expires_at > statement_timestamp()
    and expires_at <= statement_timestamp() + interval '5 minutes');

commit;
