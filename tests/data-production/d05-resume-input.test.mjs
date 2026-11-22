import assert from 'node:assert/strict';
import test from 'node:test';
import { rebuildD05ResumeInput } from '../../pipelines/data-production/orchestrator/d05-resume-input.mjs';

const runId = '55555555-5555-4555-8555-555555555555';
const project = 'd9d48901-3aa3-4424-b50f-965d6749ee8e';
const original = 'f474b91b-07f0-47ab-94dc-20dc7f55e518';
const rootTask = 'b2143002-5867-4873-9cae-21e0aebccb51';
const sv = '67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const claim = '0617b049-1111-4111-8111-111111111111';
const finding = '7f713c60-1111-4111-8111-111111111111';
const g3Audit = 'f1d9163e-3111-4b2b-86ba-7a06ad1bf78b';
const g4Audit = 'ec893e90-3111-4b2b-86ba-7a06ad1bf78b';
const sha = 'a'.repeat(64);
const rev = '28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const registry = { status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture', jobs: [
  { stage: 'D03', job_id: 'd03.world-construction', exit_gate: 'G3', implementation: { gate_reviewer_binding: 'm5-owner-reviewer-g2g5-producer' } },
  { stage: 'D04', job_id: 'd04.humanistic-discovery', exit_gate: 'G4', implementation: { gate_reviewer_binding: 'm5-owner-reviewer-g2g5-producer' } },
  { stage: 'D05', job_id: 'd05.read-model-publication', exit_gate: 'G5', implementation: { gate_reviewer_binding: 'm5-owner-reviewer-g2g5-producer' } },
] };
const scope = { project_id: project, original_id: original, root_task_id: rootTask, source_version_id: sv, raw_sha256: sha, page_number: 1 };
const g4 = { finding_id: finding, gate_audit_id: g4Audit, artifact_revision: rev, job_id: 'd04.humanistic-discovery',
  reviewer_binding_ref: 'm5-owner-reviewer-g2g5-producer', consumer: 'producer' };
const g3 = { claim_revision_id: claim, gate_audit_id: g3Audit, artifact_revision: rev, job_id: 'd03.world-construction',
  reviewer_binding_ref: 'm5-owner-reviewer-g2g5-producer', consumer: 'producer' };
const findingRow = { finding_id: finding, method_id: 'A06', qualification: 'UNASSESSED',
  interpretive_statement: '依据当前 G3 合格的世界对象，朱家角为明清棉布与米市重镇。',
  refs: JSON.stringify([{ kind: 'claim_revision', id: claim }]) };
const claimRow = { claim_revision_id: claim, producer_method_id: 'W07',
  payload: JSON.stringify({ assertion: '朱家角位于县境中部，为镇人民政府驻地。', project_id: project, original_id: original, qualification: 'UNASSESSED' }),
  asserted_time: JSON.stringify({ source_voice: 'official_gazetteer' }) };
const projectionRow = { projection_id: 'aaaaaaaa-1111-4111-8111-111111111111', projection_key: 'k',
  payload: JSON.stringify({ qualification: 'UNASSESSED', finding_id: finding, original_id: original, request_digest: sha, body: {} }),
  derived: JSON.stringify([finding]), rule: JSON.stringify({ method_id: 'P02', qualification: 'UNASSESSED' }) };
function queryFrom(o = {}) {
  return async (sql) => {
    if (sql.includes('from control.production_runs')) return o.run ?? [{ scope: JSON.stringify(scope) }];
    if (sql.includes("a.stage='D04'")) return o.g4 ?? [g4];
    if (sql.includes('from meaning.findings')) return o.findings ?? [findingRow];
    if (sql.includes('from world.claim_revisions')) return o.claims ?? [claimRow];
    if (sql.includes("a.stage='D03'")) return o.g3 ?? [g3];
    if (sql.includes('from read_model.world_projections')) return o.projections ?? [projectionRow];
    return o.rest ?? [];
  };
}

test('D05 fact input is rebuilt from run scope, current G4 finding and G3 claim', async () => {
  const input = await rebuildD05ResumeInput({ query: queryFrom(), runId, projectId: project, registry });
  assert.equal(input.schema, 'mohen.private-evidence-stage-request.v1');
  assert.equal(input.stage, 'D05');
  assert.equal(input.originalId, original);
  assert.equal(input.findingId, finding);
  assert.equal(input.projection.payload.method_trace.method_id, 'P02');
  assert.equal(input.projection.payload.lineage.g4_audit_id, g4Audit);
  assert.equal(input.projection.payload.lineage.g3_audit_id, g3Audit);
  assert.equal(input.projection.payload.method_trace.provider_calls, 0);
  assert.ok(input.projection.payload.facts[0].assertion.includes('朱家角'));
});

test('missing/ambiguous current G4 or G3 fails closed', async () => {
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ g4: [] }), runId, projectId: project, registry }), /D05_RESUME_G4_NOT_CURRENT/);
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ g4: [g4, g4] }), runId, projectId: project, registry }), /D05_RESUME_G4_NOT_CURRENT/);
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ g3: [] }), runId, projectId: project, registry }), /D05_RESUME_G3_NOT_CURRENT/);
});

test('wrong job/reviewer binding or non-A method never rebuilds', async () => {
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ g4: [{ ...g4, job_id: 'd02.material-understanding' }] }), runId, projectId: project, registry }), /D05_RESUME_G4_BINDING_MISMATCH/);
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ g4: [{ ...g4, reviewer_binding_ref: 'other' }] }), runId, projectId: project, registry }), /D05_RESUME_G4_BINDING_MISMATCH/);
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ findings: [{ ...findingRow, method_id: 'P02' }] }), runId, projectId: project, registry }), /D05_RESUME_FINDING_BINDING_MISMATCH/);
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ findings: [{ ...findingRow, refs: JSON.stringify([]) }] }), runId, projectId: project, registry }), /D05_RESUME_CLAIM_REF_AMBIGUOUS/);
});

test('claim not bound to run project/original never rebuilds', async () => {
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ claims: [{ ...claimRow,
    payload: JSON.stringify({ ...JSON.parse(claimRow.payload), project_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }) }] }),
    runId, projectId: project, registry }), /D05_RESUME_CLAIM_NOT_CANDIDATE/);
  await assert.rejects(rebuildD05ResumeInput({ query: queryFrom({ run: [{ scope: JSON.stringify({ ...scope, project_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }) }] }),
    runId, projectId: project, registry }), /D05_RESUME_RUN_SCOPE_MISMATCH/);
});
