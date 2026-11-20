import assert from 'node:assert/strict';
import test from 'node:test';
import { createG0ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d01-g0-qualification.mjs';

const runId='bfcdfad6-bbcb-4b68-946a-82e1302eeb80';
const d00InputDigest='478a8668c699fae2d66b771a536251cb05e6c1e4fc85ce212b60cd85db5a2199';
const d01InputDigest='002bb07ffd0ba9a1d8e20d50ef812915a4e95d75c5ce8404461cae4e9508975f';
const jobId='d00.source-intake';
const binding='m5-owner-reviewer-g0g1-producer';
const validReceipt={qualification_current:true,decision_origin:'independent_gate',result:'PASS',
 run_id:runId,stage:'D00',gate_code:'G0',job_id:jobId,reviewer_binding_ref:binding,consumer:'producer',
 input_digest:d00InputDigest,output_digest:d01InputDigest,
 gate_audit_id:'888db9e6-87bd-42b5-a932-4489e0270a5b',artifact_revision:'28de6385',
 object_id:'67839b1e-a344-4dd4-adf8-f7798ddf82d7',
 valid_until:new Date(Date.now()+86400000).toISOString()};
const checker=(receipt,err)=>createG0ResumeQualificationChecker({d00JobId:jobId,gateReviewerBinding:binding,
 readG0:async()=>{if(err)throw err;return receipt;}});

const args={run_id:runId,d01_input_digest:d01InputDigest,d00_input_digest:d00InputDigest};
test('current independent G0 whose output binds the D01 input is accepted',async()=>{
 assert.equal(await checker(validReceipt)(args),true);
});

test('non-current / mismatched output / wrong reviewer / expired G0 is denied',async()=>{
 const cases=[
  {...validReceipt,qualification_current:false},
  {...validReceipt,output_digest:'f'.repeat(64)},
  {...validReceipt,reviewer_binding_ref:'other'},
  {...validReceipt,consumer:'creator'},
  {...validReceipt,decision_origin:'self'},
  {...validReceipt,valid_until:new Date(Date.now()-1000).toISOString()},
  {...validReceipt,run_id:'11111111-1111-4111-8111-111111111111'},
  {...validReceipt,stage:'D01'},
 ];
 for(const receipt of cases)assert.equal(await checker(receipt)(args),false);
});

test('reader failure and malformed arguments fail closed',async()=>{
 assert.equal(await checker(null,Error('reader down'))(args),false);
 assert.equal(await checker(validReceipt)({run_id:'bad',d01_input_digest:d01InputDigest,d00_input_digest:d00InputDigest}),false);
 assert.equal(await checker(validReceipt)({run_id:runId,d01_input_digest:'short',d00_input_digest:d00InputDigest}),false);
 assert.equal(await checker(validReceipt)({run_id:runId,d01_input_digest:d01InputDigest,d00_input_digest:'short'}),false);
});
