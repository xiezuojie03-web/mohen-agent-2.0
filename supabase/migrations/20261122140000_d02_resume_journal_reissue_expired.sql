begin;

-- Retry support for D02 grants that expired unused. A grant issued for an
-- attempt that failed before live consumption (for example a client-side
-- signature check) left the row unconsumed; the original reissue policy only
-- allowed overwriting a CONSUMED grant, so that run could never be retried.
-- Replacing an EXPIRED grant cannot widen single-use semantics: consume still
-- requires expires_at > statement_timestamp().
drop policy if exists d02_resume_grant_journal_reissue on control.d02_resume_grant_journal;

create policy d02_resume_grant_journal_reissue on control.d02_resume_grant_journal
  for update to mohen_d00_grant_journal
  using (consumed_at is not null or expires_at <= statement_timestamp())
  with check (consumed_at is null and expires_at > statement_timestamp()
    and expires_at <= statement_timestamp() + interval '5 minutes');

commit;
