#!/usr/bin/env node
// 步骤④ 的真实入口：跑一次 D00 第一道工序（Y01 来源需求与存量缺口诊断）。
//
// 目的：确认 Y01 不再只是"把调用方给的空对象抄进库"，而是**自己清点项目真实存量**、
// 算出缺口、再经唯一写入口（source-discovery-repository.recordSourceNeed）落库，
// 且这条回执能在 Studio 资料台回读。
//
// 证据边界（不夸大）：
//   * 存量清点走私有工人登录 + 工作室身份的 Owner RLS 事务，与原件读回同一条通道；
//   * 写库走私有工人的唯一写入口，不开第二条写路径；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格。
//
// 负例：意图为空 / 存量读不出来 → 失败关闭，库里不得多出回执。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import { diagnoseSourceNeed } from "../pipelines/data-production/workers/source-need-diagnosis.mjs";

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
const RESEARCH_INTENT = "《松江府志》所载金泽镇水系与市镇兴衰：需要可核验的原件旁证与同时代地方文献";
const REQUESTED_DIMENSIONS = ["time_coverage", "regional_coverage"];

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const hold = (message) => {
  console.log(JSON.stringify({ status: "Y01_EXECUTOR_HOLD", reason: message }, null, 2));
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

const countNeeds = async () => {
  const { rows } = await servicePool.query("select count(*)::int as n from source.source_needs");
  return rows[0].n;
};

const report = { status: "Y01_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });

  // 1) 真实清点本项目存量（读不到即失败关闭，绝不当成"零存量"）。
  const stock = await originals.projectStock(PROJECT_ID, token);
  report.checks.stock = stock;

  // 2) 工序自己算缺口。
  const diagnosis = diagnoseSourceNeed({
    researchIntent: RESEARCH_INTENT,
    stock,
    requestedDimensions: REQUESTED_DIMENSIONS,
  });
  report.checks.diagnosis = diagnosis.existing_stock_gap;

  // 3) 负例：意图为空 → 失败关闭，不得写库。
  const before = await countNeeds();
  let emptyIntentRejected = false;
  try {
    diagnoseSourceNeed({ researchIntent: "   ", stock });
  } catch (error) {
    emptyIntentRejected = String(error?.message).includes("SOURCE_NEED_INTENT_REQUIRED");
  }
  // 4) 负例：存量读不出来（非法项目作用域）→ 失败关闭。
  let badScopeRejected = false;
  try {
    await originals.projectStock("not-a-project", token);
  } catch (error) {
    badScopeRejected = String(error?.message).includes("ORIGINAL_ID_INVALID");
  }
  const afterNegatives = await countNeeds();
  report.checks.negatives = {
    empty_intent_rejected: emptyIntentRejected,
    bad_stock_scope_rejected: badScopeRejected,
    needs_unchanged: before === afterNegatives,
  };

  // 5) 正例：经唯一写入口落库。
  const need = await discovery.recordSourceNeed({
    projectId: PROJECT_ID,
    researchIntent: RESEARCH_INTENT,
    scope: { project_id: PROJECT_ID, intent_schema: "mohen.source-need.v1" },
    coverageDimensions: diagnosis.coverage_dimensions,
    existingStockGap: diagnosis.existing_stock_gap,
    rightsBoundary: { status: "unverified", note: "本项目存量权利按来源逐条登记，此处不推断" },
    producedBy: "D00/Y01",
  });
  report.need = need;

  // 6) 回读：工人角色读得到这条回执，且缺口就是算出来的那份。
  const { rows } = await pool.query(
    `select need_id::text as need_id, produced_by, coverage_dimensions::text as coverage_dimensions,
            existing_stock_gap::text as existing_stock_gap
       from source.source_needs where need_id = $1::uuid`,
    [need.need_id]
  );
  const stored = rows[0];
  const storedGap = stored ? JSON.parse(stored.existing_stock_gap) : null;
  report.checks.readback = {
    found: Boolean(stored),
    produced_by: stored?.produced_by ?? null,
    gap_schema: storedGap?.schema ?? null,
    gaps: Array.isArray(storedGap?.gaps) ? storedGap.gaps.map((gap) => `${gap.dimension}:${gap.state}`) : null,
  };

  const ok = report.checks.readback.found
    && report.checks.readback.gap_schema === diagnosis.existing_stock_gap.schema
    && report.checks.negatives.empty_intent_rejected
    && report.checks.negatives.bad_stock_scope_rejected
    && report.checks.negatives.needs_unchanged
    && Array.isArray(report.checks.readback.gaps) && report.checks.readback.gaps.length > 0;
  report.status = ok ? "Y01_EXECUTOR_PROVEN" : "Y01_EXECUTOR_HOLD";
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
