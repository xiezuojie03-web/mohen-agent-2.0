// Use a dedicated authority connection with access to this journal only.
export function createD00ExecutionJournal(db){
 if(typeof db?.query!=='function')throw Error('D00_EXECUTION_JOURNAL_CONFIG_INVALID');
 return {
  async issueOnce({exp,...binding}){
   const result=await db.query(
    `insert into control.d00_execution_grant_journal (run_id,binding,expires_at)
     select $1::uuid,$2::jsonb,to_timestamp($3)
     where to_timestamp($3) > statement_timestamp()
     on conflict (run_id) do nothing`,
    [binding.run_id,JSON.stringify(binding),exp]);
   return result.rowCount===1;
  },
  async consumeOnce(binding){
   const result=await db.query(
    `update control.d00_execution_grant_journal
     set consumed_at=statement_timestamp()
     where run_id=$1::uuid and binding = $2::jsonb
       and consumed_at is null and expires_at > statement_timestamp()`,
    [binding.run_id,JSON.stringify(binding)]);
   return result.rowCount===1;
  },
 };
}
