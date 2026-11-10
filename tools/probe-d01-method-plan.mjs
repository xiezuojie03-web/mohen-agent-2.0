#!/usr/bin/env node
// 只读探针：按**私有工人登录**（MOHEN_PRIVATE_WORKER_DATABASE_URL）走真实 RLS，
// 读 G0 已签审计里的消费者方法预选，确认 D01 能拿到批准的计划。
// 不写库、不签 Gate、不产生资格；读不到就是 null（D01 会失败关闭）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApprovedMethodPlanReader } from "../pipelines/data-production/workers/private-evidence-binding.mjs";
import { inspectMethodPlanRef, isMethodPlanRef } from "../packages/data-access/src/method-plan-ref.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

const TARGETS = [
  { label: "M5 真实作品来源版本（扫页读 C02）", objectId: "b0a11000-0000-4000-8000-000000000005",
    expect: "approved", expectMethods: ["C02"] },
  // 该版本从未签过 G0：探针必须读到 null，D01 也必须因此拒绝读取（失败关闭），
  // 而不是悄悄退回"按载体猜方法"。
  { label: "从未签 G0 的样本版本（应拒绝读取）", objectId: "b0a11000-0000-4000-8000-000000000006",
    expect: "unapproved", expectMethods: [] },
];

const url = process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL;
if (!url) {
  console.error("HOLD: MOHEN_PRIVATE_WORKER_DATABASE_URL 未配置，无法按真实角色探针");
  process.exit(2);
}

const { createPrivateWorkerPool, assertPrivateWorkerIdentity } = await import(
  "../packages/data-access/src/private-worker-pool.mjs"
);
// 本地隔离库是自签证书：CA 必须显式给出，缺省即 HOLD，不降级为跳过校验。
const caFile = process.env.MOHEN_DATABASE_CA_CERT_FILE;
const ca = process.env.MOHEN_DATABASE_CA_CERT
  ?? (caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile, "utf8") : undefined);
const pool = await createPrivateWorkerPool(url, { ca });
try {
  await assertPrivateWorkerIdentity(pool);
  const readApprovedMethodPlan = createApprovedMethodPlanReader(pool);
  const results = [];
  for (const target of TARGETS) {
    const approved = await readApprovedMethodPlan({ objectType: "source_version", objectId: target.objectId });
    const plans = approved ? approved.refs.filter(isMethodPlanRef) : [];
    const inspected = plans.map(ref => inspectMethodPlanRef(ref));
    const ids = inspected.filter(item => item.ok).map(item => item.id);
    const invalid = inspected.filter(item => !item.ok).map(item => item.reason);
    const matched = target.expect === "approved"
      ? Boolean(approved?.gate_audit_id) && invalid.length === 0
        && target.expectMethods.every(method => ids.includes(`${method}@v1`))
      : approved === null;
    results.push({
      label: target.label,
      source_version_id: target.objectId,
      expectation: target.expect,
      gate_audit_id: approved?.gate_audit_id ?? null,
      approved_plan_ids: ids,
      invalid_refs: invalid,
      matched,
    });
  }
  const ok = results.every(row => row.matched);
  console.log(JSON.stringify({
    status: ok ? "D01_METHOD_PLAN_CONSUMPTION_PROVEN" : "D01_METHOD_PLAN_HOLD",
    note: "私有工人登录 + 真实 RLS 只读；approved=读得到 G0 批准计划，unapproved=读不到（D01 必须拒绝读取）",
    results,
  }, null, 2));
  process.exitCode = ok ? 0 : 1;
} finally {
  await pool.end();
}
