// D03 -> G3 独立 stage-output attestation 的纯失败关闭测试。
// 此前 G3 只读重建没有单测，真实 D03 首次执行时暴露两个契约缺口：
// ① machine 角色缺 world.changes 读权（迁移 20261122200000，见 G3 授权）；
// ② 重建输出把 request_digest 写成阶段输入摘要、把候选摘要写成阶段输入摘要，
//    与生产方落库的持久化摘要不等，导致签名前的输出摘要恒不匹配。
// 本测试用内存假 query 锁定生产方契约字段，零数据库、零 Provider、零付费。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  deriveD03WorldClaimStageDigests, attestG3WorldClaimStageOutput, attestStageOutputForRequest,
} from '../../tools/gate-stage-output-attestation.mjs';
import { auditHasExactStageBinding } from '../../packages/data-access/src/gate-stage-qualification.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { rebuildD03ResumeInput } from '../../pipelines/data-production/orchestrator/d03-resume-input.mjs';

const runId = '33333333-3333-4333-8333-333333333333';
const project = 'a2b0cf23-edba-42ec-8c44-0911eb52855e';
const original = '674deb39-4b3c-4bdb-b7da-cdb8a262da99';
const rootTask = 'bca52162-5354-4faa-8b28-17bca1bb64f1';
const sv = 'c20023b2-e631-4e4d-8319-bb9a7e56149a';
const evidence = '0df18664-7578-edc1-1efd-6198bb0aef28';
const readingUnit = '58866d65-f835-18cb-50d9-37abbe68f3ae';
const readUnit = '55144a55-b8f9-a7e3-71df-9ea375236f37';
const source = 'f889a887-1320-43bb-b505-01106e881abb';
const rawItem = 'd694a4aa-02ff-4f78-9c37-230f1562a252';
const link = 'bc2d3dcb-cb8a-c250-50d2-48f566e88e9e';
const g2Audit = '4d82b678-400f-4810-9149-6b6ba269715e';
const revision = '02ef673c-8a2c-8810-3571-8a3c30bb6643';
const change = '6e0eac4f-e78b-18d6-08dc-f42dc84cd846';
const claimLink = '61afc05a-e1be-8247-ed8e-6cceb7d094a7';
const cid = 'b629c090-f498-4c22-bd1c-1e72b43e10fe';
const sha = 'a'.repeat(64);
const rawSha = 'b6f030537b165b5da0973f87b7ebf031e47628419f13c715bb9ace2bf08b10cb';
const g2Artifact = 'c'.repeat(64);
const artifactRev = 'd'.repeat(64);
const qualDigest = 'e'.repeat(64);
const binding = 'm5-owner-reviewer-g2g5-producer';

const registry = {
  status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture',
  jobs: [
    { stage: 'D02', job_id: 'd02.material-understanding', exit_gate: 'G2',
      implementation: { gate_reviewer_binding: binding } },
    { stage: 'D03', job_id: 'd03.world-construction', exit_gate: 'G3',
      implementation: { gate_reviewer_binding: binding } },
  ],
};
const scope = { project_id: project, original_id: original, root_task_id: rootTask,
  source_version_id: sv, raw_sha256: rawSha, page_number: 1 };
const g2 = { evidence_id: evidence, gate_audit_id: g2Audit, artifact_revision: g2Artifact,
  job_id: 'd02.material-understanding', reviewer_binding_ref: binding, consumer: 'producer' };
const evidenceRow = {
  evidence_id: evidence, source_id: source, source_version_id: sv, raw_item_id: rawItem,
  literal_reading: '金泽镇，在县境中部，水陆交通便利。', research_proposition: '金泽镇位于县境中部，水陆交通便利。',
  evidence_type: 'descriptive_passage', source_voice: 'official_gazetteer',
  uncertainty: JSON.stringify({ qualification: 'UNASSESSED' }),
  reading_unit_id: readingUnit, link_id: link, read_unit_id: readUnit, raw_sha256: rawSha,
};

const baseQuery = (o = {}) => {
  const run = o.run ?? [{ scope: JSON.stringify(scope) }];
  const g2s = o.g2s ?? [g2];
  const evidences = o.evidences ?? [evidenceRow];
  const claims = o.claims ?? [];
  return async (sql) =>
    sql.includes('from control.production_runs') ? run
      : sql.includes('from control.qualification_current') ? g2s
        : sql.includes('from evidence.material_evidence') ? evidences
          : sql.includes('from world.claim_revisions') ? claims : [];
};

const input = await rebuildD03ResumeInput({ query: baseQuery(), runId, projectId: project, registry });
const inputDigest = executionDigest(input);
const persistDigest = createHash('sha256').update(JSON.stringify({
  runId, originalId: input.originalId, evidenceId: input.evidenceId, claim: input.claim,
}), 'utf8').digest('hex');

const claimRow = {
  claim_revision_id: revision, change_id: change,
  change_type: input.claim.change_type, producer_method_id: 'W07',
  payload: JSON.stringify({ assertion: input.claim.assertion, original_id: original,
    project_id: project, qualification: 'UNASSESSED', request_digest: persistDigest }),
  claim_evidence_link_id: claimLink, evidence_id: evidence,
  support_type: input.claim.support_type,
};

const candidate = {
  candidate_id: cid, stage: 'D03', gate_code: 'G3', consumer: 'producer',
  object_type: 'claim_revision', object_id: revision, artifact_revision: artifactRev,
  scope: JSON.stringify({ project_id: project }), input_fingerprint: inputDigest,
  evidence_refs: [
    { kind: 'claim_revision', id: revision, artifact_revision: artifactRev },
    { kind: 'material_evidence', id: evidence },
  ],
  dependency_snapshot: [{ gate_audit_id: g2Audit, artifact_revision: g2Artifact, qualification_digest: qualDigest }],
};
const digests = await deriveD03WorldClaimStageDigests({
  query: baseQuery({ claims: [claimRow] }), candidate, projectId: project, registry, runId });
const request = {
  schema: 'mohen.independent-gate-current-check.v1', run_id: runId,
  job_id: 'd03.world-construction', stage: 'D03', gate_code: 'G3',
  reviewer_binding_ref: binding, consumer: 'producer',
  input_digest: digests.input_digest, output_digest: digests.output_digest,
};
const args = (patch = {}, q = baseQuery({ claims: [claimRow] })) => ({
  query: q, candidate: patch.candidate ?? candidate, request: patch.request ?? request,
  registry: patch.registry ?? registry, projectId: project,
});

test('independent signer rebuilds the exact D03 claim output the Producer persisted', async () => {
  assert.equal(digests.input_digest, inputDigest);
  // The Producer returns the persisted claim digest (not the stage input
  // digest) and the same candidate_kind literal; pin the whole contract.
  const producerOutput = { stage: 'D03', candidate_kind: 'private_world_claim',
    original_id: original, change_id: change, claim_revision_id: revision,
    claim_evidence_link_id: claimLink, evidence_id: evidence,
    artifact_revision: artifactRev, request_digest: persistDigest,
    gate_candidate_id: cid, gate_candidate_status: 'SUBMITTED',
    qualification: 'UNASSESSED', gate_code: 'G3' };
  assert.equal(digests.output_digest, executionDigest(producerOutput));
  const attested = await attestG3WorldClaimStageOutput(args());
  assert.deepEqual(attested, { gate_code: 'G3', consumer: 'producer',
    input_digest: request.input_digest, output_digest: request.output_digest,
    job_id: 'd03.world-construction', reviewer_binding_ref: binding });
  assert.equal(auditHasExactStageBinding({ stage: 'D03', consumer: 'producer',
    input_fingerprint: request.input_digest, stage_binding: attested }, request), true);
  assert.deepEqual(await attestStageOutputForRequest(args()), attested);
});

test('a producer-supplied output_digest is never attested for G3', async () => {
  for (const bogus of ['e'.repeat(64), 'f'.repeat(64)])
    await assert.rejects(attestG3WorldClaimStageOutput(args({ request: { ...request, output_digest: bogus } })),
      /STAGE_OUTPUT_ATTESTATION_MISMATCH/);
  await assert.rejects(attestG3WorldClaimStageOutput(args({ candidate: { ...candidate, input_fingerprint: sha } })),
    /STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE/);
});

test('a rebinding of the claim payload or its upstream G2 fails closed', async () => {
  const tampered = { ...claimRow, payload: JSON.stringify({ assertion: input.claim.assertion,
    original_id: original, project_id: project, qualification: 'UNASSESSED', request_digest: '0'.repeat(64) }) };
  await assert.rejects(attestG3WorldClaimStageOutput(args({}, baseQuery({ claims: [tampered] }))),
    /STAGE_OUTPUT_WORLD_CLAIM_BINDING_MISMATCH/);
  await assert.rejects(attestG3WorldClaimStageOutput(args({}, baseQuery({ claims: [claimRow], g2s: [] }))),
    /D03_RESUME_G2_NOT_CURRENT/);
  await assert.rejects(attestG3WorldClaimStageOutput(args({}, baseQuery({ claims: [claimRow, claimRow] }))),
    /STAGE_OUTPUT_WORLD_CLAIM_NOT_UNIQUE/);
});