// D05 -> G5 独立 stage-output attestation 的失败关闭与回归测试。
//
// 本文件固定两条真实故障的修复边界（2026-11-22 第二十三批，云端真实 run
// b9989b90 / D05 候选 d6ee7004）：
//   1) derived_from_finding_ids 是 uuid[]，直接 ::text 得到的是 Postgres 数组字面量
//      "{uuid}"，JSON.parse 恒失败 → 合法候选被误判 PROJECTION_BINDING_MISMATCH。
//      修复：向数据库要 array_to_json(...)::text。
//   2) 私有 worker 持久化的是 canonical（键排序）投影正文，与权威重建的 projection
//      只差键序；旧实现用 JSON.stringify 比较把「同一事实」误判为不一致。修复：按
//      内容（executionDigest）比较。
// 全程只用内存假 query，零数据库、零 Provider、零付费、零真实凭据。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  deriveD05FactStageDigests, attestG5FactStageOutput, attestStageOutputForRequest,
} from '../../tools/gate-stage-output-attestation.mjs';
import { auditHasExactStageBinding } from '../../packages/data-access/src/gate-stage-qualification.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import { rebuildD05ResumeInput } from '../../pipelines/data-production/orchestrator/d05-resume-input.mjs';

const runId = 'b9989b90-5555-4555-8555-555555555555';
const project = 'd9d48901-3aa3-4424-b50f-965d6749ee8e';
const original = 'f474b91b-1111-4111-8111-111111111111';
const rootTask = 'b2143002-5867-4873-9cae-21e0aebccb51';
const sourceVersion = '36ea7ffc-2222-4222-8222-222222222222';
const claim = '0617b049-3333-4333-8333-333333333333';
const finding = '7f713c60-4444-4444-8444-444444444444';
const g4Audit = 'ec893e90-5555-4555-8555-555555555555';
const g3Audit = 'f1d9163e-6666-4666-8666-666666666666';
const g4Artifact = 'a'.repeat(64);
const g3Artifact = 'b'.repeat(64);
const projectionArtifact = 'c'.repeat(64);
const qualDigest = 'd'.repeat(64);
const rawSha = 'e'.repeat(64);
const cid = 'd6ee7004-7777-4777-8777-777777777777';
const projectionId = 'a17059e3-8888-4888-8888-888888888888';
const binding = 'm5-owner-reviewer-g2g5-producer';

const registry = {
  status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture',
  jobs: [
    { stage: 'D03', job_id: 'd03.world-construction', exit_gate: 'G3',
      implementation: { gate_reviewer_binding: binding } },
    { stage: 'D04', job_id: 'd04.humanistic-discovery', exit_gate: 'G4',
      implementation: { gate_reviewer_binding: binding } },
    { stage: 'D05', job_id: 'd05.read-model-publication', exit_gate: 'G5',
      implementation: { gate_reviewer_binding: binding } },
  ],
};

const scope = { project_id: project, original_id: original, root_task_id: rootTask,
  source_version_id: sourceVersion, raw_sha256: rawSha, page_number: 1 };
const g4 = { finding_id: finding, gate_audit_id: g4Audit, artifact_revision: g4Artifact,
  job_id: 'd04.humanistic-discovery', reviewer_binding_ref: binding, consumer: 'producer' };
const g3 = { claim_revision_id: claim, gate_audit_id: g3Audit, artifact_revision: g3Artifact,
  job_id: 'd03.world-construction', reviewer_binding_ref: binding, consumer: 'producer' };
const findingRow = {
  finding_id: finding, method_id: 'A06', qualification: 'UNASSESSED',
  interpretive_statement: '材料记载朱家角为县境中部镇，河道、桥梁与米市关系尚待独立复核。',
  refs: JSON.stringify([{ kind: 'claim_revision', id: claim }]),
};
const claimRow = {
  claim_revision_id: claim, producer_method_id: 'W07',
  payload: JSON.stringify({ project_id: project, original_id: original,
    qualification: 'UNASSESSED', assertion: '材料记载朱家角位于县境中部、为镇政府驻地。' }),
  asserted_time: JSON.stringify({ source_voice: 'official_gazetteer' }),
};

// rebuildD05ResumeInput 依次查 production_runs → qualification_current(D04) →
// meaning.findings → world.claim_revisions → qualification_current(D03)。
const capturedSql = [];
const baseQuery = (o = {}) => {
  const runs = o.runs ?? [{ scope: JSON.stringify(scope) }];
  const g4s = o.g4s ?? [g4];
  const g3s = o.g3s ?? [g3];
  const claims = o.claims ?? [claimRow];
  const findings = o.findings ?? [findingRow];
  const projections = o.projections ?? [];
  return async (sql) => {
    capturedSql.push(sql);
    if (sql.includes('from control.production_runs')) return runs;
    if (sql.includes('from control.qualification_current')) {
      if (sql.includes("a.stage='D04'")) return g4s;
      if (sql.includes("a.stage='D03'")) return g3s;
      return [];
    }
    if (sql.includes('from world.claim_revisions')) return claims;
    if (sql.includes('from meaning.findings')) return findings;
    if (sql.includes('from read_model.world_projections')) return projections;
    return [];
  };
};

const input = await rebuildD05ResumeInput({ query: baseQuery(), runId, projectId: project, registry });
const inputDigest = executionDigest(input);
const persistDigest = createHash('sha256').update(JSON.stringify({
  runId, originalId: input.originalId, findingId: input.findingId, projection: input.projection,
}), 'utf8').digest('hex');

/** 递归按键名逆序重建对象：模拟数据库 canonical（键排序）持久化后的读回形状。 */
function reverseKeyOrder(value) {
  if (Array.isArray(value)) return value.map(reverseKeyOrder);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).reverse().map((k) => [k, reverseKeyOrder(value[k])]));
  }
  return value;
}

const projectionRow = (o = {}) => ({
  projection_id: projectionId,
  projection_key: o.projection_key ?? input.projection.projection_key,
  payload: JSON.stringify({
    body: o.body ?? input.projection.payload,
    schema: 'mohen.private-world-projection.v1',
    finding_id: o.finding_id ?? input.findingId,
    original_id: o.original_id ?? input.originalId,
    qualification: o.qualification ?? 'UNASSESSED',
    request_digest: o.request_digest ?? persistDigest,
  }),
  derived: JSON.stringify(o.derived ?? [input.findingId]),
  rule: JSON.stringify({ method_id: o.method_id ?? 'P02',
    qualification: o.qualification_rule ?? 'UNASSESSED',
    method_version: 'source-sha256:mab-m5-isolated' }),
});

const candidate = (o = {}) => ({
  candidate_id: cid, stage: 'D05', gate_code: 'G5', consumer: 'producer',
  object_type: 'world_projection', object_id: projectionId,
  artifact_revision: projectionArtifact,
  scope: JSON.stringify({ project_id: project }),
  input_fingerprint: o.input_fingerprint ?? inputDigest,
  evidence_refs: o.evidence_refs ?? [
    { kind: 'world_projection', id: projectionId, artifact_revision: projectionArtifact },
    { kind: 'finding', id: input.findingId },
  ],
  dependency_snapshot: o.dependency_snapshot ?? [
    { gate_audit_id: g4Audit, artifact_revision: g4Artifact, qualification_digest: qualDigest },
  ],
});

const derive = (o = {}) => deriveD05FactStageDigests({
  query: baseQuery({ projections: [projectionRow(o.projection)], ...(o.query ?? {}) }),
  candidate: candidate(o.candidate), projectId: project, runId, registry,
});

test('D05→G5 只读取证：真实形状的候选可通过并复现输入摘要', async () => {
  const facts = await derive();
  assert.equal(facts.input_digest, inputDigest);
  assert.match(facts.output_digest, /^[a-f0-9]{64}$/);
});

test('D05→G5 只读取证：投影正文仅键序不同（canonical 持久化）仍判一致', async () => {
  const reordered = reverseKeyOrder(input.projection.payload);
  assert.notEqual(JSON.stringify(reordered), JSON.stringify(input.projection.payload));
  assert.equal(executionDigest(reordered), executionDigest(input.projection.payload));
  const facts = await derive({ projection: { body: reordered } });
  assert.equal(facts.input_digest, inputDigest);
});

test('D05→G5 只读取证：derived_from_finding_ids 必须以 array_to_json 读取（uuid[] 非 JSON）', async () => {
  capturedSql.length = 0;
  await derive();
  const projectionSql = capturedSql.find((sql) => sql.includes('from read_model.world_projections'));
  assert.ok(projectionSql, 'projection query executed');
  assert.match(projectionSql, /array_to_json\(p\.derived_from_finding_ids\)/);
  assert.doesNotMatch(projectionSql, /p\.derived_from_finding_ids::text/);
});

test('D05→G5 只读取证：正文内容被改写则失败关闭', async () => {
  const tampered = { ...input.projection.payload, projection_type: 'tampered' };
  await assert.rejects(derive({ projection: { body: tampered } }),
    /STAGE_OUTPUT_PROJECTION_BINDING_MISMATCH/);
});

test('D05→G5 只读取证：derived 不含该 finding 则失败关闭', async () => {
  await assert.rejects(derive({ projection: { derived: [] } }),
    /STAGE_OUTPUT_PROJECTION_BINDING_MISMATCH/);
});

test('D05→G5 只读取证：持久化 request_digest 不符则失败关闭', async () => {
  await assert.rejects(derive({ projection: { request_digest: 'f'.repeat(64) } }),
    /STAGE_OUTPUT_PROJECTION_PERSIST_DIGEST_MISMATCH/);
});

test('D05→G5 只读取证：非 P02 投影规则则失败关闭', async () => {
  await assert.rejects(derive({ projection: { method_id: 'P04' } }),
    /STAGE_OUTPUT_PROJECTION_BINDING_MISMATCH/);
});

test('D05→G5 只读取证：候选 input_fingerprint 不可复现则失败关闭', async () => {
  await assert.rejects(derive({ candidate: { input_fingerprint: 'f'.repeat(64) } }),
    /STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE/);
});

test('D05→G5 只读取证：dependency_snapshot 未绑定当前 G4 则失败关闭', async () => {
  const otherAudit = [{ gate_audit_id: '99999999-9999-4999-8999-999999999999',
    artifact_revision: g4Artifact, qualification_digest: qualDigest }];
  await assert.rejects(derive({ candidate: { dependency_snapshot: otherAudit } }),
    /STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH/);
});

test('D05→G5 只读取证：G4 资格非唯一（过期/歧义）则失败关闭', async () => {
  await assert.rejects(derive({ query: { g4s: [g4, { ...g4, gate_audit_id: g3Audit }] } }),
    /D05_RESUME_G4_NOT_CURRENT/);
});

test('G5 stage-output attestation：一致请求通过，错 job/错摘要失败关闭', async () => {
  const query = baseQuery({ projections: [projectionRow()] });
  const stageRequest = { schema: 'mohen.independent-gate-current-check.v1', run_id: runId,
    job_id: 'd05.read-model-publication', stage: 'D05', gate_code: 'G5',
    reviewer_binding_ref: binding, input_digest: inputDigest,
    output_digest: (await derive()).output_digest, consumer: 'producer' };
  const attested = await attestG5FactStageOutput({ query, candidate: candidate(),
    request: stageRequest, registry, projectId: project });
  assert.equal(attested.gate_code, 'G5');
  assert.equal(attested.input_digest, inputDigest);
  assert.equal(attested.consumer, 'producer');
  assert.equal(auditHasExactStageBinding({ stage: 'D05', consumer: 'producer',
    input_fingerprint: inputDigest, stage_binding: attested }, stageRequest), true);

  await assert.rejects(attestG5FactStageOutput({ query, candidate: candidate(),
    request: { ...stageRequest, job_id: 'd04.humanistic-discovery' }, registry, projectId: project }),
    /STAGE_OUTPUT_JOB_MISMATCH/);
  await assert.rejects(attestG5FactStageOutput({ query, candidate: candidate(),
    request: { ...stageRequest, output_digest: 'f'.repeat(64) }, registry, projectId: project }),
    /STAGE_OUTPUT_ATTESTATION_MISMATCH/);
});

test('G5 stage-output attestation：唯一分派入口把 D05/G5 交给事实分支取证', async () => {
  const query = baseQuery({ projections: [projectionRow()] });
  const facts = await derive();
  const attested = await attestStageOutputForRequest({ query, candidate: candidate(),
    request: { schema: 'mohen.independent-gate-current-check.v1', run_id: runId,
      job_id: 'd05.read-model-publication', stage: 'D05', gate_code: 'G5',
      reviewer_binding_ref: binding, input_digest: inputDigest,
      output_digest: facts.output_digest, consumer: 'producer' },
    registry, projectId: project });
  assert.equal(attested.job_id, 'd05.read-model-publication');
});
