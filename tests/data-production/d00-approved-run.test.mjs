import assert from 'node:assert/strict';
import test from 'node:test';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {resolveD00ApprovedRun} from '../../pipelines/data-production/orchestrator/d00-approved-run.mjs';

test('a pinned D00 run is available only for the approved canonical input',()=>{
 const input={research_intent:'fixture',scope:{original_id:'fixture'},consumer_method_plan:{methods:[]}};
 const runId='56ce4a31-df35-4b24-911d-b899202e0775';
 const approval=JSON.stringify({runId,inputDigest:executionDigest(input)});
 assert.equal(resolveD00ApprovedRun(undefined,input),null);
 assert.equal(resolveD00ApprovedRun(approval,input),runId);
 assert.throws(()=>resolveD00ApprovedRun(approval,{...input,scope:{original_id:'other'}}),/MISMATCH/);
 assert.throws(()=>resolveD00ApprovedRun('bad',input),/INVALID/);
});
