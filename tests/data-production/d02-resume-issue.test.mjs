import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createD02IssueEndpoint } from '../../pipelines/data-production/orchestrator/d02-resume-issue.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const SCHEMA='mohen.d02-resume-request.v1';
const credential='synthetic-d02-issue-credential-32-characters';
const runId='bfcdfad6-bbcb-4b68-946a-82e1302eeb80';
const project='e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5';
const original='4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const rootTask='2c5a4a37-9d3e-4a4e-9d1f-4f8f0c3d8f11';
const sv='67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const raw='5fe7f057-a797-42cd-81b8-0892d4c271b6';
const readUnit='43951035-beb3-d17b-44ba-c83705a00fb3';
const readRun='89a61890-05ed-2096-f41b-71ff96ab647c';
const audit='113c2bbe-300f-4cfa-8c03-02daaa91533e';
const sha='a'.repeat(64);
const revision='28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const extent={kind:'utf8_byte_range/v1',raw_sha256:sha,quote_sha256:sha,source_version_id:sv,raw_item_id:raw,start_byte:0,end_byte:16};
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D01',job_id:'d01.carrier-reading',exit_gate:'G1',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g0g1-producer'}},
 {stage:'D02',job_id:'d02.material-understanding',exit_gate:'G2',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
]};
const body={run_id:runId,from_stage:'D02',project_id:project,
 scope:{project_id:project,original_id:original,page_number:1}};
const runScope={project_id:project,original_id:original,root_task_id:rootTask,source_version_id:sv,raw_sha256:sha,page_number:1};
const g1={read_unit_id:readUnit,gate_audit_id:audit,artifact_revision:revision,job_id:'d01.carrier-reading',
 reviewer_binding_ref:'m5-owner-reviewer-g0g1-producer',consumer:'producer'};
const readRow={read_unit_id:readUnit,read_run_id:readRun,method_code:'C01',locator_schema:'utf8_byte_range/v1',
 locator:JSON.stringify(extent),production_run_id:runId,raw_item_id:raw,raw_sha256:sha,status:'done',
 config_schema:'mab.private-text-reading.v1',original_id:original,project_id:project,source_version_id:sv};
const attestorQuery=async(sql)=>{
 if(sql.includes('from control.production_runs'))return [{scope:JSON.stringify(runScope)}];
 if(sql.includes('from control.qualification_current'))return [g1];
 if(sql.includes('from source.read_units'))return [readRow];
 return [];
};
function req(b=body,sigOverride){
 const time=String(Date.now());
 const digest=executionDigest({run_id:b.run_id,from_stage:b.from_stage,scope:b.scope,project_id:b.project_id});
 const sig=sigOverride??createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+digest).digest('hex');
 return new Request('https://authority.invalid/d02-issue',{method:'POST',
  headers:{'content-type':'application/json','x-mohen-d02-time':time,'x-mohen-d02-signature':sig},body:JSON.stringify(b)});
}
function setup({authorityOk=true,query=attestorQuery}={}){
 let issued=false;
 const endpoint=createD02IssueEndpoint({credential,registry,attestorQuery:query,
  authority:{issue:async r=>{if(!authorityOk||r.stage!=='D02')throw Error('DENY');issued=true;
   assert.equal(r.job_id,'d02.material-understanding');return {token:'signed-d02-token'};}},
 });
 return {endpoint,isIssued:()=>issued};
}

test('valid signed D02 issue returns the rebuilt reading request and a one-use token',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req());
 assert.equal(reply.status,200);
 const json=await reply.json();
 assert.equal(json.token,'signed-d02-token');
 assert.equal(json.resume_input.stage,'D02');
 assert.equal(json.resume_input.originalId,original);
 assert.equal(json.resume_input.readUnitId,readUnit);
 assert.equal(json.resume_input.reading.gate_audit_id,audit);
 assert.deepEqual(json.resume_input.reading.extent,extent);
 assert.equal(isIssued(),true);
});

test('bad signature and wrong stage never invoke the signing authority',async()=>{
 const {endpoint,isIssued}=setup();
 assert.equal((await endpoint(req(body,'f'.repeat(64)))).status,401);
 assert.equal((await endpoint(req({...body,from_stage:'D01'}))).status,401);
 assert.equal(isIssued(),false);
});

test('a mismatched original in the caller scope receives no grant',async()=>{
 const {endpoint,isIssued}=setup();
 const reply=await endpoint(req({...body,scope:{...body.scope,
  original_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}}));
 assert.equal(reply.status,403);
 assert.equal(isIssued(),false);
});

test('a stale or missing current G1 rebuilds to nothing and yields no token',async()=>{
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
