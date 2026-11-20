import assert from 'node:assert/strict';
import test from 'node:test';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {resolveD00ApprovedRun} from '../../pipelines/data-production/orchestrator/d00-approved-run.mjs';

test('a pinned D00 run is available only for the approved canonical input',()=>{
 const input={research_intent:'fixture',scope:{original_id:'fixture'},consumer_method_plan:{methods:[{method_id:"C02",method_version:"v1"}]}};
 const runId='56ce4a31-df35-4b24-911d-b899202e0775';
 const approval=JSON.stringify({runId,inputDigest:executionDigest({...input,consumer_method_plan:input.consumer_method_plan.methods})});
 assert.equal(resolveD00ApprovedRun(undefined,input),null);
 assert.equal(resolveD00ApprovedRun(approval,input),runId);
 assert.throws(()=>resolveD00ApprovedRun(approval,{...input,scope:{original_id:'other'}}),/MISMATCH/);
 assert.throws(()=>resolveD00ApprovedRun('bad',input),/INVALID/);
});

test('a Studio-approved digest also authorizes the CLI-decoded method plan',async()=>{
 const {randomUUID,generateKeyPairSync}=await import('node:crypto');
 const {readMethodPlanArg}=await import('../../tools/lib/method-plan-input.mjs');
 const {buildSourceIntakeInput}=await import('../../pipelines/data-production/orchestrator/orchestrator.mjs');
 const {createD00ExecutionAuthorizer}=await import('../../pipelines/data-production/orchestrator/d00-execution-authorizer.mjs');
 const runId=randomUUID();
 const studio={research_intent:'fixture',scope:{page_number:1},consumer_method_plan:{methods:[{method_id:'C02',method_version:'v1'}]}};
 const input=buildSourceIntakeInput({...studio,consumer_method_plan:readMethodPlanArg(JSON.stringify(studio.consumer_method_plan))});
 const inputDigest=executionDigest(input);
 assert.equal(resolveD00ApprovedRun(JSON.stringify({runId,inputDigest}),studio),runId);
 const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
  {stage:'D00',job_id:'d00.source-intake',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 ]};
 const {privateKey}=generateKeyPairSync('ed25519');
 const authorizer=createD00ExecutionAuthorizer({registry,privateKey,
  approval:{runId,inputDigest,registryDigest:executionDigest(registry),holdEpoch:'fixture',authorizedConditions:{evidence:true}},
  journal:{issueOnce:async()=>true,consumeOnce:async()=>true},
 });
 const {token}=await authorizer.issue({stage:'D00',job_id:'d00.source-intake',mode:'attended',run_id:runId,input});
 assert.equal(token.split('.').length,3);
});
