#!/usr/bin/env node
/**
 * 金泽创作线收口：发布真实正文修订2（work 96073b53 → rev2）。
 *
 * 前置（已由 persist-m5-shinze-content.mjs 完成）：rev2 真实 H1/H2/H3 正文、
 * 独立 G5、投稿快照、运营 APPROVED。本脚本只做最后一步：精确发布 + 指针核验，
 * 使 WATCH 消费同一真实修订（display 权 2026-11-24 已批准）。
 * 仅 loopback 隔离库；非生产；幂等按 idempotency_key。
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

const WORK_ID = "96073b53-36a0-aede-19ec-6e1ddc03c3d1";
const SOURCE_ID = "f889a887-1320-43bb-b505-01106e881abb";
const OPERATOR = "editorial-operator-m5@mohen";
const uuidFrom = (label) => { const h = crypto.createHash("sha256").update(label).digest("hex").slice(0, 32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; };

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
try {
  const rev = (await db.query(
    `select revision_id::text as revision_id, revision_no from publication.work_revisions
      where work_id=$1::uuid order by revision_no desc limit 1`, [WORK_ID])).rows[0];
  if (!rev) throw new Error("WORK_OR_REVISION_NOT_FOUND");
  console.log(`REVISION revision_no=${rev.revision_no} id=${rev.revision_id}`);

  const display = (await db.query(
    `select rights_by_action->>'display' as display from source.sources where source_id=$1::uuid`, [SOURCE_ID])).rows[0];
  if (display?.display !== "allowed") throw new Error(`DISPLAY_NOT_ALLOWED ${display?.display}`);
  console.log(`DISPLAY_RIGHT=allowed`);

  // 运行审核（idempotent）→ 校验可发布与权利缺口。
  await db.query("BEGIN");
  await db.query("SET LOCAL ROLE mohen_editorial_operator");
  const decision = (await db.query(
    `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text) as d`,
    [uuidFrom(`decision-rev2:${WORK_ID}:${rev.revision_id}`), WORK_ID, rev.revision_id, "APPROVED", OPERATOR,
     "金泽真实正文修订2 收口发布", `m5-shinze-decide-${rev.revision_id}`])).rows[0].d;
  await db.query("COMMIT");
  console.log(`DECISION=${decision.decision} publishable=${decision.publishable} rights_gaps=${(decision.rights_gaps || []).length}`);
  console.log("RIGHTS_GAPS=" + JSON.stringify(decision.rights_gaps ?? [], null, 2));
  // 发布闸只查 display + 运营 APPROVED（见 fullchain Step 8 注释：download/adapt/redistribute 是媒体复制权，文本引用作品不涉及）。
  if (decision.decision !== "APPROVED") throw new Error("DECISION_NOT_APPROVED");

  await db.query("BEGIN");
  await db.query("SET LOCAL ROLE mohen_editorial_operator");
  const pub = (await db.query(
    `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as p`,
    [uuidFrom(`publication-rev2:${WORK_ID}:${rev.revision_id}`), WORK_ID, rev.revision_id, OPERATOR,
     `m5-shinze-publish-${rev.revision_id}`])).rows[0].p;
  await db.query("COMMIT");
  console.log(`PUBLISHED=${pub.publication_id}`);

  const ptr = (await db.query(
    `select source_schema, coalesce(revision_id::text, studio_revision_id::text) as revision_id, publication_id::text
      from publication.published_pointers where work_id=$1::uuid`, [WORK_ID])).rows[0];
  console.log(`POINTER=${JSON.stringify(ptr)}`);
  if (!ptr || ptr.revision_id !== rev.revision_id) throw new Error("POINTER_NOT_REV2");
  console.log(`LINE_CLOSED work=${WORK_ID} rev=${rev.revision_id} 已发布，WATCH 可读真实正文`);
} finally {
  await db.end();
}