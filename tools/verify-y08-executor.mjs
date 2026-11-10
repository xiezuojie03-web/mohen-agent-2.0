#!/usr/bin/env node
// Y08 工序真实链验证：D00 第八道工序（完整性鉴定与取得回执）的回执必须由工序
// 从本次准入已核验真值与链上已落库记录派生——库存回读哈希、登记一致、Y05 身份
// 分层、Y07 获取尝试（acquired_verified 且字节一致）、Y04 覆盖结论
// （verified_against.matched）、Y03 核查结论，六道齐备回执才成文；
// 核查结论是 needs_owner 就原样带回执，绝不升级为可采纳。
// 链上五条引用（need/catalog/verification/attempt/coverage）逐条以工人角色回读，
// 正是 G0 evidenceRefs 里那份依据。
//
// 证据边界：本地隔离库，不构成 VERIFIED_LIVE；回执不是资格，不签 Gate。
// 负例：尝试未核验 / 覆盖未核对 / 外来身份 → 失败关闭（本工具不写库）。
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { deriveSourceIdentityStratification } from "../pipelines/data-production/workers/source-identity-stratification.mjs";
import { deriveValidatedAssetReceipt } from "../pipelines/data-production/workers/source-asset-receipt.mjs";

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
  console.log(JSON.stringify({ status: "Y08_EXECUTOR_HOLD", reason: message }, null, 2));
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

const report = { status: "Y08_EXECUTOR_HOLD", project: owner.project_title, checks: {} };

try {
  await assertPrivateWorkerIdentity(pool);
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);

  // 1) 链上记录（按 created_at 取最新一道工序的产物）：Y01 需求、Y02 准入目录、
  //    Y03 准入核查、Y07 获取尝试、Y04 准入覆盖结论。
  const needRows = await queryRows(
    `select need_id::text as need_id from source.source_needs
      where project_id = (:'id')::uuid order by created_at desc limit 1`,
    { id: PROJECT_ID }
  );
  if (!needRows[0]) hold("项目还没有 Y01 需求回执");
  const needId = needRows[0].need_id;
  const catalogRows = await queryRows(
    `select catalog_entry_id::text as catalog_entry_id from source.resource_catalog
      where need_id = (:'id')::uuid order by created_at desc limit 1`,
    { id: needId }
  );
  if (!catalogRows[0]) hold("该需求还没有 Y02 目录记录");
  const catalogEntryId = catalogRows[0].catalog_entry_id;
  const verificationRows = await queryRows(
    `select verification_id::text as verification_id, verdict from source.candidate_verifications
      where catalog_entry_id = (:'id')::uuid order by created_at desc limit 1`,
    { id: catalogEntryId }
  );
  if (!verificationRows[0]) hold("该目录还没有 Y03 核查记录");
  const verification = verificationRows[0];
  // 真实 D00 运行中尝试与覆盖结论成对落库；这里取最近一次"成对"的那对。
  const pairRows = await queryRows(
    `select a.attempt_id::text as attempt_id, a.result_state, a.asset_sha256,
            a.byte_size::int as byte_size,
            c.coverage_id::text as coverage_id, c.verified_against::text as verified_against
       from source.acquisition_attempts a
       join source.acquisition_coverages c on c.attempt_id = a.attempt_id
      where a.need_id = (:'id')::uuid
      order by a.created_at desc limit 1`,
    { id: needId }
  );
  if (!pairRows[0]) hold("该需求还没有成对的 Y07 获取尝试与 Y04 覆盖结论");
  const attemptRow = pairRows[0];
  const coverageRow = pairRows[0];

  // 2) 真实链：读原件记录 → 读登记 → 派生身份分层（与 D00 工序内同一实现）。
  const record = await originals.getStored(ORIGINAL_ID, token);
  if (!record) hold("原件不在 STORED_VERIFIED 状态");
  const registration = await registrations.lookup(ORIGINAL_ID, token);
  const identity = deriveSourceIdentityStratification({ registration, record });

  // 3) 工序派生回执：六道工序齐备才成文。
  const baseFacts = {
    registration, record, identity,
    attempt: { attempt_id: attemptRow.attempt_id, resultState: attemptRow.result_state,
      assetSha256: attemptRow.asset_sha256, byteSize: attemptRow.byte_size },
    coverage: { coverage_id: coverageRow.coverage_id,
      verifiedAgainst: JSON.parse(coverageRow.verified_against) },
    verification: { verification_id: verification.verification_id, verdict: verification.verdict },
    needId, catalogEntryId, pageNumber: PAGE_NUMBER,
  };
  const { receipt, evidenceRefs } = deriveValidatedAssetReceipt(baseFacts);
  report.receipt = {
    schema: receipt.schema, method: receipt.method,
    verification_verdict: receipt.verification_verdict,
    qualification: receipt.qualification, basis: receipt.basis,
  };
  if (receipt.qualification !== "UNASSESSED" ||
      receipt.verification_verdict !== verification.verdict)
    hold("回执升级了核查结论或冒充了资格");

  // 4) 负例：尝试未核验 / 覆盖未核对 / 外来身份 → 失败关闭。
  const rejects = (mutate, code) => {
    try { deriveValidatedAssetReceipt(mutate(baseFacts)); return false; }
    catch (error) { return String(error?.message).includes(code); }
  };
  report.checks.negatives = {
    unverified_attempt_rejected: rejects((f) => ({ ...f,
      attempt: { ...f.attempt, assetSha256: "1".repeat(64) } }), "RECEIPT_ATTEMPT_NOT_VERIFIED"),
    unmatched_coverage_rejected: rejects((f) => ({ ...f,
      coverage: { ...f.coverage, verifiedAgainst: { matched: false } } }), "RECEIPT_COVERAGE_UNVERIFIED"),
    foreign_identity_rejected: rejects((f) => ({ ...f, identity: { schema: "other" } }),
      "RECEIPT_IDENTITY_REQUIRED"),
  };

  // 5) 链上五条引用逐条以工人角色回读：这就是 G0 evidenceRefs 的那份依据。
  const readback = {};
  for (const ref of evidenceRefs) {
    if (ref.kind === "source_need") {
      const { rows } = await pool.query(
        "select need_id::text as id from source.source_needs where need_id = $1::uuid", [ref.id]);
      readback.source_need = rows.length === 1;
    } else if (ref.kind === "resource_catalog") {
      const { rows } = await pool.query(
        "select catalog_entry_id::text as id from source.resource_catalog where catalog_entry_id = $1::uuid", [ref.id]);
      readback.resource_catalog = rows.length === 1;
    } else if (ref.kind === "candidate_verification") {
      const { rows } = await pool.query(
        "select verification_id::text as id from source.candidate_verifications where verification_id = $1::uuid", [ref.id]);
      readback.candidate_verification = rows.length === 1;
    } else if (ref.kind === "acquisition_attempt") {
      const { rows } = await pool.query(
        "select attempt_id::text as id from source.acquisition_attempts where attempt_id = $1::uuid", [ref.id]);
      readback.acquisition_attempt = rows.length === 1;
    } else if (ref.kind === "acquisition_coverage") {
      const { rows } = await pool.query(
        "select coverage_id::text as id from source.acquisition_coverages where coverage_id = $1::uuid", [ref.id]);
      readback.acquisition_coverage = rows.length === 1;
    }
  }
  report.evidence_refs = evidenceRefs;
  report.checks.chain_refs_readable = readback;

  const ok = receipt.schema === "mohen.validated-asset-receipt.v1"
    && receipt.method === "D00/Y08:intake_receipt@v1"
    && receipt.sha256 === record.sha256 && receipt.byte_size === record.byte_size
    && receipt.page_number === PAGE_NUMBER
    && receipt.basis.length === 6
    && evidenceRefs.length === 5
    && Object.values(readback).every(Boolean)
    && Object.values(report.checks.negatives).every(Boolean);
  report.status = ok ? "Y08_EXECUTOR_PROVEN" : "Y08_EXECUTOR_HOLD";
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
