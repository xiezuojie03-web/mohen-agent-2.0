#!/usr/bin/env node
/**
 * test-st08-submission-snapshot-isolation.mjs —— ST-08 SubmitForEditorialReview + submission_snapshot
 *
 * 阶段口径：ST-08 属于 M5 Studio 业务任务轴（KAD2 §7 第 8 个业务动作），不是 D 轴新阶段。
 * 设计原文：ST-08「明确提交冻结稿件」→ 确认当前 revision / 媒体权利 / 知识资格缺口、版本快照
 *           → `submission_snapshot`；投稿不代表公开、也不代表合格知识。
 *
 * 两个题材（复用 ST-07 已 G5 签发并 current 的 work_revision）：
 *  - 「朱家角」 project=d9d48901 work=2c8a6f10 revision=8c5a7cc4（A05 actor_situation）
 *  - 「七宝」   project=b1ecefa4 work=5e12a8f3 revision=333ab162（A09 historical_transformation）
 *
 * 正向：提交冻结快照 → 记录精确修订身份 + 当前 G5 + 版本快照 + 逐动作媒体权利 + 缺口
 * 负向：未知修订 / 跨项目 / 非最新修订 / 无当前 G5 / 快照不可改写不可删除 / 非授权角色不可写
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

const STUDIO_USER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";

const TOPICS = [
  {
    name: "朱家角",
    projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e",
    workId: "2c8a6f10-e4b2-4b55-9a7e-1d3e5f9a0c22",
    directorPlan: "473bb944-5a02-997a-4628-ea41188090e7",
  },
  {
    name: "七宝",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    workId: "5e12a8f3-bc9d-4b4e-9a1f-3c5d6e7b8a91",
    directorPlan: "979836db-a6dc-bbb6-baf2-7b4e8c662a49",
  },
];

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw)
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

const results = { PASS: [], FAIL: [] };
const pass = (key, detail) => { results.PASS.push(key); console.log(`  ✅ ${key}${detail ? ` —— ${detail}` : ""}`); };
const fail = (key, detail) => { results.FAIL.push(key); console.log(`  ❌ ${key}${detail ? ` —— ${detail}` : ""}`); };

const SUBMIT_SQL = `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4::text) as snap`;

async function main() {
  console.log("=".repeat(74));
  console.log("ST-08 SubmitForEditorialReview + submission_snapshot —— 本地隔离验证");
  console.log("两题材（朱家角 / 七宝），精确修订 G5 current 为前提");
  console.log("=".repeat(74));

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const studioToken = mintSessionToken(STUDIO_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET);

  console.log("\n  --- Step 0: 应用迁移 ST-08 submission_snapshot ---\n");
  const migrationSql = fs.readFileSync(
    path.join(ROOT, "supabase/migrations/20261114180000_mab_m5_st08_submission_snapshot.sql"), "utf8");
  await db.query(migrationSql);
  console.log("  ✅ migration applied");

  const asStudio = async () => {
    await db.query("SET LOCAL ROLE mohen_app_runtime");
    await db.query(`SET LOCAL mohen.session_token = '${studioToken}'`);
  };
  const resetSession = async () => {
    try { await db.query("RESET ROLE"); } catch {}
    try { await db.query("RESET ALL"); } catch {}
  };

  for (const topic of TOPICS) {
    console.log(`\n${"─".repeat(74)}`);
    console.log(`\n  ▶ 题材：${topic.name} (project=${topic.projectId.slice(0, 8)}…)`);
    await resetSession();

    // 精确修订身份从库内取，避免脚本硬编码漂移
    const revRow = await db.query(
      `select revision_id::text as revision_id, revision_no, content_hash
       from studio.work_revisions where work_id = $1 order by revision_no desc limit 1`, [topic.workId]);
    if (!revRow.rows[0]) { fail(`${topic.name}_revision_lookup`, "库内无该作品修订，需先跑 ST-07"); continue; }
    const revisionId = revRow.rows[0].revision_id;
    console.log(`  当前最新修订 revision_id=${revisionId.slice(0, 8)}… rev=${revRow.rows[0].revision_no}`);

    // ======= 正向 1：提交冻结快照 =======
    console.log("\n  --- Step 1: 提交冻结稿件（submission_snapshot） ---");
    let snapshotId = crypto.randomUUID();
    try {
      await db.query("BEGIN");
      await asStudio();
      const res = await db.query(SUBMIT_SQL, [snapshotId, revisionId, topic.projectId, STUDIO_USER_ID]);
      await db.query("COMMIT");
      const snap = res.rows[0].snap;
      snapshotId = snap.snapshot_id;
      console.log(`  snapshot_id=${snap.snapshot_id}（${snap.idempotent ? "已存在，按幂等复用" : "本次新建"}）`);
      console.log(`  artifact_revision=${String(snap.artifact_revision).slice(0, 12)}… knowledge_gate=${String(snap.knowledge_gate_audit_id).slice(0, 8)}…`);
      console.log(`  publication_eligible=${snap.publication_eligible} gaps=${(snap.gaps || []).length}`);
      if (!snap.snapshot_id) throw new Error("未返回 snapshot_id");
      if (String(snap.revision_id) !== revisionId) throw new Error("返回的修订与提交修订不一致");
      if (!snap.knowledge_gate_audit_id) throw new Error("未记录知识资格审计");
      pass(`${topic.name}_snapshot_created`, `${snap.idempotent ? "idempotent" : "created"} gaps=${(snap.gaps || []).length} publication_eligible=${snap.publication_eligible}`);
    } catch (err) {
      await db.query("rollback").catch(() => {});
      fail(`${topic.name}_snapshot_created`, err.message);
      continue;
    }

    // ======= 正向 2：快照内容核验（精确修订 + 资格 + 版本快照 + 权利 + 缺口） =======
    console.log("\n  --- Step 2: 快照内容核验 ---");
    try {
      const row = await db.query(
        `select s.snapshot_id::text, s.revision_id::text, s.revision_no, s.content_hash,
                s.artifact_revision, s.knowledge_gate_audit_id::text, s.payload::text as payload,
                w.content_hash as live_content_hash, w.title
         from studio.submission_snapshots s
         join studio.work_revisions w on w.revision_id = s.revision_id
         where s.revision_id = $1`, [revisionId]);
      const r = row.rows[0];
      if (!r) throw new Error("快照未落库");
      const p = JSON.parse(r.payload);
      const checks = [];
      checks.push(["schema", p.schema === "mohen.submission-snapshot.v1"]);
      checks.push(["精确修订身份", p.work_revision?.revision_id === revisionId]);
      checks.push(["content_hash 与修订一致", p.work_revision?.content_hash === r.live_content_hash]);
      checks.push(["artifact_revision 快照=库内", p.work_revision?.artifact_revision === r.artifact_revision]);
      checks.push(["知识资格 G5 已记录", p.knowledge_qualification?.gate_code === "G5" && !!p.knowledge_qualification?.gate_audit_id]);
      checks.push(["投稿≠公开声明", p.statements?.submission_is_not_publication === true]);
      checks.push(["投稿≠知识合格声明", p.statements?.submission_is_not_knowledge_qualification === true]);
      checks.push(["版本快照含 director_plan", !!p.version_snapshot?.director_plan?.plan_id]);
      checks.push(["逐动作媒体权利已记录", Array.isArray(p.rights?.originals) && p.rights.originals.length > 0]);
      checks.push(["G5 必检动作显式 allowed", p.rights.originals.every(o =>
        o.actions?.machine_read === "allowed" && o.actions?.retain === "allowed")]);
      checks.push(["缺口如实记录", Array.isArray(p.gaps) && p.gaps.length > 0]);
      const bad = checks.filter(([, ok]) => !ok).map(([k]) => k);
      console.log(`  title=${r.title}`);
      console.log(`  知识资格 purpose=${p.knowledge_qualification?.purpose_namespace}/${p.knowledge_qualification?.purpose_code}/${p.knowledge_qualification?.purpose_version}`);
      console.log(`  媒体权利逐原件=${p.rights.originals.map(o => `basis=${o.basis};blocked=${(o.blocked_actions || []).join("|")}`).join(" ; ")}`);
      console.log(`  缺口=${p.gaps.map(g => g.code).join(", ")}`);
      if (bad.length) throw new Error(`快照字段不符：${bad.join(",")}`);
      pass(`${topic.name}_snapshot_content_verified`, `${checks.length} 项`);
    } catch (err) {
      fail(`${topic.name}_snapshot_content_verified`, err.message);
    }

    // ======= 负向 1：同一精确修订重复提交 → 幂等返回原快照（不产生第二份） =======
    console.log("\n  --- Step 3: 幂等（重复提交不产生第二份冻结快照） ---");
    try {
      await db.query("BEGIN");
      await asStudio();
      const res = await db.query(SUBMIT_SQL, [crypto.randomUUID(), revisionId, topic.projectId, STUDIO_USER_ID]);
      await db.query("COMMIT");
      const snap = res.rows[0].snap;
      const cnt = await db.query(`select count(*)::int as n from studio.submission_snapshots where revision_id = $1`, [revisionId]);
      if (snap.idempotent !== true) throw new Error("未按幂等返回");
      if (snap.snapshot_id !== snapshotId) throw new Error("幂等返回了不同 snapshot_id");
      if (cnt.rows[0].n !== 1) throw new Error(`快照行数=${cnt.rows[0].n}，应为 1`);
      pass(`${topic.name}_submit_idempotent`, "复用原 snapshot_id，行数=1");
    } catch (err) {
      await db.query("rollback").catch(() => {});
      fail(`${topic.name}_submit_idempotent`, err.message);
    }

    // ======= 负向 2：未知修订 =======
    await expectError(db, asStudio, `${topic.name}_negative_unknown_revision`,
      "PRIVATE_SUBMISSION_REVISION_NOT_FOUND",
      SUBMIT_SQL, [crypto.randomUUID(), crypto.randomUUID(), topic.projectId, STUDIO_USER_ID]);

    // ======= 负向 3：跨项目（他用别题材项目提交本修订） =======
    const otherProject = TOPICS.find(t => t.projectId !== topic.projectId).projectId;
    await expectError(db, asStudio, `${topic.name}_negative_cross_project`,
      "PRIVATE_SUBMISSION_REVISION_NOT_FOUND",
      SUBMIT_SQL, [crypto.randomUUID(), revisionId, otherProject, STUDIO_USER_ID]);

    // ======= 负向 4：快照不可改写 / 不可删除 =======
    // 两层保护都要实证：应用角色连 UPDATE/DELETE 权限都没有（第一层）；
    // 即便换成有权限的库属主，BEFORE UPDATE/DELETE 触发器仍拒绝（第二层）。
    await expectError(db, asStudio, `${topic.name}_negative_snapshot_no_update_grant`,
      "权限不够",
      `update studio.submission_snapshots set submitted_by = 'tamper' where revision_id = $1`, [revisionId]);
    await expectError(db, asStudio, `${topic.name}_negative_snapshot_no_delete_grant`,
      "权限不够",
      `delete from studio.submission_snapshots where revision_id = $1`, [revisionId]);
    await expectError(db, async () => {}, `${topic.name}_negative_snapshot_immutable_trigger_update`,
      "SUBMISSION_SNAPSHOT_IMMUTABLE",
      `update studio.submission_snapshots set submitted_by = 'tamper' where revision_id = $1`, [revisionId]);
    await expectError(db, async () => {}, `${topic.name}_negative_snapshot_immutable_trigger_delete`,
      "SUBMISSION_SNAPSHOT_IMMUTABLE",
      `delete from studio.submission_snapshots where revision_id = $1`, [revisionId]);

    // ======= 负向 5：非授权角色不得写快照 =======
    try {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_gate_signer_m5_machine");
      await db.query(
        `insert into studio.submission_snapshots(snapshot_id, work_id, revision_id, revision_no, project_id,
           content_hash, artifact_revision, knowledge_gate_audit_id, submitted_by, payload)
         values ($1::uuid,$2::uuid,$3::uuid,1,$4::uuid,
           repeat('a',64), repeat('b',64), $5::uuid, 'forged', '{}'::jsonb)`,
        [crypto.randomUUID(), topic.workId, revisionId, topic.projectId, crypto.randomUUID()]);
      await db.query("ROLLBACK");
      fail(`${topic.name}_negative_unauthorized_role`, "非授权角色竟然写入成功");
    } catch (err) {
      await db.query("ROLLBACK").catch(() => {});
      if (/permission denied|权限不够|42501/i.test(err.message)) pass(`${topic.name}_negative_unauthorized_role`, "42501 拒绝");
      else fail(`${topic.name}_negative_unauthorized_role`, err.message);
    }
  }

  // ======= 负向 6：修订内容在 G5 之后被改动 → 资格不再“当前”，必须失败关闭 =======
  console.log(`\n${"─".repeat(74)}`);
  console.log("\n  ▶ 负向：G5 之后内容被改动 → 精确修订资格不再当前");
  await resetSession();
  const topicG = TOPICS[1];
  try {
    await db.query("BEGIN");
    await asStudio();
    const revRow = await db.query(
      `select revision_id::text as revision_id from studio.work_revisions
       where work_id = $1 order by revision_no desc limit 1`, [topicG.workId]);
    const revId = revRow.rows[0].revision_id;
    await db.query(`update studio.work_revisions set content = content || '{"tamper":"after-g5"}'::jsonb
                    where revision_id = $1`, [revId]);
    console.log(`  ✅ 事务内改动修订内容（artifact_revision 随之改变，随后回滚）`);
    await expectErrorInTx(db, `${topicG.name}_negative_artifact_revision_moved`,
      "PRIVATE_SUBMISSION_KNOWLEDGE_NOT_QUALIFIED:artifact_revision_moved",
      SUBMIT_SQL, [crypto.randomUUID(), revId, topicG.projectId, STUDIO_USER_ID]);
  } catch (err) {
    fail(`${topicG.name}_negative_artifact_revision_moved_setup`, err.message);
  } finally {
    await db.query("rollback").catch(() => {});
    console.log("  ↩ 事务已回滚，修订内容恢复原状");
  }

  // ======= 负向 7：非最新修订 / 无当前 G5（事务内构造 rev2 后回滚） =======
  console.log(`\n${"─".repeat(74)}`);
  console.log("\n  ▶ 负向：旧修订不得越过新修订送审；无当前 G5 的修订必须失败关闭");
  await resetSession();
  const topic0 = TOPICS[0];
  try {
    await db.query("BEGIN");
    await asStudio();
    const revRow = await db.query(
      `select revision_id::text as revision_id, revision_no from studio.work_revisions
       where work_id = $1 order by revision_no desc limit 1`, [topic0.workId]);
    const rev1 = revRow.rows[0];
    const rev2Id = crypto.randomUUID();
    await db.query(
      `select studio.persist_private_work_revision($1::uuid,$2::uuid,$3::integer,$4::integer,
         $5::uuid,$6::text,$7::text,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid) as saved`,
      [topic0.workId, rev2Id, rev1.revision_no + 1, rev1.revision_no, topic0.projectId, STUDIO_USER_ID,
       `${topic0.name}修订${rev1.revision_no + 1}（ST-08 负向用例，事务内构造后回滚）`,
       JSON.stringify({ narrative_arc: { opening: "负向用例：未经 G5 的新修订" } }), JSON.stringify([]),
       JSON.stringify({ originals: [] }), topic0.directorPlan]);
    console.log(`  ✅ 事务内构造 rev${rev1.revision_no + 1}=${rev2Id.slice(0, 8)}…（无 G5，随后回滚）`);

    // 旧修订（已有快照）在存在更新修订后不得再被当作可送审版本
    await expectErrorInTx(db, `${topic0.name}_negative_not_latest_revision`,
      "PRIVATE_SUBMISSION_NOT_LATEST_REVISION",
      SUBMIT_SQL, [crypto.randomUUID(), rev1.revision_id, topic0.projectId, STUDIO_USER_ID]);

    // 无当前 G5 的新修订必须失败关闭
    await expectErrorInTx(db, `${topic0.name}_negative_no_current_g5`,
      "PRIVATE_SUBMISSION_KNOWLEDGE_NOT_QUALIFIED:no_current_g5",
      SUBMIT_SQL, [crypto.randomUUID(), rev2Id, topic0.projectId, STUDIO_USER_ID]);
  } catch (err) {
    fail(`${topic0.name}_negative_latest_and_g5_setup`, err.message);
  } finally {
    await db.query("rollback").catch(() => {});
    console.log("  ↩ 事务已回滚，库内不残留 rev2 与任何测试快照");
  }

  await resetSession();
  await db.end();

  console.log(`\n${"=".repeat(74)}`);
  console.log("VERIFIED_ISOLATED REPORT —— ST-08 submission_snapshot");
  console.log("=".repeat(74));
  console.log(`\n✅ PASS (${results.PASS.length}):`);
  for (const p of results.PASS) console.log(`   ${p}`);
  if (results.FAIL.length) {
    console.log(`\n❌ FAIL (${results.FAIL.length}):`);
    for (const f of results.FAIL) console.log(`   ${f}`);
  }
  console.log(`\n${results.FAIL.length === 0 ? "✅ VERIFIED_ISOLATED" : "❌ NOT PASS"}`);
  console.log(`关键验证：精确修订冻结 + 当前 G5 复核 + 逐动作媒体权利 + 缺口如实记账`);
  console.log(`   投稿不代表公开/合格知识（statements + gaps 落库）；快照 append-only 不可改写`);
  console.log("=".repeat(74));
  process.exit(results.FAIL.length === 0 ? 0 : 1);
}

async function expectError(db, asStudio, key, expected, sql, params) {
  try {
    await db.query("BEGIN");
    await asStudio();
    await db.query(sql, params);
    await db.query("ROLLBACK");
    fail(key, `预期 ${expected}，实际成功`);
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    if (String(err.message).includes(expected)) pass(key, expected);
    else fail(key, `${err.message}（预期 ${expected}）`);
  }
}

// 复用已开启的事务：不 BEGIN / 不 ROLLBACK，仅断言错误后由外层保存点回滚
async function expectErrorInTx(db, key, expected, sql, params) {
  await db.query("SAVEPOINT st08_neg");
  try {
    await db.query(sql, params);
    await db.query("ROLLBACK TO SAVEPOINT st08_neg");
    fail(key, `预期 ${expected}，实际成功`);
  } catch (err) {
    await db.query("ROLLBACK TO SAVEPOINT st08_neg");
    if (String(err.message).includes(expected)) pass(key, expected);
    else fail(key, `${err.message}（预期 ${expected}）`);
  }
}

main().catch(err => { console.error("FATAL:", err); process.exit(2); });
