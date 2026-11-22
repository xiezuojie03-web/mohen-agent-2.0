import assert from 'node:assert/strict';
import test from 'node:test';
import { rebuildD04ResumeInput } from '../../pipelines/data-production/orchestrator/d04-resume-input.mjs';

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
const scope={project_id:project,original_id:original,root_task_id:rootTask,source_version_id:sv,raw_sha256:sha,page_number:1};
const g3={claim_revision_id:claim,gate_audit_id:audit,artifact_revision:revision,job_id:'d03.world-construction',
 reviewer_binding_ref:'m5-owner-reviewer-g2g5-producer',consumer:'producer'};
const payload={method:'W07',assertion:'材料记载朱家角位于县境中部，为镇人民政府驻地，面积125公顷。',
 project_id:project,original_id:original,evidence_ids:[evidence],qualification:'UNASSESSED',request_digest:sha};
const assertedTime={note:'D03 world-claim candidate derived from a current G2 material observation',
 source_voice:'official_gazetteer',qualification:'UNASSESSED'};
const claimRow={claim_revision_id:claim,subject_id:change,producer_method_id:'W07',
 payload:JSON.stringify(payload),asserted_time:JSON.stringify(assertedTime),
 claim_evidence_link_id:link,evidence_id:evidence,support_type:'supports'};
function queryFrom({run=[{scope:JSON.stringify(scope)}],g3s=[g3],claims=[claimRow]}={}){
 return async sql=>sql.includes('from control.production_runs')?run
  :sql.includes('from control.qualification_current')?g3s
  :sql.includes('from world.claim_revisions')?claims:[];
}

test('D04 input is rebuilt from the run scope, current G3 and L3 claim revision',async()=>{
 const input=await rebuildD04ResumeInput({query:queryFrom(),runId,projectId:project,registry});
 assert.equal(input.schema,'mohen.private-evidence-stage-request.v1');
 assert.equal(input.stage,'D04');
 assert.equal(input.originalId,original);
 assert.equal(input.claimRevisionId,claim);
 assert.equal(input.finding.method_id,'A06');
 assert.equal(input.finding.purpose_code,'BE');
 assert.equal(input.finding.uncertainty.qualification,'UNASSESSED');
 assert.ok(input.finding.interpretive_statement.includes(payload.assertion));
 assert.equal(input.finding.uncertainty.g3_audit_id,audit);
 assert.equal(input.finding.uncertainty.source_voice,'official_gazetteer');
});

test('a non-current/ambiguous G3 or missing claim fails closed',async()=>{
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({g3s:[]}),runId,projectId:project,registry}),/D04_RESUME_G3_NOT_CURRENT/);
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({g3s:[g3,g3]}),runId,projectId:project,registry}),/D04_RESUME_G3_NOT_CURRENT/);
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({claims:[]}),runId,projectId:project,registry}),/D04_RESUME_CLAIM_NOT_UNIQUE/);
});

test('a G3 from another job/reviewer binding or another project never rebuilds',async()=>{
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({g3s:[{...g3,job_id:'d02.material-understanding'}]}),
  runId,projectId:project,registry}),/D04_RESUME_G3_BINDING_MISMATCH/);
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({g3s:[{...g3,reviewer_binding_ref:'other'}]}),
  runId,projectId:project,registry}),/D04_RESUME_G3_BINDING_MISMATCH/);
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom(),runId,projectId:'ffffffff-ffff-4fff-8fff-ffffffffffff',registry}),
  /D04_RESUME_RUN_SCOPE_MISMATCH/);
});

test('a claim not bound to the run project/original or not a candidate never rebuilds',async()=>{
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({claims:[{...claimRow,
  payload:JSON.stringify({...payload,project_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'})}]}),
  runId,projectId:project,registry}),/D04_RESUME_CLAIM_NOT_CANDIDATE/);
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({claims:[{...claimRow,
  payload:JSON.stringify({...payload,qualification:'ASSERTED'})}]}),
  runId,projectId:project,registry}),/D04_RESUME_CLAIM_NOT_CANDIDATE/);
 await assert.rejects(rebuildD04ResumeInput({query:queryFrom({claims:[{...claimRow,producer_method_id:'X99'}]}),
  runId,projectId:project,registry}),/D04_RESUME_CLAIM_BINDING_MISMATCH/);
});
