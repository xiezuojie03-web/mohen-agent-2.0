import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createD03IssueEndpoint } from '../../pipelines/data-production/orchestrator/d03-resume-issue.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const SCHEMA='mohen.d03-resume-request.v1';
const credential='synthetic-d03-issue-credential-32-characters';
const runId='33333333-3333-4333-8333-333333333333';
const project='d9d48901-3aa3-4424-b50f-965d6749ee8e';
const original='4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const rootTask='b2143002-5867-4873-9cae-21e0aebccb51';
const sv='67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const raw='5fe7f057-a797-42cd-81b8-0892d4c271b6';
const evidence='031dd3d9-1111-4111-8111-111111111111';
const readUnit='43951035-beb3-d17b-44ba-c83705a00fb3';
const audit='1a9402cb-3111-4b2b-86ba-7a06ad1bf78b';
const sha='a'.repeat(64);
const revision='28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D02',job_id:'d02.material-understanding',exit_gate:'G2',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
 {stage:'D03',job_id:'d03.world-construction',exit_gate:'G3',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
]};
const body={run_id:runId,from_stage:'D03',project_id:project,
 scope:{project_id:project,original_id:original,page_number:1}};
const runScope={project_id:project,original_id:original,root_task_id:rootTask,source_version_id:sv,raw_sha256:sha,page_number:1};
const g2={evidence_id:evidence,gate_audit_id:audit,artifact_revision:revision,job_id:'d02.material-understanding',
 reviewer_binding_ref:'m5-owner-reviewer-g2g5-producer',consumer:'producer'};
const evRow={evidence_id:evidence,source_id:'cccccccc-1111-4111-8111-111111111111',source_version_id:sv,raw_item_id:raw,
 literal_reading:'青浦县低田均科正耗平米三斗六升五合',research_proposition:'《上海地名志》记载青浦县低田科则',
 evidence_type:'gazetteer_tax_quota_observation',source_voice:'official_gazetteer',
 uncertainty:JSON.stringify({qualification:'UNASSESSED'}),reading_unit_id:'aaaaaaaa-beb3-d17b-44ba-c83705a00fb3',
 link_id:'bbbbbbbb-beb3-d17b-44ba-c83705a00fb3',read_unit_id:readUnit,raw_sha256:sha};
const attestorQuery=async(sql)=>{
 if(sql.includes('from control.production_runs'))return [{scope:JSON.stringify(runScope)}];
 if(sql.includes('from control.qualification_current'))return [g2];
 if(sql.includes('from evidence.material_evidence'))return [evRow];
 return [];
};
function req(b=body,sigOverride){
 const time=String(Date.now());
 const digest=executionDigest({run_id:b.run_id,from_stage:b.from_stage,scope:b.scope,project_id:b.project_id});
 const sig=sigOverride??createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+digest).digest('hex');
 return new Request('https://authority.invalid/d03-issue',{method:'POST',
  headers:{'content-type':'application/json','x-mohen-d03-time':time,'x-mohen-d03-signature':sig},body:JSON.stringify(b)});
}
function setup({authorityOk=true,query=attestorQuery}={}){
 let issued=false;
 const endpoint=createD03IssueEndpoint({credential,registry,attestorQuery:query,
  authority:{issue:async r=>{if(!authorityOk||r.stage!=='D03')throw Error('DENY');issued=true;
   assert.equal(r.job_id,'d03.world-construction');return {token:'signed-d03-token'};}},
 });
 return {endpoint,isIssued:()=>issued};
}

test('valid signed D03 issue returns the rebuilt claim request and a one-use token',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req());
 assert.equal(reply.status,200);
 const json=await reply.json();
 assert.equal(json.token,'signed-d03-token');
 assert.equal(json.resume_input.stage,'D03');
 assert.equal(json.resume_input.originalId,original);
 assert.equal(json.resume_input.evidenceId,evidence);
 assert.equal(json.resume_input.claim.assertion,'《上海地名志》记载青浦县低田科则');
 assert.equal(json.resume_input.claim.support_type,'supports');
 assert.equal(isIssued(),true);
});

test('bad signature and wrong stage never invoke the signing authority',async()=>{
 const {endpoint,isIssued}=setup();
 assert.equal((await endpoint(req(body,'f'.repeat(64)))).status,401);
 assert.equal((await endpoint(req({...body,from_stage:'D02'}))).status,401);
 assert.equal(isIssued(),false);
});

test('a mismatched original in the caller scope receives no grant',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req({...body,scope:{...body.scope,
  original_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}}));
 assert.equal(reply.status,403);
 assert.equal(isIssued(),false);
});

test('a stale or missing current G2 rebuilds to nothing and yields no token',async()=>{
 const {endpoint,isIssued}=setup({query:async sql=>
  sql.includes('from control.qualification_current')?[]:attestorQuery(sql)});
 const reply=await endpoint(req());
 assert.equal(reply.status,503);
 assert.equal(isIssued(),false);
});

test('signing authority denial yields no token',async()=>{
 const denied=setup({authorityOk:false});
 const reply=await denied.endpoint(req());
 assert.equal(reply.status,503);
 assert.equal(denied.isIssued(),false);
});
