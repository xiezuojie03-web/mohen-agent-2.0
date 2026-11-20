import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import test from 'node:test';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { createD00ExecutionAuthorizer } from '../../pipelines/data-production/orchestrator/d00-execution-authorizer.mjs';

const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const runId='11111111-1111-4111-8111-111111111111';
const input={scope:{original_id:'original',project_id:'project',root_task_id:'root'}};
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D00',job_id:'d00.source-intake',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
]};
const request={run_id:runId,stage:'D00',job_id:'d00.source-intake',mode:'attended',input};
const approval={runId,inputDigest:executionDigest(input),registryDigest:executionDigest(registry),
 holdEpoch:'approved-epoch',authorizedConditions:{evidence:true}};
function fixture(overrides={}){
 let issued,used=false;
 const journal={
  issueOnce:async grant=>{if(issued)return false;issued=grant;return true;},
  consumeOnce:async(grant,now)=>{if(used||issued?.exp<=now||
   Object.entries(grant).some(([key,value])=>issued?.[key]!==value))return false;used=true;return true;},
 };
 return createD00ExecutionAuthorizer({registry,approval,privateKey,journal,...overrides});
}

test('one Ed25519 D00 grant is bound to the approved input and consumed once',async()=>{
 const authority=fixture();
 await assert.rejects(authority.issue({...request,stage:'D01'}),/DENIED/);
 await assert.rejects(authority.issue({...request,input:{scope:{original_id:'other'}}}),/DENIED/);
 const issued=await Promise.allSettled([authority.issue(request),authority.issue(request)]);
 const [grant]=issued.filter(result=>result.status==='fulfilled');
 assert.equal(issued.filter(result=>result.status==='fulfilled').length,1);
 const [header,payload,signature]=grant.value.token.split('.');
 assert.ok(verify(null,Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url'));
 const {jti,run_id,stage,job_id,mode,hold_epoch,registry_digest,input_digest}=claims;
 const replay={jti,run_id,stage,job_id,mode,hold_epoch,registry_digest,input_digest};
 await assert.rejects(authority.consume({...replay,input_digest:'x'}),/DENIED/);
 const results=await Promise.allSettled([authority.consume(replay),authority.consume(replay)]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 assert.equal(results.find(result=>result.status==='fulfilled').value.consumed_nonce,jti);
});

test('requires independently approved conditions and fails closed on ledger rejection',async()=>{
 assert.throws(()=>fixture({approval:{...approval,authorizedConditions:{}}}),/CONFIG/);
 const authority=fixture({journal:{issueOnce:async()=>false,consumeOnce:async()=>false}});
 await assert.rejects(authority.issue(request),/DENIED/);
});
