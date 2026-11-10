#!/usr/bin/env node
// Y03 工序真实链验证：D00 第三道工序（候选核查）必须用真实私有工人角色、
// 真实登记读取通道跑通——核查项由工序从本次准入真值派生，经唯一写入口
// （source-discovery-repository.recordCandidateVerification）落库，
// 并能以工人角色回读，在 Studio 资料台可见。
//
// 证据边界（不夸大）：
//   * 登记读取走私有工人登录 + 工作室身份的 Owner RLS 事务，与原件读回同一条通道；
//   * 写库走私有工人的唯一写入口，不开第二条写路径；
//   * 本地隔离库，不构成 VERIFIED_LIVE；不签 Gate、不产生任何资格；
//   * 本次没有读到历史地名异称/时代纪年词源，结论就必须是 needs_owner，
//     工具不替研究者编词源去凑一个 admissible。
//
// 负例：字节被篡改 / 扩展缺词源 / 扩展维度不在规范集合 → 失败关闭。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import {
  deriveIntakeCandidateVerification,
  CANDIDATE_VERIFICATION_SCHEMA,
  INTAKE_VERIFICATION_METHOD,
  INTAKE_VERIFICATION_METHOD_VERSION,
} from "../pipelines/data-production/workers/source-candidate-verification.mjs";

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
  console.log(JSON.stringify({ status: "Y03_EXECUTOR_HOLD", reason: message }, null, 2));
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

const countVerifications = async () => {
  const { rows } = await servicePool.query("select count(*)::int as n from source.candidate_verifications");
  return rows[0].n;
};

const report = { status: "Y03_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });

  // 1) 核查挂在 Y02 已登记的真实准入目录条目上（同一研究问题、同一份原件）。
  const entryRows = await queryRows(
    `select catalog_entry_id::text as catalog_entry_id, provider, catalog_title, catalog_identifier
       from source.resource_catalog
      where project_id = (:'id')::uuid and discovered_by_method = 'D00/Y02:intake_registration'
      order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  const entry = entryRows[0];
  if (!entry) hold("项目还没有 Y02 准入目录条目，先跑 verify-y02-executor.mjs");
  report.catalog_entry = entry;

  // 2) 真实链：读原件记录 → 读登记 → 工序自己派生核查结论。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);
  const derived = deriveIntakeCandidateVerification({ registration, record });
  report.checks.derived = {
    verdict: derived.verdict,
    reason_code: derived.reasonCode,
    method: `${derived.methodKey}@${derived.methodVersion}`,
    identity_sha256: derived.checks.identity.sha256,
    catalog_no: derived.checks.locator.catalog_no,
    provenance: derived.checks.provenance.status,
    rights_unknown_actions: derived.checks.rights.unknown_actions.length,
    unresolved: derived.checks.named_expansions.unresolved,
  };
  if (derived.checks.identity.sha256 !== record.sha256) hold("核查身份与原件字节不一致");
  if (derived.verdict !== "needs_owner") hold(`本次没有词源依据，结论不应是 ${derived.verdict}`);

  // 3) 负例（不写库）：篡改字节、扩展缺词源、扩展维度不合规，都必须失败关闭。
  let tamperedRejected = false;
  try {
    deriveIntakeCandidateVerification({ registration, record: { ...record, sha256: "0".repeat(64) } });
  } catch (error) {
    tamperedRejected = String(error?.message).includes("CANDIDATE_VERIFICATION_ORIGINAL_NOT_VERIFIED");
  }
  let sourcelessRejected = false;
  try {
    deriveIntakeCandidateVerification({ registration, record,
      expansions: [{ dimension: "place_name", term: "松江府", source_ref: "",
        applicable_era: "清代", ambiguity: "none", rationale: "按府级词形扩展" }] });
  } catch (error) {
    sourcelessRejected = String(error?.message).includes("CANDIDATE_VERIFICATION_EXPANSION_INCOMPLETE");
  }
  let badDimensionRejected = false;
  try {
    deriveIntakeCandidateVerification({ registration, record,
      expansions: [{ dimension: "modern_admin_unit", term: "松江区", source_ref: "某现代名录",
        applicable_era: "2020", ambiguity: "none", rationale: "用今天的区划反推" }] });
  } catch (error) {
    badDimensionRejected = String(error?.message).includes("CANDIDATE_VERIFICATION_EXPANSION_DIMENSION_INVALID");
  }
  const before = await countVerifications();
  report.checks.negatives = {
    tampered_bytes_rejected: tamperedRejected,
    sourceless_expansion_rejected: sourcelessRejected,
    non_spec_dimension_rejected: badDimensionRejected,
    count_unchanged_by_negatives: (await countVerifications()) === before,
  };

  // 4) 正例：经唯一写入口落库。
  const saved = await discovery.recordCandidateVerification({
    projectId: PROJECT_ID,
    catalogEntryId: entry.catalog_entry_id,
    checks: derived.checks,
    verdict: derived.verdict,
    reasonCode: derived.reasonCode,
    methodKey: derived.methodKey,
    methodVersion: derived.methodVersion,
  });
  report.verification = { verification_id: saved.verification_id, verdict: saved.verdict };
  const after = await countVerifications();
  report.checks.negatives.count_increased_by_one = after === before + 1;

  // 5) 回读：工人角色读得到这条核查记录，且内容就是派生的那份。
  const { rows } = await pool.query(
    `select verification_id::text as verification_id, catalog_entry_id::text as catalog_entry_id,
            verdict, reason_code, method_key, method_version, checks::text as checks
       from source.candidate_verifications where verification_id = $1::uuid`,
    [saved.verification_id]
  );
  const stored = rows[0];
  const storedChecks = stored ? JSON.parse(stored.checks) : null;
  report.checks.readback = {
    found: Boolean(stored),
    catalog_entry_id: stored?.catalog_entry_id ?? null,
    verdict: stored?.verdict ?? null,
    reason_code: stored?.reason_code ?? null,
    method: stored ? `${stored.method_key}@${stored.method_version}` : null,
    schema: storedChecks?.schema ?? null,
    unresolved: storedChecks?.named_expansions?.unresolved ?? null,
  };

  const ok = report.checks.readback.found
    && report.checks.readback.catalog_entry_id === entry.catalog_entry_id
    && report.checks.readback.verdict === "needs_owner"
    && report.checks.readback.reason_code === derived.reasonCode
    && report.checks.readback.method === `${INTAKE_VERIFICATION_METHOD}@${INTAKE_VERIFICATION_METHOD_VERSION}`
    && report.checks.readback.schema === CANDIDATE_VERIFICATION_SCHEMA
    && JSON.stringify(report.checks.readback.unresolved) === JSON.stringify(["place_name", "era"])
    && report.checks.negatives.tampered_bytes_rejected
    && report.checks.negatives.sourceless_expansion_rejected
    && report.checks.negatives.non_spec_dimension_rejected
    && report.checks.negatives.count_unchanged_by_negatives
    && report.checks.negatives.count_increased_by_one;
  report.status = ok ? "Y03_EXECUTOR_PROVEN" : "Y03_EXECUTOR_HOLD";
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
