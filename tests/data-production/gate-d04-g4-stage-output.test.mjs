// D04 -> G4 独立 stage-output attestation 的纯失败关闭测试。
// 实现（tools/gate-stage-output-attestation.mjs#attestG4FindingStageOutput）已随
// D04 授权通道上线，但此前只有 D00/D01 单测覆盖；这里补齐 G4 的只读重建与
// 生产方伪造摘要、错 job/reviewer、非当前 G3、错 finding 绑定的负例。
// 全程只用内存假 query，零数据库、零 Provider、零付费、零真实凭据。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  deriveD04FindingStageDigests, attestG4FindingStageOutput, attestStageOutputForRequest,
} from '../../tools/gate-stage-output-attestation.mjs';
import { auditHasExactStageBinding } from '../../packages/data-access/src/gate-stage-qualification.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { rebuildD04ResumeInput } from '../../pipelines/data-production/orchestrator/d04-resume-input.mjs';

const runId = '44444444-4444-4444-8444-444444444444';
const project = 'd9d48901-3aa3-4424-b50f-965d6749ee8e';
const original = '4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const rootTask = 'b2143002-5867-4873-9cae-21e0aebccb51';
const sv = '67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const claim = '0617b049-1111-4111-8111-111111111111';
const evidence = '031dd3d9-1111-4111-8111-111111111111';
const audit = 'f1d9163e-3111-4b2b-86ba-7a06ad1bf78b';
const findingId = '7f713c60-1111-4111-8111-111111111111';
const cid = 'd2f1da86-1111-4111-8111-111111111111';
const sha = 'a'.repeat(64);
const artifactRev = 'b'.repeat(64);
const g3Artifact = 'c'.repeat(64);
const qualDigest = 'd'.repeat(64);
const binding = 'm5-owner-reviewer-g2g5-producer';

const registry = {
  status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture',
  jobs: [
    { stage: 'D03', job_id: 'd03.world-construction', exit_gate: 'G3',
      implementation: { gate_reviewer_binding: binding } },
    { stage: 'D04', job_id: 'd04.humanistic-discovery', exit_gate: 'G4',
      implementation: { gate_reviewer_binding: binding } },
  ],
};
const scope = { project_id: project, original_id: original, root_task_id: rootTask,
  source_version_id: sv, raw_sha256: sha, page_number: 1 };
const g3 = { claim_revision_id: claim, gate_audit_id: audit, artifact_revision: g3Artifact,
  job_id: 'd03.world-construction', reviewer_binding_ref: binding, consumer: 'producer' };
const payload = { method: 'W07', assertion: '材料记载朱家角为县境中部镇。', project_id: project,
  original_id: original, evidence_ids: [evidence], qualification: 'UNASSESSED', request_digest: sha };
const assertedTime = { note: 'from current G2 observation', source_voice: 'official_gazetteer',
  qualification: 'UNASSESSED' };
const claimRow = { claim_revision_id: claim, subject_id: 'a84129b8-76ce-9522-6e79-f1259bf5cc64',
  producer_method_id: 'W07', payload: JSON.stringify(payload), asserted_time: JSON.stringify(assertedTime),
  claim_evidence_link_id: '78ed7e87-d46d-183c-67b6-59045cefebac', evidence_id: evidence,
  support_type: 'supports' };

// rebuildD04ResumeInput 只查 production_runs / qualification_current / claim_revisions；
// meaning.findings 由 attestation 自己查。先重建 input，再据此确定 finding 行。
const baseQuery = (o = {}) => {
  const run = o.run ?? [{ scope: JSON.stringify(scope) }];
  const g3s = o.g3s ?? [g3];
  const claims = o.claims ?? [claimRow];
  const findings = o.findings ?? [];
  return async (sql) =>
    sql.includes('from control.production_runs') ? run
      : sql.includes('from control.qualification_current') ? g3s
        : sql.includes('from world.claim_revisions') ? claims
          : sql.includes('from meaning.findings') ? findings : [];
};

const input = await rebuildD04ResumeInput({ query: baseQuery(), runId, projectId: project, registry });
const inputDigest = executionDigest(input);
const persistDigest = createHash('sha256').update(JSON.stringify({
  runId, originalId: input.originalId, claimRevisionId: input.claimRevisionId, finding: input.finding,
}), 'utf8').digest('hex');

const findingRow = {
  finding_id: findingId, method_id: 'A06', qualification: 'UNASSESSED',
  refs: JSON.stringify([{ kind: 'claim_revision', id: input.claimRevisionId }]),
  discovery_method: JSON.stringify({ method_id: 'A06', purpose_code: 'BE',
    request_digest: persistDigest, qualification: 'UNASSESSED' }),
};

const candidate = {
  candidate_id: cid, stage: 'D04', gate_code: 'G4', consumer: 'producer',
  object_type: 'finding', object_id: findingId, artifact_revision: artifactRev,
  scope: JSON.stringify({ project_id: project }), input_fingerprint: inputDigest,
  evidence_refs: [
    { kind: 'finding', id: findingId, artifact_revision: artifactRev },
    { kind: 'claim_revision', id: input.claimRevisionId },
  ],
  dependency_snapshot: [{ gate_audit_id: audit, artifact_revision: g3Artifact,
    qualification_digest: qualDigest }],
};
const digests = await deriveD04FindingStageDigests({ query: baseQuery({ findings: [findingRow] }),
  candidate, projectId: project, registry, runId });
const request = {
  schema: 'mohen.independent-gate-current-check.v1', run_id: runId,
  job_id: 'd04.humanistic-discovery', stage: 'D04', gate_code: 'G4',
  reviewer_binding_ref: binding, consumer: 'producer',
  input_digest: digests.input_digest, output_digest: digests.output_digest,
};
function args(patch = {}, q = baseQuery({ findings: [findingRow] })) {
  return { query: q, candidate: patch.candidate ?? candidate, request: patch.request ?? request,
    registry: patch.registry ?? registry, projectId: project };
}

test('independent signer rebuilds the exact D04 finding output and exact bound digests', async () => {
  assert.equal(digests.input_digest, inputDigest);
  // 生产方 recordHumanisticFinding 返回的契约对象：request_digest 是持久化摘要
  // （不是阶段输入摘要），候选类别为 private_humanistic_finding。
  assert.equal(digests.output_digest, executionDigest({
    stage: 'D04', candidate_kind: 'private_humanistic_finding',
    original_id: input.originalId, finding_id: findingId,
    claim_revision_id: input.claimRevisionId, artifact_revision: artifactRev,
    request_digest: persistDigest, gate_candidate_id: cid, gate_candidate_status: 'SUBMITTED',
    qualification: 'UNASSESSED', gate_code: 'G4',
  }));
  const attested = await attestG4FindingStageOutput(args());
  assert.deepEqual(attested, { gate_code: 'G4', consumer: 'producer',
    input_digest: request.input_digest, output_digest: request.output_digest,
    job_id: 'd04.humanistic-discovery', reviewer_binding_ref: binding });
  // The verifier accepts a run's handoff only when the signed binding carries
  // the same consumer as the request; a binding without it signs an audit the
  // Gate service can never read back (G2-G5 used to omit it).
  assert.equal(auditHasExactStageBinding({ stage: 'D04', consumer: 'producer',
    input_fingerprint: request.input_digest, stage_binding: attested }, request), true);
  // 单一派发入口按持久 stage/gate 选择 G4，而非按调用方给的阶段名。
  const dispatched = await attestStageOutputForRequest(args());
  assert.deepEqual(dispatched, attested);
});

test('a producer-supplied output_digest or input_digest is never attested', async () => {
  for (const bogus of ['e'.repeat(64), 'f'.repeat(64)]) {
    await assert.rejects(attestG4FindingStageOutput(args({ request: { ...request, output_digest: bogus } })),
      /STAGE_OUTPUT_ATTESTATION_MISMATCH/);
    await assert.rejects(attestG4FindingStageOutput(args({ request: { ...request, input_digest: bogus } })),
      /STAGE_OUTPUT_ATTESTATION_MISMATCH/);
    await assert.rejects(attestG4FindingStageOutput(args({ candidate: { ...candidate, input_fingerprint: bogus } })),
      /STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE/);
  }
});

test('rejects wrong job, reviewer binding, stage/gate and registry before finding review', async () => {
  for (const patch of [
    { request: { ...request, job_id: 'd03.world-construction' } },
    { request: { ...request, reviewer_binding_ref: 'other-reviewer' } },
    { request: { ...request, stage: 'D03', gate_code: 'G3' } },
    { registry: { ...registry, status: 'DISABLED' } },
    { registry: { ...registry, jobs: [registry.jobs[1], registry.jobs[1]] } },
  ]) await assert.rejects(attestG4FindingStageOutput(args(patch)));
});

test('a non-current/ambiguous G3 or missing claim fails closed before signing', async () => {
  await assert.rejects(attestG4FindingStageOutput(args({}, baseQuery({ findings: [findingRow], g3s: [] }))),
    /D04_RESUME_G3_NOT_CURRENT/);
  await assert.rejects(attestG4FindingStageOutput(args({}, baseQuery({ findings: [findingRow], g3s: [g3, g3] }))),
    /D04_RESUME_G3_NOT_CURRENT/);
  await assert.rejects(attestG4FindingStageOutput(args({}, baseQuery({ findings: [findingRow], claims: [] }))),
    /D04_RESUME_CLAIM_NOT_UNIQUE/);
});

test('refuses ambiguous or non-A06/unassessed finding rows and a broken upstream snapshot', async () => {
  await assert.rejects(attestG4FindingStageOutput(args({}, baseQuery({
    findings: [findingRow, findingRow] }))), /STAGE_OUTPUT_FINDING_NOT_UNIQUE/);
  for (const bad of [
    { ...findingRow, method_id: 'X99' },
    { ...findingRow, qualification: 'ASSERTED' },
    { ...findingRow, refs: JSON.stringify([{ kind: 'claim_revision', id: project }]) },
    { ...findingRow, discovery_method: JSON.stringify({ request_digest: '0'.repeat(64) }) },
  ]) await assert.rejects(attestG4FindingStageOutput(args({}, baseQuery({ findings: [bad] }))),
    /STAGE_OUTPUT_FINDING_BINDING_MISMATCH/);
  // 上游快照必须是恰好一条、格式合法的当前 G3 绑定；缺条、多条或非 UUID 审计 id 都拒绝。
  for (const dep of [[], [candidate.dependency_snapshot[0], candidate.dependency_snapshot[0]],
    [{ gate_audit_id: 'not-a-uuid', artifact_revision: g3Artifact, qualification_digest: qualDigest }],
    [{ gate_audit_id: audit, artifact_revision: 'not-sha', qualification_digest: qualDigest }]]) {
    await assert.rejects(attestG4FindingStageOutput(args({ candidate: { ...candidate,
      dependency_snapshot: dep } })), /STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH/);
  }
});

test('a candidate whose scope/purpose/evidence refs are wrong is refused before finding review', async () => {
  for (const patch of [
    { candidate: { ...candidate, stage: 'D03' } },
    { candidate: { ...candidate, gate_code: 'G3' } },
    { candidate: { ...candidate, object_type: 'claim_revision' } },
    { candidate: { ...candidate, scope: JSON.stringify({ project_id: runId }) } },
    { candidate: { ...candidate, evidence_refs: [{ kind: 'finding', id: findingId,
      artifact_revision: artifactRev }] } },
  ]) await assert.rejects(attestG4FindingStageOutput(args(patch)), /STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH/);
});
