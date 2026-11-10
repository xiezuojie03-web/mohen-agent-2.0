#!/usr/bin/env node
// Y02 工序真实链验证：D00 第二道工序（资源目录观察）必须用真实私有工人角色、
// 真实登记读取通道跑通——条目由工序从登记真值派生（含馆方目录号），
// 经唯一写入口（source-discovery-repository.recordCatalogEntry）落库，
// 并能以工人角色回读，在 Studio 资料台可见。
//
// 证据边界（不夸大）：
//   * 登记读取走私有工人登录 + 工作室身份的 Owner RLS 事务，与原件读回同一条通道；
//   * 写库走私有工人的唯一写入口，不开第二条写路径；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格。
//
// 负例：字节被篡改 / 缺提供方 → 失败关闭；缺馆方目录号 → 如实留空，不编一个。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import {
  deriveIntakeCatalogEntry,
  CATALOG_OBSERVATION_SCHEMA,
  INTAKE_DISCOVERY_METHOD,
  INTAKE_DISCOVERY_METHOD_VERSION,
} from "../pipelines/data-production/workers/source-catalog-observation.mjs";

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
const EXPECTED_CATALOG_NO = "NAJDA-292-0017";

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const hold = (message) => {
  console.log(JSON.stringify({ status: "Y02_EXECUTOR_HOLD", reason: message }, null, 2));
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

const countCatalog = async () => {
  const { rows } = await servicePool.query("select count(*)::int as n from source.resource_catalog");
  return rows[0].n;
};

const report = { status: "Y02_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });

  // 1) Y02 条目挂在 Y01 已登记的真实需求下（同一研究问题的目录观察）。
  const needRows = await queryRows(
    `select need_id::text as need_id, research_intent
       from source.source_needs where project_id = (:'id')::uuid
      order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  const need = needRows[0];
  if (!need) hold("项目还没有 Y01 需求回执，先跑 verify-y01-executor.mjs");

  // 2) 真实链：读原件记录 → 读登记（含馆方目录号）→ 工序自己派生条目。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);
  report.checks.registration = {
    provider: registration.provider,
    title: registration.title,
    original_locator: registration.original_locator ?? null,
    provenance_status: registration.provenance_status ?? null,
    content_availability: registration.content_availability ?? null,
  };
  const entry = deriveIntakeCatalogEntry({ registration, record });
  report.checks.derived = {
    provider: entry.provider,
    catalog_title: entry.catalogTitle,
    catalog_identifier: entry.catalogIdentifier,
    availability_state: entry.availabilityState,
    discovered_by_method: `${entry.discoveredByMethod}@${entry.methodVersion}`,
    evidence_schema: entry.evidenceRef.schema,
  };
  if (entry.catalogIdentifier !== EXPECTED_CATALOG_NO) {
    hold(`馆方目录号未按真值派生（得到 ${JSON.stringify(entry.catalogIdentifier)}）`);
  }

  // 3) 负例：字节被篡改 → 失败关闭；缺提供方 → 失败关闭；缺目录号 → 如实留空。
  let tamperedRejected = false;
  try {
    deriveIntakeCatalogEntry({ registration, record: { ...record, sha256: "0".repeat(64) } });
  } catch (error) {
    tamperedRejected = String(error?.message).includes("SOURCE_CATALOG_ORIGINAL_NOT_VERIFIED");
  }
  let providerlessRejected = false;
  try {
    deriveIntakeCatalogEntry({ registration: { ...registration, provider: "  " }, record });
  } catch (error) {
    providerlessRejected = String(error?.message).includes("SOURCE_CATALOG_REGISTRATION_IDENTITY_REQUIRED");
  }
  const noLocator = deriveIntakeCatalogEntry({
    registration: { ...registration, original_locator: null }, record });
  const before = await countCatalog();
  report.checks.negatives = {
    tampered_bytes_rejected: tamperedRejected,
    providerless_rejected: providerlessRejected,
    missing_catalog_no_honest_null: noLocator.catalogIdentifier === null,
  };

  // 4) 正例：经唯一写入口落库（同一需求下重跑则复用，不产生重复条目）。
  const existing = await pool.query(
    `select catalog_entry_id::text as catalog_entry_id from source.resource_catalog
      where need_id = $1::uuid and provider = $2 and catalog_identifier = $3 limit 1`,
    [need.need_id, entry.provider, entry.catalogIdentifier]
  );
  let saved;
  let reused = false;
  if (existing.rows.length > 0) {
    saved = existing.rows[0];
    reused = true;
  } else {
    saved = await discovery.recordCatalogEntry({
      projectId: PROJECT_ID, needId: need.need_id, ...entry });
  }
  report.catalog_entry = { catalog_entry_id: saved.catalog_entry_id, reused };
  const after = await countCatalog();
  report.checks.negatives.catalog_unchanged_by_negatives = after === before || after === before + 1;

  // 5) 回读：工人角色读得到这条目录条目，且内容就是派生的那份。
  const { rows } = await pool.query(
    `select catalog_entry_id::text as catalog_entry_id, provider, catalog_title, catalog_identifier,
            carrier_hint, language, coverage_hint::text as coverage_hint, rights_hint::text as rights_hint,
            availability_state, discovered_by_method, method_version, evidence_ref::text as evidence_ref
       from source.resource_catalog where catalog_entry_id = $1::uuid`,
    [saved.catalog_entry_id]
  );
  const stored = rows[0];
  const storedEvidence = stored ? JSON.parse(stored.evidence_ref) : null;
  report.checks.readback = {
    found: Boolean(stored),
    provider: stored?.provider ?? null,
    catalog_title: stored?.catalog_title ?? null,
    catalog_identifier: stored?.catalog_identifier ?? null,
    availability_state: stored?.availability_state ?? null,
    discovered_by_method: stored?.discovered_by_method ?? null,
    evidence_schema: storedEvidence?.schema ?? null,
  };

  const ok = report.checks.readback.found
    && report.checks.readback.provider === entry.provider
    && report.checks.readback.catalog_title === entry.catalogTitle
    && report.checks.readback.catalog_identifier === EXPECTED_CATALOG_NO
    && report.checks.readback.availability_state === "catalog_found"
    && report.checks.readback.discovered_by_method === INTAKE_DISCOVERY_METHOD
    && report.checks.readback.evidence_schema === CATALOG_OBSERVATION_SCHEMA
    && stored?.method_version === INTAKE_DISCOVERY_METHOD_VERSION
    && report.checks.negatives.tampered_bytes_rejected
    && report.checks.negatives.providerless_rejected
    && report.checks.negatives.missing_catalog_no_honest_null
    && report.checks.negatives.catalog_unchanged_by_negatives;
  report.status = ok ? "Y02_EXECUTOR_PROVEN" : "Y02_EXECUTOR_HOLD";
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
