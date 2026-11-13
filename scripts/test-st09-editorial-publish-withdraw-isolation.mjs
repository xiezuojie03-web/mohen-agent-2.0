#!/usr/bin/env node
/**
 * test-st09-editorial-publish-withdraw-isolation.mjs —— ST-09 EditorialDecision / Publish / Withdraw
 *
 * 设计原文：KAD2 §7 ST-09「独立 Operator 决策精确 revision 与指针；不代 G；失败保留旧合法稿」、
 *           §9 `PUBLISH_ELIGIBILITY_HOLD`「资格/版权/运营核签不足 → 仅内部预览，不切公开指针」、
 *           KALC §4 作品状态机、§11「CAS 发布只指向批准且当下合法的不可变 WorkRevision」。
 *
 * 两题材（复用 ST-08 已冻结的 submission_snapshot）：
 *  - 「朱家角」/「七宝」
 *
 * 预期结论（按当前真实素材权利）：运营核签可以成立（APPROVED），但**公开发布必须 HOLD**，
 * 因为上海图书馆来源未显式许可 `display`；指针保持原样，不新切公开。这不是缺陷，是设计内失败关闭。
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
  if (m) env[m[1]] = m[2];
}

const OPERATOR = "editorial-operator-st09@mohen";
const TOPICS = [
  { name: "朱家角", projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e", workId: "2c8a6f10-e4b2-4b55-9a7e-1d3e5f9a0c22" },
  { name: "七宝", projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c", workId: "5e12a8f3-bc9d-4b4e-9a1f-3c5d6e7b8a91" },
];

const DECIDE = `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text) as d`;
const PUBLISH = `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as p`;
const WITHDRAW = `select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text) as w`;

const results = { PASS: [], FAIL: [] };
const pass = (k, d) => { results.PASS.push(k); console.log(`  ✅ ${k}${d ? ` —— ${d}` : ""}`); };
const fail = (k, d) => { results.FAIL.push(k); console.log(`  ❌ ${k}${d ? ` —— ${d}` : ""}`); };

async function main() {
  console.log("=".repeat(76));
  console.log("ST-09 EditorialDecision / Publish / Withdraw —— 本地隔离验证");
  console.log("两题材：朱家角 / 七宝（复用 ST-08 冻结快照）");
  console.log("=".repeat(76));

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();

  console.log("\n  --- Step 0: 应用迁移 ST-09 ---\n");
  const sql = fs.readFileSync(
    path.join(ROOT, "supabase/migrations/20261114190000_mab_m5_st09_editorial_publish_withdraw.sql"), "utf8");
  await db.query(sql);
  console.log("  ✅ migration applied");

  const reset = async () => {
    try { await db.query("RESET ROLE"); } catch {}
    try { await db.query("RESET ALL"); } catch {}
  };

  const ptrCount = async () => (await db.query(`select count(*)::int as n from publication.published_pointers`)).rows[0].n;
  const ptrBefore = await ptrCount();

  for (const topic of TOPICS) {
    console.log(`\n${"─".repeat(76)}`);
    console.log(`\n  ▶ 题材：${topic.name}`);
    await reset();

    const rev = (await db.query(
      `select revision_id::text as revision_id, revision_no, creator_id
       from studio.work_revisions where work_id = $1 order by revision_no desc limit 1`, [topic.workId])).rows[0];
    if (!rev) { fail(`${topic.name}_revision_lookup`, "库内无修订，需先跑 ST-07/ST-08"); continue; }
    const revisionId = rev.revision_id;
    console.log(`  精确修订 revision_id=${revisionId.slice(0, 8)}… creator=${rev.creator_id}`);

    // ===== 正向 1：运营核签 APPROVED（不代 G，只核当前资格与权利） =====
    console.log("\n  --- Step 1: 运营核签 EditorialDecision ---");
    const decisionId = crypto.randomUUID();
    const idemDecision = `st09-decide-${topic.workId}`;
    let effectiveDecisionId = decisionId;
    try {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      const res = await db.query(DECIDE,
        [decisionId, topic.workId, revisionId, "APPROVED", OPERATOR, "ST-09 隔离验证：运营核签", idemDecision]);
      await db.query("COMMIT");
      const d = res.rows[0].d;
      effectiveDecisionId = d.decision_id;
      console.log(`  decision_id=${d.decision_id}（${d.idempotent ? "已存在，按幂等复用" : "本次新建"}）publishable=${d.publishable} rights_gaps=${(d.rights_gaps || []).length}`);
      if (d.decision !== "APPROVED") throw new Error("决策形态不符");
      if (String(d.revision_id) !== revisionId) throw new Error("决策未绑定精确修订");
      pass(`${topic.name}_decision_approved`,
        `${d.idempotent ? "idempotent" : "created"} gaps=${(d.rights_gaps || []).length} publishable=${d.publishable}`);
    } catch (err) {
      await db.query("rollback").catch(() => {});
      fail(`${topic.name}_decision_approved`, err.message);
      continue;
    }

    // ===== 正向 2：决策落库内容核验（精确修订 + 当前 G5 + 权利缺口） =====
    console.log("\n  --- Step 2: 决策落库核验 ---");
    try {
      const row = (await db.query(
        `select d.decision_id::text, d.decision, d.revision_id::text, d.operator_id, d.operator_role,
                d.artifact_revision, d.knowledge_gate_audit_id::text, d.submission_snapshot_id::text,
                d.rights_gaps::text, d.content_hash,
                w.content_hash as live_hash, s.snapshot_id::text as live_snapshot
         from publication.editorial_decisions d
         join studio.work_revisions w on w.revision_id = d.revision_id
         join studio.submission_snapshots s on s.revision_id = d.revision_id
         where d.decision_id = $1`, [effectiveDecisionId])).rows[0];
      if (!row) throw new Error("决策未落库");
      const gaps = JSON.parse(row.rights_gaps);
      const checks = [
        ["决策=APPROVED", row.decision === "APPROVED"],
        ["绑定精确修订", row.revision_id === revisionId],
        ["运营身份独立", row.operator_id === OPERATOR && row.operator_role === "editorial_operator"],
        ["绑定投稿冻结快照", row.submission_snapshot_id === row.live_snapshot],
        ["绑定当前 G5 审计", !!row.knowledge_gate_audit_id],
        ["content_hash 与修订一致", row.content_hash === row.live_hash],
        ["权利缺口如实记录", Array.isArray(gaps) && gaps.some(g => g.action === "display")],
      ];
      const bad = checks.filter(([, ok]) => !ok).map(([k]) => k);
      console.log(`  gaps: ${gaps.map(g => g.code).join(", ")}`);
      if (bad.length) throw new Error(`字段不符：${bad.join(",")}`);
      pass(`${topic.name}_decision_content_verified`, `${checks.length} 项`);
    } catch (err) {
      fail(`${topic.name}_decision_content_verified`, err.message);
    }

    // ===== 正向 3：幂等重放 =====
    await expectError(db, `${topic.name}_decision_idempotent`, null, async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      const r = await db.query(DECIDE,
        [crypto.randomUUID(), topic.workId, revisionId, "APPROVED", OPERATOR, "重放", idemDecision]);
      await db.query("COMMIT");
      if (r.rows[0].d.idempotent !== true) throw new Error("未按幂等返回");
      if (r.rows[0].d.decision_id !== effectiveDecisionId) throw new Error("幂等返回了不同 decision_id");
    }, "幂等复用同一 decision_id");

    // ===== 负向 1：创作者自审（operator = creator） =====
    await expectError(db, `${topic.name}_negative_operator_is_creator`, "EDITORIAL_OPERATOR_CONFLICT", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(DECIDE, [crypto.randomUUID(), topic.workId, revisionId, "APPROVED",
        rev.creator_id, "自称运营", `st09-self-${topic.workId}`]);
    });

    // ===== 负向 2：未知修订 =====
    await expectError(db, `${topic.name}_negative_unknown_revision`, "EDITORIAL_REVISION_NOT_FOUND", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(DECIDE, [crypto.randomUUID(), topic.workId, crypto.randomUUID(), "APPROVED",
        OPERATOR, "", `st09-unknown-${topic.workId}`]);
    });

    // ===== 负向 3：非法决策值 =====
    await expectError(db, `${topic.name}_negative_invalid_decision`, "EDITORIAL_DECISION_INVALID:unknown_decision", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(DECIDE, [crypto.randomUUID(), topic.workId, revisionId, "PUBLISH_NOW",
        OPERATOR, "", `st09-bad-${topic.workId}`]);
    });

    // ===== 负向 4：发布必须 HOLD（display 未显式许可），指针保持原样 =====
    console.log("\n  --- Step 3: 发布 PUBLISH_ELIGIBILITY_HOLD 与指针不变 ---");
    const before = await ptrCount();
    await expectError(db, `${topic.name}_publish_hold_rights`, "PUBLISH_ELIGIBILITY_HOLD:rights_display_not_allowed", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(PUBLISH, [crypto.randomUUID(), topic.workId, revisionId, OPERATOR, `st09-pub-${topic.workId}`]);
    });
    try {
      const after = await ptrCount();
      const ownPtr = (await db.query(
        `select count(*)::int as n from publication.published_pointers where work_id = $1`, [topic.workId])).rows[0].n;
      if (after !== before) throw new Error(`指针总数变化 ${before}→${after}`);
      if (ownPtr !== 0) throw new Error("该作品出现了公开指针");
      pass(`${topic.name}_publish_pointer_untouched`, `指针总数仍为 ${after}，该作品指针=0`);
    } catch (err) {
      fail(`${topic.name}_publish_pointer_untouched`, err.message);
    }

    // ===== 负向 5：撤回未发布作品 =====
    await expectError(db, `${topic.name}_negative_withdraw_not_published`, "WITHDRAW_NOT_PUBLISHED", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(WITHDRAW, [crypto.randomUUID(), topic.workId, crypto.randomUUID(),
        OPERATOR, "误撤回", `st09-wd-${topic.workId}`]);
    });

    // ===== 负向 6：创作者侧角色不得决策/发布 =====
    await expectError(db, `${topic.name}_negative_creator_cannot_decide`, "权限不够", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_app_runtime");
      await db.query(DECIDE, [crypto.randomUUID(), topic.workId, revisionId, "APPROVED",
        OPERATOR, "", `st09-app-${topic.workId}`]);
    });

    // ===== 负向 7：运营侧角色不得改历史决策（append-only） =====
    await expectError(db, `${topic.name}_negative_decision_no_update_grant`, "权限不够", async () => {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(`update publication.editorial_decisions set decision = 'APPROVED' where decision_id = $1`,
        [effectiveDecisionId]);
    });
    // 库属主也改不动（触发器兜底）
    await expectError(db, `${topic.name}_negative_decision_immutable_trigger`, "EDITORIAL_DECISION_IMMUTABLE", async () => {
      await db.query("BEGIN");
      await db.query(`update publication.editorial_decisions set notes = 'tamper' where decision_id = $1`,
        [effectiveDecisionId]);
    });
  }

  // ===== 负向 8：未投稿的修订不能核签、不能发布（事务内构造后回滚） =====
  console.log(`\n${"─".repeat(76)}`);
  console.log("\n  ▶ 负向：未投稿修订 → 不能核签 / 不能发布（事务内构造后回滚）");
  await reset();
  const t0 = TOPICS[0];
  try {
    await db.query("BEGIN");
    const rev1 = (await db.query(
      `select revision_id::text as revision_id, revision_no from studio.work_revisions
       where work_id = $1 order by revision_no desc limit 1`, [t0.workId])).rows[0];
    const rev2 = crypto.randomUUID();
    await db.query(
      `insert into studio.work_revisions(
         revision_id, work_id, revision_no, project_id, creator_id, title, content_hash, content, beats,
         source_and_rights_refs, depends_on_director_plan, depends_on_story_seeds,
         depends_on_agent_contexts, depends_on_projections, publication_status, payload)
       select $1::uuid, work_id, revision_no + 1, project_id, creator_id, title || '（ST-09 负向用例）',
              $2::text, content, beats, source_and_rights_refs, depends_on_director_plan,
              depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections, 'draft', payload
       from studio.work_revisions where revision_id = $3::uuid`,
      [rev2, crypto.createHash("sha256").update("st09-negative-rev2").digest("hex"), rev1.revision_id]);
    console.log("  ✅ 事务内构造未投稿的新修订（随后回滚）");
    await expectErrorInTx(db, "未投稿不可核签", "EDITORIAL_SUBMISSION_REQUIRED", async () => {
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(DECIDE, [crypto.randomUUID(), t0.workId, rev2, "APPROVED", OPERATOR, "",
        `st09-nosub-${rev2}`]);
    });
    await expectErrorInTx(db, "未投稿不可发布", "PUBLISH_SUBMISSION_REQUIRED", async () => {
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      await db.query(PUBLISH, [crypto.randomUUID(), t0.workId, rev2, OPERATOR, `st09-nosub-pub-${rev2}`]);
    });
  } catch (err) {
    fail("st09_unsubmitted_revision_setup", err.message);
  } finally {
    await db.query("rollback").catch(() => {});
    console.log("  ↩ 事务已回滚，库内不残留 rev2");
  }

  // ===== 结构验证：同一张指针表可指向 studio 精确修订，且读取联接可用（事务内、回滚） =====
  // 说明：本段只验"指针表结构与读取联接"，事务内构造后立即回滚，
  //      不构成任何"已获发布资格"的证据（真实发布仍被 display 许可挡住）。
  console.log(`\n${"─".repeat(76)}`);
  console.log("\n  ▶ 结构验证：studio 指针写入约束 + 读取联接（事务内、回滚）");
  await reset();
  try {
    await db.query("BEGIN");
    const t = TOPICS[1];
    const rev = (await db.query(
      `select revision_id::text as revision_id, project_id::text as project_id, content_hash
       from studio.work_revisions where work_id = $1 order by revision_no desc limit 1`, [t.workId])).rows[0];
    const dec = (await db.query(
      `select decision_id::text as decision_id, submission_snapshot_id::text as sid
       from publication.editorial_decisions where revision_id = $1 order by created_at desc limit 1`,
      [rev.revision_id])).rows[0];
    const pubId = crypto.randomUUID();
    await db.query(
      `insert into publication.publication_snapshots(
         publication_id, work_id, revision_id, project_id, decision_id, submission_snapshot_id,
         artifact_revision, scope, published_by, rights_snapshot, idempotency_key)
       values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::text,'PUBLIC','fixture',
               '{}'::jsonb,$8::text)`,
      [pubId, t.workId, rev.revision_id, rev.project_id, dec.decision_id, dec.sid,
        "0".repeat(64), `st09-readpath-${pubId}`]);
    await db.query(
      `insert into publication.published_pointers(
         work_id, source_schema, revision_id, studio_revision_id, publication_id, published_by)
       values ($1::uuid,'studio',null,$2::uuid,$3::uuid,'fixture')`,
      [t.workId, rev.revision_id, pubId]);

    const studioRead = await db.query(
      `select p.work_id::text, p.source_schema, w.revision_id::text, w.title, w.content
       from publication.published_pointers p
       join studio.work_revisions w on w.revision_id = p.studio_revision_id
       where p.work_id = $1`, [t.workId]);
    if (studioRead.rows.length !== 1) throw new Error("studio 指针读取联接失败");
    if (studioRead.rows[0].source_schema !== "studio") throw new Error("source_schema 不符");

    const legacyRead = await db.query(
      `select count(*)::int as n from publication.published_pointers p
       join publication.work_revisions r on r.revision_id = p.revision_id
       where p.work_id = $1`, [t.workId]);
    if (legacyRead.rows[0].n !== 0) throw new Error("legacy 联接不应命中 studio 指针");

    // 目标互斥约束必须挡住"同时指两套修订"的脏数据
    await db.query("SAVEPOINT st09_scope");
    let exclusivityEnforced = false;
    try {
      await db.query(
        `update publication.published_pointers set revision_id = gen_random_uuid()
         where work_id = $1`, [t.workId]);
    } catch { exclusivityEnforced = true; }
    await db.query("ROLLBACK TO SAVEPOINT st09_scope");
    if (!exclusivityEnforced) throw new Error("目标互斥约束未生效");

    pass("pointer_studio_readpath", "studio 指针可写、可按 studio 修订联接读取；legacy 联接不误命中；互斥约束生效");
    pass("watch_readpath_gap_recorded",
      "现有 listPublished() 走 legacy 联接，读不到 studio 指针——WATCH 消费需在下一批适配（已记账）");
  } catch (err) {
    fail("pointer_studio_readpath", err.message);
  } finally {
    await db.query("rollback").catch(() => {});
    console.log("  ↩ 事务已回滚，未留下任何发布记录");
  }

  const ptrFinal = await ptrCount();
  if (ptrFinal === ptrBefore) pass("ptr_total_unchanged", `公开指针总数 ${ptrBefore} → ${ptrFinal} 未变`);
  else fail("ptr_total_unchanged", `${ptrBefore} → ${ptrFinal}`);

  await reset();
  await db.end();

  console.log(`\n${"=".repeat(76)}`);
  console.log("VERIFIED_ISOLATED REPORT —— ST-09 EditorialDecision / Publish / Withdraw");
  console.log("=".repeat(76));
  console.log(`\n✅ PASS (${results.PASS.length}):`);
  for (const p of results.PASS) console.log(`   ${p}`);
  if (results.FAIL.length) {
    console.log(`\n❌ FAIL (${results.FAIL.length}):`);
    for (const f of results.FAIL) console.log(`   ${f}`);
  }
  console.log(`\n${results.FAIL.length === 0 ? "✅ VERIFIED_ISOLATED（核签与 HOLD 成立）" : "❌ NOT PASS"}`);
  console.log("口径：运营核签成立，但公开发布因媒资 display 未显式许可而失败关闭、指针未切；");
  console.log("      WATCH 公开消费的正面路径仍待媒资展示许可（外部条件），本批不伪造许可。");
  console.log("=".repeat(76));
  process.exit(results.FAIL.length === 0 ? 0 : 1);
}

async function expectError(db, key, expected, body, okDetail) {
  try {
    await body();
    await db.query("COMMIT").catch(() => {});
    if (expected === null) pass(key, okDetail);
    else fail(key, `预期 ${expected}，实际成功`);
  } catch (err) {
    await db.query("rollback").catch(() => {});
    if (expected === null) fail(key, err.message);
    else if (String(err.message).includes(expected)) pass(key, expected);
    else fail(key, `${err.message}（预期 ${expected}）`);
  }
}

async function expectErrorInTx(db, key, expected, body) {
  await db.query("SAVEPOINT st09_neg");
  try {
    await body();
    await db.query("ROLLBACK TO SAVEPOINT st09_neg");
    fail(key, `预期 ${expected}，实际成功`);
  } catch (err) {
    await db.query("ROLLBACK TO SAVEPOINT st09_neg");
    if (String(err.message).includes(expected)) pass(key, expected);
    else fail(key, `${err.message}（预期 ${expected}）`);
  }
}

main().catch(err => { console.error("FATAL:", err); process.exit(2); });
