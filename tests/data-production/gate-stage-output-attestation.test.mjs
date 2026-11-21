import test from 'node:test';
import assert from 'node:assert/strict';
import {attestG0TextStageOutput, attestG1ReadingStageOutput,
  deriveD01ReadingStageDigests} from '../../tools/gate-stage-output-attestation.mjs';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';
import {auditHasExactStageBinding} from '../../packages/data-access/src/gate-stage-qualification.mjs';
import {selectDigestBoundStageCandidate} from '../../tools/gate-stage-candidate-selection.mjs';

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

// ---- D01/G1 独立重建（C02 扫页 / C01 全文）------------------------------------

const runId='11111111-1111-4111-8111-111111111111';
const unitId='99999999-9999-4999-8999-999999999999';
const readRunId='88888888-8888-4888-8888-888888888888';
const g0Audit='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reqDigest='9'.repeat(64);
const imageSha='3a1a7f565c8f57328da9350c3be2f75751d26876af6c0d39663ca5ac6b7e6651';
const d01Job={stage:'D01',exit_gate:'G1',job_id:'d01.carrier-reading',
  implementation:{gate_reviewer_binding:'m5-owner-reviewer-g0g1-producer'}};
const d01Registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},jobs:[d01Job]};
const g0Plan=buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]});
const g0ApprovedRefs=[{kind:'source_version',id:sv,artifact_revision:rev},...g0Plan];
const page={kind:'scanned_page/v1',page_number:1,page_sha256:imageSha,
  raw_item_id:raw,source_version_id:sv,raw_sha256:imageSha};
const imageRow={original_id:original,project_id:project,original_state:'STORED_VERIFIED',
  content_type:'image/jpeg',original_sha256:imageSha,original_bytes:260123,
  raw_item_id:raw,raw_checksum:imageSha,raw_bytes:260123};
const imageUnit={read_unit_id:unitId,read_run_id:readRunId,method_code:'C02',
  locator_schema:'scanned_page/v1',locator:JSON.stringify(page),
  production_run_id:runId,request_digest:reqDigest,project_id:project,original_id:original};
const runScope={project_id:project,source_version_id:sv,original_id:original,
  raw_sha256:imageSha,page_number:1};
const expectedD01Input={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',
  originalId:original,method_plan:g0Plan,page:{...page}};
const g1Candidate={candidate_id:cid,stage:'D01',gate_code:'G1',consumer:'producer',
  object_type:'read_unit',object_id:unitId,artifact_revision:rev,
  scope:JSON.stringify({project_id:project}),
  input_fingerprint:executionDigest(expectedD01Input),
  evidence_refs:[{kind:'read_unit',id:unitId,artifact_revision:rev},
    {kind:'source_version',id:sv}]};
const expectedD01Output={stage:'D01',candidate_kind:'private_scanned_page_reading',
  original_id:original,source_version_id:sv,raw_item_id:raw,raw_sha256:imageSha,
  read_run_id:readRunId,read_unit_id:unitId,artifact_revision:rev,request_digest:reqDigest,
  page:{...page},
  method_plan_approval:{gate_audit_id:g0Audit,method_id:'C02',method_version:'v1',
    planned_methods:['C02@v1']},
  gate_candidate_id:cid,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',
  gate_code:'G1'};
const g1Request={schema:'mohen.independent-gate-current-check.v1',run_id:runId,
  job_id:d01Job.job_id,stage:'D01',gate_code:'G1',
  reviewer_binding_ref:d01Job.implementation.gate_reviewer_binding,
  input_digest:executionDigest(expectedD01Input),
  output_digest:executionDigest(expectedD01Output),consumer:'producer'};

function d01Query(overrides={}){
  return async (sql,params)=>{
    if(sql.includes('from source.read_units'))return overrides.units??[imageUnit];
    if(sql.includes('from source.raw_items'))return overrides.rows??[imageRow];
    if(sql.includes('from control.production_runs'))
      return overrides.runRows??[{scope:JSON.stringify(overrides.runScope??runScope)}];
    if(sql.includes('artifact_revision_for'))return overrides.revision??[{revision:rev}];
    if(sql.includes('from control.qualification_current'))
      return overrides.approved??[{gate_audit_id:g0Audit,
        evidence_refs:JSON.stringify(overrides.approvedRefs??g0ApprovedRefs)}];
    throw Error('UNEXPECTED_D01_QUERY:'+sql.slice(0,60));
  };
}
function d01Args(query=d01Query(),overrides={}){
  return {query,candidate:g1Candidate,request:g1Request,registry:d01Registry,
    projectId:project,...overrides};
}

test('independent signer rebuilds the real D01 C02 reading and its exact bound digests',async()=>{
  const digests=await deriveD01ReadingStageDigests({query:d01Query(),
    candidate:g1Candidate,projectId:project,runId});
  assert.deepEqual(digests,{input_digest:g1Request.input_digest,
    output_digest:g1Request.output_digest,carrier:'C02'});
  const binding=await attestG1ReadingStageOutput(d01Args());
  assert.deepEqual(binding,{job_id:g1Request.job_id,
    reviewer_binding_ref:g1Request.reviewer_binding_ref,consumer:'producer',
    input_digest:g1Request.input_digest,output_digest:g1Request.output_digest});
  assert.equal(auditHasExactStageBinding({stage:'D01',consumer:'producer',
    input_fingerprint:g1Request.input_digest,stage_binding:binding},g1Request),true);
});

test('a producer-supplied D01 output digest is never attested',async()=>{
  for(const bogus of ['c'.repeat(64),'d'.repeat(64)]){
    await assert.rejects(attestG1ReadingStageOutput(d01Args(undefined,
      {request:{...g1Request,output_digest:bogus}})),/STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE/);
    await assert.rejects(attestG1ReadingStageOutput(d01Args(undefined,
      {request:{...g1Request,input_digest:'e'.repeat(64)}})),/STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH/);
  }
});

test('rejects wrong stage/gate/job/registry and non-current G0 plan before signing',async()=>{
  for(const patch of [
    {request:{...g1Request,stage:'D00',gate_code:'G0'}},
    {request:{...g1Request,job_id:'d00.source-intake'}},
    {request:{...g1Request,reviewer_binding_ref:'other-reviewer'}},
    {registry:{...d01Registry,status:'DISABLED'}},
    {registry:{...d01Registry,jobs:[d01Job,d01Job]}},
  ]) await assert.rejects(attestG1ReadingStageOutput(d01Args(undefined,patch)));
  await assert.rejects(attestG1ReadingStageOutput(d01Args(d01Query({approved:[]}))),
    /STAGE_OUTPUT_G0_METHOD_PLAN_NOT_CURRENT/);
  await assert.rejects(attestG1ReadingStageOutput(d01Args(d01Query({approved:[
    {gate_audit_id:g0Audit,evidence_refs:JSON.stringify(g0ApprovedRefs)},
    {gate_audit_id:g0Audit,evidence_refs:JSON.stringify(g0ApprovedRefs)}]}))),
    /STAGE_OUTPUT_G0_METHOD_PLAN_NOT_CURRENT/);
});

test('refuses ambiguous, mismatched or unsupported persisted D01 facts',async()=>{
  for(const patch of [
    {units:[imageUnit,imageUnit]},
    {units:[{...imageUnit,production_run_id:project}]},
    {units:[{...imageUnit,request_digest:'nope'}]},
    {units:[{...imageUnit,project_id:runId}]},
    {revision:[{revision:'0'.repeat(64)}]},
    {rows:[]},
    {rows:[imageRow,imageRow]},
    {rows:[{...imageRow,content_type:'text/plain'}]},
    {rows:[{...imageRow,original_state:'PENDING'}]},
    {rows:[{...imageRow,raw_checksum:'e'.repeat(64)}]},
    {runScope:{...runScope,page_number:2}},
    {runScope:{...runScope,original_id:runId}},
  ]) await assert.rejects(attestG1ReadingStageOutput(d01Args(d01Query(patch))),
    /STAGE_OUTPUT_/);
});

test('C01 only attests a whole-document reading; a quoted fragment fails closed',async()=>{
  const textPlan=buildMethodPlanRefs({methods:[{method_id:'C01',method_version:'v1'}]});
  const extent={kind:'utf8_byte_range/v1',source_version_id:sv,raw_item_id:raw,
    raw_sha256:sha,start_byte:0,end_byte:120,quote_sha256:sha};
  const textRow={...imageRow,content_type:'text/plain',original_sha256:sha,
    original_bytes:120,raw_checksum:sha,raw_bytes:120};
  const textUnit={...imageUnit,method_code:'C01',locator_schema:'utf8_byte_range/v1',
    locator:JSON.stringify(extent)};
  const textScope={...runScope,raw_sha256:sha};
  const textQuery=d01Query({units:[textUnit],rows:[textRow],runScope:textScope,
    approvedRefs:[{kind:'source_version',id:sv,artifact_revision:rev},...textPlan]});
  const expectedTextInput={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',
    originalId:original,method_plan:textPlan,
    text:{kind:'verified_utf8_full/v1',source_version_id:sv,raw_item_id:raw,raw_sha256:sha}};
  const textCandidate={...g1Candidate,
    input_fingerprint:executionDigest(expectedTextInput)};
  const expectedTextOutput={stage:'D01',candidate_kind:'private_text_reading',
    original_id:original,source_version_id:sv,raw_item_id:raw,raw_sha256:sha,
    read_run_id:readRunId,read_unit_id:unitId,artifact_revision:rev,request_digest:reqDigest,
    extent,
    method_plan_approval:{gate_audit_id:g0Audit,method_id:'C01',method_version:'v1',
      planned_methods:['C01@v1']},
    gate_candidate_id:cid,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',
    gate_code:'G1'};
  const textRequest={...g1Request,input_digest:executionDigest(expectedTextInput),
    output_digest:executionDigest(expectedTextOutput)};
  const binding=await attestG1ReadingStageOutput({query:textQuery,candidate:textCandidate,
    request:textRequest,registry:d01Registry,projectId:project});
  assert.equal(binding.output_digest,textRequest.output_digest);
  // 片段引用无法在只读路径上重建引文正文，必须失败关闭而不是照抄摘要。
  const fragment={...extent,end_byte:60};
  await assert.rejects(attestG1ReadingStageOutput({query:d01Query({units:[{...textUnit,
    locator:JSON.stringify(fragment)}],rows:[textRow],runScope:textScope,
    approvedRefs:[{kind:'source_version',id:sv,artifact_revision:rev},...textPlan]}),
    candidate:textCandidate,request:textRequest,registry:d01Registry,projectId:project}),
    /STAGE_OUTPUT_TEXT_QUOTE_NOT_ATTESTABLE/);
});

test('digest-bound locator resolves repeated D01 attempts without choosing the first row',async()=>{
  const seen=[];
  const attestFor=(matching)=>({candidate})=>{
    seen.push(candidate.candidate_id);
    if(!matching.includes(candidate.candidate_id))throw Error('STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE');
    return {input_digest:g1Request.input_digest,output_digest:g1Request.output_digest};
  };
  const rowsFor=ids=>async(sql)=>{
    if(sql.includes('from control.gate_candidates'))
      return ids.map(id=>({candidate_id:id,gate_code:'G1',stage:'D01',
        object_type:'read_unit',object_id:unitId,artifact_revision:rev,
        scope:g1Candidate.scope,consumer:'producer',
        evidence_refs:JSON.stringify(g1Candidate.evidence_refs),
        input_fingerprint:g1Request.input_digest,project_id:project,run_project_id:project}));
    throw Error('UNEXPECTED_SELECTION_QUERY:'+sql.slice(0,60));
  };
  const three=['c'.repeat(8)+'-1111-4111-8111-111111111111',
    'd'.repeat(8)+'-1111-4111-8111-111111111111',
    'e'.repeat(8)+'-1111-4111-8111-111111111111'];
  const only=await selectDigestBoundStageCandidate(rowsFor(three),g1Request,
    {attest:attestFor([three[2]])});
  assert.deepEqual(only,{candidateId:three[2],projectId:project});
  assert.equal(seen.length,3,'every repeated candidate is reconstructed, never short-circuited');
  assert.equal(await selectDigestBoundStageCandidate(rowsFor(three),g1Request,
    {attest:attestFor([])}),null,'no reproducible candidate stays HOLD');
  assert.equal(await selectDigestBoundStageCandidate(rowsFor(three),g1Request,
    {attest:attestFor(three)}),null,'two matching candidates are ambiguous, not authority');
});


import {createRuleGateReviewer} from '../../tools/rule-gate-reviewer.mjs';
import {MACHINE_REVIEWER_USER_ID,MACHINE_SIGNER_LOGIN} from '../../tools/machine-reviewer-session.mjs';

test('existing independent Reviewer includes independently reconstructed binding in its signed decision, not merely the helper result',async()=>{
  const signedId='77777777-7777-4777-8777-777777777777';
  const decisions=[];
  const calls=[];
  const q=async (sql,params)=>{
    calls.push(sql);
    if(sql.includes('from control.gate_policy_versions'))
      return [{required_checks:'["identity_version"]',max_validity:'6 days'}];
    if(sql.includes('from control.gate_candidates'))
      return [{...candidate,scope:candidate.scope,
        purpose_namespace:'data-production',purpose_code:'m5-remediation',purpose_version:'v1',
        evidence_refs:JSON.stringify(candidate.evidence_refs),dependency_snapshot:'[]',
        submitted_at:'2026-11-16T00:00:00Z'}];
    if(sql.includes('control.artifact_revision_for'))return [{revision:rev}];
    if(sql.includes('from source.raw_items'))return [row];
    if(sql.includes('from control.qualification_current'))return [];
    if(sql.includes('from control.gate_audits'))return [{
      gate_code:'G0',result:'PASS',decision_origin:'independent_gate',consumer:'producer',
      reviewer_user_id:MACHINE_REVIEWER_USER_ID,
      reviewer_db_identity:MACHINE_SIGNER_LOGIN,current:true,
    }];
    throw Error('UNEXPECTED_SIGNER_QUERY:'+sql.slice(0,60));
  };
  const makeReviewer=()=>createRuleGateReviewer({
    query:q,projectId:project,log:()=>{},
    mintToken:()=> 'test-only-mock-session',randomId:()=>run,
    attestStageOutput:({candidate:candidateRead,request:stageRequest,projectId:pid})=>
      attestG0TextStageOutput({query:q,candidate:candidateRead,request:stageRequest,
        registry,projectId:pid}),
    decide:async (decision,sessionToken)=>{decisions.push({decision,sessionToken});return signedId;}
  });
  const signed=await makeReviewer().review({gate:'G0',candidateId:cid,stageRequest:request});
  assert.equal(signed.status,'PASS');
  assert.equal(signed.auditId,signedId);
  assert.equal(decisions.length,1);
  assert.deepEqual(decisions[0].decision.receipt.stage_binding,{
    job_id:request.job_id,reviewer_binding_ref:request.reviewer_binding_ref,
    input_digest:request.input_digest,output_digest:request.output_digest,
    consumer:'producer'});
  assert.equal(auditHasExactStageBinding({
    stage:'D00',consumer:'producer',input_fingerprint:request.input_digest,
    stage_binding:decisions[0].decision.receipt.stage_binding
  },request),true);
  assert.equal(decisions[0].decision.result,'PASS');
  assert.equal(decisions[0].sessionToken,'test-only-mock-session');
  await assert.rejects(makeReviewer().review({gate:'G0',candidateId:cid,
    stageRequest:{...request,output_digest:'c'.repeat(64)}}),
    /STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE/);
  assert.equal(decisions.length,1,'bad output must be denied BEFORE authority.decide');
  assert.ok(calls.some(sql=>sql.includes('from source.raw_items')));
});
