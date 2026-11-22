// Dedicated one-use journal for D05 resume grants. Same additive shape as the
// D01/D02/D03/D04 journals (its own table, its own stage check) so a D05 grant can
// never be consumed through another stage's journal. One grant per run; issue
// exactly once, consume exactly once; a consumed grant may be re-issued for a
// retry, as may a grant that expired unused.
export function createD05ResumeJournal(db) {
  if (typeof db?.query !== 'function') throw Error('D05_RESUME_JOURNAL_CONFIG_INVALID');
  return {
    async issueOnce({ exp, ...binding }) {
      const result = await db.query(
        `insert into control.d05_resume_grant_journal (run_id,binding,expires_at)
         select $1::uuid,$2::jsonb,to_timestamp($3)
         where to_timestamp($3) > statement_timestamp()
         on conflict (run_id) do update
           set binding=excluded.binding, expires_at=excluded.expires_at, consumed_at=null
           where control.d05_resume_grant_journal.consumed_at is not null
              or control.d05_resume_grant_journal.expires_at <= statement_timestamp()`,
        [binding.run_id, JSON.stringify(binding), exp]);
      return result.rowCount === 1;
    },
    async consumeOnce(binding) {
      const result = await db.query(
        `update control.d05_resume_grant_journal
         set consumed_at=statement_timestamp()
         where run_id=$1::uuid and binding = $2::jsonb
           and consumed_at is null and expires_at > statement_timestamp()`,
        [binding.run_id, JSON.stringify(binding)]);
      return result.rowCount === 1;
    },
  };
}
