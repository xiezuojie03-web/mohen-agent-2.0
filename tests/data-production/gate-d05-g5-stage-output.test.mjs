// D05 fact branch → G5 独立 stage-output attestation 的纯失败关闭测试。
// 零数据库、零 Provider、零付费、零真实凭据；全程内存假 query。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  deriveD05FactStageDigests, attestG5FactStageOutput, attestStageOutputForRequest,
} from '../../tools/gate-stage-output-attestation.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { rebuildD05ResumeInput } from '../../pipelines/data-production/orchestrator/d05-resume-input.mjs';

const runId = '55555555-5555-4555-8555-555555555555';
const project = 'd9d48901-3aa3-4424-b50f-965d6749ee8e';
const original = 'f474b91b-07f0-47ab-94dc-20dc7f55e518';
const rootTask = 'b2143002-5867-4873-9cae-21e0aebccb51';
const sv = '67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const claim = '0617b049-1111-4111-8111-111111111111';
const findingId = '7f713c60-1111-4111-8111-111111111111';
const g3Audit = 'f1d9163e-3111-4b2b-86ba-7a06ad1bf78b';
const g4Audit = 'ec893e90-3111-4b2b-86ba-7a06ad1bf78b';
const cid = 'd2f1da86-1111-4111-8111-111111111111';
const projectionId = 'aaaaaaaa-1111-4111-8111-111111111111';
const sha = 'a'.repeat(64);
const artifactRev = 'b'.repeat(64);
const g3Artifact = 'c'.repeat(64);
const g4Artifact = 'e'.repeat(64);
const qualDigest = 'd'.repeat(64);
const binding = 'm5-owner-reviewer-g2g5-producer';

const registry = { status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture', jobs: [
  { stage: 'D03', job_id: 'd03.world-construction', exit_gate: 'G3', implementation: { gate_reviewer_binding: binding } },
  { stage: 'D04', job_id: 'd04.humanistic-discovery', exit_gate: 'G4', implementation: { gate_reviewer_binding: binding } },
  { stage: 'D05', job_id: 'd05.read-model-publication', exit_gate: 'G5', implementation: { gate_reviewer_binding: binding } },
] };
const scope = { project_id: project, original_id: original, root_task_id: rootTask, source_version_id: sv, raw_sha256: sha, page_number: 1 };
const g4 = { finding_id: findingId, gate_audit_id: g4Audit, artifact_revision: g4Artifact, job_id: 'd04.humanistic-discovery',
  reviewer_binding_ref: binding, consumer: 'producer' };
const g3 = { claim_revision_id: claim, gate_audit_id: g3Audit, artifact_revision: g3Artifact, job_id: 'd03.world-construction',
  reviewer_binding_ref: binding, consumer: 'producer' };
const findingRow = { finding_id: findingId, method_id: 'A06', qualification: 'UNASSESSED',
  interpretive_statement: '依据当前 G3 合格世界对象，朱家角为明清棉布与米市重镇。',
  refs: JSON.stringify([{ kind: 'claim_revision', id: claim }]) };
const claimRow = { claim_revision_id: claim, producer_method_id: 'W07',
  payload: JSON.stringify({ assertion: '朱家角位于县境中部，为镇人民政府驻地。', project_id: project, original_id: original, qualification: 'UNASSESSED' }),
  asserted_time: JSON.stringify({ source_voice: 'official_gazetteer' }) };

const input = await rebuildD05ResumeInput({ query: async (sql) =>
  sql.includes('from control.production_runs') ? [{ scope: JSON.stringify(scope) }]
    : sql.includes("a.stage='D04'") ? [g4]
    : sql.includes('from meaning.findings') ? [findingRow]
    : sql.includes('from world.claim_revisions') ? [claimRow]
    : sql.includes("a.stage='D03'") ? [g3] : [], runId, projectId: project, registry });
const inputDigest = executionDigest(input);
const persistDigest = createHash('sha256').update(JSON.stringify({
  runId, originalId: input.originalId, findingId: input.findingId, projection: input.projection,
}), 'utf8').digest('hex');
const projectionRow = { projection_id: projectionId, projection_key: input.projection.projection_key,
  payload: JSON.stringify({ schema: 'mohen.private-world-projection.v1', qualification: 'UNASSESSED',
    body: input.projection.payload, finding_id: findingId, original_id: original, request_digest: persistDigest }),
  derived: JSON.stringify([findingId]), rule: JSON.stringify({ method_id: 'P02', qualification: 'UNASSESSED' }) };
const candidate = { candidate_id: cid, stage: 'D05', gate_code: 'G5', consumer: 'producer',
  object_type: 'world_projection', object_id: projectionId, artifact_revision: artifactRev,
  scope: JSON.stringify({ project_id: project }), input_fingerprint: inputDigest,
  evidence_refs: [
    { kind: 'world_projection', id: projectionId, artifact_revision: artifactRev },
    { kind: 'finding', id: findingId },
  ],
  dependency_snapshot: [{ gate_audit_id: g4Audit, artifact_revision: g4Artifact, qualification_digest: qualDigest }] };
const query = async (sql) =>
  sql.includes('from control.production_runs') ? [{ scope: JSON.stringify(scope) }]
    : sql.includes("a.stage='D04'") ? [g4]
    : sql.includes('from meaning.findings') ? [findingRow]
    : sql.includes('from world.claim_revisions') ? [claimRow]
    : sql.includes("a.stage='D03'") ? [g3]
    : sql.includes('from read_model.world_projections') ? [projectionRow] : [];
const digests = await deriveD05FactStageDigests({ query, candidate, projectId: project, registry, runId });
const request = { schema: 'mohen.independent-gate-current-check.v1', run_id: runId,
  job_id: 'd05.read-model-publication', stage: 'D05', gate_code: 'G5',
  reviewer_binding_ref: binding, consumer: 'producer',
  input_digest: digests.input_digest, output_digest: digests.output_digest };
const args = (patch = {}, q = query) => ({ query: q, candidate: patch.candidate ?? candidate,
  request: patch.request ?? request, registry: patch.registry ?? registry, projectId: project });

test('independent signer rebuilds the exact D05 fact projection and bound digests', async () => {
  assert.equal(digests.input_digest, inputDigest);
  const attested = await attestG5FactStageOutput(args());
  assert.deepEqual(attested, { gate_code: 'G5', input_digest: request.input_digest,
    output_digest: request.output_digest, job_id: 'd05.read-model-publication', reviewer_binding_ref: binding });
  const viaDispatch = await attestStageOutputForRequest(args());
  assert.deepEqual(viaDispatch, attested);
});

test('producer-forged input/output digests and wrong job/reviewer fail closed', async () => {
  await assert.rejects(attestG5FactStageOutput(args({ request: { ...request, input_digest: sha } })), /STAGE_OUTPUT_ATTESTATION_MISMATCH/);
  await assert.rejects(attestG5FactStageOutput(args({ request: { ...request, output_digest: sha } })), /STAGE_OUTPUT_ATTESTATION_MISMATCH/);
  await assert.rejects(attestG5FactStageOutput(args({ request: { ...request, job_id: 'd04.humanistic-discovery' } })), /STAGE_OUTPUT_JOB_MISMATCH/);
  await assert.rejects(attestG5FactStageOutput(args({ request: { ...request, reviewer_binding_ref: 'other' } })), /STAGE_OUTPUT_REVIEWER_BINDING_MISMATCH/);
});

test('a forged projection payload or a wrong upstream G4 audit fails closed', async () => {
  const forgedRow = { ...projectionRow, payload: JSON.stringify({ ...JSON.parse(projectionRow.payload), body: { forged: true } }) };
  const forgedQuery = async (sql) => sql.includes('from read_model.world_projections') ? [forgedRow] : query(sql);
  await assert.rejects(attestG5FactStageOutput(args({}, forgedQuery)), /STAGE_OUTPUT_PROJECTION_BINDING_MISMATCH/);
  const wrongDep = { ...candidate, dependency_snapshot: [{ gate_audit_id: sha, artifact_revision: g4Artifact, qualification_digest: qualDigest }] };
  await assert.rejects(attestG5FactStageOutput(args({ candidate: wrongDep })), /STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH/);
});

test('missing/ambiguous persisted projection or non-current G4 fails closed', async () => {
  const noProjection = async (sql) => sql.includes('from read_model.world_projections') ? [] : query(sql);
  await assert.rejects(attestG5FactStageOutput(args({}, noProjection)), /STAGE_OUTPUT_PROJECTION_NOT_UNIQUE/);
  const noG4 = async (sql) => sql.includes("a.stage='D04'") ? [] : query(sql);
  await assert.rejects(attestG5FactStageOutput(args({}, noG4)), /D05_RESUME_G4_NOT_CURRENT/);
});
