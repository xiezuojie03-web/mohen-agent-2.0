#!/usr/bin/env node
/**
 * 朱家角修订3 发布 + WATCH 自验（隔离库，工程自验层）。镜像金泽 publish-shinze-rev2-watch 模式。
 * 前置已核：G5 current_valid、投稿快照、审批 APPROVED、display allowed。
 * 发布者用既有机器 operator（不冒充 Owner 真人 UI 身份）；撤权留 Owner 浏览器体验。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { PUBLISHED_WORKS_SQL, STUDIO_REVISION_WATCHABLE_SQL } from "../apps/web/lib/publication-watch-sql.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const DATABASE_URL = (envText.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/m) || [])[1];
if (!DATABASE_URL) throw new Error("NO_DATABASE_URL");

{
  const u = new URL(DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  if (!["127.0.0.1", "localhost", "::1"].includes(host) || !/dev|isolat|test/.test(name))
    throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const uuidFrom = (l) => {
  const h = crypto.createHash("sha256").update(l).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const WORK = "08ddaaa8-0de5-396f-9ef1-e750e613d81d";
const REV3 = uuidFrom(`rev3:${WORK}:zhujiajiao`);
const OPERATOR_ID = "b0a11000-0000-4000-8000-0000000000b2";
const EXPECTED_BEATS = 4;

const results = { pass: [], fail: [] };
const pass = (k, d) => { results.pass.push(k); console.log(`  PASS ${k}${d ? ` -- ${d}` : ""}`); };
const fail = (k, d) => { results.fail.push(k); console.log(`  FAIL ${k}${d ? ` -- ${d}` : ""}`); };

const db = new Client({ connectionString: DATABASE_URL, options: "-c statement_timeout=6000" });
await db.connect();
const asOperator = async (sql, params) => {
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL ROLE mohen_editorial_operator");
    const r = await db.query(sql, params);
    await db.query("COMMIT");
    return r.rows[0]?.result ?? r.rows[0];
  } catch (e) { try { await db.query("ROLLBACK"); } catch {} throw e; }
  finally { try { await db.query("RESET ROLE"); } catch {} }
};

try {
  console.log(`WORK=${WORK}\nREV3=${REV3}`);

  const pre = (await db.query(
    `select r.revision_no,
       (select count(*)::int from control.gate_audits ga where ga.object_type='work_revision' and ga.object_id=r.revision_id and ga.gate_code='G5' and ga.result='PASS' and ga.current_valid and (ga.valid_until is null or ga.valid_until>now())) as g5,
       (select count(*)::int from studio.submission_snapshots ss where ss.revision_id=r.revision_id) as snap,
       (select decision from publication.editorial_decisions d where d.revision_id=r.revision_id order by created_at desc limit 1) as decision
     from studio.work_revisions r where r.revision_id=$1::uuid`, [REV3])).rows[0];
  if (!pre || pre.g5 < 1) fail("precheck_g5", "无当前有效 G5"); else pass("precheck_g5", `G5 current_valid (${pre.g5})`);
  if (!pre || pre.snap < 1) fail("precheck_submission", "无投稿快照"); else pass("precheck_submission", "投稿快照在");
  if (pre?.decision !== "APPROVED") fail("precheck_decision", `decision=${pre?.decision}`); else pass("precheck_decision", "APPROVED");

  const pubId = crypto.randomUUID();
  const idem = `pub-m5-zhujiajiao-rev3:${pubId}`;
  try {
    const pub = await asOperator(
      `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5) as result`,
      [pubId, WORK, REV3, OPERATOR_ID, idem]);
    if (pub?.publication_id !== pubId) throw new Error(`publication_id mismatch ${JSON.stringify(pub)}`);
    const p = (await db.query(`select studio_revision_id::text, publication_id::text from publication.published_pointers where work_id=$1::uuid`, [WORK])).rows[0];
    if (!p || p.studio_revision_id !== REV3) throw new Error(`pointer not rev3 ${JSON.stringify(p)}`);
    pass("publish_exact_pointer", `指针 → rev3 ${REV3.slice(0, 8)} publication=${pubId.slice(0, 8)}`);
  } catch (e) { fail("publish_exact_pointer", e.message); }

  try {
    const listed = (await db.query(PUBLISHED_WORKS_SQL)).rows.find((w) => w.work_id === WORK && w.revision_id === REV3);
    if (!listed) throw new Error("WATCH 未列出 rev3");
    let beatCount = 0;
    try { const b = JSON.parse(listed.studio_beats ?? "[]"); beatCount = Array.isArray(b) ? b.length : 0; } catch {}
    if (beatCount !== EXPECTED_BEATS) throw new Error(`beats 章数 ${beatCount} != ${EXPECTED_BEATS}`);
    pass("watch_list_4_chapters", `WATCH 列表含 rev3，${EXPECTED_BEATS} 章真实正文（source_schema=${listed.source_schema}）`);
  } catch (e) { fail("watch_list_4_chapters", e.message); }

  const watchableSQL = STUDIO_REVISION_WATCHABLE_SQL.replace(/:'wid'/g, "$1").replace(/:'rid'/g, "$2");
  try {
    const w = (await db.query(watchableSQL, [WORK, REV3])).rows;
    if (!w.length || w[0].ok !== 1) throw new Error("逐请求未放行");
    pass("watch_request_same_revision", "同 revision 逐请求放行");
  } catch (e) { fail("watch_request_same_revision", e.message); }
  try {
    const wrong = (await db.query(watchableSQL, [WORK, crypto.randomUUID()])).rows;
    if (wrong.some((r) => r.ok === 1)) throw new Error("错 revision 仍放行");
    pass("watch_wrong_revision_rejected", "错 revision 不放行");
  } catch (e) { fail("watch_wrong_revision_rejected", e.message); }
} finally {
  await db.end();
}

console.log(`\n${"=".repeat(70)}`);
console.log(`PUBLISH+WATCH REPORT: ${results.pass.length} PASS / ${results.fail.length} FAIL`);
console.log(`${results.fail.length === 0 ? "PUBLISH_WATCH_VERIFIED (朱家角 rev3 已发布，WATCH 自验通过；撤权留给 Owner 浏览器)" : "NOT_PASS"}`);
console.log(`${"=".repeat(70)}`);
process.exit(results.fail.length === 0 ? 0 : 1);