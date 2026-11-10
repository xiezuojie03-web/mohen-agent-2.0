#!/usr/bin/env node
// Y06 工序真实链验证：D00 第六道工序（资源价值互补与取得优先级评估）必须用真实
// 私有工人角色、真实登记读取通道跑通——处置由工序从 Y03 核查结论派生
// （admissible→selected、needs_owner→deferred、rejected→excluded），
// 经唯一写入口（source-discovery-repository.recordPriorityAssessment）落库，
// 并能以工人角色回读，在 Studio 资料台可见。
//
// 证据边界（不夸大）：
//   * 本真实来源 Y03 结论为 needs_owner（时空异名词源未读），故处置只能是
//     deferred——绝不放宽为 selected；
//   * 库内触发器负例：同一候选没有 admissible 核查时强写 selected 必须被库拒绝
//     （PRIORITY_SELECTED_REQUIRES_ADMISSIBLE_VERIFICATION）；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import { deriveIntakeCandidateVerification } from "../pipelines/data-production/workers/source-candidate-verification.mjs";
import {
  deriveIntakePriority,
  PRIORITY_ASSESSMENT_SCHEMA,
  INTAKE_PRIORITY_METHOD,
  INTAKE_PRIORITY_METHOD_VERSION,
} from "../pipelines/data-production/workers/source-priority-assessment.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
const ORIGINAL_ID = "b0a11000-0000-4000-8000-000000000002";

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const hold = (message) => {
  console.log(JSON.stringify({ status: "Y06_EXECUTOR_HOLD", reason: message }, null, 2));
  process.exit(2);
};
if (typeof secret !== "string" || !secret) hold("MOHEN_DATABASE_SESSION_SECRET 未配置");
const workerUrl = process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL;
if (!workerUrl) hold("MOHEN_PRIVATE_WORKER_DATABASE_URL 未配置，无法按真实工人角色执行");

function makeToken(uid) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 120000 })).toString("base64url");
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  return `${payload}.${sig}`;
}

const ownerRows = await queryRows(
  `select owner_user_id::text as owner_user_id, project_title
     from studio.projects where project_id = (:'id')::uuid`,
  { id: PROJECT_ID }
);
const owner = ownerRows[0];
if (!owner) hold("项目不存在");
const token = makeToken(owner.owner_user_id);

const caFile = process.env.MOHEN_DATABASE_CA_CERT_FILE;
const ca = process.env.MOHEN_DATABASE_CA_CERT
  ?? (caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile, "utf8") : undefined);

const { createPrivateWorkerPool, assertPrivateWorkerIdentity } = await import(
  "../packages/data-access/src/private-worker-pool.mjs"
);
const pool = await createPrivateWorkerPool(workerUrl, { ca });
const servicePool = getNodePgPool();

const countAssessments = async () => {
  const { rows } = await servicePool.query("select count(*)::int as n from source.priority_assessments");
  return rows[0].n;
};

const report = { status: "Y06_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });

  // 1) 处置挂在 Y01 需求与 Y02 准入目录条目上。
  const entryRows = await queryRows(
    `select catalog_entry_id::text as catalog_entry_id, need_id::text as need_id
       from source.resource_catalog
      where project_id = (:'id')::uuid and discovered_by_method = 'D00/Y02:intake_registration'
      order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  const entry = entryRows[0];
  if (!entry) hold("项目还没有 Y02 准入目录条目，先跑 verify-y02-executor.mjs");

  // 2) 真实链：读原件记录 → 读登记 → 工序先重跑 Y03 核查（本次仍无异名词源，
  //    结论仍是 needs_owner），再从核查结论派生 Y06 处置。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);
  const verification = deriveIntakeCandidateVerification({ registration, record, expansions: [] });
  if (verification.verdict !== "needs_owner") hold("本来源的 Y03 结论预期为 needs_owner");
  const derived = deriveIntakePriority({ registration, verification });
  report.checks.derived = {
    decision: derived.decision, rationale: derived.rationale,
    authority: derived.criteria.authority.state, relevance: derived.criteria.relevance.state,
    coverage: derived.criteria.coverage.state, freshness: derived.criteria.freshness.state,
    rights: derived.criteria.rights.state,
  };
  if (derived.decision !== "deferred") hold("needs_owner 的处置只能是 deferred");

  // 3) 负例（不写库）：核查结论缺失/越界即失败关闭。
  let verdictlessRejected = false;
  try {
    deriveIntakePriority({ registration, verification: { verdict: "approved" } });
  } catch (error) {
    verdictlessRejected = String(error?.message).includes("PRIORITY_VERIFICATION_VERDICT_INVALID");
  }
  // 库内触发器负例：同一候选没有 admissible 核查时强写 selected 必须被库拒绝。
  let triggerRejected = false;
  try {
    await discovery.recordPriorityAssessment({
      projectId: PROJECT_ID, needId: entry.need_id, catalogEntryId: entry.catalog_entry_id,
      criteria: { probe: true }, decision: "selected",
      rationale: "负例探针：无 admissible 核查强写 selected", methodKey: "probe", methodVersion: "v1",
    });
  } catch (error) {
    triggerRejected = String(error?.message).includes("PRIORITY_SELECTED_REQUIRES_ADMISSIBLE_VERIFICATION");
  }
  const before = await countAssessments();
  report.checks.negatives = {
    verdictless_rejected: verdictlessRejected,
    selected_without_admissible_rejected_by_db: triggerRejected,
    count_unchanged_by_negatives: (await countAssessments()) === before,
  };

  // 4) 正例：经唯一写入口落库。
  const saved = await discovery.recordPriorityAssessment({
    projectId: PROJECT_ID, needId: entry.need_id, catalogEntryId: entry.catalog_entry_id,
    criteria: derived.criteria, decision: derived.decision, rationale: derived.rationale,
    methodKey: derived.methodKey, methodVersion: derived.methodVersion,
  });
  report.assessment = { assessment_id: saved.assessment_id, decision: saved.decision };
  const after = await countAssessments();
  report.checks.negatives.count_increased_by_one = after === before + 1;

  // 5) 回读：工人角色读得到这条处置，且内容就是派生的那份。
  const { rows } = await pool.query(
    `select assessment_id::text as assessment_id, catalog_entry_id::text as catalog_entry_id,
            decision, rationale, method_key, method_version, criteria::text as criteria
       from source.priority_assessments where assessment_id = $1::uuid`,
    [saved.assessment_id]
  );
  const stored = rows[0];
  const storedCriteria = stored ? JSON.parse(stored.criteria) : null;
  report.checks.readback = {
    found: Boolean(stored),
    catalog_entry_id: stored?.catalog_entry_id ?? null,
    decision: stored?.decision ?? null,
    method: stored ? `${stored.method_key}@${stored.method_version}` : null,
    schema: storedCriteria?.schema ?? null,
    relevance: storedCriteria?.relevance?.state ?? null,
    rationale: stored?.rationale ?? null,
  };

  const ok = report.checks.readback.found
    && report.checks.readback.catalog_entry_id === entry.catalog_entry_id
    && report.checks.readback.decision === "deferred"
    && report.checks.readback.method === `${INTAKE_PRIORITY_METHOD}@${INTAKE_PRIORITY_METHOD_VERSION}`
    && report.checks.readback.schema === PRIORITY_ASSESSMENT_SCHEMA
    && report.checks.readback.relevance === "unknown"
    && String(report.checks.readback.rationale).includes(verification.reasonCode)
    && report.checks.negatives.verdictless_rejected
    && report.checks.negatives.selected_without_admissible_rejected_by_db
    && report.checks.negatives.count_unchanged_by_negatives
    && report.checks.negatives.count_increased_by_one;
  report.status = ok ? "Y06_EXECUTOR_PROVEN" : "Y06_EXECUTOR_HOLD";
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = ok ? 0 : 1;
} catch (error) {
  report.reason = String(error?.stack ?? error);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await pool.end();
  await servicePool.end();
}
