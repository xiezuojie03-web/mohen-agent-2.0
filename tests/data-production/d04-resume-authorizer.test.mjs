import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import test from 'node:test';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { createD04ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d04-resume-authorizer.mjs';

const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const runId='44444444-4444-4444-8444-444444444444';
const sha='a'.repeat(64);
const finding={method_id:'A06',finding_type:'bounded_interpretive_finding',
 human_question:'材料记载了什么？',interpretive_statement:'依据合格主张，材料记载了某事。',
 counter_view_or_alternative:['概述性材料，待独立复核。'],missing_evidence:['统计口径'],
 uncertainty:{qualification:'UNASSESSED'},purpose_code:'BE'};
const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D04',
 originalId:'11111111-1111-4111-8111-111111111111',
 claimRevisionId:'55555555-5555-4555-8555-555555555555',finding};
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D03',job_id:'d03.world-construction',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D04',job_id:'d04.humanistic-discovery',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
]};
const inputDigest=executionDigest(input);
const request={run_id:runId,stage:'D04',job_id:'d04.humanistic-discovery',mode:'attended',input,input_digest:inputDigest};
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
 return createD04ResumeAuthorizer({registry,holdEpoch:'d04-resume-epoch',privateKey,journal,
  qualificationChecker:async()=>true,...overrides});
}

test('D04 resume grant is bound to input digest, requires current G3, and is consumed once',async()=>{
 const authority=fixture();
 await assert.rejects(authority.issue({...request,stage:'D03'}),/DENIED/);
 await assert.rejects(authority.issue({...request,input_digest:'f'.repeat(64)}),/DENIED/);
 const issued=await Promise.allSettled([authority.issue(request),authority.issue(request)]);
 const fulfilled=issued.filter(r=>r.status==='fulfilled');
 assert.equal(fulfilled.length,1);
 const {token}=fulfilled[0].value;
 const [header,payload,signature]=token.split('.');
 assert.ok(verify(null,Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(claims.stage,'D04');
 assert.equal(claims.job_id,'d04.humanistic-discovery');
 assert.equal(claims.input_digest,inputDigest);
 const replay={jti:claims.jti,run_id:runId,stage:'D04',job_id:'d04.humanistic-discovery',mode:'attended',
  hold_epoch:'d04-resume-epoch',registry_digest:executionDigest(registry),input_digest:inputDigest};
 const results=await Promise.allSettled([authority.consume(replay),authority.consume(replay)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='fulfilled').value.consumed_nonce,claims.jti);
 // A D04 grant is never consumable through the D03 binding.
 await assert.rejects(authority.consume({...replay,stage:'D03'}),/DENIED/);
});

test('D04 resume grant is denied when the current G3 does not qualify the input',async()=>{
 const authority=fixture({qualificationChecker:async()=>false});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D04 resume grant fails closed when the qualification check throws',async()=>{
 const authority=fixture({qualificationChecker:async()=>{throw Error('reader unavailable');}});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D04 resume authorizer rejects a missing D04 policy and a rejected journal',async()=>{
 assert.throws(()=>fixture({registry:{...registry,jobs:registry.jobs.filter(j=>j.stage!=='D04')}}),/CONFIG/);
 const authority=fixture({journal:{issueOnce:async()=>false,consumeOnce:async()=>false}});
 await assert.rejects(authority.issue(request),/DENIED/);
});
