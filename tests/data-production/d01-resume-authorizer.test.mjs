import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import test from 'node:test';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { createD01ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d01-resume-authorizer.mjs';

const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const runId='22222222-2222-4222-8222-222222222222';
const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:'11111111-1111-4111-8111-111111111111',
 page:{kind:'scanned_page/v1',page_number:1,source_version_id:'33333333-3333-4333-8333-333333333333'}};
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D00',job_id:'d00.source-intake',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D01',job_id:'d01.private-evidence-read',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
]};
const inputDigest=executionDigest(input);
const request={run_id:runId,stage:'D01',job_id:'d01.private-evidence-read',mode:'attended',input,input_digest:inputDigest};
function fixture(overrides={}){
 let issued,used=false;
 const journal={
  issueOnce:async grant=>{if(issued)return false;issued=grant;return true;},
  // Mirror the real SQL `binding = $2::jsonb` exact match: issueOnce stores
  // {exp,...binding}; consumeOnce must send the identical binding object.
  consumeOnce:async(grant,now)=>{
   const {exp:_e,...onlyBinding}=issued??{};
   if(used||!issued||issued.exp<=now||
      JSON.stringify(Object.keys(onlyBinding).sort().reduce((o,k)=>(o[k]=onlyBinding[k],o),{}))!==
      JSON.stringify(Object.keys(grant).sort().reduce((o,k)=>(o[k]=grant[k],o),{})))return false;
   used=true;return true;
  },
 };
 return createD01ResumeAuthorizer({registry,holdEpoch:'d01-resume-epoch',privateKey,journal,
  qualificationChecker:async()=>true,...overrides});
}

test('D01 resume grant is bound to input digest, requires G0 current, and is consumed once',async()=>{
 const authority=fixture();
 await assert.rejects(authority.issue({...request,stage:'D00'}),/DENIED/);
 await assert.rejects(authority.issue({...request,input_digest:'f'.repeat(64)}),/DENIED/);
 const issued=await Promise.allSettled([authority.issue(request),authority.issue(request)]);
 const fulfilled=issued.filter(r=>r.status==='fulfilled');
 assert.equal(fulfilled.length,1);
 const {token}=fulfilled[0].value;
 const [header,payload,signature]=token.split('.');
 assert.ok(verify(null,Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(claims.stage,'D01');
 assert.equal(claims.job_id,'d01.private-evidence-read');
 assert.equal(claims.input_digest,inputDigest);
 const replay={jti:claims.jti,run_id:runId,stage:'D01',job_id:'d01.private-evidence-read',mode:'attended',
  hold_epoch:'d01-resume-epoch',registry_digest:executionDigest(registry),input_digest:inputDigest};
 const results=await Promise.allSettled([authority.consume(replay),authority.consume(replay)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='fulfilled').value.consumed_nonce,claims.jti);
});

test('D01 resume grant is denied when upstream G0 is not current',async()=>{
 const authority=fixture({qualificationChecker:async()=>false});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D01 resume grant fails closed when qualification check throws',async()=>{
 const authority=fixture({qualificationChecker:async()=>{throw Error('reader unavailable');}});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D01 resume authorizer rejects missing conditions and ledger rejection',async()=>{
 assert.throws(()=>fixture({registry:{...registry,jobs:[registry.jobs[0]]}}),/CONFIG/);
 const authority=fixture({journal:{issueOnce:async()=>false,consumeOnce:async()=>false}});
 await assert.rejects(authority.issue(request),/DENIED/);
});
