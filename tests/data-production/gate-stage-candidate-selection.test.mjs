import test from 'node:test';
import assert from 'node:assert/strict';
import {selectExactStageCandidate} from '../../tools/gate-stage-candidate-selection.mjs';

const id='11111111-1111-4111-8111-111111111111';
const candidate='22222222-2222-4222-8222-222222222222';
const project='33333333-3333-4333-8333-333333333333';
const request={schema:'mohen.independent-gate-current-check.v1',run_id:id,
  stage:'D00',gate_code:'G0',job_id:'D00.intake',reviewer_binding_ref:'independent-G0',
  input_digest:'a'.repeat(64),output_digest:'b'.repeat(64),consumer:'producer'};

test('selects exactly one staged G0 candidate and derives project from persisted scope',async()=>{
  const calls=[];
  const query=async (sql,params)=>{
    calls.push({sql,params});
    assert.match(sql,/join control\.production_runs r on r\.run_id=c\.run_id/);
    assert.match(sql,/r\.scope->>'project_id'=c\.allowed_scope->>'project_id'/);
    assert.match(sql,/c\.stage=:'stage'/);
    assert.match(sql,/c\.consumer='producer'/);
    assert.match(sql,/c\.candidate_status='SUBMITTED'/);
    assert.match(sql,/c\.input_fingerprint=:'fp'/);
    assert.match(sql,/limit 2/);
    assert.doesNotMatch(sql,/output_digest/);
    return [{candidate_id:candidate,project_id:project,run_project_id:project}];
  };
  assert.deepEqual(await selectExactStageCandidate(query,request),
    {candidateId:candidate,projectId:project});
  assert.deepEqual(calls[0].params,{run:id,stage:'D00',gate:'G0',fp:'a'.repeat(64)});
  assert.equal(Object.hasOwn(calls[0].params,'project'),false);
});

test('rejects missing or ambiguous persisted candidates and any invalid project identity',async()=>{
  for(const rows of [[],[
    {candidate_id:candidate,project_id:project,run_project_id:project},{candidate_id:id,project_id:project}
  ],[{candidate_id:candidate,project_id:null}],
  [{candidate_id:candidate,project_id:'fixture-project',run_project_id:'fixture-project'}],
  [{candidate_id:candidate,project_id:project,run_project_id:null}],
  [{candidate_id:candidate,project_id:project,run_project_id:id}],
  [{candidate_id:candidate,project_id:project}],
  [{candidate_id:'not-a-uuid',project_id:project}]]) {
    assert.equal(await selectExactStageCandidate(async()=>rows,request),null);
  }
  assert.equal(await selectExactStageCandidate(async()=>null,request),null);
  // Real SQL returns no row if the persisted run has empty/foreign project
  // scope; the selector also fails closed against malformed query adapters.
  assert.equal(await selectExactStageCandidate(async()=>[],request),null);
});

test('rejects stage/gate mismatch or malformed input before querying independent DB',async()=>{
  let reads=0;const query=async()=>{reads++;return []};
  for(const bad of [{...request,stage:'D01'},{...request,gate_code:'G1'},
    {...request,consumer:'watch'},{...request,run_id:'not-a-uuid'},
    {...request,input_digest:'invalid'},
    {...request,project_id:project}]) {
    await assert.rejects(selectExactStageCandidate(query,bad),/STAGE_QUALIFICATION_REQUEST_INVALID/);
  }
  assert.equal(reads,0);
});

test('selection never attests the Producer supplied output digest',async()=>{
  const query=async()=>[{candidate_id:candidate,project_id:project,run_project_id:project}];
  const a=await selectExactStageCandidate(query,request);
  const b=await selectExactStageCandidate(query,{...request,output_digest:'f'.repeat(64)});
  assert.deepEqual(a,b); // output is checked only against independently signed stage_binding later
});
