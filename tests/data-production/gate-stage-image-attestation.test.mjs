import test from 'node:test';
import assert from 'node:assert/strict';
import {attestG0ImageStageOutput} from '../../tools/gate-stage-output-attestation.mjs';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';
import {auditHasExactStageBinding} from '../../packages/data-access/src/gate-stage-qualification.mjs';

const run='11111111-1111-4111-8111-111111111111';
const cid='22222222-2222-4222-8222-222222222222';
const project='33333333-3333-4333-8333-333333333333';
const sv='44444444-4444-4444-8444-444444444444';
const original='55555555-5555-4555-8555-555555555555';
const raw='66666666-6666-4666-8666-666666666666';
const sha='a'.repeat(64);
const rev='f'.repeat(64);
const methodPlan=buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]});
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},jobs:[
  {stage:'D00',exit_gate:'G0',job_id:'d00.source-intake',
    implementation:{gate_reviewer_binding:'m5-owner-reviewer-g0g1-producer'}}]};
const candidate={candidate_id:cid,stage:'D00',gate_code:'G0',consumer:'producer',
  object_type:'source_version',object_id:sv,artifact_revision:rev,
  scope:JSON.stringify({project_id:project}),input_fingerprint:'b'.repeat(64),
  evidence_refs:[{kind:'source_version',id:sv,artifact_revision:rev},...methodPlan]};
const row={original_id:original,project_id:project,original_state:'STORED_VERIFIED',
  content_type:'image/jpeg',original_sha256:sha,original_bytes:260342,
  raw_item_id:raw,raw_checksum:sha,raw_bytes:260342};
// The pre-execution authorization scope is persisted by control.production_runs.
const runScope={project_id:project,original_id:original,source_version_id:sv,
  raw_sha256:sha,page_number:1};
// EXACT D01 scanned-page output that privateSourceIntakeAdapter builds for image.
const output={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:original,
  method_plan:methodPlan,
  page:{kind:'scanned_page/v1',page_number:1,source_version_id:sv,
    raw_item_id:raw,raw_sha256:sha,page_sha256:sha}};
const request={schema:'mohen.independent-gate-current-check.v1',run_id:run,
  job_id:'d00.source-intake',stage:'D00',gate_code:'G0',
  reviewer_binding_ref:'m5-owner-reviewer-g0g1-producer',
  input_digest:'b'.repeat(64),output_digest:executionDigest(output),consumer:'producer'};
// query routes by the SQL table referenced, mirroring the signer's own reads.
function makeQuery({originalRows=[row],runScopes=[runScope]}={}){
  return async(sql,params)=>{
    if(sql.includes('from source.raw_items')){
      assert.match(sql,/studio.private_originals/);
      assert.deepEqual(params,{sourceVersion:sv,project});
      return originalRows;
    }
    if(sql.includes('from control.production_runs')){
      assert.match(sql,/run_id/);
      assert.deepEqual(params,{run});
      return runScopes.map(s=>({scope:typeof s==='string'?s:JSON.stringify(s)}));
    }
    throw Error('UNEXPECTED_QUERY:'+String(sql).slice(0,60));
  };
}
function args(overrides={}){
  return {query:makeQuery(),candidate,request,registry,projectId:project,...overrides};
}

test('independent signer derives exact C02 scanned-page output from persisted source and run scope',async()=>{
  const binding=await attestG0ImageStageOutput(args());
  assert.deepEqual(binding,{job_id:request.job_id,reviewer_binding_ref:request.reviewer_binding_ref,
    consumer:'producer',input_digest:request.input_digest,output_digest:request.output_digest});
  assert.equal(auditHasExactStageBinding({stage:'D00',consumer:'producer',
    input_fingerprint:request.input_digest,stage_binding:binding},request),true);
});

test('a producer changing output_digest cannot persuade the signer to attest it',async()=>{
  for(const bogus of ['c'.repeat(64),'d'.repeat(64)]){
    await assert.rejects(attestG0ImageStageOutput(args(
      {request:{...request,output_digest:bogus}})),/STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE/);
  }
});

test('page_number comes from persisted run scope, never from a caller field',async()=>{
  // A different page in the producer output cannot be attested even though the
  // rest of the request is unchanged: the digest will not reproduce.
  const tampered={...output,page:{...output.page,page_number:3}};
  await assert.rejects(attestG0ImageStageOutput(args(
    {request:{...request,output_digest:executionDigest(tampered)}})),
    /STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE/);
  // A run scope that disagrees with the source facts is refused before digest.
  await assert.rejects(attestG0ImageStageOutput(args(
    {query:makeQuery({runScopes:[{...runScope,raw_sha256:'e'.repeat(64)}]})})),
    /STAGE_OUTPUT_PAGE_SCOPE_MISMATCH/);
  await assert.rejects(attestG0ImageStageOutput(args(
    {query:makeQuery({runScopes:[{...runScope,page_number:0}]})})),
    /STAGE_OUTPUT_PAGE_SCOPE_MISMATCH/);
});

test('refuses ambiguous or missing run scope (no choose-first)',async()=>{
  for(const runScopes of [[],[runScope,runScope]]){
    await assert.rejects(attestG0ImageStageOutput(args(
      {query:makeQuery({runScopes})})),/STAGE_OUTPUT_RUN_SCOPE_NOT_UNIQUE/);
  }
});

test('refuses C01-only plan, duplicate/absent plans, and text carrier',async()=>{
  const c01=buildMethodPlanRefs({methods:[{method_id:'C01',method_version:'v1'}]});
  for(const refs of [
    [{kind:'source_version',id:sv,artifact_revision:rev},...c01],
    [{kind:'source_version',id:sv,artifact_revision:rev}],
    [{kind:'source_version',id:sv,artifact_revision:rev},...methodPlan,...methodPlan],
  ]) await assert.rejects(attestG0ImageStageOutput(args(
    {candidate:{...candidate,evidence_refs:refs}})),/STAGE_OUTPUT_METHOD_PLAN/);
  // content_type must be an image; text/plain with a C02 plan fails closed.
  await assert.rejects(attestG0ImageStageOutput(args(
    {query:makeQuery({originalRows:[{...row,content_type:'text/plain'}]})})),
    /STAGE_OUTPUT_ORIGINAL_BYTES_NOT_ATTESTED/);
});

test('refuses wrong job, reviewer binding, input, stage, scope and unsupported carriers',async()=>{
  for(const patch of [
    {request:{...request,job_id:'d01.carrier-reading'}},
    {request:{...request,reviewer_binding_ref:'other-reviewer'}},
    {candidate:{...candidate,input_fingerprint:'e'.repeat(64)}},
    {candidate:{...candidate,scope:JSON.stringify({project_id:run})}},
    {request:{...request,stage:'D01',gate_code:'G1'}},
    {registry:{...registry,status:'DISABLED'}},
  ]) await assert.rejects(attestG0ImageStageOutput(args(patch)));
});

test('refuses duplicate/absent persisted originals and sha/byte mismatches',async()=>{
  for(const originalRows of [[],[row,row]]){
    await assert.rejects(attestG0ImageStageOutput(args(
      {query:makeQuery({originalRows})})),/STAGE_OUTPUT_PERSISTED_SOURCE_NOT_UNIQUE/);
  }
  for(const bad of [
    {...row,original_state:'PENDING'},
    {...row,original_sha256:'e'.repeat(64)},
    {...row,raw_checksum:'e'.repeat(64)},
    {...row,raw_bytes:260341},
    {...row,project_id:run},
  ]) await assert.rejects(attestG0ImageStageOutput(args(
    {query:makeQuery({originalRows:[bad]})})),/STAGE_OUTPUT_ORIGINAL_BYTES_NOT_ATTESTED/);
});

test('accepts png/webp image carriers and never signs G1 by analogy',async()=>{
  for(const content_type of ['image/png','image/webp']){
    const binding=await attestG0ImageStageOutput(args(
      {query:makeQuery({originalRows:[{...row,content_type}]})}));
    assert.equal(binding.output_digest,request.output_digest);
  }
  await assert.rejects(attestG0ImageStageOutput(args(
    {request:{...request,stage:'D01',gate_code:'G1'}})),
    /STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED/);
});
