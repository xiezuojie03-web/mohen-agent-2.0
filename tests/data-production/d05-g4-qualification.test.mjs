import assert from 'node:assert/strict';
import test from 'node:test';
import { createG4ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d05-g4-qualification.mjs';

const runId = '55555555-5555-4555-8555-555555555555';
const finding = '7f713c60-1111-4111-8111-111111111111';
const audit = 'ec893e90-3111-4b2b-86ba-7a06ad1bf78b';
const sha = 'a'.repeat(64);
const projection = { projection_key: 'k', payload: { method_trace: { method_id: 'P02' } } };
const input = { schema: 'mohen.private-evidence-stage-request.v1', stage: 'D05',
  originalId: '11111111-1111-4111-8111-111111111111', findingId: finding, projection };
const receipt = { qualification_current: true, decision_origin: 'independent_gate', result: 'PASS',
  stage: 'D04', gate_code: 'G4', job_id: 'd04.humanistic-discovery',
  reviewer_binding_ref: 'm5-owner-reviewer-g2g5-producer', consumer: 'producer',
  finding_id: finding, gate_audit_id: audit, artifact_revision: sha,
  valid_until: new Date(Date.now() + 86400000).toISOString() };
const checker = (over = {}) => createG4ResumeQualificationChecker({ readG4: async () => over.receipt ?? receipt,
  d04JobId: 'd04.humanistic-discovery', gateReviewerBinding: 'm5-owner-reviewer-g2g5-producer' });

test('current independent G4 for the exact finding qualifies the D05 input', async () => {
  assert.equal(await checker()({ run_id: runId, input, stage: 'D05' }), true);
});

test('non-current, wrong-stage, wrong-job or wrong-finding G4 fails closed', async () => {
  for (const r of [
    { ...receipt, qualification_current: false },
    { ...receipt, decision_origin: 'producer' },
    { ...receipt, result: 'HOLD' },
    { ...receipt, stage: 'D03' },
    { ...receipt, gate_code: 'G3' },
    { ...receipt, job_id: 'd05.read-model-publication' },
    { ...receipt, reviewer_binding_ref: 'other' },
    { ...receipt, consumer: 'consumer' },
    { ...receipt, finding_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    { ...receipt, valid_until: new Date(Date.now() - 1000).toISOString() },
  ]) assert.equal(await checker({ receipt: r })({ run_id: runId, input, stage: 'D05' }), false);
  assert.equal(await checker()({ run_id: runId, input, stage: 'D04' }), false);
});

test('reader errors and malformed typed inputs fail closed', async () => {
  const failing = createG4ResumeQualificationChecker({ readG4: async () => { throw Error('reader down'); },
    d04JobId: 'd04.humanistic-discovery', gateReviewerBinding: 'm5-owner-reviewer-g2g5-producer' });
  assert.equal(await failing({ run_id: runId, input, stage: 'D05' }), false);
  assert.equal(await checker()({ run_id: 'bad', input, stage: 'D05' }), false);
  assert.equal(await checker()({ run_id: runId, input: { ...input, findingId: 'bad' }, stage: 'D05' }), false);
  assert.equal(await checker()({ run_id: runId, input: { ...input, projection: undefined }, stage: 'D05' }), false);
});
