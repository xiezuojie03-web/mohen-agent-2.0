import test from 'node:test';
import assert from 'node:assert/strict';
import {createIndependentGateClient} from '../../pipelines/data-production/orchestrator/independent-gate-client.mjs';
import {requireIndependentStageQualification} from '../../pipelines/data-production/orchestrator/independent-stage-qualification.mjs';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

test('independent Gate read response must bind to current stage exact output and expiry',async()=>{
  const run={run_id:'123e4567-e89b-42d3-a456-426614174011'};
  const job={job_id:'d02.material-understanding',stage:'D02',implementation:{gate_reviewer_binding:'independent-G2'}};
  const input={source:'synthetic'},output={material:'synthetic candidate'};
  const valid={
    qualification_current:true,decision_origin:'independent_gate',result:'PASS',
    run_id:run.run_id,job_id:job.job_id,reviewer_binding_ref:job.implementation.gate_reviewer_binding,
    consumer:'producer',stage:'D02',gate_code:'G2',
    input_digest:executionDigest(input),output_digest:executionDigest(output),
    gate_audit_id:'123e4567-e89b-42d3-a456-426614174012',
    artifact_revision:'v1',object_type:'material_evidence',
    object_id:'123e4567-e89b-42d3-a456-426614174013',
    valid_until:new Date(Date.now()+60000).toISOString(),
  };
  const check=async(receipt)=>{
    const f=createIndependentGateClient({
      endpoint:'https://verifier.example.invalid/qualification',
      credential:'synthetic-readonly-gate-verification-key',
      fetcher:async()=>new Response(JSON.stringify(receipt),{headers:{'content-type':'application/json'}}),
    });
    return requireIndependentStageQualification({
      context:{verifyStageQualification:f},run,stage:'D02',job,input,
      result:{disposition:'PASS',outputs:{qualified_material_evidence:output}},
    });
  };
  assert.equal((await check(valid)).gate_audit_id,valid.gate_audit_id);
  await assert.rejects(check({...valid,qualification_current:false}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
  await assert.rejects(check({...valid,output_digest:'f'.repeat(64)}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
  await assert.rejects(check({...valid,valid_until:new Date(Date.now()-1000).toISOString()}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
  await assert.rejects(check({...valid,job_id:'other-job'}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
  await assert.rejects(check({...valid,reviewer_binding_ref:'another-reviewer'}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
  await assert.rejects(check({...valid,consumer:'watch'}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
  await assert.rejects(check({...valid,job_id:undefined}),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/);
});
