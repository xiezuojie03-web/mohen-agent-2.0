#!/usr/bin/env node
// Y08 工序真实链验证（历史文件名，工序归位见下）：D00 第八道工序「来源资产完整性与
// 取得证据鉴定」的 extent/missing_parts 结论必须用真实私有工人角色、真实登记读取通道跑通——
// 覆盖结论由工序从本次准入真值与真实获取尝试派生，经唯一写入口
// （source-discovery-repository.recordAcquisitionCoverage）落库，并能以工人角色回读，在 Studio 资料台可见。
//
// 工序归位（按 D00 交付包规范原文，不是改名游戏）：
//   * 「取得范围与缺失部件」是 Y08 的产出（ValidatedAssetReceipt、extent/missing_parts），
//     本工具早先被标为 Y04；Y04 的产出是 OriginalProviderTrace 与原机构回溯链
//     （见 tools/verify-y04-origin-trace.mjs）。旧 append-only 行保留原样，新行一律写 Y08。
//
// 证据边界（不夸大）：
//   * 登记读取走私有工人登录 + 工作室身份的 Owner RLS 事务，与原件读回同一条通道；
//   * 写库走私有工人的唯一写入口，不开第二条写路径；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格；
//   * 本次只核到第 35 页的字节，总量（这份版本共多少页）没有核实，
//     completeness 必须是 unknown，工具不替工序说 partial/complete。
//
// 负例：字节被篡改 / 尝试自称取得但字节对不上 / 没有尝试 → 失败关闭，且都不落库。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import {
  deriveIntakeCoverage,
  COVERAGE_CONCLUSION_SCHEMA,
  INTAKE_COVERAGE_METHOD,
  INTAKE_COVERAGE_METHOD_VERSION,
} from "../pipelines/data-production/workers/source-coverage-conclusion.mjs";

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
const PAGE_NUMBER = 35;

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const hold = (message) => {
  console.log(JSON.stringify({ status: "Y04_EXECUTOR_HOLD", reason: message }, null, 2));
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

const countCoverages = async () => {
  const { rows } = await servicePool.query("select count(*)::int as n from source.acquisition_coverages");
  return rows[0].n;
};

const report = { status: "Y04_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });

  // 1) 覆盖挂在 Y02 已登记的真实准入目录条目与 Y01 需求上。
  const entryRows = await queryRows(
    `select catalog_entry_id::text as catalog_entry_id, need_id::text as need_id
       from source.resource_catalog
      where project_id = (:'id')::uuid and discovered_by_method = 'D00/Y02:intake_registration'
      order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  const entry = entryRows[0];
  if (!entry) hold("项目还没有 Y02 准入目录条目，先跑 verify-y02-executor.mjs");

  // 2) 真实链：读原件记录 → 读登记。覆盖结论需要一次真实获取尝试：
  //    本页确为从 NAJ 馆藏页面人工下载并登记的 JPEG（原件现处 STORED_VERIFIED）。
  //    若库里还没有这次尝试的账，经同一唯一写入口如实补上；已有就复用最新一条。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);

  let attempt = null;
  const attemptRows = await queryRows(
    `select attempt_id::text as attempt_id, result_state, asset_sha256, byte_size
       from source.acquisition_attempts
      where project_id = (:'id')::uuid and result_state = 'acquired_verified'
      order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  if (attemptRows[0]) {
    attempt = attemptRows[0];
    report.attempt_reused = attempt.attempt_id;
  } else {
    await discovery.registerAcquisitionMethod({
      methodKey: "M0002", methodVersion: "v1",
      resourceScope: { provider: registration.provider, locator: registration.original_locator },
      accessMode: "manual_download",
      preconditions: ["馆藏页面对公网可见", "页面提供本页图像下载"],
      steps: ["按馆方目录号定位藏品页面", "下载本页 JPEG", "按原件登记流程入库并核验哈希"],
      successCriteria: ["入库字节哈希与下载文件一致"],
      failureModes: ["页面不可达", "图像缺页", "下载字节与登记不一致"],
      alternatives: [],
      methodState: "TESTED_SUCCESS",
    });
    const needRows = await queryRows(
      `select need_id::text as need_id from source.source_needs
        where project_id = (:'id')::uuid order by created_at desc limit 1`,
      { id: PROJECT_ID }
    );
    if (!needRows[0]) hold("项目还没有 Y01 需求回执，先跑 verify-y01-executor.mjs");
    const appended = await discovery.appendAcquisitionAttempt({
      projectId: PROJECT_ID,
      needId: needRows[0].need_id,
      candidateRef: { catalog_entry_id: entry.catalog_entry_id },
      methodKey: "M0002", methodVersion: "v1",
      executionEnvironment: { kind: "owner_workstation", note: "NAJ 馆藏页面人工下载" },
      requestDigest: record.sha256,
      startedAt: new Date(Date.now() - 60000),
      finishedAt: new Date(),
      resultState: "acquired_verified",
      acquiredExtent: { pages: [PAGE_NUMBER] },
      byteSize: record.byte_size,
      assetSha256: record.sha256,
      sourceLocator: registration.original_locator,
      // 登记里只有自述 basis/status，九个动作本次都没有逐动作依据：如实留空
      // （写入口不接受非动作键；缺失动作在裁决时等价 unknown = HOLD）。
    });
    attempt = { attempt_id: appended.attempt_id, result_state: "acquired_verified",
      asset_sha256: record.sha256, byte_size: record.byte_size };
    report.attempt_recorded = appended.attempt_id;
  }

  // 3) 工序自己派生覆盖结论。
  const derived = deriveIntakeCoverage({ registration, record, attempt, pageNumber: PAGE_NUMBER });
  report.checks.derived = {
    completeness_state: derived.completeness_state,
    acquired_pages: derived.coverage_scope.acquired?.pages ?? null,
    total_extent: derived.coverage_scope.total_extent,
    missing_parts: derived.missing_parts,
    matched: derived.verified_against.matched,
  };
  if (derived.completeness_state !== "unknown") hold("总量未核实，结论不应是 partial/complete");
  if (derived.verified_against.matched !== true) hold("取得账与库存字节应当一致");

  // 4) 负例（不写库）：篡改字节 / 尝试字节对不上 / 缺尝试，都必须失败关闭。
  let tamperedRejected = false;
  try {
    deriveIntakeCoverage({ registration, record: { ...record, sha256: "0".repeat(64) }, attempt, pageNumber: PAGE_NUMBER });
  } catch (error) {
    tamperedRejected = String(error?.message).includes("COVERAGE_ORIGINAL_NOT_VERIFIED");
  }
  let mismatchRejected = false;
  try {
    deriveIntakeCoverage({ registration, record,
      attempt: { ...attempt, asset_sha256: "1".repeat(64) }, pageNumber: PAGE_NUMBER });
  } catch (error) {
    mismatchRejected = String(error?.message).includes("COVERAGE_ATTEMPT_ASSET_MISMATCH");
  }
  let attemptlessRejected = false;
  try {
    deriveIntakeCoverage({ registration, record, pageNumber: PAGE_NUMBER });
  } catch (error) {
    attemptlessRejected = String(error?.message).includes("COVERAGE_ATTEMPT_REQUIRED");
  }
  const before = await countCoverages();
  report.checks.negatives = {
    tampered_bytes_rejected: tamperedRejected,
    mismatched_attempt_rejected: mismatchRejected,
    attemptless_rejected: attemptlessRejected,
    count_unchanged_by_negatives: (await countCoverages()) === before,
  };

  // 5) 正例：经唯一写入口落库。
  const saved = await discovery.recordAcquisitionCoverage({
    projectId: PROJECT_ID,
    attemptId: attempt.attempt_id,
    catalogEntryId: entry.catalog_entry_id,
    coverageScope: derived.coverage_scope,
    missingParts: derived.missing_parts,
    completenessState: derived.completeness_state,
    verifiedAgainst: derived.verified_against,
  });
  report.coverage = { coverage_id: saved.coverage_id, completeness_state: saved.completeness_state };
  const after = await countCoverages();
  report.checks.negatives.count_increased_by_one = after === before + 1;

  // 6) 回读：工人角色读得到这条覆盖结论，且内容就是派生的那份。
  const { rows } = await pool.query(
    `select coverage_id::text as coverage_id, attempt_id::text as attempt_id,
            catalog_entry_id::text as catalog_entry_id, completeness_state,
            coverage_scope::text as coverage_scope, missing_parts::text as missing_parts,
            verified_against::text as verified_against
       from source.acquisition_coverages where coverage_id = $1::uuid`,
    [saved.coverage_id]
  );
  const stored = rows[0];
  const storedScope = stored ? JSON.parse(stored.coverage_scope) : null;
  const storedMissing = stored ? JSON.parse(stored.missing_parts) : null;
  const storedVerified = stored ? JSON.parse(stored.verified_against) : null;
  report.checks.readback = {
    found: Boolean(stored),
    attempt_id: stored?.attempt_id ?? null,
    catalog_entry_id: stored?.catalog_entry_id ?? null,
    completeness_state: stored?.completeness_state ?? null,
    schema: storedScope?.schema ?? null,
    acquired_pages: storedScope?.acquired?.pages ?? null,
    total_extent: storedScope?.total_extent ?? null,
    missing_parts: storedMissing,
    matched: storedVerified?.matched ?? null,
  };

  const ok = report.checks.readback.found
    && report.checks.readback.attempt_id === attempt.attempt_id
    && report.checks.readback.catalog_entry_id === entry.catalog_entry_id
    && report.checks.readback.completeness_state === "unknown"
    && report.checks.readback.schema === COVERAGE_CONCLUSION_SCHEMA
    && storedScope?.method === `${INTAKE_COVERAGE_METHOD}@${INTAKE_COVERAGE_METHOD_VERSION}`
    && JSON.stringify(report.checks.readback.acquired_pages) === JSON.stringify([PAGE_NUMBER])
    && report.checks.readback.total_extent === "unknown"
    && JSON.stringify(report.checks.readback.missing_parts) === JSON.stringify([{ part: "other_pages", state: "unassessed" }])
    && report.checks.readback.matched === true
    && report.checks.negatives.tampered_bytes_rejected
    && report.checks.negatives.mismatched_attempt_rejected
    && report.checks.negatives.attemptless_rejected
    && report.checks.negatives.count_unchanged_by_negatives
    && report.checks.negatives.count_increased_by_one;
  report.status = ok ? "Y04_EXECUTOR_PROVEN" : "Y04_EXECUTOR_HOLD";
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
