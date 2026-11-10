#!/usr/bin/env node
// Y05 工序真实链验证：D00 第五道工序（来源对象、版本与依赖鉴别）必须用真实
// 私有工人角色、真实登记读取通道跑通——身份分层由工序从本次准入真值派生，
// 逐层标 known/unknown 与证据。按迁移 D00-C4，本工序不落新表（产出即
// source.sources/source_versions 既有身份，核查动作由 Y03 承载），
// 因此本工具的证据是：真实登记 → 派生 → 七层齐全且与登记逐层一致 → 负例失败关闭。
//
// 证据边界（不夸大）：
//   * 登记读取走私有工人登录 + 工作室身份的 Owner RLS 事务，与原件读回同一条通道；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格；
//   * 收藏层（馆内哪一套）本次没有读，必须如实 unknown——不拿提供方冒充收藏。
//
// 负例：字节被篡改 / 缺身份锚点 / 版本无不可变修订 → 失败关闭。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import {
  deriveSourceIdentityStratification,
  IDENTITY_STRATIFICATION_SCHEMA,
  INTAKE_IDENTITY_METHOD,
  INTAKE_IDENTITY_METHOD_VERSION,
} from "../pipelines/data-production/workers/source-identity-stratification.mjs";

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
  console.log(JSON.stringify({ status: "Y05_EXECUTOR_HOLD", reason: message }, null, 2));
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

const report = { status: "Y05_EXECUTOR_HOLD", project: owner.project_title, checks: {} };
const layerOf = (result, name) => result.layers.find((layer) => layer.layer === name);

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);

  // 1) 真实链：读原件记录 → 读登记 → 工序自己派生身份分层。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);
  const derived = deriveSourceIdentityStratification({ registration, record });
  report.checks.derived = {
    schema: derived.schema,
    method: derived.method,
    layers: derived.layers.map((layer) => ({ layer: layer.layer, state: layer.state })),
    unresolved: derived.dependencies.unresolved,
  };

  // 2) 与登记逐层核对：known 层的值必须就是登记真值，unknown 层必须如实。
  const catalogNo = registration?.original_locator?.catalog_no ?? null;
  const layerChecks = {
    provider_matches: layerOf(derived, "provider")?.value?.name === registration.provider,
    collection_unknown: layerOf(derived, "collection")?.state === "unknown",
    catalog_record_matches: catalogNo
      ? layerOf(derived, "catalog_record")?.value?.catalog_no === catalogNo
      : layerOf(derived, "catalog_record")?.state === "unknown",
    work_matches: layerOf(derived, "work")?.value?.title === registration.title,
    version_matches: layerOf(derived, "version")?.value?.source_version_id === registration.source_version_id
      && /^[a-f0-9]{64}$/.test(layerOf(derived, "version")?.value?.artifact_revision ?? ""),
    holding_matches: layerOf(derived, "holding")?.value?.institution === registration.provider,
    digital_asset_matches: layerOf(derived, "digital_asset")?.value?.sha256 === record.sha256
      && layerOf(derived, "digital_asset")?.value?.raw_item_id === registration.raw_item_id,
    seven_layers: derived.layers.length === 7,
  };
  report.checks.layers = layerChecks;

  // 3) 确定性：同一真值重跑派生，结果逐字节一致（不依赖运行侧状态）。
  const again = deriveSourceIdentityStratification({ registration, record });
  report.checks.deterministic = JSON.stringify(again) === JSON.stringify(derived);

  // 4) 负例：篡改字节 / 缺身份锚点 / 版本无修订，都必须失败关闭。
  let tamperedRejected = false;
  try {
    deriveSourceIdentityStratification({ registration, record: { ...record, sha256: "0".repeat(64) } });
  } catch (error) {
    tamperedRejected = String(error?.message).includes("IDENTITY_ORIGINAL_NOT_VERIFIED");
  }
  let anchorlessRejected = false;
  try {
    deriveSourceIdentityStratification({ registration: { ...registration, provider: " " }, record });
  } catch (error) {
    anchorlessRejected = String(error?.message).includes("IDENTITY_ANCHOR_REQUIRED");
  }
  let revisionlessRejected = false;
  try {
    deriveSourceIdentityStratification({
      registration: { ...registration, source_version_artifact_revision: "" }, record });
  } catch (error) {
    revisionlessRejected = String(error?.message).includes("IDENTITY_VERSION_REVISION_INVALID");
  }
  report.checks.negatives = {
    tampered_bytes_rejected: tamperedRejected,
    anchorless_rejected: anchorlessRejected,
    revisionless_rejected: revisionlessRejected,
  };

  const ok = Object.values(layerChecks).every(Boolean)
    && report.checks.derived.schema === IDENTITY_STRATIFICATION_SCHEMA
    && report.checks.derived.method === `${INTAKE_IDENTITY_METHOD}@${INTAKE_IDENTITY_METHOD_VERSION}`
    && report.checks.deterministic
    && tamperedRejected && anchorlessRejected && revisionlessRejected;
  report.status = ok ? "Y05_EXECUTOR_PROVEN" : "Y05_EXECUTOR_HOLD";
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = ok ? 0 : 1;
} catch (error) {
  report.reason = String(error?.stack ?? error);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await pool.end();
}
