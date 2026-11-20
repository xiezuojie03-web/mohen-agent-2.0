import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac} from 'node:crypto';
import {createD01IssueEndpoint} from '../../pipelines/data-production/orchestrator/d01-resume-issue.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const SCHEMA='mohen.d01-resume-request.v1';
const credential='synthetic-d01-issue-credential-32-characters';
const runId='bfcdfad6-bbcb-4b68-946a-82e1302eeb80';
const project='e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5';
const original='4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const sv='67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const raw='5fe7f057-a797-42cd-81b8-0892d4c271b6';
const sha='a'.repeat(64);
const revision='28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D00',job_id:'d00.source-intake',exit_gate:'G0'},
 {stage:'D01',job_id:'d01.private-evidence-read'},
]};
const body={run_id:runId,from_stage:'D01',project_id:project,
 scope:{project_id:project,original_id:original,page_number:1}};
const methodPlan=buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]});
const candidate={candidate_id:'48766904-c409-4b37-b602-9339a582b7e6',object_id:sv,gate_code:'G0',stage:'D00',
 consumer:'producer',object_type:'source_version',artifact_revision:revision,
 scope:JSON.stringify({project_id:project,original_id:original,source_version_id:sv,raw_sha256:sha,page_number:1}),
 evidence_refs:[{kind:'source_version',id:sv,artifact_revision:revision},...methodPlan]};
const srcRow={original_id:original,project_id:project,original_state:'STORED_VERIFIED',content_type:'image/jpeg',
 original_sha256:sha,original_bytes:'2048',raw_item_id:raw,raw_checksum:sha,raw_bytes:'2048'};
const attestorQuery=async(sql)=>{
 if(sql.includes('from source.raw_items'))return [srcRow];
 if(sql.includes('from control.production_runs'))return [{scope:JSON.stringify({project_id:project,page_number:1,source_version_id:sv,original_id:original,raw_sha256:sha})}];
 return [];
};
const g0Request={run_id:runId,stage:'D00',gate_code:'G0',output_digest:'b'.repeat(64)};
function req(b=body,sigOverride){
 const time=String(Date.now());
 const digest=executionDigest({run_id:b.run_id,from_stage:b.from_stage,scope:b.scope,project_id:b.project_id});
 const sig=sigOverride??createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+digest).digest('hex');
 return new Request('https://authority.invalid/d01-issue',{method:'POST',
  headers:{'content-type':'application/json','x-mohen-d01-time':time,'x-mohen-d01-signature':sig},body:JSON.stringify(b)});
}
function setup({authorityOk=true}={}){
 let issued=false;
 const endpoint=createD01IssueEndpoint({credential,registry,attestorQuery,
  loadCandidate:async()=>candidate,loadG0Request:async()=>g0Request,
  authority:{issue:async r=>{if(!authorityOk||r.stage!=='D01')throw Error('DENY');issued=true;assert.equal(r.job_id,'d01.private-evidence-read');return {token:'signed-d01-token'};}},
 });
 return {endpoint,isIssued:()=>issued};
}

test('valid signed D01 issue returns rebuilt resume input and one-use token',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req());
 assert.equal(reply.status,200);
 const json=await reply.json();
 assert.equal(json.token,'signed-d01-token');
 assert.equal(json.resume_input.stage,'D01');
 assert.equal(json.resume_input.originalId,original);
 assert.equal(json.resume_input.page.page_number,1);
 assert.equal(isIssued(),true);
});

test('bad signature and wrong stage never invoke the signing authority',async()=>{
 const {endpoint,isIssued}=setup();
 assert.equal((await endpoint(req(body,'f'.repeat(64)))).status,401);
 assert.equal((await endpoint(req({...body,from_stage:'D02'}))).status,401);
 assert.equal(isIssued(),false);
});

test('signing authority denial (G0 not current) yields no token',async()=>{
 const denied=setup({authorityOk:false});
 const reply=await denied.endpoint(req());
 assert.equal(reply.status,503);
 assert.equal(denied.isIssued(),false);
});
