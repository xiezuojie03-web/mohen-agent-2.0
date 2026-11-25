#!/usr/bin/env node
/**
 * Owner 决策落地（2026-11-25）：批准主线来源 9aa03207（上海地名志·朱家角）的导演生成外发权。
 *
 * 依据：Owner 2026-11-25「费用全权授权、按计划全力推进」已把金泽来源的外发权扩至
 *   导演生成（m5-shinze 委托已落地）；同一授权范围覆盖 M5 两个非模板题材的导演生成。
 *   朱家角来源原 external_processing=unknown（2026-11-08 stamp 权利证据），
 *   本脚本把该授权如实落库，带完整决策留痕。
 *
 * 边界（严格）：
 *   - 只改这一个来源、只放开 external_processing 一项；display 保持已批准；
 *     download/adapt/redistribute 保持 unknown。
 *   - 只在 loopback 隔离库执行，不碰生产库/Storage/RLS/部署。
 *   - 保留原始授权证据，不覆盖历史；新增 2026-11-25 授权记录。
 *   - 幂等：重复运行不产生多条记录。
 */
import fs from "node:fs";
import path from "node:path";
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

const SOURCE_ID = "9aa03207-6d60-4984-8c1f-347df2532842";
const DECISION_AT = "2026-11-25";
const DECISION_BY = "Owner (project owner, 2026-11-25 全权授权·按计划全力推进)";
const RECORDED_BY = "scripts/approve-m5-zhujiajiao-external-processing.mjs";
const apply = process.argv.includes("--apply");

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
try {
  const before = (await db.query(
    `select source_id::text, title, rights_by_action, rights_evidence from source.sources where source_id=$1`,
    [SOURCE_ID])).rows[0];
  if (!before) throw new Error("SOURCE_NOT_FOUND");
  console.log("BEFORE", JSON.stringify({ rights_by_action: before.rights_by_action }, null, 1));

  const rights = { ...(before.rights_by_action || {}) };
  const ev = JSON.parse(JSON.stringify(before.rights_evidence || {}));
  const already = rights.external_processing === "allowed" &&
    Array.isArray(ev.external_processing_authorizations) &&
    ev.external_processing_authorizations.some((a) => a.decision_at === DECISION_AT);

  if (already) {
    console.log("ALREADY_APPROVED_IDEMPOTENT");
  } else {
    rights.external_processing = "allowed";
    ev.granted_actions = Array.from(new Set([...(ev.granted_actions || []), "external_processing"]));
    ev.held_actions = (ev.held_actions || []).filter((a) => a !== "external_processing");
    ev.external_processing_authorizations = [
      ...(ev.external_processing_authorizations || []),
      {
        decision_at: DECISION_AT,
        decision_by: DECISION_BY,
        actions: ["external_processing"],
        scope: "m5 director content generation (H1/H2/H3 + work panels) for zhujiajiao mainline; same scope as m5-shinze delegation 77bdea5d",
        object: "source 9aa03207 / 上海地名志·朱家角",
        note: "Owner 2026-11-25 authorized external processing for M5 director generation (both non-template topics); download/adapt/redistribute remain unknown.",
        recorded_by: RECORDED_BY,
      },
    ];
    console.log("AFTER", JSON.stringify({ rights_by_action: rights }, null, 1));
    if (apply) {
      await db.query(
        `update source.sources set rights_by_action=$2::jsonb, rights_evidence=$3::jsonb where source_id=$1`,
        [SOURCE_ID, JSON.stringify(rights), JSON.stringify(ev)]);
      console.log("APPLIED");
    } else {
      console.log("DRY_RUN_ONLY (add --apply to write)");
    }
  }
  const after = (await db.query(
    `select rights_by_action->>'external_processing' xp, rights_by_action->>'display' display from source.sources where source_id=$1`,
    [SOURCE_ID])).rows[0];
  console.log("VERIFY", JSON.stringify(after));
} finally {
  await db.end();
}