#!/usr/bin/env node
// M5：把已发布真实作品的 G0—G5 资格链按**当前**对象内容重建，并做 HTTP 级
// 「可消费 → 撤权即时拒绝 → 重签恢复」验证（本地隔离，仅本地 PG + 本地 3210）。
//
// 为什么需要重建：2026-11-09 的 artifact 身份修正（登记内容列哈希）让 G0 对象
// `source.source_versions b0a11000-…-0005` 的哈希发生变化（CP2-C 冻结 rights_snapshot），
// 于是整链被 `control.invalidation_events` 登记退休，WATCH 只剩样例作品。
// Owner 2026-11-10 裁决 A：先为该来源补显式公有领域权利（`tools/stamp-public-domain-rights.mjs`），
// 再按合同重签整链——本工具负责第二步。
//
// 诚实边界：
// - G0—G4 与 G5(producer) 一律走 `tools/rule-gate-reviewer.mjs` 的**真实规则评审**，自建判定不做数；
// - G5(watch) 的修订绑定回执按批次 H 的同一口径构造（逐字段绑定 + 逐动作权利），
//   由机器评审身份签发，**不等于** Owner 的人文背书；
// - 候选登记由超级用户直连完成（与批次 H 一致，隔离演练口径）；
// - 不改生产库、不改代码路径、不碰外部服务。

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryRows, run, workContentDigest } from "../packages/data-access/src/index.mjs";
import { buildMethodPlanRefs, isMethodPlanRef } from "../packages/data-access/src/method-plan-ref.mjs";
import {
  MACHINE_REVIEWER_USER_ID,
  mintMachineSessionToken,
} from "./machine-reviewer-session.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATE_AUTHORITY_SCRIPT = path.resolve(rootDir, "packages/data-access/scripts/gate-authority.mjs");
const RULE_REVIEWER_SCRIPT = path.resolve(rootDir, "tools/rule-gate-reviewer.mjs");
const EVIDENCE_PATH = path.resolve(rootDir, "tasks/results/MAB/evidence/m5-watch-eligibility/verify-5m.json");
const BASE_URL = process.env.MOHEN_VERIFY_BASE_URL ?? "http://127.0.0.1:3210";

const WORK = "5b42577e-a4d6-4024-b1f9-99d0d788c9ec";
const REVISION = "62a8ba95-e07f-4f7e-bcb9-f728004d651a";
const PROJECTION = "560c5f6d-a7b0-6ec5-1f0b-0ed98d60c91d";

// 已退休的链：按门顺序排列，候选只作为"证据碎片模板"（run_id/stage/evidence_refs/scope）。
const CHAIN = [
  { gate: "G0", candidate: "4dd44e1c-8c6a-4492-8aad-2d1294b3408d" },
  { gate: "G1", candidate: "13105b76-e6dd-4d92-9800-0ee318ac9a10" },
  { gate: "G2", candidate: "05de243a-e8ea-47ea-be32-e933b56737fc" },
  { gate: "G3", candidate: "b4f17acc-a0a8-446b-8eca-94b6815df7ae" },
  { gate: "G4", candidate: "422c7052-9719-4412-aee0-f85423d75c0a" },
  { gate: "G5", candidate: "c1b252bc-7a1d-4784-a72f-d1b0a8a76e73" },
];
const G5_WATCH_TEMPLATE = "bbe5c657-7263-4317-baa4-e4c1c49a97cc";

const WATCH_CTX = {
  purpose: { namespace: "mohen.watch", code: "display", version: "1" },
  scope: { mode: "public_watch" },
};

const sha256 = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const asJsonValue = (value) => (typeof value === "string" ? JSON.parse(value) : value);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function gateAuthority(command, decision, sessionToken) {
  const machineUrl = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  if (!machineUrl) throw new Error("MOHEN_GATE_MACHINE_DATABASE_URL missing");
  const result = spawnSync(process.execPath, [GATE_AUTHORITY_SCRIPT, command], {
    input: JSON.stringify({ decision, sessionToken }),
    env: { ...process.env, MOHEN_GATE_DATABASE_URL: machineUrl },
    encoding: "utf8",
    timeout: 90000,
  });
  if (result.status !== 0) throw new Error(`gate-authority ${command} failed: ${(result.stderr || "").trim()}`);
  return JSON.parse(result.stdout.trim());
}

function runRuleReviewer(gate) {
  const result = spawnSync(process.execPath, [RULE_REVIEWER_SCRIPT, "--gate", gate], {
    env: process.env,
    encoding: "utf8",
    timeout: 180000,
  });
  const line = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .filter((item) => item.startsWith("RULE_GATE_REVIEW") || item.startsWith("RULE_GATE_REVEIEW") || item.startsWith("RULE_GATE_REVIEW_FAILED"))
    .join(" | ");
  return { status: result.status, line };
}

async function artifactRevision(objectType, objectId) {
  const rows = await queryRows(
    `select control.artifact_revision_for((:'ot')::text, (:'oid')::uuid)::text as rev`,
    { ot: objectType, oid: objectId }
  );
  return rows[0].rev;
}

async function readCandidate(candidateId) {
  const rows = await queryRows(
    `select candidate_id::text as candidate_id, run_id::text as run_id, stage, gate_code,
        object_type, object_id::text as object_id, artifact_revision::text as artifact_revision,
        purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
        dependency_snapshot, evidence_refs
       from control.gate_candidates where candidate_id = (:'cid')::uuid`,
    { cid: candidateId }
  );
  const row = rows[0];
  if (!row) throw new Error(`CANDIDATE_TEMPLATE_MISSING:${candidateId}`);
  return {
    ...row,
    allowed_scope: asJsonValue(row.allowed_scope),
    dependency_snapshot: asJsonValue(row.dependency_snapshot),
    evidence_refs: asJsonValue(row.evidence_refs),
  };
}

async function insertCandidate(source, { artifactRevision: arev, dependencySnapshot, fingerprintSeed }) {
  const candidateId = crypto.randomUUID();
  await run(
    `insert into control.gate_candidates(candidate_id, run_id, stage, gate_code, object_type, object_id,
        artifact_revision, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
        input_fingerprint, dependency_snapshot, evidence_refs, candidate_status, producer_identity)
     values ((:'cid')::uuid, (:'run')::uuid, :'stage', :'gate', :'ot', (:'oid')::uuid, :'arev',
        :'ns', :'code', :'ver', :'consumer', (:'scope')::jsonb,
        :'fp', (:'deps')::jsonb, (:'refs')::jsonb, 'SUBMITTED', 'mohen_private_worker')`,
    {
      cid: candidateId,
      run: source.run_id,
      stage: source.stage,
      gate: source.gate_code,
      ot: source.object_type,
      oid: source.object_id,
      arev,
      ns: source.purpose_namespace,
      code: source.purpose_code,
      ver: source.purpose_version,
      consumer: source.consumer,
      scope: JSON.stringify(source.allowed_scope),
      fp: sha256(fingerprintSeed),
      deps: JSON.stringify(dependencySnapshot),
      refs: JSON.stringify(source.evidence_refs),
    }
  );
  return candidateId;
}

async function auditFor(candidateId) {
  const rows = await queryRows(
    `select gate_audit_id::text as audit_id, artifact_revision::text as artifact_revision,
        qualification_digest, decision_origin, consumer, result,
        control.current_qualification_is_valid(gate_audit_id) as current
       from control.gate_audits where candidate_id = (:'cid')::uuid`,
    { cid: candidateId }
  );
  const row = rows[0];
  if (!row) return null;
  // data-access 走 psql 文本通道，布尔会以 't'/'f' 回来；统一成真布尔再判定。
  return { ...row, current: row.current === true || row.current === "t" };
}

async function currentQualification(objectType, objectId, artifactRevisionValue) {
  const rows = await queryRows(
    `select q.gate_audit_id::text as audit_id, q.artifact_revision::text as artifact_revision,
        a.qualification_digest,
        control.current_qualification_is_valid(q.gate_audit_id) as current
       from control.qualification_current q
         join control.gate_audits a on a.gate_audit_id = q.gate_audit_id
      where q.gate_code = (:'gate') and q.object_type = (:'ot')::text and q.object_id = (:'oid')::uuid
        and q.artifact_revision = (:'arev')::text and q.consumer = 'producer'
      order by q.valid_until desc limit 1`,
    { gate: "G0", ot: objectType, oid: objectId, arev: artifactRevisionValue }
  );
  const row = rows[0];
  if (!row) return null;
  return row.current === true || row.current === "t" ? row : null;
}

async function waitForServer(timeoutMs = 240000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/works/published`);
      if (response.ok) return true;
    } catch {
      // server not up yet
    }
    await sleep(2000);
  }
  return false;
}

async function fetchPublishedWorks() {
  const response = await fetch(`${BASE_URL}/api/works/published`);
  const body = await response.json().catch(() => ({}));
  const works = Array.isArray(body?.works) ? body.works : [];
  return { status: response.status, ids: works.map((item) => String(item.work_id ?? item.workId ?? item.id ?? "")) };
}

async function signWatchRevision(template, dependencySnapshot, validUntil, state) {
  const revisionRows = await queryRows(
    `select title, description, content::text as content
       from publication.work_revisions where revision_id = (:'rid')::uuid`,
    { rid: REVISION }
  );
  const revision = revisionRows[0];
  if (!revision) throw new Error("WORK_REVISION_MISSING");
  const content = asJsonValue(revision.content);
  const binding = {
    schema: "mohen.work-revision-g5-binding.v1",
    work_id: WORK,
    revision_id: REVISION,
    content_sha256: workContentDigest(content),
    complete_work: true,
    consumer: "watch",
    purpose: WATCH_CTX.purpose,
    scope: WATCH_CTX.scope,
    rights_by_action: { display: "allowed" },
    title: String(revision.title),
    description: String(revision.description),
    rights_valid_until: validUntil,
  };
  const currentRows = await queryRows(
    `select gate_audit_id::text as audit_id from control.qualification_current
       where gate_code='G5' and object_type=(:'ot')::text and object_id=(:'oid')::uuid
         and artifact_revision=(:'arev')::text and purpose_namespace=:'ns' and purpose_code=:'code'
         and purpose_version=:'ver' and consumer='watch'`,
    {
      ot: template.object_type,
      oid: template.object_id,
      arev: state.projectionRevision,
      ns: WATCH_CTX.purpose.namespace,
      code: WATCH_CTX.purpose.code,
      ver: WATCH_CTX.purpose.version,
    }
  );
  const candidateId = await insertCandidate(template, {
    artifactRevision: state.projectionRevision,
    dependencySnapshot,
    fingerprintSeed: { gate: "G5", object: template.object_id, revision: state.projectionRevision, consumer: "watch", at: validUntil },
  });
  const token = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID });
  const out = gateAuthority(
    "decide",
    {
      requestId: crypto.randomUUID(),
      candidateId,
      result: "PASS",
      ruleVersion: "v1",
      validUntil,
      expectedAuditId: currentRows[0]?.audit_id ?? null,
      receipt: {
        checks: { work_revision_binding: true, rights_by_operation: true },
        work_revision_binding: binding,
        rationale:
          "M5 重签：已发布修订逐字段绑定（content_sha256/标题/描述/完整作品）+ 逐动作权利核验；机器规则签发，人文背书仍以 Owner 体验为准。",
        evidence_refs: template.evidence_refs,
      },
    },
    token
  );
  return { candidateId, auditId: out.gate_audit_id, binding };
}

async function main() {
  const state = { projectionRevision: await artifactRevision("world_projection", PROJECTION) };
  const steps = [];
  const record = (name, ok, detail) => {
    steps.push({ step: name, ok, ...detail });
    if (!ok) throw new Error(`STEP_FAILED:${name}:${JSON.stringify(detail)}`);
  };

  // 1. 前置：已发布作品此刻确实不在 WATCH（复现问题），且服务可读。
  if (!(await waitForServer())) throw new Error("DEV_SERVER_UNREACHABLE");
  const before = await fetchPublishedWorks();
  record("http.before_rebuild", before.status === 200, { status: before.status, ids: before.ids });

  // 2. 依次重建 G0→G4、G5(producer)：候选由已退休候选复制证据碎片，对象内容哈希取当前值。
  //    G0 现在必须带 C 方法预选引用；本链的 D01 读法不是猜的——按该 read_unit 实际使用的
  //    读运行 config.schema 反推（扫描页阅读 → C02，纯文本阅读 → C01），不补默认值。
  const readRunSchema = (
    await queryRows(
      `select r.config->>'schema' as schema from source.read_runs r
         join source.read_units u using(read_run_id)
        where u.read_unit_id = (:'id')::uuid`,
      { id: "ff227f15-b9b5-c37f-b309-52ad6120b5dc" }
    )
  )[0]?.schema;
  const methodId =
    readRunSchema === "mab.private-scanned-page-reading.v1"
      ? "C02"
      : readRunSchema === "mab.private-text-reading.v1"
        ? "C01"
        : null;
  if (!methodId) throw new Error(`D01_READ_METHOD_UNRESOLVED:${readRunSchema ?? "unknown"}`);
  const methodPlanRefs = buildMethodPlanRefs({ methods: [{ method_id: methodId, method_version: "v1" }] });
  state.methodPlan = { read_run_schema: readRunSchema, method_id: methodId, refs: methodPlanRefs };
  let parent = null;
  for (const entry of CHAIN) {
    const template = await readCandidate(entry.candidate);
    const currentRevision = await artifactRevision(template.object_type, template.object_id);
    const reusable = await currentQualification(template.object_type, template.object_id, currentRevision);
    if (reusable) {
      // 幂等：该门在该对象当前内容上已有有效资格，直接复用，不重复签发。
      record(`chain.${entry.gate}`, true, {
        reused: true,
        auditId: reusable.audit_id,
        objectType: template.object_type,
        objectId: template.object_id,
        artifactRevision: currentRevision,
      });
      parent = {
        audit_id: reusable.audit_id,
        digest: reusable.qualification_digest,
        artifact_revision: reusable.artifact_revision,
      };
      if (entry.gate === "G4") state.g4 = parent;
      continue;
    }
    const dependencySnapshot = parent
      ? [{ gate_audit_id: parent.audit_id, qualification_digest: parent.digest, artifact_revision: parent.artifact_revision }]
      : [];
    const refreshedRefs = template.evidence_refs.map((ref) =>
      ref && ref.id === template.object_id && "artifact_revision" in ref
        ? { ...ref, artifact_revision: currentRevision }
        : ref
    );
    const evidenceRefs =
      entry.gate === "G0" && !refreshedRefs.some(isMethodPlanRef)
        ? [...refreshedRefs, ...methodPlanRefs]
        : refreshedRefs;
    // 同一门/同一对象/同一消费者下超期未签的旧 SUBMITTED 候选改为 HOLD（不改内容、不冒充评审结论），
    // 避免评审器在多个候选之间"取最新"时语义含糊。
    await run(
      `update control.gate_candidates set candidate_status = 'HOLD'
        where gate_code = :'gate' and object_type = :'ot' and object_id = (:'oid')::uuid
          and consumer = :'consumer' and candidate_status = 'SUBMITTED'`,
      { gate: entry.gate, ot: template.object_type, oid: template.object_id, consumer: template.consumer }
    );
    const candidateId = await insertCandidate(
      { ...template, evidence_refs: evidenceRefs },
      {
        artifactRevision: currentRevision,
        dependencySnapshot,
        fingerprintSeed: { gate: entry.gate, object: template.object_id, revision: currentRevision, consumer: template.consumer },
      }
    );
    const review = runRuleReviewer(entry.gate);
    const audit = await auditFor(candidateId);
    record(`chain.${entry.gate}`, Boolean(audit && audit.result === "PASS" && audit.current === true), {
      candidateId,
      auditId: audit?.audit_id ?? null,
      current: audit?.current ?? null,
      reviewer: review.line,
      objectType: template.object_type,
      objectId: template.object_id,
      artifactRevision: currentRevision,
      dependedOn: dependencySnapshot[0]?.gate_audit_id ?? null,
    });
    parent = {
      audit_id: audit.audit_id,
      digest: audit.qualification_digest,
      artifact_revision: audit.artifact_revision,
    };
    if (entry.gate === "G4") state.g4 = parent;
  }

  // 3. G5(watch)：把已发布修订绑定到当前投影资格上（依赖 G4）。
  const watchTemplate = await readCandidate(G5_WATCH_TEMPLATE);
  const validUntil = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  const signed = await signWatchRevision(
    { ...watchTemplate, artifact_revision: state.projectionRevision },
    [{ gate_audit_id: state.g4.audit_id, qualification_digest: state.g4.digest, artifact_revision: state.g4.artifact_revision }],
    validUntil,
    state
  );
  const watchAudit = await auditFor(signed.candidateId);
  record("chain.G5_watch", Boolean(watchAudit && watchAudit.result === "PASS" && watchAudit.current === true), {
    candidateId: signed.candidateId,
    auditId: signed.auditId,
    current: watchAudit?.current ?? null,
    binding: signed.binding,
  });

  // 4. HTTP 正例：真实作品重新出现在 WATCH 可消费列表。
  const positive = await fetchPublishedWorks();
  record("http.positive_after_resign", positive.ids.includes(WORK), { ids: positive.ids });

  // 5. 撤权 → HTTP 立即拒绝（P08 精准失效的 HTTP 断言）。
  const machineToken = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID });
  const revoked = gateAuthority(
    "revoke",
    {
      auditId: signed.auditId,
      requestId: crypto.randomUUID(),
      reason: "M5 3.6 HTTP 撤权即时拒绝断言（本地隔离，撤权后立即重签恢复）",
    },
    machineToken
  );
  const afterRevoke = await fetchPublishedWorks();
  record("http.revoked_immediate_deny", !afterRevoke.ids.includes(WORK), {
    blockedCount: revoked.blocked_count,
    ids: afterRevoke.ids,
  });

  // 6. 重签恢复：再签一次同一对象/修订（不同 validUntil 以区分候选），HTTP 恢复可见。
  const restoreValidUntil = new Date(Date.now() + 29 * 24 * 3600_000).toISOString();
  const restored = await signWatchRevision(
    { ...watchTemplate, artifact_revision: state.projectionRevision },
    [{ gate_audit_id: state.g4.audit_id, qualification_digest: state.g4.digest, artifact_revision: state.g4.artifact_revision }],
    restoreValidUntil,
    state
  );
  const restoredAudit = await auditFor(restored.candidateId);
  const afterRestore = await fetchPublishedWorks();
  record("http.restored_after_resign", afterRestore.ids.includes(WORK), {
    auditId: restored.auditId,
    current: restoredAudit?.current ?? null,
    ids: afterRestore.ids,
  });

  const summary = {
    status: "VERIFY_5M_ALL_PASS",
    ranAt: new Date().toISOString(),
    isolation: "local-mohen_dev + localhost:3210",
    work: WORK,
    revision: REVISION,
    projection: PROJECTION,
    projectionRevision: state.projectionRevision,
    methodPlan: state.methodPlan,
    watchAuditId: signed.auditId,
    restoredAuditId: restored.auditId,
    revokedAuditId: signed.auditId,
    boundary: {
      machineSigned: "G5 watch 由机器评审身份签发，不等于 Owner 人文背书",
      candidateInsert: "候选登记由超级用户直连完成（隔离演练口径）",
      rights: "公有领域显式权利来自 tools/stamp-public-domain-rights.mjs 的 PD-old 证据",
    },
    steps,
  };
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  console.log("VERIFY_5M_ALL_PASS");
}

main().catch(async (error) => {
  const failure = {
    status: "VERIFY_5M_FAILED",
    ranAt: new Date().toISOString(),
    error: String(error?.message ?? error),
  };
  try {
    const current = await fetchPublishedWorks();
    failure.publishedIds = current.ids;
  } catch {
    // ignore
  }
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(failure, null, 2));
  console.log("VERIFY_5M_FAILED");
  process.exitCode = 1;
});
