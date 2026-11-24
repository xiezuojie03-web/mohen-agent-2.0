// G2 regression: the independent attester must rebuild the EXACT D02 contract
// output the Runner hands to the Gate (the candidate returned by
// private-evidence-stage.mjs observeMaterial). A richer/different shape makes
// every real run's output digest irreproducible, as seen on 2026-11-24.
import test from 'node:test';
import assert from 'node:assert/strict';
import { d02ObservationOutput, stageBindingFor } from '../../tools/gate-stage-output-attestation.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { auditHasExactStageBinding } from '../../packages/data-access/src/gate-stage-qualification.mjs';

const ids = {
  originalId: '55555555-5555-4555-8555-555555555555',
  evidenceId: '66666666-6666-4666-8666-666666666666',
  readingUnitId: '77777777-7777-4777-8777-777777777777',
  linkId: '88888888-8888-4888-8888-888888888888',
  readUnitId: '99999999-9999-4999-8999-999999999999',
  readRunId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  artifactRevision: 'b'.repeat(64),
  requestDigest: 'c'.repeat(64),
  gateCandidateId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

test('G2 attester output carries exactly the producer contract keys', () => {
  const output = d02ObservationOutput(ids);
  assert.deepEqual(Object.keys(output).sort(), [
    'artifact_revision', 'candidate_kind', 'evidence_id', 'gate_candidate_id',
    'gate_candidate_status', 'gate_code', 'link_id', 'original_id', 'qualification',
    'read_run_id', 'read_unit_id', 'reading_unit_id', 'request_digest', 'stage',
  ]);
  assert.equal(output.stage, 'D02');
  assert.equal(output.gate_code, 'G2');
  assert.equal(output.candidate_kind, 'private_material_observation');
  assert.equal(output.qualification, 'UNASSESSED');
  assert.equal(output.gate_candidate_status, 'SUBMITTED');
});

test('G2 attester output digest is stable and shape-sensitive', () => {
  const digest = executionDigest(d02ObservationOutput(ids));
  assert.equal(digest, executionDigest(d02ObservationOutput({ ...ids })));
  // Any renamed or added field is a different contract output, never a match.
  assert.notEqual(digest, executionDigest({ ...d02ObservationOutput(ids), evidence_type: 'x' }));
  assert.notEqual(digest, executionDigest({ ...d02ObservationOutput(ids), request_digest: 'd'.repeat(64) }));
});

test('G2 signed binding is readable as this Producer handoff', () => {
  const job = { job_id: 'd02.material-understanding',
    implementation: { gate_reviewer_binding: 'm5-owner-reviewer-g2g5-producer' } };
  const facts = { input_digest: 'e'.repeat(64), output_digest: 'f'.repeat(64) };
  const binding = stageBindingFor(job, facts, 'G2');
  assert.deepEqual(binding, { gate_code: 'G2', consumer: 'producer',
    input_digest: facts.input_digest, output_digest: facts.output_digest,
    job_id: job.job_id, reviewer_binding_ref: 'm5-owner-reviewer-g2g5-producer' });
  const request = { schema: 'mohen.independent-gate-current-check.v1', stage: 'D02',
    gate_code: 'G2', job_id: job.job_id,
    reviewer_binding_ref: job.implementation.gate_reviewer_binding,
    input_digest: facts.input_digest, output_digest: facts.output_digest, consumer: 'producer' };
  const audit = { stage: 'D02', consumer: 'producer',
    input_fingerprint: facts.input_digest, stage_binding: binding };
  assert.equal(auditHasExactStageBinding(audit, request), true);
  // Dropping consumer is exactly the 2026-11-24 defect: signed but unreadable.
  assert.equal(auditHasExactStageBinding({ ...audit,
    stage_binding: { ...binding, consumer: undefined } }, request), false);
});