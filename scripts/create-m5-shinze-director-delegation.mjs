#!/usr/bin/env node
/**
 * Owner 授权落地（2026-11-25）：为金泽项目 a2b0cf23 建立「导演动作」模型委托。
 *
 * 背景：段 5（导演 H1/H2/H3 + 19 组件 → WorkRevision）的唯一缺口是——历来没有一张
 *   既含 llm_director_h1/h2/h3(+work_panels) 动作、又 external_processing=GRANTED、又有
 *   USD 预算的委托，导致真实 H1/H2/H3 从未在授权通道跑过一次（正文因此为空/占位）。
 *   来源 f889a887 的 rights_by_action.external_processing 已为 allowed（D02 时段放开），
 *   权利闸已开；本脚本只补齐「预算 + 动作 + GRANTED」这一张委托账。
 *
 * 依据：Owner 2026-11-25 明确「费用全权授权、按计划全力推进」；本委托把该授权落为
 *   可核账的额度和范围（封顶 1.00 USD，逐次真实调用以 Receipt 对账）。
 *
 * 边界（严格）：
 *   - 只在 loopback 隔离库执行（REFUSE_NON_ISOLATED_DB），不碰生产库/Storage/RLS/部署。
 *   - 不改来源 rights_by_action（已是 allowed）、不扩其他动作、不新增 Provider。
 *   - 幂等：按固定 idempotency_key 去重，重复运行不产生第二条委托。
 *   - 先不带 --apply 只报告；加 --apply 才写库。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
const { Client } = pg;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && m[2] !== "") env[m[1]] = m[2];
}

{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!loopback || !/dev|isolat|test/.test(name)) throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const PROJECT_ID = "a2b0cf23-edba-42ec-8c44-0911eb52855e";
const TASK_ID = "bca52162-5354-4faa-8b28-17bca1bb64f1";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const SOURCE_ID = "f889a887-1320-43bb-b505-01106e881abb";
const RUN_ID = "21d9603f-ee28-4d2c-91f9-bd246d382ea9";
const DECISION_AT = "2026-11-25";
const MODEL = "deepseek-flash";
const ENGINE_VERSION = "deepseek/2026-11-07";
const BUDGET_USD = "1.00";
const ACTIONS = ["llm_director_h1", "llm_director_h2", "llm_director_h3", "llm_work_panels"];
const IKEY = "be3c1f2a-9a4d-4f8b-8c1e-2d7a6f0b9c55";
const apply = process.argv.includes("--apply");

const uuidSeed = (label) => {
  const h = crypto.createHash("sha256").update(label).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const DELEGATION_ID = uuidSeed("m5-shinze-director-delegation");
const SERIES_ID = uuidSeed("m5-shinze-director-series");
const requestHash = crypto.createHash("sha256")
  .update(`m5-shinze-director:${PROJECT_ID}:${ACTIONS.join(",")}:${DECISION_AT}`).digest("hex");

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
try {
  const existing = (await db.query(
    "select delegation_id::text, budget_limit, allowed_actions, transfer_rights_decision from studio.delegations where idempotency_key=$1",
    [IKEY])).rows[0];

  if (existing) {
    console.log("ALREADY_EXISTS_IDEMPOTENT", JSON.stringify(existing));
  } else {
    const inputManifest = {
      actions: ACTIONS,
      source_ids: [SOURCE_ID],
      max_calls: 8,
      owner_authorization: DECISION_AT,
      budget_cap_usd: Number(BUDGET_USD),
      run_id: RUN_ID,
      purpose: "m5 shinze director content generation (H1/H2/H3 + work panels)",
    };
    const transfer = {
      external_processing: "GRANTED",
      decided_by: "owner",
      decided_at: DECISION_AT,
      scope: "M5 金泽 director generation (H1/H2/H3 + work panels) on qualified research material; supersedes D02 single-observation scope",
      budget_cap_usd: Number(BUDGET_USD),
    };
    const params = [
      DELEGATION_ID, PROJECT_ID, "m5-shinze-bca52162", TASK_ID, "director-h1h2h3-generation",
      SERIES_ID, 1, OWNER_ID, "mohen-studio-director", "deepseek", ENGINE_VERSION,
      JSON.stringify(inputManifest), ACTIONS, JSON.stringify(transfer),
      "m5.studio-director.authorization.2026-11-25", BUDGET_USD, "USD",
      requestHash, IKEY, "mohen.studio-director.v1",
    ];
    console.log("WOULD_INSERT delegation:", DELEGATION_ID);
    console.log("  actions:", ACTIONS.join(", "));
    console.log("  model:", MODEL, " budget:", BUDGET_USD, "USD  transfer:", JSON.stringify(transfer));
    if (apply) {
      const res = await db.query(
        `insert into studio.delegations(
           delegation_id, project_id, root_task_ref, root_task_id, subtask_ref, delegation_series_id,
           delegation_revision_no, requester, executor, provider, engine_version, input_manifest,
           allowed_actions, transfer_rights_decision, policy_version, expires_at, budget_limit, currency,
           request_hash, idempotency_key, output_schema)
         select $1::uuid,$2::uuid,$3,$4::uuid,$5,$6::uuid,$7,$8::uuid,$9,$10,$11,$12::jsonb,
                $13::text[],$14::jsonb,$15, now() + interval '7 days', $16::numeric,$17,$18,$19,$20
         where not exists (select 1 from studio.delegations where idempotency_key=$19)`,
        params);
      console.log("APPLIED rows=", res.rowCount);
    } else {
      console.log("DRY_RUN_ONLY (add --apply to write)");
    }
  }

  const after = (await db.query(
    `select delegation_id::text, allowed_actions, budget_limit, currency, transfer_rights_decision->>'external_processing' as xp,
            expires_at::text, idempotency_key
       from studio.delegations where idempotency_key=$1`, [IKEY])).rows[0];
  console.log("VERIFY", after ? JSON.stringify(after) : "NOT_FOUND");
} finally {
  await db.end();
}