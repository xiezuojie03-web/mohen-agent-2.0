import test from 'node:test';
import assert from 'node:assert/strict';
import {attestG0TextStageOutput} from '../../tools/gate-stage-output-attestation.mjs';
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
const methodPlan=buildMethodPlanRefs({methods:[{method_id:'C01',method_version:'v1'}]});
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},jobs:[
  {stage:'D00',exit_gate:'G0',job_id:'d00.source-intake',
    implementation:{gate_reviewer_binding:'m5-owner-reviewer-g0g1-producer'}}]};
const candidate={candidate_id:cid,stage:'D00',gate_code:'G0',consumer:'producer',
  object_type:'source_version',object_id:sv,artifact_revision:rev,
  scope:JSON.stringify({project_id:project}),input_fingerprint:'b'.repeat(64),
  evidence_refs:[{kind:'source_version',id:sv,artifact_revision:rev},...methodPlan]};
const row={original_id:original,project_id:project,original_state:'STORED_VERIFIED',
  content_type:'text/plain',original_sha256:sha,original_bytes:120,
  raw_item_id:raw,raw_checksum:sha,raw_bytes:120};
const output={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:original,
  method_plan:methodPlan,text:{kind:'verified_utf8_full/v1',source_version_id:sv,
    raw_item_id:raw,raw_sha256:sha}};
const request={schema:'mohen.independent-gate-current-check.v1',run_id:run,
  job_id:'d00.source-intake',stage:'D00',gate_code:'G0',
  reviewer_binding_ref:'m5-owner-reviewer-g0g1-producer',
  input_digest:'b'.repeat(64),output_digest:executionDigest(output),consumer:'producer'};
function args(query=async()=>[row],overrides={}) {
  return {query,candidate,request,registry,projectId:project,...overrides};
}

test('independent signer derives exact C01 D00 output from persisted source/original refs',async()=>{
  let count=0;
  const binding=await attestG0TextStageOutput(args(async(sql,params)=>{
    count++;
    assert.match(sql,/source.raw_items/);
    assert.match(sql,/studio.private_originals/);
    assert.match(sql,/limit 2/);
    assert.doesNotMatch(sql,/output_digest/);
    assert.deepEqual(params,{sourceVersion:sv,project});return [row];
  }));
  assert.equal(count,1);
  assert.deepEqual(binding,{job_id:request.job_id,reviewer_binding_ref:request.reviewer_binding_ref,
    consumer:'producer',input_digest:request.input_digest,output_digest:request.output_digest});
  assert.equal(auditHasExactStageBinding({stage:'D00',consumer:'producer',
    input_fingerprint:request.input_digest,stage_binding:binding},request),true);
});

test('a producer changing output_digest cannot persuade the signer to attest it',async()=>{
  for(const bogus of ['c'.repeat(64),'d'.repeat(64)]){
    await assert.rejects(attestG0TextStageOutput(args(undefined,
      {request:{...request,output_digest:bogus}})),/STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE/);
  }
});

test('rejects wrong job, reviewer binding, input, stage and scope before source review',async()=>{
  for(const patch of [
    {request:{...request,job_id:'d01.carrier-reading'}},
    {request:{...request,reviewer_binding_ref:'other-reviewer'}},
    {candidate:{...candidate,input_fingerprint:'e'.repeat(64)}},
    {candidate:{...candidate,scope:JSON.stringify({project_id:run})}},
    {request:{...request,stage:'D01',gate_code:'G1'}},
    {registry:{...registry,status:'DISABLED'}},
  ]) await assert.rejects(attestG0TextStageOutput(args(async()=>{throw Error('SHOULD_NOT_READ');},patch)));
});

test('refuses duplicate/absent method plans, source revision mismatch and unsupported carrier',async()=>{
  for(const refs of [[{kind:'source_version',id:sv,artifact_revision:rev}],
    [{kind:'source_version',id:sv,artifact_revision:rev},...methodPlan,...methodPlan],
    [{kind:'source_version',id:sv,artifact_revision:'0'.repeat(64)},...methodPlan],
    [{kind:'source_version',id:sv,artifact_revision:rev},
      ...buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]})]]) {
    await assert.rejects(attestG0TextStageOutput(args(undefined,
      {candidate:{...candidate,evidence_refs:refs}})));
  }
  for(const bad of [
    {...row,content_type:'image/png'}, {...row,original_state:'PENDING'},
    {...row,original_sha256:'e'.repeat(64)}, {...row,raw_bytes:119},
    {...row,project_id:run}
  ]) await assert.rejects(attestG0TextStageOutput(args(async()=>[bad])));
});

test('refuses missing/ambiguous persisted originals (no choose-first), and never signs G1 by analogy',async()=>{
  for(const rows of [[],[row,row],null]) {
    await assert.rejects(attestG0TextStageOutput(args(async()=>rows)),
      /STAGE_OUTPUT_PERSISTED_SOURCE_NOT_UNIQUE/);
  }
  await assert.rejects(attestG0TextStageOutput(args(async()=>[row],
    {request:{...request,stage:'D01',gate_code:'G1'}})),
    /STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED/);
});
