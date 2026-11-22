import assert from 'node:assert/strict';
import test from 'node:test';
import { rebuildD02ResumeInput } from '../../pipelines/data-production/orchestrator/d02-resume-input.mjs';

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
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D01',job_id:'d01.carrier-reading',exit_gate:'G1',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g0g1-producer'}},
 {stage:'D02',job_id:'d02.material-understanding',exit_gate:'G2',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
]};
const scope={project_id:project,original_id:original,root_task_id:rootTask,source_version_id:sv,
 raw_sha256:sha,page_number:1};
const extent={kind:'utf8_byte_range/v1',raw_sha256:sha,quote_sha256:sha,source_version_id:sv,raw_item_id:raw,
 start_byte:0,end_byte:16};
const g1={read_unit_id:readUnit,gate_audit_id:audit,artifact_revision:revision,job_id:'d01.carrier-reading',
 reviewer_binding_ref:'m5-owner-reviewer-g0g1-producer',consumer:'producer'};
const readRow={read_unit_id:readUnit,read_run_id:readRun,method_code:'C01',locator_schema:'utf8_byte_range/v1',
 locator:JSON.stringify(extent),production_run_id:runId,raw_item_id:raw,raw_sha256:sha,status:'done',
 config_schema:'mab.private-text-reading.v1',original_id:original,project_id:project,source_version_id:sv};
function queryFrom({run=[{scope:JSON.stringify(scope)}],g1s=[g1],reads=[readRow]}={}){
 return async sql=>sql.includes('from control.production_runs')?run
  :sql.includes('from control.qualification_current')?g1s
  :sql.includes('from source.read_units')?reads:[];
}

test('D02 input is rebuilt from the persisted run scope, current G1 and L1 read unit',async()=>{
 const input=await rebuildD02ResumeInput({query:queryFrom(),runId,projectId:project,registry});
 assert.equal(input.schema,'mohen.private-evidence-stage-request.v1');
 assert.equal(input.stage,'D02');
 assert.equal(input.originalId,original);
 assert.equal(input.readUnitId,readUnit);
 assert.equal(input.reading.run_id,runId);
 assert.equal(input.reading.project_id,project);
 assert.equal(input.reading.root_task_id,rootTask);
 assert.equal(input.reading.gate_audit_id,audit);
 assert.equal(input.reading.artifact_revision,revision);
 assert.equal(input.reading.read_run_id,readRun);
 assert.equal(input.reading.raw_item_id,raw);
 assert.deepEqual(input.reading.extent,extent);
});

test('a non-current/ambiguous G1 or a foreign read unit fails closed',async()=>{
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({g1s:[]}),runId,projectId:project,registry}),
  /D02_RESUME_G1_NOT_CURRENT/);
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({g1s:[g1,g1]}),runId,projectId:project,registry}),
  /D02_RESUME_G1_NOT_CURRENT/);
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({reads:[]}),runId,projectId:project,registry}),
  /D02_RESUME_READ_UNIT_NOT_UNIQUE/);
});

test('a G1 from another job/reviewer binding or another project never rebuilds',async()=>{
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({g1s:[{...g1,job_id:'d00.source-intake'}]}),
  runId,projectId:project,registry}),/D02_RESUME_G1_BINDING_MISMATCH/);
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({g1s:[{...g1,reviewer_binding_ref:'other'}]}),
  runId,projectId:project,registry}),/D02_RESUME_G1_BINDING_MISMATCH/);
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom(),runId,projectId:'ffffffff-ffff-4fff-8fff-ffffffffffff',registry}),
  /D02_RESUME_RUN_SCOPE_MISMATCH/);
});

test('a read unit that does not match the run scope bytes never rebuilds',async()=>{
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({reads:[{...readRow,raw_sha256:'b'.repeat(64)}]}),
  runId,projectId:project,registry}),/D02_RESUME_READ_UNIT_BINDING_MISMATCH/);
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({reads:[{...readRow,method_code:'C02'}]}),
  runId,projectId:project,registry}),/D02_RESUME_READ_UNIT_BINDING_MISMATCH/);
 await assert.rejects(rebuildD02ResumeInput({query:queryFrom({reads:[{...readRow,locator:'{}'}]}),
  runId,projectId:project,registry}),/D02_RESUME_LOCATOR_INVALID/);
});
