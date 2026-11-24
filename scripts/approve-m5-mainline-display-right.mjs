#!/usr/bin/env node
/**
 * Owner 决策落地（2026-11-24）：批准主线来源 9aa03207（上海地名志·朱家角）的公开展示权。
 *
 * 背景：原权利证据（tools/stamp-shl-open-data-rights.mjs，2026-11-08）将 display 列为
 *   held_actions，scope=project_internal_research，note=pending explicit owner decision。
 *   Owner 2026-11-24 明确答复「批准公开」，本脚本把该授权如实落库，带完整决策留痕。
 *
 * 边界（严格）：
 *   - 只改这一个来源、只放开 display 一项；download/adapt/redistribute/external_processing 保持 HOLD。
 *   - 只在 loopback 隔离库执行，不碰生产库/Storage/RLS/部署。
 *   - 保留 2026-11-08 原始授权证据，不覆盖历史；新增 2026-11-24 授权记录。
 *   - 幂等：重复运行不产生多条记录；若不放心可先不带 --apply 只报告。
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
const DECISION_AT = "2026-11-24";
const DECISION_BY = "Owner (project owner, C0)";
const RECORDED_BY = "scripts/approve-m5-mainline-display-right.mjs";
const apply = process.argv.includes("--apply");

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
try {
  const before = (await db.query(
    `select source_id::text, title, rights_by_action, rights_evidence from source.sources where source_id=$1`,
    [SOURCE_ID])).rows[0];
  if (!before) throw new Error("SOURCE_NOT_FOUND");
  console.log("BEFORE", JSON.stringify({ rights_by_action: before.rights_by_action, rights_evidence: before.rights_evidence }, null, 1));

  const rights = { ...(before.rights_by_action || {}) };
  const ev = JSON.parse(JSON.stringify(before.rights_evidence || {}));
  const already = rights.display === "allowed" &&
    Array.isArray(ev.public_display_authorizations) &&
    ev.public_display_authorizations.some((a) => a.decision_at === DECISION_AT && a.actions?.includes("display"));

  if (already) {
    console.log("ALREADY_APPROVED_IDEMPOTENT");
  } else {
    rights.display = "allowed";
    ev.granted_actions = Array.from(new Set([...(ev.granted_actions || []), "display"]));
    ev.held_actions = (ev.held_actions || []).filter((a) => a !== "display");
    ev.public_display_authorizations = [
      ...(ev.public_display_authorizations || []),
      {
        decision_at: DECISION_AT,
        decision_by: DECISION_BY,
        actions: ["display"],
        scope: "public_watch_for_m5_mainline_work",
        object: "source 9aa03207 / 上海地名志·朱家角",
        note: "Owner explicitly approved public display on 2026-11-24; download/adapt/redistribute/external_processing remain HOLD pending separate decision.",
        recorded_by: RECORDED_BY,
      },
    ];
    ev.owner_decision_at = DECISION_AT;
    ev.note = "Owner approved public display 2026-11-24 (see public_display_authorizations). Other held actions unchanged.";
    console.log("AFTER", JSON.stringify({ rights_by_action: rights, rights_evidence: ev }, null, 1));
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
    `select rights_by_action, rights_evidence from source.sources where source_id=$1`, [SOURCE_ID])).rows[0];
  console.log("VERIFY", JSON.stringify({ display: after.rights_by_action?.display,
    authorizations: after.rights_evidence?.public_display_authorizations }, null, 1));
} finally {
  await db.end();
}
