import assert from 'node:assert/strict';
import test from 'node:test';
import {createD00ExecutionJournal} from '../../pipelines/data-production/orchestrator/d00-execution-journal.mjs';

test('journal writes and consumes a complete binding with atomic statements',async()=>{
 const calls=[];
 const db={query:async(sql,params)=>{calls.push({sql,params});return {rowCount:calls.length===1?1:0};}};
 const journal=createD00ExecutionJournal(db);
 const grant={run_id:'run',stage:'D00',job_id:'job',mode:'attended',hold_epoch:'epoch',
  registry_digest:'registry',input_digest:'input',jti:'nonce',exp:250};
 const {exp,...binding}=grant;
 assert.equal(await journal.issueOnce(grant),true);
 assert.equal(await journal.consumeOnce(binding,200),false);
 assert.match(calls[0].sql,/on conflict \(run_id\) do nothing/i);
 assert.deepEqual(calls[0].params,['run',JSON.stringify(binding),250]);
 assert.match(calls[1].sql,/consumed_at is null/i);
 assert.match(calls[1].sql,/binding = \$2::jsonb/i);
 assert.match(calls[1].sql,/expires_at > statement_timestamp\(\)/i);
 assert.deepEqual(calls[1].params,['run',JSON.stringify(binding)]);
});
