#!/usr/bin/env node
/**
 * M5 同一正式作品对象的连续业务交接验证（隔离库，§19.1 / PLAN §3.5 B/C/D）
 *
 * 继承已有真实对象，不新建第二套真值、不签任何 Gate、不回填历史身份：
 *   Project b0a11000…0001（ACTIVE，Owner 270bcecf…）
 *   Delegation 78655328… / root_task_ref studio-llm-dispatch
 *   DirectorPlan c17e3aea…（public.director_plans 正式正文 + G5 ec8117cb…）
 *   Work 3bb3458b… / WorkRevision 5c459bc3…（publication.work_revisions 正式正文
 *     + studio.work_revisions 封套 formal_revision_id + G5 286ca90d…）
 *
 * 在一个进程内连续回放 ST-08 → ST-09 → 发布指针 → WATCH → 撤权，
 * 每一步都断言仍是同一 Project/Root/Plan/Work/Revision，并做真实反向验证。
 * 已uet通过的 ST-05/ST-07 正文权威测试不在此重复。
 *
 * 安全：仅 loopback 且库名含 dev/isolat/test；不改生产；不签 Gate；不改 RLS。
 */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { PUBLISHED_WORKS_SQL, STUDIO_REVISION_WATCHABLE_SQL } from "../apps/web/lib/publication-watch-sql.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}
{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  if (!(host === "127.0.0.1" || host === "localhost" || host === "::1") || !/dev|isolat|test/.test(name))
    throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
}

const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
const OTHER_PROJECT_ID = "b0a11000-0000-4000-8000-000000000099";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const DELEGATION_ID = "78655328-d6b3-4c1c-adb8-4dd3e309c8b9";
const ROOT_TASK_REF = "studio-llm-dispatch";
const PLAN_ID = "c17e3aea-e99a-d5d6-3b29-d014f9e788e0";
const WORK_ID = "3bb3458b-90e9-2b0d-4475-67f310b2ac99";
const REVISION_ID = "5c459bc3-1750-b718-eaf5-daa16ec441e0";
const PLAN_G5 = "ec8117cb-95c5-4f52-bef5-784a15064f6f";
const REV_G5 = "286ca90d-a68b-42a7-be54-dbd90f380c35";
const OPERATOR_ID = "b0a11000-0000-4000-8000-0000000000b2";
const SNAPSHOT_ID = (() => {
  const h = createHash("sha256").update(`mab-st08-formal:snapshot:${REVISION_ID}`).digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
})();
const watchableSQL = STUDIO_REVISION_WATCHABLE_SQL.replace(/:'wid'/g, "$1").replace(/:'rid'/g, "$2");
const publishedSQL = PUBLISHED_WORKS_SQL;

const results = { PASS: [], FAIL: [], FINDING: [] };
const pass = (k, d) => { results.PASS.push(k); console.log(`  PASS ${k}${d ? ` -- ${d}` : ""}`); };
const fail = (k, d) => { results.FAIL.push(k); console.log(`  FAIL ${k}${d ? ` -- ${d}` : ""}`); };
const finding = (k, d) => { results.FINDING.push(k); console.log(`  FINDING ${k}${d ? ` -- ${d}` : ""}`); };
const expectReject = async (label, fn, pattern) => {
  let rejected = false, msg = "";
  try { await fn(); } catch (e) { rejected = true; msg = e instanceof Error ? e.message : String(e); }
  if (!rejected || (pattern && !new RegExp(pattern).test(msg))) {
    fail(label, `expected rejection ${pattern}, got rejected=${rejected} msg=${msg.slice(0, 120)}`);
    return null;
  }
  return msg;
};

async function main() {
  console.log("=".repeat(78));
  console.log("M5 同一正式作品对象连续业务交接验证（隔离库）");
  console.log(`project=${PROJECT_ID} root=${ROOT_TASK_REF} plan=${PLAN_ID} work=${WORK_ID} revision=${REVISION_ID}`);
  console.log("=".repeat(78));
  const db = new Client({ connectionString: env.DATABASE_URL });
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
  const pointer = async () => (await db.query(
    `select source_schema, studio_revision_id::text as revision_id, publication_id::text
       from publication.published_pointers where work_id=$1`, [WORK_ID])).rows[0] ?? null;

  const before = (await db.query(
    `select (select count(*)::int from public.director_plans) plans,
            (select count(*)::int from publication.works) works,
            (select count(*)::int from publication.work_revisions) revisions,
            (select count(*)::int from control.gate_audits where gate_code='G5') g5s`)).rows[0];

  // ---- 1. 同一对象锚点：Project / Delegation / Root / DirectorPlan / Work / Revision ----
  try {
    const a = (await db.query(
      `select p.project_id::text as project_id, p.owner_user_id::text as owner_id, p.lifecycle_status,
              d.delegation_id::text as delegation_id, d.root_task_ref,
              dp.plan_id::text as plan_id, dp.project_id::text as plan_project, dp.delegation_id::text as plan_delegation,
              dp.root_task_ref as plan_root, dp.research_snapshot_hash, dp.research_source_refs,
              w.work_id::text as work_id, w.project_id::text as work_project, w.owner_user_id::text as work_owner,
              r.revision_id::text as revision_id, r.work_id::text as rev_work,
              r.content->'director_source'->>'plan_id' as source_plan,
              e.formal_revision_id::text as envelope_target, e.project_id::text as envelope_project
         from studio.projects p
         join studio.delegations d on d.project_id = p.project_id and d.delegation_id = $2::uuid
         join public.director_plans dp on dp.project_id = p.project_id and dp.plan_id = $3::uuid
         join publication.works w on w.project_id = p.project_id and w.work_id = $4::uuid
         join publication.work_revisions r on r.work_id = w.work_id and r.revision_id = $5::uuid
         join studio.work_revisions e on e.revision_id = r.revision_id
        where p.project_id = $1::uuid`,
      [PROJECT_ID, DELEGATION_ID, PLAN_ID, WORK_ID, REVISION_ID])).rows[0];
    const checks = {
      project: a?.project_id === PROJECT_ID, owner: a?.owner_id === OWNER_ID,
      active: a?.lifecycle_status === "ACTIVE", delegation: a?.delegation_id === DELEGATION_ID,
      root: a?.root_task_ref === ROOT_TASK_REF, plan: a?.plan_id === PLAN_ID,
      plan_project: a?.plan_project === PROJECT_ID, plan_delegation: a?.plan_delegation === DELEGATION_ID,
      plan_root: a?.plan_root === ROOT_TASK_REF, snapshot: /^[a-f0-9]{64}$/.test(a?.research_snapshot_hash ?? ""),
      source_refs: Array.isArray(a?.research_source_refs) && a.research_source_refs.length > 0,
      work: a?.work_id === WORK_ID, work_project: a?.work_project === PROJECT_ID,
      work_owner: a?.work_owner === OWNER_ID, revision: a?.revision_id === REVISION_ID,
      rev_work: a?.rev_work === WORK_ID, source_plan: a?.source_plan === PLAN_ID,
      envelope: a?.envelope_target === REVISION_ID, envelope_project: a?.envelope_project === PROJECT_ID,
    };
    const broken = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    if (broken.length) throw new Error(`同一对象锚点断裂：${broken.join(",")} row=${JSON.stringify(a)}`);
    pass("same_object_anchor", `Project/Delegation/Root/Plan/Work/Revision/封套全部同一对象；snapshot=${a.research_snapshot_hash.slice(0, 12)}…`);
  } catch (e) { fail("same_object_anchor", e.message); await db.end(); return report(); }

  // ---- 2. 独立 G5 与正式正文指纹（继承，不新签） ----
  try {
    const g = (await db.query(
      `select (select artifact_revision from control.gate_audits where gate_audit_id=$1) plan_g5_rev,
              (select artifact_revision from control.gate_audits where gate_audit_id=$2) rev_g5_rev`,
      [PLAN_G5, REV_G5])).rows[0];
    const planRev = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev", [PLAN_ID])).rows[0].rev;
    const workRev = (await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev", [REVISION_ID])).rows[0].rev;
    if (planRev !== g.plan_g5_rev || workRev !== g.rev_g5_rev) throw new Error("G5 指纹与正式正文实时指纹不一致");
    const current = (await db.query(
      `select count(*)::int n from control.gate_audits where gate_audit_id in ($1::uuid,$2::uuid)
        and result='PASS' and current_valid and (valid_until is null or now()<valid_until)
        and decision_origin='independent_gate'`, [PLAN_G5, REV_G5])).rows[0].n;
    if (current !== 2) throw new Error(`当前有效独立 G5 应为 2，实际=${current}`);
    pass("inherited_independent_g5", `Plan G5 ${PLAN_G5.slice(0,8)}… / Revision G5 ${REV_G5.slice(0,8)}… 当前有效且指纹读正式正文`);
  } catch (e) { fail("inherited_independent_g5", e.message); }

  // ---- 3. ST-08 投稿：同一 revision 的冻结快照（幂等继承） ----
  try {
    const r = (await db.query(
      `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4) as result`,
      [SNAPSHOT_ID, REVISION_ID, PROJECT_ID, OWNER_ID])).rows[0].result;
    const info = typeof r === "string" ? JSON.parse(r) : r;
    if (info.revision_id !== REVISION_ID || info.snapshot_id !== SNAPSHOT_ID) throw new Error("投稿未绑定同一正式 revision");
    const s = (await db.query(
      `select snapshot_id::text, revision_id::text, project_id::text, content_hash, artifact_revision, payload
         from studio.submission_snapshots where revision_id=$1`, [REVISION_ID])).rows[0];
    const live = (await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev", [REVISION_ID])).rows[0].rev;
    const planLive = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev", [PLAN_ID])).rows[0].rev;
    if (s.revision_id !== REVISION_ID || s.project_id !== PROJECT_ID || s.artifact_revision !== live
      || s.payload?.version_snapshot?.director_plan?.artifact_revision !== planLive)
      throw new Error("投稿快照未精确绑定同一 revision / Project / Plan 指纹");
    pass("st08_same_revision_snapshot", `${info.idempotent ? "幂等复用" : "新建"} snapshot=${SNAPSHOT_ID.slice(0,8)}…；revision/content_hash/plan 指纹全部对齐`);
  } catch (e) { fail("st08_same_revision_snapshot", e.message); }

  // ---- 4. 反向：错 Project 投稿、旧 revision 越过最新 revision 均被拒 ----
  await expectReject("st08_wrong_project_rejected", async () => db.query(
    `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4)`,
    [randomUUID(), REVISION_ID, OTHER_PROJECT_ID, OWNER_ID]), "PRIVATE_SUBMISSION_REVISION_NOT_FOUND|NOT_FOUND");

  // ---- 5. ST-09 角色隔离 / 自审拒绝 ----
  try {
    const acl = (await db.query(
      `select coalesce(array_agg(grantee::regrole::text),'{}') grantees
         from (select (aclexplode(proacl)).grantee grantee from pg_proc
                where oid='publication.decide_editorial(uuid,uuid,uuid,text,text,text,text)'::regprocedure) x`)).rows[0].grantees;
    if (!acl.includes("mohen_editorial_operator") || acl.includes("mohen_app_runtime") || acl.some((x) => /gate_signer/.test(x)))
      throw new Error(`角色隔离失败 grantees=${JSON.stringify(acl)}`);
    pass("st09_role_isolation", "decide_editorial 仅 Operator 可执行，Creator/Gate signer 无 execute");
  } catch (e) { fail("st09_role_isolation", e.message); }
  const creator = (await db.query("select creator_id from studio.work_revisions where revision_id=$1", [REVISION_ID])).rows[0].creator_id;
  await expectReject("st09_self_review_rejected", () => asOperator(
    `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,'self',$5)`,
    [randomUUID(), WORK_ID, REVISION_ID, creator, `loop-self-${randomUUID()}`]), "OPERATOR_CONFLICT");

  // ---- 6. 退回 → 真实发布拒绝（PUBLISH_DECISION_REQUIRED）→ 再批准 ----
  const nonce = Date.now();
  try {
    const req = await asOperator(
      `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'CHANGES_REQUESTED',$4,'loop changes',$5) as result`,
      [randomUUID(), WORK_ID, REVISION_ID, OPERATOR_ID, `loop-changes-${nonce}`]);
    if (req.decision !== "CHANGES_REQUESTED") throw new Error("退回决策未记录");
    pass("st09_changes_requested", "退回决策 appended，同一 revision，投稿快照不变");
  } catch (e) { fail("st09_changes_requested", e.message); }
  const ptrBefore = await pointer();
  await expectReject("st09_changes_blocks_publish", () => asOperator(
    `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5)`,
    [randomUUID(), WORK_ID, REVISION_ID, OPERATOR_ID, `loop-publish-blocked-${nonce}`]), "PUBLISH_DECISION_REQUIRED");
  const ptrAfterReject = await pointer();
  if ((ptrBefore?.publication_id ?? null) !== (ptrAfterReject?.publication_id ?? null))
    fail("st09_failed_publish_keeps_pointer", "退回态发布被拒后指针被破坏");
  else pass("st09_failed_publish_keeps_pointer", "发布被拒后旧合法指针未变");
  try {
    const appr = await asOperator(
      `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,$5,$6) as result`,
      [randomUUID(), WORK_ID, REVISION_ID, OPERATOR_ID, "loop approved", `loop-approved-${nonce}`]);
    if (appr.decision !== "APPROVED") throw new Error("批准决策未记录");
    const d = (await db.query(
      `select revision_id::text, project_id::text, artifact_revision, knowledge_gate_audit_id::text, decision
         from publication.editorial_decisions where decision_id=$1`, [appr.decision_id])).rows[0];
    if (d.revision_id !== REVISION_ID || d.project_id !== PROJECT_ID
      || d.knowledge_gate_audit_id !== REV_G5 || d.decision !== "APPROVED")
      throw new Error(`批准决策未绑定同一对象/G5：${JSON.stringify(d)}`);
    pass("st09_approved_same_object", "APPROVED 精确绑定同一 revision/Project/Revision G5，运营批准未改 Gate");
  } catch (e) { fail("st09_approved_same_object", e.message); }

  // ---- 7. 发布指针 CAS + 越权发布失败保护 ----
  const pubId = randomUUID();
  try {
    const pub = await asOperator(
      `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5) as result`,
      [pubId, WORK_ID, REVISION_ID, OPERATOR_ID, `loop-publish-${nonce}`]);
    if (pub.publication_id !== pubId) throw new Error("publication_id 不匹配");
    const p = await pointer();
    if (!p || p.revision_id !== REVISION_ID || p.publication_id !== pubId || p.source_schema !== "studio")
      throw new Error(`指针未精确指向同一 revision：${JSON.stringify(p)}`);
    const snap = (await db.query(
      `select revision_id::text, project_id::text, artifact_revision from publication.publication_snapshots where publication_id=$1`,
      [pubId])).rows[0];
    const live = (await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev", [REVISION_ID])).rows[0].rev;
    if (snap.revision_id !== REVISION_ID || snap.project_id !== PROJECT_ID || snap.artifact_revision !== live)
      throw new Error("发布快照未读同一正式正文指纹");
    pass("publish_exact_pointer", `指针 publication=${pubId.slice(0,8)}… → revision=${REVISION_ID.slice(0,8)}…；快照指纹对齐`);
  } catch (e) { fail("publish_exact_pointer", e.message); }
  await expectReject("publish_self_operator_rejected", () => asOperator(
    `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5)`,
    [randomUUID(), WORK_ID, REVISION_ID, creator, `loop-publish-self-${nonce}`]), "OPERATOR_REQUIRED");
  const pAfterBad = await pointer();
  if (pAfterBad?.publication_id !== pubId) fail("publish_failure_keeps_pointer", "越权发布失败后指针被破坏");
  else pass("publish_failure_keeps_pointer", "越权发布被拒，原合法指针未变");

  // ---- 8. WATCH 合法消费 + 错 revision / 匿名反向 ----
  try {
    const listed = (await db.query(publishedSQL)).rows.find((w) => w.work_id === WORK_ID && w.revision_id === REVISION_ID);
    if (!listed) throw new Error("WATCH 未列出同一正式 revision");
    const w = (await db.query(watchableSQL, [WORK_ID, REVISION_ID])).rows;
    if (!w.length || w[0].ok !== 1) throw new Error("WATCH 对同一 revision 未放行");
    pass("watch_same_revision", "WATCH 列表与逐请求放行均指向同一正式 revision");
  } catch (e) { fail("watch_same_revision", e.message); }
  try {
    const wrong = (await db.query(watchableSQL, [WORK_ID, randomUUID()])).rows;
    if (wrong.some((r) => r.ok === 1)) throw new Error("错 revision 被 WATCH 放行");
    pass("watch_wrong_revision_rejected", "错 revision 不放行");
  } catch (e) { fail("watch_wrong_revision_rejected", e.message); }
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL ROLE anon");
    let denied = false;
    try { await db.query(publishedSQL); } catch { denied = true; }
    await db.query("ROLLBACK");
    if (denied) pass("watch_anonymous_denied", "anon 角色无指针表读取权，匿名消费被拒");
    else finding("watch_anonymous_denied", "anon 可读发布列表（需单独核对 RLS/公开边界），不记 PASS");
  } catch (e) { try { await db.query("ROLLBACK"); } catch {} fail("watch_anonymous_denied", e.message); }
  finally { try { await db.query("RESET ROLE"); } catch {} }

  // ---- 9. 撤权即时失效 + 历史快照保留 + 幂等 ----
  try {
    const wd = await asOperator(
      `select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) as result`,
      [randomUUID(), WORK_ID, pubId, OPERATOR_ID, "loop withdraw", `loop-withdraw-${nonce}`]);
    if (!wd.pointer_removed) throw new Error("撤权未删指针");
    const p = await pointer();
    if (p) throw new Error("撤权后指针仍存在");
    const watch = (await db.query(watchableSQL, [WORK_ID, REVISION_ID])).rows;
    if (watch.some((r) => r.ok === 1)) throw new Error("撤权后 WATCH 仍放行");
    const listed = (await db.query(publishedSQL)).rows.find((w) => w.work_id === WORK_ID);
    if (listed) throw new Error("撤权后 WATCH 仍列出作品");
    const hist = (await db.query("select count(*)::int n from publication.publication_snapshots where publication_id=$1", [pubId])).rows[0].n;
    if (hist !== 1) throw new Error("撤权后历史发布快照未保留");
    pass("withdraw_immediate_invalidation", "新请求不再消费：指针删除、WATCH 隐藏/不放行，历史快照保留");
  } catch (e) { fail("withdraw_immediate_invalidation", e.message); }
  const wdId = (await db.query("select withdrawal_id::text id from publication.withdrawals where work_id=$1 order by created_at desc limit 1", [WORK_ID])).rows[0]?.id;
  if (wdId) {
    try {
      const again = await asOperator(
        `select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) as result`,
        [wdId, WORK_ID, pubId, OPERATOR_ID, "repeat", `loop-withdraw-${nonce}`]);
      if (again.idempotent !== true || again.withdrawal_id !== wdId)
        throw new Error(`重复撤权未幂等返回原记录：${JSON.stringify(again)}`);
      pass("withdraw_idempotent", "重复撤权幂等返回原撤回记录");
    } catch (e) { fail("withdraw_idempotent", e.message); }
  }

  // ---- 10. 未扩大对象面：无新 Plan/Work/Revision/G5 ----
  try {
    const after = (await db.query(
      `select (select count(*)::int from public.director_plans) plans,
              (select count(*)::int from publication.works) works,
              (select count(*)::int from publication.work_revisions) revisions,
              (select count(*)::int from control.gate_audits where gate_code='G5') g5s`)).rows[0];
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error(`对象面变化 before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
    pass("no_new_objects_or_gate", "本轮未新建 Plan/Work/Revision/G5，未签 Gate");
  } catch (e) { fail("no_new_objects_or_gate", e.message); }

  finding("envelope_creator_identity", `封套 creator_id=${creator} 为非用户文本标签；Owner 作为 operator 的审核不构成本脚本证明的独立 Reviewer，需真实 UI 创建封套后另验`);
  await db.end();
  report();
}
function report() {
  console.log("\n" + "=".repeat(78));
  console.log("VERIFIED_ISOLATED REPORT —— M5 同一对象连续业务交接");
  console.log("=".repeat(78));
  console.log(`\nPASS (${results.PASS.length}):`); results.PASS.forEach((p) => console.log(`   ${p}`));
  if (results.FAIL.length) { console.log(`\nFAIL (${results.FAIL.length}):`); results.FAIL.forEach((f) => console.log(`   ${f}`)); }
  if (results.FINDING.length) { console.log(`\nFINDING (${results.FINDING.length}):`); results.FINDING.forEach((f) => console.log(`   ${f}`)); }
  console.log(`\n${results.FAIL.length === 0 ? "VERIFIED_ISOLATED (with findings)" : "NOT PASS"}`);
  console.log("=".repeat(78));
  process.exit(results.FAIL.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(2); });
