#!/usr/bin/env node
/**
 * Owner 授权落地（2026-11-25）：为朱家角主线项目 d9d48901 建立「导演动作」模型委托。
 * 与金泽 77bdea5d 同一授权范围（Owner 11-25 费用全权授权、按计划全力推进）；
 * 来源 9aa03207 的 external_processing 已由 approve-m5-zhujiajiao-external-processing.mjs 落库为 allowed。
 * 边界：loopback 隔离库、封顶 1.00 USD、幂等、--apply 才写库。
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
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && m[2] !== "") env[m[1]] = m[2]; }

{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!loopback || !/dev|isolat|test/.test(name)) throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const PROJECT_ID = "d9d48901-3aa3-4424-b50f-965d6749ee8e";
const TASK_ID = "b2143002-5867-4873-9cae-21e0aebccb51";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const SOURCE_ID = "9aa03207-6d60-4984-8c1f-347df2532842";
const RUN_ID = "b9989b90-fd8a-4d50-b4b4-6f3cca7fb049";
const DECISION_AT = "2026-11-25";
const BUDGET_USD = "1.00";
const ACTIONS = ["llm_director_h1", "llm_director_h2", "llm_director_h3", "llm_work_panels"];
const IKEY = "6d0f6ac4-1b5e-4c4f-9a86-0f1e2c8a4b17";
const apply = process.argv.includes("--apply");

const uuidSeed = (label) => {
  const h = crypto.createHash("sha256").update(label).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const DELEGATION_ID = uuidSeed("m5-zhujiajiao-director-delegation");
const SERIES_ID = uuidSeed("m5-zhujiajiao-director-series");
const requestHash = crypto.createHash("sha256").update(`m5-zhujiajiao-director:${PROJECT_ID}:${ACTIONS.join(",")}:${DECISION_AT}`).digest("hex");

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
try {
  const existing = (await db.query("select delegation_id::text, budget_limit, allowed_actions, transfer_rights_decision from studio.delegations where idempotency_key=$1", [IKEY])).rows[0];
  if (existing) {
    console.log("ALREADY_EXISTS_IDEMPOTENT", JSON.stringify(existing));
  } else {
    const inputManifest = {
      actions: ACTIONS, source_ids: [SOURCE_ID], max_calls: 8,
      owner_authorization: DECISION_AT, budget_cap_usd: Number(BUDGET_USD), run_id: RUN_ID,
      purpose: "m5 zhujiajiao director content generation (H1/H2/H3 + work panels)",
    };
    const transfer = {
      external_processing: "GRANTED", decided_by: "owner", decided_at: DECISION_AT,
      scope: "M5 zhujiajiao director generation (H1/H2/H3 + work panels) on qualified research material; same 2026-11-25 owner authorization as m5-shinze delegation 77bdea5d",
      budget_cap_usd: Number(BUDGET_USD),
    };
    const params = [
      DELEGATION_ID, PROJECT_ID, "m5-zhujiajiao-b2143002", TASK_ID, "director-h1h2h3-generation",
      SERIES_ID, 1, OWNER_ID, "mohen-studio-director", "deepseek", "deepseek/2026-11-07",
      JSON.stringify(inputManifest), ACTIONS, JSON.stringify(transfer),
      "m5.studio-director.authorization.2026-11-25", BUDGET_USD, "USD",
      requestHash, IKEY, "mohen.studio-director.v1",
    ];
    console.log("WOULD_INSERT delegation:", DELEGATION_ID);
    console.log("  actions:", ACTIONS.join(", "), "budget:", BUDGET_USD, "USD");
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