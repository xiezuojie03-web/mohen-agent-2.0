import assert from 'node:assert/strict';
import test from 'node:test';
import { rebuildD03ResumeInput } from '../../pipelines/data-production/orchestrator/d03-resume-input.mjs';

const runId='33333333-3333-4333-8333-333333333333';
const project='d9d48901-3aa3-4424-b50f-965d6749ee8e';
const original='4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const rootTask='b2143002-5867-4873-9cae-21e0aebccb51';
const sv='67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const raw='5fe7f057-a797-42cd-81b8-0892d4c271b6';
const evidence='031dd3d9-1111-4111-8111-111111111111';
const readUnit='43951035-beb3-d17b-44ba-c83705a00fb3';
const readingUnit='aaaaaaaa-beb3-d17b-44ba-c83705a00fb3';
const link='bbbbbbbb-beb3-d17b-44ba-c83705a00fb3';
const audit='1a9402cb-3111-4b2b-86ba-7a06ad1bf78b';
const sha='a'.repeat(64);
const revision='28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D02',job_id:'d02.material-understanding',exit_gate:'G2',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
 {stage:'D03',job_id:'d03.world-construction',exit_gate:'G3',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g2g5-producer'}},
]};
const scope={project_id:project,original_id:original,root_task_id:rootTask,source_version_id:sv,raw_sha256:sha,page_number:1};
const g2={evidence_id:evidence,gate_audit_id:audit,artifact_revision:revision,job_id:'d02.material-understanding',
 reviewer_binding_ref:'m5-owner-reviewer-g2g5-producer',consumer:'producer'};
const evRow={evidence_id:evidence,source_id:'cccccccc-1111-4111-8111-111111111111',source_version_id:sv,raw_item_id:raw,
 literal_reading:'青浦县低田均科正耗平米三斗六升五合',research_proposition:'《上海地名志》记载青浦县低田科则',
 evidence_type:'gazetteer_tax_quota_observation',source_voice:'official_gazetteer',
 uncertainty:JSON.stringify({qualification:'UNASSESSED'}),reading_unit_id:readingUnit,
 link_id:link,read_unit_id:readUnit,raw_sha256:sha};
function queryFrom({run=[{scope:JSON.stringify(scope)}],g2s=[g2],evs=[evRow]}={}){
 return async sql=>sql.includes('from control.production_runs')?run
  :sql.includes('from control.qualification_current')?g2s
  :sql.includes('from evidence.material_evidence')?evs:[];
}

test('D03 input is rebuilt from the run scope, current G2 and L2 material evidence',async()=>{
 const input=await rebuildD03ResumeInput({query:queryFrom(),runId,projectId:project,registry});
 assert.equal(input.schema,'mohen.private-evidence-stage-request.v1');
 assert.equal(input.stage,'D03');
 assert.equal(input.originalId,original);
 assert.equal(input.evidenceId,evidence);
 assert.equal(input.claim.assertion,'《上海地名志》记载青浦县低田科则');
 assert.equal(input.claim.change_type,'gazetteer_tax_quota_observation');
 assert.equal(input.claim.support_type,'supports');
 assert.equal(input.claim.time_scope.qualification,'UNASSESSED');
});

test('a non-current/ambiguous G2 or foreign evidence fails closed',async()=>{
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({g2s:[]}),runId,projectId:project,registry}),/D03_RESUME_G2_NOT_CURRENT/);
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({g2s:[g2,g2]}),runId,projectId:project,registry}),/D03_RESUME_G2_NOT_CURRENT/);
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({evs:[]}),runId,projectId:project,registry}),/D03_RESUME_EVIDENCE_NOT_UNIQUE/);
});

test('a G2 from another job/reviewer binding or another project never rebuilds',async()=>{
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({g2s:[{...g2,job_id:'d00.source-intake'}]}),
  runId,projectId:project,registry}),/D03_RESUME_G2_BINDING_MISMATCH/);
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({g2s:[{...g2,reviewer_binding_ref:'other'}]}),
  runId,projectId:project,registry}),/D03_RESUME_G2_BINDING_MISMATCH/);
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom(),runId,projectId:'ffffffff-ffff-4fff-8fff-ffffffffffff',registry}),
  /D03_RESUME_RUN_SCOPE_MISMATCH/);
});

test('evidence not bound to the run bytes or not a candidate never rebuilds',async()=>{
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({evs:[{...evRow,raw_sha256:'b'.repeat(64)}]}),
  runId,projectId:project,registry}),/D03_RESUME_EVIDENCE_BINDING_MISMATCH/);
 await assert.rejects(rebuildD03ResumeInput({query:queryFrom({evs:[{...evRow,uncertainty:JSON.stringify({qualification:'ASSERTED'})}]}),
  runId,projectId:project,registry}),/D03_RESUME_EVIDENCE_NOT_CANDIDATE/);
});
