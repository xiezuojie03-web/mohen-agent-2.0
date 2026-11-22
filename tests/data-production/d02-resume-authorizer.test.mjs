import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import test from 'node:test';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { createD02ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d02-resume-authorizer.mjs';

const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const runId='22222222-2222-4222-8222-222222222222';
const sha='a'.repeat(64);
const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D02',
 originalId:'11111111-1111-4111-8111-111111111111',readUnitId:'44444444-4444-4444-8444-444444444444',
 reading:{schema:'mohen.qualified-private-reading.v1',run_id:runId,
  project_id:'55555555-5555-4555-8555-555555555555',root_task_id:'66666666-6666-4666-8666-666666666666',
  gate_audit_id:'77777777-7777-4777-8777-777777777777',artifact_revision:sha,
  read_run_id:'88888888-8888-4888-8888-888888888888',source_version_id:'99999999-9999-4999-8999-999999999999',
  raw_item_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',raw_sha256:sha,
  extent:{kind:'utf8_byte_range/v1',raw_sha256:sha,quote_sha256:sha,
   source_version_id:'99999999-9999-4999-8999-999999999999',raw_item_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   start_byte:0,end_byte:16}}};
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D00',job_id:'d00.source-intake',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D01',job_id:'d01.carrier-reading',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
 {stage:'D02',job_id:'d02.material-understanding',execution_policy:{enabled:true,attended:true,enable_requires:['evidence']}},
]};
const inputDigest=executionDigest(input);
const request={run_id:runId,stage:'D02',job_id:'d02.material-understanding',mode:'attended',input,input_digest:inputDigest};
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
 return createD02ResumeAuthorizer({registry,holdEpoch:'d02-resume-epoch',privateKey,journal,
  qualificationChecker:async()=>true,...overrides});
}

test('D02 resume grant is bound to input digest, requires current G1, and is consumed once',async()=>{
 const authority=fixture();
 await assert.rejects(authority.issue({...request,stage:'D01'}),/DENIED/);
 await assert.rejects(authority.issue({...request,input_digest:'f'.repeat(64)}),/DENIED/);
 const issued=await Promise.allSettled([authority.issue(request),authority.issue(request)]);
 const fulfilled=issued.filter(r=>r.status==='fulfilled');
 assert.equal(fulfilled.length,1);
 const {token}=fulfilled[0].value;
 const [header,payload,signature]=token.split('.');
 assert.ok(verify(null,Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(claims.stage,'D02');
 assert.equal(claims.job_id,'d02.material-understanding');
 assert.equal(claims.input_digest,inputDigest);
 const replay={jti:claims.jti,run_id:runId,stage:'D02',job_id:'d02.material-understanding',mode:'attended',
  hold_epoch:'d02-resume-epoch',registry_digest:executionDigest(registry),input_digest:inputDigest};
 const results=await Promise.allSettled([authority.consume(replay),authority.consume(replay)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='fulfilled').value.consumed_nonce,claims.jti);
 // A D02 grant is never consumable through the D01 or D00 binding.
 await assert.rejects(authority.consume({...replay,stage:'D01'}),/DENIED/);
});

test('D02 resume grant is denied when the current G1 does not qualify the input',async()=>{
 const authority=fixture({qualificationChecker:async()=>false});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D02 resume grant fails closed when the qualification check throws',async()=>{
 const authority=fixture({qualificationChecker:async()=>{throw Error('reader unavailable');}});
 await assert.rejects(authority.issue(request),/DENIED/);
});

test('D02 resume authorizer rejects a missing D02 policy and a rejected journal',async()=>{
 assert.throws(()=>fixture({registry:{...registry,jobs:registry.jobs.filter(j=>j.stage!=='D02')}}),/CONFIG/);
 const authority=fixture({journal:{issueOnce:async()=>false,consumeOnce:async()=>false}});
 await assert.rejects(authority.issue(request),/DENIED/);
});
