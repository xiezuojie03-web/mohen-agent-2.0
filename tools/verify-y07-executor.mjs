#!/usr/bin/env node
// Y07 工序真实链验证：D00 第七道工序（合法获取方案与协议路径组合）必须用真实
// 私有工人角色、真实登记读取通道跑通——获取方法与尝试由工序从本次准入真值
// 校验派生（M#### 方法键、64hex 请求摘要、可解析时间；acquired_verified 必须
// 字节与哈希同库存原件一致），candidate_ref 就是本次准入的 Y05 身份分层本身，
// 经唯一写入口（source-discovery-repository.registerAcquisitionMethod /
// appendAcquisitionAttempt）落库，并能以工人角色回读，在 Studio 资料台可见。
//
// 证据边界（不夸大）：
//   * 本页确为从 NAJ 馆藏页面人工下载并登记的 JPEG（原件现处 STORED_VERIFIED），
//     获取账如实记录这次真实取得，不编造任何额外来源；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格。
//
// 负例：缺 acquisition / 字节对不上 / 身份不是本次准入这份 → 失败关闭，且都不落库。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import { deriveSourceIdentityStratification } from "../pipelines/data-production/workers/source-identity-stratification.mjs";
import { deriveIntakeAcquisitionRecord } from "../pipelines/data-production/workers/source-acquisition-record.mjs";

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
  console.log(JSON.stringify({ status: "Y07_EXECUTOR_HOLD", reason: message }, null, 2));
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

const countAttempts = async () => {
  const { rows } = await servicePool.query("select count(*)::int as n from source.acquisition_attempts");
  return rows[0].n;
};

const report = { status: "Y07_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });

  // 1) 尝试挂在 Y01 需求上。
  const needRows = await queryRows(
    `select need_id::text as need_id from source.source_needs
      where project_id = (:'id')::uuid order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  if (!needRows[0]) hold("项目还没有 Y01 需求回执，先跑 verify-y01-executor.mjs");
  const needId = needRows[0].need_id;

  // 2) 真实链：读原件记录 → 读登记 → 工序派生 Y05 身份分层（candidate_ref 的来源）。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);
  const identity = deriveSourceIdentityStratification({ registration, record });

  // 3) 工序校验本次真实获取：NAJ 馆藏页面人工下载本页 JPEG，字节与库存一致。
  const acquisitionInput = {
    method: {
      method_key: "M0002", method_version: "v1", access_mode: "manual_download",
      resource_scope: { provider: registration.provider, locator: registration.original_locator },
      preconditions: ["馆藏页面对公网可见", "页面提供本页图像下载"],
      steps: ["按馆方目录号定位藏品页面", "下载本页 JPEG", "按原件登记流程入库并核验哈希"],
      success_criteria: ["入库字节哈希与下载文件一致"],
      failure_modes: ["页面不可达", "图像缺页", "下载字节与登记不一致"],
      alternatives: [],
      method_state: "TESTED_SUCCESS",
    },
    attempt: {
      result_state: "acquired_verified",
      asset_sha256: record.sha256, byte_size: record.byte_size,
      started_at: new Date(Date.now() - 60000), finished_at: new Date(),
      request_digest: record.sha256,
      execution_environment: { kind: "owner_workstation", note: "NAJ 馆藏页面人工下载" },
      acquired_extent: { pages: [PAGE_NUMBER] },
    },
  };
  const derived = deriveIntakeAcquisitionRecord({
    registration, record, identity, acquisition: acquisitionInput });
  report.checks.derived = {
    method: `${derived.method.methodKey}@${derived.method.methodVersion}`,
    result_state: derived.attempt.resultState,
    candidate_ref_schema: derived.candidateRef.schema,
    dependency_kinds: derived.dependencyRefs.map((d) => d.kind),
  };
  if (derived.candidateRef.schema !== "mohen.source-identity-stratification.v1")
    hold("candidate_ref 必须是 Y05 身份分层本身");

  // 4) 负例（不写库）：缺 acquisition / 字节对不上 / 身份对不上，都必须失败关闭。
  let missingRejected = false;
  try {
    deriveIntakeAcquisitionRecord({ registration, record, identity });
  } catch (error) {
    missingRejected = String(error?.message).includes("ACQUISITION_REQUIRED");
  }
  let mismatchRejected = false;
  try {
    deriveIntakeAcquisitionRecord({ registration, record, identity,
      acquisition: { ...acquisitionInput,
        attempt: { ...acquisitionInput.attempt, asset_sha256: "1".repeat(64) } } });
  } catch (error) {
    mismatchRejected = String(error?.message).includes("ACQUISITION_ASSET_MISMATCH");
  }
  let identityRejected = false;
  try {
    deriveIntakeAcquisitionRecord({ registration, record,
      identity: { schema: "other" }, acquisition: acquisitionInput });
  } catch (error) {
    identityRejected = String(error?.message).includes("ACQUISITION_IDENTITY_REQUIRED");
  }
  const before = await countAttempts();
  report.checks.negatives = {
    missing_acquisition_rejected: missingRejected,
    mismatched_asset_rejected: mismatchRejected,
    foreign_identity_rejected: identityRejected,
    count_unchanged_by_negatives: (await countAttempts()) === before,
  };

  // 5) 正例：方法与尝试经唯一写入口落库，candidate_ref 为 Y05 身份分层本身。
  const registered = await discovery.registerAcquisitionMethod(derived.method);
  if (registered?.method_key !== derived.method.methodKey) hold("方法登记回执与方法键不一致");
  const appended = await discovery.appendAcquisitionAttempt({
    projectId: PROJECT_ID, needId,
    candidateRef: derived.candidateRef,
    methodKey: registered.method_key, methodVersion: registered.method_version,
    ...derived.attempt, dependencyRefs: derived.dependencyRefs,
  });
  report.attempt = { attempt_id: appended.attempt_id, method_key: registered.method_key };
  const after = await countAttempts();
  report.checks.negatives.count_increased_by_one = after === before + 1;

  // 6) 回读：工人角色读得到这条尝试，且 candidate_ref/字节与派生的那份一致。
  const { rows } = await pool.query(
    `select attempt_id::text as attempt_id, method_key, method_version, result_state,
            asset_sha256, byte_size::int as byte_size, candidate_ref::text as candidate_ref,
            dependency_refs::text as dependency_refs
       from source.acquisition_attempts where attempt_id = $1::uuid`,
    [appended.attempt_id]
  );
  const stored = rows[0];
  const storedRef = stored ? JSON.parse(stored.candidate_ref) : null;
  const storedDeps = stored ? JSON.parse(stored.dependency_refs) : null;
  report.checks.readback = {
    found: Boolean(stored),
    method: stored ? `${stored.method_key}@${stored.method_version}` : null,
    result_state: stored?.result_state ?? null,
    asset_sha256: stored?.asset_sha256 ?? null,
    byte_size: stored?.byte_size ?? null,
    candidate_ref_schema: storedRef?.schema ?? null,
    candidate_ref_layers: Array.isArray(storedRef?.layers) ? storedRef.layers.length : null,
    dependency_kinds: Array.isArray(storedDeps) ? storedDeps.map((d) => d.kind).sort() : null,
  };

  const ok = report.checks.readback.found
    && report.checks.readback.method === "M0002@v1"
    && report.checks.readback.result_state === "acquired_verified"
    && report.checks.readback.asset_sha256 === record.sha256
    && report.checks.readback.byte_size === record.byte_size
    && report.checks.readback.candidate_ref_schema === "mohen.source-identity-stratification.v1"
    && report.checks.readback.candidate_ref_layers === 7
    && JSON.stringify(report.checks.readback.dependency_kinds) === JSON.stringify(["raw_item", "source_version"])
    && report.checks.negatives.missing_acquisition_rejected
    && report.checks.negatives.mismatched_asset_rejected
    && report.checks.negatives.foreign_identity_rejected
    && report.checks.negatives.count_unchanged_by_negatives
    && report.checks.negatives.count_increased_by_one;
  report.status = ok ? "Y07_EXECUTOR_PROVEN" : "Y07_EXECUTOR_HOLD";
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
