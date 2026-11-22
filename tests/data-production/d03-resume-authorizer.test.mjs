import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import test from 'node:test';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { createD03ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d03-resume-authorizer.mjs';

const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const runId='33333333-3333-4333-8333-333333333333';
const sha='a'.repeat(64);
const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D03',
 originalId:'11111111-1111-4111-8111-111111111111',evidenceId:'44444444-4444-4444-8444-444444444444',
 claim:{assertion:'《松江府志》记载青浦县低田均科。',change_type:'taxation_quota_assessment',
  time_scope:{note:'dating unresolved',qualification:'UNASSESSED'},support_type:'supports'}};
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D00',job_id:'d00.source-intake',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D01',job_id:'d01.carrier-reading',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D02',job_id:'d02.material-understanding',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D03',job_id:'d03.world-construction',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
]};
const inputDigest=executionDigest(input);
const request={run_id:runId,stage:'D03',job_id:'d03.world-construction',mode:'attended',input,input_digest:inputDigest};
function fixture(overrides={}){
 let issued,used=false;
 const journal={
  issueOnce:async grant=>{if(issued)return false;issued=grant;return true;},
  consumeOnce:async(grant,now)=>{
   const {exp:_e,...onlyBinding}=issued??{};
   if(used||!issued||issued.exp<=now||
      JSON.stringify(Object.keys(onlyBinding).sort().reduce((o,k)=>(o[k]=onlyBinding[k],o),{}))!==
      JSON.stringify(Object.keys(grant).sort().reduce((o,k)=>(o[k]=grant[k],o),{})))return false;
   used=true;return true;
  },
 };
 return createD03ResumeAuthorizer({registry,holdEpoch:'d03-resume-epoch',privateKey,journal,
  qualificationChecker:async()=>true,...overrides});
}

test('D03 resume grant is bound to input digest, requires current G2, and is consumed once',async()=>{
 const authority=fixture();
 await assert.rejects(authority.issue({...request,stage:'D02'}),/DENIED/);
 await assert.rejects(authority.issue({...request,input_digest:'f'.repeat(64)}),/DENIED/);
 const issued=await Promise.allSettled([authority.issue(request),authority.issue(request)]);
 const fulfilled=issued.filter(r=>r.status==='fulfilled');
 assert.equal(fulfilled.length,1);
 const {token}=fulfilled[0].value;
 const [header,payload,signature]=token.split('.');
 assert.ok(verify(null,Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(claims.stage,'D03');
 assert.equal(claims.job_id,'d03.world-construction');
 assert.equal(claims.input_digest,inputDigest);
 const replay={jti:claims.jti,run_id:runId,stage:'D03',job_id:'d03.world-construction',mode:'attended',
  hold_epoch:'d03-resume-epoch',registry_digest:executionDigest(registry),input_digest:inputDigest};
 const results=await Promise.allSettled([authority.consume(replay),authority.consume(replay)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='fulfilled').value.consumed_nonce,claims.jti);
 // A D03 grant is never consumable through the D01/D02 binding.
 await assert.rejects(authority.consume({...replay,stage:'D02'}),/DENIED/);
});

test('D03 resume grant is denied when the current G2 does not qualify the input',async()=>{
 const authority=fixture({qualificationChecker:async()=>false});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D03 resume grant fails closed when the qualification check throws',async()=>{
 const authority=fixture({qualificationChecker:async()=>{throw Error('reader unavailable');}});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D03 resume authorizer rejects a missing D03 policy and a rejected journal',async()=>{
 assert.throws(()=>fixture({registry:{...registry,jobs:registry.jobs.filter(j=>j.stage!=='D03')}}),/CONFIG/);
 const authority=fixture({journal:{issueOnce:async()=>false,consumeOnce:async()=>false}});
 await assert.rejects(authority.issue(request),/DENIED/);
});
