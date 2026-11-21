// Dedicated one-use journal for D01 resume grants. Separate table from the D00
// journal so D00's immutable (run_id) primary key and stage='D00' check are
// untouched. One grant per run; issue exactly once, consume exactly once.
export function createD01ResumeJournal(db){
 if(typeof db?.query!=='function')throw Error('D01_RESUME_JOURNAL_CONFIG_INVALID');
 return {
  async issueOnce({exp,...binding}){
   // A run may be resumed again after a failed attempt only when its previous
   // grant was already consumed; an unconsumed grant stays one-use and rejects
   // a re-issue (rowCount 0). This keeps grants single-use while allowing retry.
   const result=await db.query(
    `insert into control.d01_resume_grant_journal (run_id,binding,expires_at)
     select $1::uuid,$2::jsonb,to_timestamp($3)
     where to_timestamp($3) > statement_timestamp()
     on conflict (run_id) do update
       set binding=excluded.binding, expires_at=excluded.expires_at, consumed_at=null
       where control.d01_resume_grant_journal.consumed_at is not null`,
    [binding.run_id,JSON.stringify(binding),exp]);
   return result.rowCount===1;
  },
  async consumeOnce(binding){
   const result=await db.query(
    `update control.d01_resume_grant_journal
     set consumed_at=statement_timestamp()
     where run_id=$1::uuid and binding = $2::jsonb
       and consumed_at is null and expires_at > statement_timestamp()`,
    [binding.run_id,JSON.stringify(binding)]);
   return result.rowCount===1;
  },
 };
}
