import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createD04IssueEndpoint } from '../../pipelines/data-production/orchestrator/d04-resume-issue.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const SCHEMA='mohen.d04-resume-request.v1';
const credential='synthetic-d04-issue-credential-32-characters';
const runId='44444444-4444-4444-8444-444444444444';
const project='d9d48901-3aa3-4424-b50f-965d6749ee8e';
const original='4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const rootTask='b2143002-5867-4873-9cae-21e0aebccb51';
const sv='67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const claim='0617b049-1111-4111-8111-111111111111';
const change='a84129b8-76ce-9522-6e79-f1259bf5cc64';
const evidence='031dd3d9-1111-4111-8111-111111111111';
const link='78ed7e87-d46d-183c-67b6-59045cefebac';
const audit='f1d9163e-3111-4b2b-86ba-7a06ad1bf78b';
const sha='a'.repeat(64);
const revision='28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D03',job_id:'d03.world-construction',exit_gate:'G3',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
 {stage:'D04',job_id:'d04.humanistic-discovery',exit_gate:'G4',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
]};
const body={run_id:runId,from_stage:'D04',project_id:project,
 scope:{project_id:project,original_id:original,page_number:1}};
const runScope={project_id:project,original_id:original,root_task_id:rootTask,source_version_id:sv,raw_sha256:sha,page_number:1};
const g3={claim_revision_id:claim,gate_audit_id:audit,artifact_revision:revision,job_id:'d03.world-construction',
 reviewer_binding_ref:'m5-owner-reviewer-g2g5-producer',consumer:'producer'};
const payload={method:'W07',assertion:'材料记载朱家角位于县境中部，为镇人民政府驻地。',
 project_id:project,original_id:original,evidence_ids:[evidence],qualification:'UNASSESSED',request_digest:sha};
const claimRow={claim_revision_id:claim,subject_id:change,producer_method_id:'W07',
 payload:JSON.stringify(payload),asserted_time:JSON.stringify({source_voice:'official_gazetteer',qualification:'UNASSESSED'}),
 claim_evidence_link_id:link,evidence_id:evidence,support_type:'supports'};
const attestorQuery=async(sql)=>{
 if(sql.includes('from control.production_runs'))return [{scope:JSON.stringify(runScope)}];
 if(sql.includes('from control.qualification_current'))return [g3];
 if(sql.includes('from world.claim_revisions'))return [claimRow];
 return [];
};
function req(b=body,sigOverride){
 const time=String(Date.now());
 const digest=executionDigest({run_id:b.run_id,from_stage:b.from_stage,scope:b.scope,project_id:b.project_id});
 const sig=sigOverride??createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+digest).digest('hex');
 return new Request('https://authority.invalid/d04-issue',{method:'POST',
  headers:{'content-type':'application/json','x-mohen-d04-time':time,'x-mohen-d04-signature':sig},body:JSON.stringify(b)});
}
function setup({authorityOk=true,query=attestorQuery}={}){
 let issued=false;
 const endpoint=createD04IssueEndpoint({credential,registry,attestorQuery:query,
  authority:{issue:async r=>{if(!authorityOk||r.stage!=='D04')throw Error('DENY');issued=true;
   assert.equal(r.job_id,'d04.humanistic-discovery');return {token:'signed-d04-token'};}},
 });
 return {endpoint,isIssued:()=>issued};
}

test('valid signed D04 issue returns the rebuilt finding request and a one-use token',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req());
 assert.equal(reply.status,200);
 const json=await reply.json();
 assert.equal(json.token,'signed-d04-token');
 assert.equal(json.resume_input.stage,'D04');
 assert.equal(json.resume_input.originalId,original);
 assert.equal(json.resume_input.claimRevisionId,claim);
 assert.equal(json.resume_input.finding.method_id,'A06');
 assert.equal(json.resume_input.finding.uncertainty.qualification,'UNASSESSED');
 assert.equal(isIssued(),true);
});

test('bad signature and wrong stage never invoke the signing authority',async()=>{
 const {endpoint,isIssued}=setup();
 assert.equal((await endpoint(req(body,'f'.repeat(64)))).status,401);
 assert.equal((await endpoint(req({...body,from_stage:'D03'}))).status,401);
 assert.equal(isIssued(),false);
});

test('a mismatched original in the caller scope receives no grant',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req({...body,scope:{...body.scope,
  original_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}}));
 assert.equal(reply.status,403);
 assert.equal(isIssued(),false);
});

test('a stale or missing current G3 rebuilds to nothing and yields no token',async()=>{
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
