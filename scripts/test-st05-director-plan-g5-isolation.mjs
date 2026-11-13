#!/usr/bin/env node
/**
 * test-st05-director-plan-g5-isolation.mjs —— ST-05 AssembleDirectorPlan + G5 机器评审
 *
 * 阶段口径：ST-05 属于 M5 Studio 业务任务轴，不是 D 轴的 D06；
 *           导演方案上游引用 D05 P04 story_seed/agent_context + D04 finding；
 *           由 G5（stage=D05, layer=L5）签发消费资格。
 *
 * 两个题材（复用 ST-04/ST-06 的已验证测试数据）：
 *  - 「朱家角」 project_id=d9d48901 finding_id=749414aa (A05 actor_situation, G4 PASS)
 *    original_id=f474b91b story_seed_uuid=派生 / agent_context_uuid=派生 / projection_uuid=派生
 *  - 「七宝」   project_id=b1ecefa4 finding_id=3cffc174 (A09 historical_transformation, G4 PASS)
 *    original_id=1cc126eb ...
 *
 * G5 reviewer 已扩展：
 *   checkWorkRevisionBinding 新增 director_plan 路由（method_id=H1H2H3, depends_on 存在性校验）
 *   checkRightsByOperation   新增 director_plan 路由（从 payload.original_ids 取 originals）
 *
 * 引用 MAB 交付包：KAD2 §7 ST-05 AssembleDirectorPlan 定义
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}

const STUDIO_USER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";

const TOPICS = [
  {
    name: "朱家角",
    projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e",
    findingId: "749414aa-9539-78a5-0a4e-007abedfbd9d",
    g4AuditId: "07f2ecbb-475c-46ca-a8f5-089e3e021c03",
    runId: "ffb4430e-bc11-4e18-824e-4e6f492ea432",
    originalId: "f474b91b-07f0-47ab-94dc-20dc7f55e518",
    // 与 test-d05-p04-g5-isolation.mjs / test-d05-g5-isolation.mjs 完全一致的派生 UUID
    storySeedKey: "zhujiajiao_canal_rice_market_seed",
    agentContextKey: "zhujiajiao_canal_rice_agent_ctx",
    projectionKey: "zhujiajiao_canal_rice_market_network",
    directorPlanTitle: "朱家角漕运米市网络导演方案·H1H2H3",
    h2Decisions: {
      selection: "network_anchor",
      alternatives: [
        { name: "actor_chain", reason: "以 A05 行动者链为主轴，但单维" },
        { name: "spatial_layer", reason: "以空间层次为主轴，但时间厚度不足" }
      ],
      justification: "A05+A02 交叉：以网络锚点串联行动者处境与空间格局"
    },
    h3Beats: [
      { kind: "anchor", content: "明中叶漕粮转口，西栅米市成为网络节点", duration_ms: 30000 },
      { kind: "tension", content: "漕夫-米商-乡绅三角博弈与空间锁合", duration_ms: 45000 },
      { kind: "turning", content: "民国中期米业衰退放生池成为社会互动残余锚点", duration_ms: 40000 }
    ]
  },
  {
    name: "七宝",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    findingId: "3cffc174-fc69-ba33-09de-148022e818e6",
    g4AuditId: "7c1625c0-d8b3-4876-8d4b-928f35fe545f",
    runId: "abc3251e-aa65-4e4f-9cae-9d61621ca98b",
    originalId: "1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53",
    storySeedKey: "qibao_town_multilayer_identity_seed",
    agentContextKey: "qibao_town_multilayer_agent_ctx",
    projectionKey: "qibao_town_multilayer_identity_projection",
    directorPlanTitle: "七宝古镇多层身份导演方案·H1H2H3",
    h2Decisions: {
      selection: "transformation_overlap",
      alternatives: [
        { name: "layer_sequential", reason: "按时间顺序三层，但缺失层间交叉" },
        { name: "identity_conflict", reason: "聚焦层间冲突，但难以覆盖全幅" }
      ],
      justification: "A09 变化链 + A05 行动者博弈：以叠压-冲突双轨推进"
    },
    h3Beats: [
      { kind: "origin", content: "北宋七宝教寺建镇确立宗教锚点", duration_ms: 25000 },
      { kind: "multiplication", content: "明清漕运开埠叠加商贸层与宗教层竞争", duration_ms: 40000 },
      { kind: "compression", content: "清末民初文教层兴起三方力量此消彼长", duration_ms: 45000 }
    ]
  }
];

// 复用已有 P04/P02 验证脚本的派生算法（两层哈希）
function derivedSeedUuid(topic) {
  const seedDigest = crypto.createHash("sha256")
    .update(`${topic.projectId}:${topic.findingId}:${topic.storySeedKey}`).digest("hex");
  const h = crypto.createHash("sha256")
    .update(`mab-private-story-seed:${seedDigest}`).digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
function derivedAgentContextUuid(topic) {
  const ctxDigest = crypto.createHash("sha256")
    .update(`${topic.projectId}:${topic.findingId}:${topic.agentContextKey}`).digest("hex");
  const h = crypto.createHash("sha256")
    .update(`mab-private-agent-context:${ctxDigest}`).digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
function derivedProjectionUuid(topic) {
  const inputDigest = crypto.createHash("sha256").update(
    `${topic.runId}:${topic.originalId}:${topic.findingId}:${topic.projectionKey}`).digest("hex");
  const h = crypto.createHash("sha256").update(
    `mab-private-world-projection:${inputDigest}`).digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
function derivedDirectorPlanUuid(topic) {
  const h = crypto.createHash("sha256")
    .update(`mab-private-director-plan:${topic.projectId}:${topic.findingId}:${topic.directorPlanTitle}`)
    .digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw)
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

async function main() {
  console.log("=".repeat(72));
  console.log("ST-05 AssembleDirectorPlan + G5 机器评审 —— 本地隔离验证");
  console.log("两题材（朱家角 / 七宝）+ director_plan method=H1H2H3");
  console.log("=".repeat(72));

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const secret = env.MOHEN_DATABASE_SESSION_SECRET;
  const studioToken = mintSessionToken(STUDIO_USER_ID, secret);
  const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);

  // ======= Step 0: 运行迁移 =======
  console.log("\n  --- Step 0: 应用迁移 director_plan ---\n");
  const migrationSql = fs.readFileSync(
    path.join(ROOT, "supabase/migrations/20261114120000_mab_m5_director_plan.sql"), "utf8"
  );
  try {
    await db.query(migrationSql);
    console.log("  ✅ migration applied");
  } catch (err) {
    // 如果已应用过，可能报 relation already exists — 继续
    if (err.message.includes("already exists") || err.message.includes("duplicate")) {
      console.log(`  ⚠️ migration already applied (${err.message.split("\n")[0]})`);
    } else {
      console.log(`  ❌ migration FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  // 清理旧 SUBMITTED candidates
  await db.query(`DELETE FROM control.gate_candidates WHERE gate_code='G5' AND candidate_status='SUBMITTED'`);
  console.log("  Cleaned old SUBMITTED candidates\n");

  // decideGate
  async function decideGate(decision) {
    let originalRole = null;
    let resetNeeded = false;
    await db.query("begin");
    try {
      const roleRes = await db.query("select current_user::text as cur_role");
      originalRole = roleRes.rows[0].cur_role;
      resetNeeded = true;
      await db.query("set role mohen_gate_signer_m5_machine");
      await db.query(`SET mohen.session_token = '` + machineToken + `'`);
      const res = await db.query(
        `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [decision.candidateId, decision.requestId, decision.result,
         decision.ruleVersion, decision.validUntil,
         JSON.stringify(decision.receipt), decision.expectedAuditId]
      );
      await db.query("commit");
      return res.rows[0].gate_audit_id;
    } catch (err) {
      try { await db.query("rollback"); } catch {}
      throw err;
    } finally {
      try { await db.query("select set_config('mohen.session_token',null,true)"); } catch {}
      try { if (resetNeeded && originalRole) await db.query(`set role ${originalRole}`); } catch {}
    }
  }

  const PASS = []; const FAIL = [];

  for (const topic of TOPICS) {
    console.log(`\n${"-".repeat(70)}`);
    console.log(`  --- ${topic.name} director_plan persist + G5 ---`);
    console.log(`${"-".repeat(70)}\n`);

    const storySeedUuid = derivedSeedUuid(topic);
    const ctxUuid = derivedAgentContextUuid(topic);
    const planUuid = derivedDirectorPlanUuid(topic);
    // projection 从 DB 里按 projection_key 查（derivedProjectionUuid 算法需完整 payload 对象）
    let projectionUuid;
    try {
      const proj = await db.query(
        `select projection_id::text as pid from read_model.world_projections
         where projection_key=$1 limit 1`, [topic.projectionKey]);
      projectionUuid = proj.rows[0]?.pid;
    } catch (e) {}
    console.log(`  story_seed_id   = ${storySeedUuid}`);
    console.log(`  agent_context   = ${ctxUuid}`);
    console.log(`  world_projection= ${projectionUuid || "(待查)"}`);
    console.log(`  director_plan   = ${planUuid}`);
    if (!projectionUuid) { console.log(`  ❌ projection not found for key=${topic.projectionKey}`); FAIL.push(`${topic.name}_proj_missing`); continue; }

    // ======= Step 1: verify 上游对象存在（上批次 P02/P04 已 COMMIT 持久化）=======
    console.log("\n  --- Step 1: verify upstream objects exist ---");
    try {
      const q1 = await db.query(`select story_seed_id::text, payload->>'schema' as schema from read_model.story_seeds where story_seed_id=$1`, [storySeedUuid]);
      const q2 = await db.query(`select agent_context_id::text, payload->>'schema' as schema from read_model.agent_contexts where agent_context_id=$1`, [ctxUuid]);
      const q3 = await db.query(`select projection_id::text, projection_key from read_model.world_projections where projection_id=$1`, [projectionUuid]);
      if (!q1.rows[0]) { console.log(`  ❌ story_seed not found — 先跑 scripts/test-d05-p04-g5-isolation.mjs`); FAIL.push(`${topic.name}_story_seed_missing`); continue; }
      if (!q2.rows[0]) { console.log(`  ❌ agent_context not found`); FAIL.push(`${topic.name}_ctx_missing`); continue; }
      if (!q3.rows[0]) { console.log(`  ❌ projection not found`); FAIL.push(`${topic.name}_proj_missing`); continue; }
      console.log(`  ✅ story_seed  ${q1.rows[0].schema} exists`);
      console.log(`  ✅ agent_context ${q2.rows[0].schema} exists`);
      console.log(`  ✅ projection   ${q3.rows[0].projection_key} exists`);
      PASS.push(`${topic.name}_upstream_verified`);
    } catch (err) {
      console.log(`  ❌ verify FAILED: ${err.message}`); FAIL.push(`${topic.name}_upstream`); continue;
    }

    // ======= Step 2: persist director_plan =======
    console.log("\n  --- Step 2: persist director_plan ---");
    try {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_app_runtime");
      await db.query(`SET mohen.session_token = '` + studioToken + `'`);
      const persRes = await db.query(
        `select studio.persist_private_director_plan(
           $1::uuid, $2::uuid, $3::text,
           ARRAY[$4]::uuid[], ARRAY[$5]::uuid[], ARRAY[$6]::uuid[],
           ARRAY[]::uuid[], $7::jsonb, $8::jsonb, $9::jsonb) as saved`,
        [planUuid, topic.projectId, topic.directorPlanTitle,
         storySeedUuid, ctxUuid, projectionUuid,
         JSON.stringify(topic.h2Decisions), JSON.stringify(topic.h3Beats),
         JSON.stringify({ alternative_plans: {}, media_refs: [] })]
      );
      await db.query("COMMIT");
      const saved = persRes.rows[0].saved;
      const rev = saved.artifact_revision;
      console.log(`  ✅ DB persist PASS: artifact_revision=${rev?.slice(0,16)}...`);
      console.log(`     original_ids count = ${saved.derived_story_seeds.length > 0 ? "回溯中" : "空"}`);
    } catch (err) {
      try { await db.query("ROLLBACK"); } catch {}
      console.log(`  ❌ DB persist FAILED: ${err.message}`); FAIL.push(`${topic.name}_persist`); continue;
    }

    // ======= Step 3: verify director_plan 落库 =======
    console.log("\n  --- Step 3: verify director_plan in studio.director_plans ---");
    try {
      const v = await db.query(
        `select plan_id::text as id, title, method_id, qualification,
                array_to_string(depends_on_story_seeds,',') as d_story,
                array_to_string(depends_on_agent_contexts,',') as d_ctx,
                array_to_string(depends_on_projections,',') as d_proj,
                payload->>'original_ids' as orig_ids
         from studio.director_plans where plan_id=$1::uuid`, [planUuid]);
      const row = v.rows[0];
      console.log(`  ✅ title=${row.title}`);
      console.log(`     method_id=${row.method_id}  qual=${row.qualification}`);
      console.log(`     depends_story_seeds  non-empty=${row.d_story !== ''}`);
      console.log(`     depends_agent_ctx    non-empty=${row.d_ctx !== ''}`);
      console.log(`     depends_projections  non-empty=${row.d_proj !== ''}`);
      PASS.push(`${topic.name}_director_plan_persisted`);
    } catch (err) {
      console.log(`  ❌ verify FAILED: ${err.message}`); FAIL.push(`${topic.name}_verify_plan`); continue;
    }

    // ======= Step 4: artifact_revision_for('director_plan') =======
    console.log("\n  --- Step 4: artifact_revision_for('director_plan') ---");
    let artifactRevision;
    try {
      const rev = await db.query(
        `select control.artifact_revision_for('director_plan',$1::uuid) as rev`, [planUuid]);
      artifactRevision = rev.rows[0].rev;
      if (!artifactRevision) throw new Error("artifact_revision is null");
      console.log(`  ✅ artifact_revision=${artifactRevision.slice(0,16)}...`);
      PASS.push(`${topic.name}_artifact_revision`);
    } catch (err) {
      console.log(`  ❌ artifact_revision FAILED: ${err.message}`); FAIL.push(`${topic.name}_artifact_revision`); continue;
    }

    // ======= Step 5: 上游 G5/G4 审计（dependency_snapshot 构建）=======
    console.log("\n  --- Step 5: dependency_snapshot ---");
    let depSnapshot = [];
    try {
      // story_seed G5 audit
      const seedG5Audit = await db.query(
        `select gate_audit_id, artifact_revision, qualification_digest
         from control.gate_audits
         where object_type='story_seed' and object_id=$1::uuid and gate_code='G5'
         order by signed_at desc limit 1`, [storySeedUuid]);
      // agent_context G5 audit
      const ctxG5Audit = await db.query(
        `select gate_audit_id, artifact_revision, qualification_digest
         from control.gate_audits
         where object_type='agent_context' and object_id=$1::uuid and gate_code='G5'
         order by signed_at desc limit 1`, [ctxUuid]);
      // world_projection G5 audit
      const projG5Audit = await db.query(
        `select gate_audit_id, artifact_revision, qualification_digest
         from control.gate_audits
         where object_type='world_projection' and object_id=$1::uuid and gate_code='G5'
         order by signed_at desc limit 1`, [projectionUuid]);
      // finding G4 audit
      const g4Audit = await db.query(
        `select artifact_revision, qualification_digest from control.gate_audits where gate_audit_id=$1::uuid`,
        [topic.g4AuditId]);

      depSnapshot = [
        ...(seedG5Audit.rows[0] ? [{
          gate_code: "G5", stage: "D05", object_type: "story_seed",
          object_id: storySeedUuid, artifact_revision: seedG5Audit.rows[0].artifact_revision,
          gate_audit_id: seedG5Audit.rows[0].gate_audit_id,
          qualification_digest: seedG5Audit.rows[0].qualification_digest
        }] : []),
        ...(ctxG5Audit.rows[0] ? [{
          gate_code: "G5", stage: "D05", object_type: "agent_context",
          object_id: ctxUuid, artifact_revision: ctxG5Audit.rows[0].artifact_revision,
          gate_audit_id: ctxG5Audit.rows[0].gate_audit_id,
          qualification_digest: ctxG5Audit.rows[0].qualification_digest
        }] : []),
        ...(projG5Audit.rows[0] ? [{
          gate_code: "G5", stage: "D05", object_type: "world_projection",
          object_id: projectionUuid, artifact_revision: projG5Audit.rows[0].artifact_revision,
          gate_audit_id: projG5Audit.rows[0].gate_audit_id,
          qualification_digest: projG5Audit.rows[0].qualification_digest
        }] : []),
        // director_plan 直接上游是 G5 级别对象，但 UPSTREAM_BY_GATE['G5']='G4' 要求至少一条 G4 审计
        // 满足 Gate 先序规则（G5 必须在 G4 之后签发）
        ...(g4Audit.rows[0] ? [{
          gate_code: "G4", stage: "D04", object_type: "finding",
          object_id: topic.findingId, artifact_revision: g4Audit.rows[0].artifact_revision,
          gate_audit_id: topic.g4AuditId,
          qualification_digest: g4Audit.rows[0].qualification_digest
        }] : [])
      ];
      console.log(`  dependency items = ${depSnapshot.length}`);
      depSnapshot.forEach(d => console.log(`    ${d.gate_code}/${d.object_type} rev=${d.artifact_revision?.slice(0,12)}...`));
      PASS.push(`${topic.name}_dep_snapshot_built`);
    } catch (err) {
      console.log(`  ❌ dep_snapshot FAILED: ${err.message}`); FAIL.push(`${topic.name}_dep_snapshot`); continue;
    }

    // ======= Step 6: submit gate_candidate =======
    console.log("\n  --- Step 6: gate_candidate ---");
    const planInputFp = crypto.createHash("sha256")
      .update(`${topic.projectId}:director_plan:${planUuid}:${artifactRevision}`).digest("hex");
    const candRaw = crypto.createHash("sha256")
      .update(`mab-private-gate-candidate:G5:D05:director_plan:${planUuid}`).digest("hex").slice(0, 32);
    const candUuid = `${candRaw.slice(0,8)}-${candRaw.slice(8,12)}-${candRaw.slice(12,16)}-${candRaw.slice(16,20)}-${candRaw.slice(20,32)}`;

    const evidenceRefs = [
      { kind: "director_plan", id: planUuid, artifact_revision: artifactRevision },
      { kind: "story_seed", id: storySeedUuid },
      { kind: "agent_context", id: ctxUuid },
      { kind: "world_projection", id: projectionUuid }
    ];
    const allowedScope = { project_id: topic.projectId };

    try {
      await db.query(
        `insert into control.gate_candidates(
           candidate_id, run_id, stage, gate_code, object_type, object_id,
           artifact_revision, purpose_namespace, purpose_code, purpose_version,
           allowed_scope, consumer, dependency_snapshot, evidence_refs,
           input_fingerprint, submitted_at, producer_identity, candidate_status
         ) values (
           $1::uuid, $2::uuid, 'D05', 'G5', 'director_plan', $3::uuid,
           $4, 'data-production', 'm5-remediation', 'v1',
           $5::jsonb, 'producer', $6::jsonb, $7::jsonb,
           $8, now(), 'private-evidence-worker', 'SUBMITTED'
         )
         on conflict (candidate_id) do update set dependency_snapshot = excluded.dependency_snapshot,
           evidence_refs = excluded.evidence_refs, artifact_revision = excluded.artifact_revision,
           candidate_status = 'SUBMITTED'`,
        [candUuid, topic.runId, planUuid, artifactRevision,
         JSON.stringify(allowedScope), JSON.stringify(depSnapshot),
         JSON.stringify(evidenceRefs), planInputFp]
      );
      console.log(`  ✅ gate_candidate submitted: ${candUuid}`);
      PASS.push(`${topic.name}_candidate_submitted`);
    } catch (err) {
      console.log(`  ❌ gate_candidate FAILED: ${err.message}`); FAIL.push(`${topic.name}_candidate`); continue;
    }

    // ======= Step 7: G5 reviewer dryRun + sign =======
    console.log("\n  --- Step 7: G5 machine review ---");
    const reviewer = createRuleGateReviewer({
      query: queryRows,
      decide: decideGate,
      projectId: topic.projectId,
      log: line => console.log(`    ${line}`)
    });
    try {
      const dryRun = await reviewer.review({ gate: "G5", dryRun: true });
      console.log(`  dryRun status = ${dryRun.status}`);
      if (dryRun.status !== "DRY_RUN_PASS") {
        console.log(`  ❌ dryRun FAIL: ${dryRun.failed?.join(",")}`);
        FAIL.push(`${topic.name}_dryRun:${dryRun.failed?.join("|")}`);
        continue;
      }
      console.log(`  ✅ dryRun PASS → 正式签发`);
      const signed = await reviewer.review({ gate: "G5", dryRun: false });
      console.log(`  signed status = ${signed.status}`);
      if (signed.status === "PASS") {
        console.log(`  ✅ G5 PASS! audit_id=${signed.auditId}`);
        PASS.push(`${topic.name}_g5_signed`);
      } else {
        console.log(`  ❌ G5 FAIL: ${signed.failed?.join(",")}`);
        FAIL.push(`${topic.name}_g5_fail:${signed.failed?.join("|")}`);
      }
    } catch (err) {
      console.log(`  ❌ G5 reviewer error: ${err.message}`); FAIL.push(`${topic.name}_g5_error`);
    }
  }

  await db.end();

  // ======= 汇总 =======
  console.log(`\n${"=".repeat(72)}`);
  console.log(`VERIFIED_ISOLATED REPORT —— ST-05 director_plan + G5`);
  console.log(`${"=".repeat(72)}`);
  console.log(`\n✅ PASS (${PASS.length}):`);
  PASS.forEach(p => console.log(`   ${p}`));
  if (FAIL.length > 0) {
    console.log(`\n❌ FAIL (${FAIL.length}):`);
    FAIL.forEach(f => console.log(`   ${f}`));
  }
  console.log(`\n${PASS.length > 0 && FAIL.length === 0 ? "✅ VERIFIED_ISOLATED" : "⚠️ 部分失败"}`);
  console.log(`关键验证：director_plan persist + artifact_revision_for + G5 reviewer 双路由扩展`);
  console.log(`   checkWorkRevisionBinding(director_plan) → method=H1H2H3 + depends_on 存在`);
  console.log(`   checkRightsByOperation(director_plan) → payload.original_ids 回溯 originals`);
  console.log(`   两题材：朱家角(A05) / 七宝(A09) 均为非 A06 finding（泛化验证）`);
  console.log(`${"=".repeat(72)}`);

  process.exit(FAIL.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("\n❌ FATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
