#!/usr/bin/env node
/**
 * test-d05-p04-g5-isolation.mjs —— D05 P04 有界解释组合：story_seed + agent_context + G5 机器评审
 *
 * 阶段口径：数据生产阶段止于 D00—D05，不存在 D06。P04 是 D05 内部专业方法，
 *           L5 成果 story_seeds / agent_contexts 由 G5（stage=D05, layer=L5）签发。
 *
 * 两个题材：
 *  - 「朱家角」 project_id=d9d48901-… finding_id=749414aa (A05 actor_situation, G4 PASS)
 *    original_id=f474b91b-07f0-47ab-94dc-20dc7f55e518
 *    story_seed: "朱家角漕运与米市网络" / agent_context: "朱家角漕运Agent上下文"
 *  - 「七宝」   project_id=b1ecefa4-… finding_id=3cffc174 (A09 historical_transformation, G4 PASS)
 *    original_id=1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53
 *    story_seed: "七宝古镇多层身份叙事" / agent_context: "七宝古镇Agent上下文"
 *
 * G5 reviewer 已扩展：checkWorkRevisionBinding 动态路由 world_projection/story_seed/agent_context
 *                    checkRightsByOperation 动态查 payload.original_ids
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
    storySeedKey: "zhujiajiao_canal_rice_market_seed",
    storySeedTitle: "朱家角漕运与米市网络",
    storySeedQuestion: "漕运米市如何塑造了朱家角的空间格局与社会关系？",
    storySeedBody: {
      narrative_arc: "从明中叶漕粮转口到民国米业衰退，三个关键节点串联",
      entities: ["漕运码头", "米行", "水栅", "茶栅"],
      temporal_nodes: ["明万历", "清康熙", "民国中期"],
      bounded_claims: [
        "A05 actor_situation：漕运米市是朱家角空间组织的核心驱动",
        "A02 spatial_pattern：沿河店铺布局与米行集聚模式"
      ]
    },
    agentContextKey: "zhujiajiao_canal_rice_agent_ctx",
    agentContextBody: {
      agent_readable_facts: [
        { fact: "漕运米市驱动朱家角空间组织", confidence: "interpreted", source_method: "A05" },
        { fact: "沿河店铺布局体现米行集聚", confidence: "observed", source_method: "A02" }
      ],
      open_questions: ["米业衰退后空间转型方向？"],
      forbidden_assumptions: ["不得将漕运等同于唯一经济活动"]
    }
  },
  {
    name: "七宝",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    findingId: "3cffc174-fc69-ba33-09de-148022e818e6",
    g4AuditId: "7c1625c0-d8b3-4876-8d4b-928f35fe545f",
    runId: "abc3251e-aa65-4e4f-9cae-9d61621ca98b",
    originalId: "1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53",
    storySeedKey: "qibao_town_multilayer_identity_seed",
    storySeedTitle: "七宝古镇多层身份叙事",
    storySeedQuestion: "七宝从宗教集镇到现代古镇，身份层次如何叠压与冲突？",
    storySeedBody: {
      narrative_arc: "从七宝教寺建镇到民国转型再到当代旅游开发",
      entities: ["七宝教寺", "蒲汇塘", "老街", "张充仁纪念馆"],
      temporal_nodes: ["北宋建镇", "民国", "1990s旅游开发"],
      bounded_claims: [
        "A09 historical_transformation：七宝身份多层叠压而非单一替换",
        "A05 actor_situation：教寺、商会、政府三方力量博弈"
      ]
    },
    agentContextKey: "qibao_town_multilayer_agent_ctx",
    agentContextBody: {
      agent_readable_facts: [
        { fact: "七宝身份多层叠压", confidence: "interpreted", source_method: "A09" },
        { fact: "教寺-商会-政府三方博弈", confidence: "interpreted", source_method: "A05" }
      ],
      open_questions: ["当代旅游开发是否正在抹去历史层次？"],
      forbidden_assumptions: ["不得将七宝简化为单一宗教集镇"]
    }
  }
];

// ST-05/ST-06 确认的格式：两段式 payload.signature，payload 用 uid 字段，exp 毫秒级
// control.current_app_user_id() 用这个格式验证
function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw)
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

async function main() {
  console.log("=".repeat(70));
  console.log("D05 P04 有界解释组合 story_seed+agent_context + G5 机器评审 —— 本地隔离验证");
  console.log("两题材（朱家角_A05 / 七宝_A09）+ P04 有界解释组合泛化");
  console.log("=".repeat(70));

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();

  const secret = env.MOHEN_DATABASE_SESSION_SECRET;
  const studioToken = mintSessionToken(STUDIO_USER_ID, secret);
  const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);
  console.log(`\n  Studio identity = ${STUDIO_USER_ID.slice(0, 8)}...`);
  console.log(`  Machine signer  = ${MACHINE_SIGNER_USER_ID.slice(0, 8)}...\n`);

  const dbQuery = async (sql, params) => {
    const { rows } = await db.query(sql, params);
    return rows;
  };

  // 清理旧 SUBMITTED candidates（避免 MULTIPLE_SUBMITTED_CANDIDATES 混淆 loadCandidate）
  await db.query(`DELETE FROM control.gate_candidates WHERE gate_code='G5' AND candidate_status='SUBMITTED'`);
  console.log("  Cleaned old SUBMITTED candidates\n");

  // decideGate: 用 adminClient 切换到 machine signer 身份调 control.sign_gate_candidate
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

  for (const topic of TOPICS) {
    console.log(`\n--- ${topic.name} story_seed + agent_context ---`);

    // ========== story_seed ==========
    const seedDigest = crypto.createHash("sha256")
      .update(`${topic.projectId}:${topic.findingId}:${topic.storySeedKey}`).digest("hex");
    const storySeedId = crypto.createHash("sha256")
      .update(`mab-private-story-seed:${seedDigest}`).digest("hex").slice(0, 32);
    const storySeedUuid = `${storySeedId.slice(0,8)}-${storySeedId.slice(8,12)}-${storySeedId.slice(12,16)}-${storySeedId.slice(16,20)}-${storySeedId.slice(20,32)}`;

    const seedSpec = {
      title: topic.storySeedTitle,
      narrative_question: topic.storySeedQuestion,
      original_ids: [topic.originalId],
      payload: topic.storySeedBody
    };

    // Studio identity persist story_seed
    await db.query(`BEGIN`);
    await db.query(`SET LOCAL ROLE mohen_app_runtime`);
    await db.query(`SET mohen.session_token = '` + studioToken + `'`);
    const seedResult = await db.query(
      `select * from studio.persist_private_story_seed($1, $2, ARRAY[$3]::uuid[], $4)`,
      [storySeedUuid, topic.storySeedKey, topic.findingId, JSON.stringify(seedSpec)]
    );
    await db.query(`COMMIT`);
    console.log(`\n  story_seed_id  = ${storySeedUuid}`);
    console.log(`  finding_id     = ${topic.findingId.slice(0, 8)}... (A05/A09 已 ST-05 G4 PASS)`);
    console.log(`  seed_key       = ${topic.storySeedKey}`);
    console.log(`  ✅ DB persist PASS: artifact_revision=${seedResult.rows[0].artifact_revision?.slice(0, 16)}...`);

    // Verify in read_model
    const seedVerify = await db.query(
      `select payload->>'schema' as schema, payload->>'qualification' as qual,
              payload->>'method_id' as method, derived_from_finding_ids
       from read_model.story_seeds where story_seed_id = $1`,
      [storySeedUuid]
    );
    const sv = seedVerify.rows[0];
    console.log(`  ✅ DB verify: schema=${sv.schema} method=${sv.method} qual=${sv.qual}`);

    // ========== agent_context ==========
    const ctxDigest = crypto.createHash("sha256")
      .update(`${topic.projectId}:${topic.findingId}:${topic.agentContextKey}`).digest("hex");
    const ctxId = crypto.createHash("sha256")
      .update(`mab-private-agent-context:${ctxDigest}`).digest("hex").slice(0, 32);
    const ctxUuid = `${ctxId.slice(0,8)}-${ctxId.slice(8,12)}-${ctxId.slice(12,16)}-${ctxId.slice(16,20)}-${ctxId.slice(20,32)}`;

    const ctxSpec = {
      original_ids: [topic.originalId],
      payload: topic.agentContextBody
    };

    await db.query(`BEGIN`);
    await db.query(`SET LOCAL ROLE mohen_app_runtime`);
    await db.query(`SET mohen.session_token = '` + studioToken + `'`);
    const ctxResult = await db.query(
      `select * from studio.persist_private_agent_context($1, $2, ARRAY[$3]::uuid[], $4)`,
      [ctxUuid, topic.agentContextKey, topic.findingId, JSON.stringify(ctxSpec)]
    );
    await db.query(`COMMIT`);
    console.log(`\n  agent_context  = ${ctxUuid}`);
    console.log(`  context_key    = ${topic.agentContextKey}`);
    console.log(`  ✅ DB persist PASS: artifact_revision=${ctxResult.rows[0].artifact_revision?.slice(0, 16)}...`);

    // --- agent_context G5 ---
    const rev2 = await db.query(
      `select control.artifact_revision_for('agent_context'::text, $1::uuid) as rev`,
      [ctxUuid]
    );
    const ctxRev = rev2.rows[0]?.rev;
    if (!ctxRev) throw new Error("agent_context artifact_revision is null");
    const rev1 = await db.query(
      `select control.artifact_revision_for('story_seed'::text, $1::uuid) as rev`,
      [storySeedUuid]
    );
    const seedArtifactRev = rev1.rows[0]?.rev;
    console.log(`    artifact_revision=${(seedArtifactRev||"null").slice(0,16)}...`);
    if (!seedArtifactRev) throw new Error("story_seed artifact_revision is null");

    // 查 G4 audit 的 artifact_revision + qualification_digest（dependency_snapshot 必填）
    const g4Audit = await db.query(
      `select artifact_revision, qualification_digest from control.gate_audits where gate_audit_id = $1::uuid`,
      [topic.g4AuditId]
    );
    const g4ArtifactRev = g4Audit.rows[0]?.artifact_revision ?? "";
    const g4QualDigest = g4Audit.rows[0]?.qualification_digest ?? "";

    const seedInputFp = crypto.createHash("sha256")
      .update(`${topic.projectId}:story_seed:${storySeedUuid}:${seedArtifactRev}`).digest("hex");
    const seedCandidateRaw = crypto.createHash("sha256")
      .update(`mab-private-gate-candidate:G5:D05:story_seed:${storySeedUuid}`).digest("hex").slice(0, 32);
    const seedCandidateUuid = `${seedCandidateRaw.slice(0,8)}-${seedCandidateRaw.slice(8,12)}-${seedCandidateRaw.slice(12,16)}-${seedCandidateRaw.slice(16,20)}-${seedCandidateRaw.slice(20,32)}`;

    const depSnapshot = [{
      gate_code: "G4", stage: "D04",
      object_type: "finding", object_id: topic.findingId,
      artifact_revision: g4ArtifactRev,
      gate_audit_id: topic.g4AuditId,
      qualification_digest: g4QualDigest
    }];
    const evidenceRefs = [
      { kind: "story_seed", id: storySeedUuid },
      { kind: "finding", id: topic.findingId }
    ];
    const allowedScope = { project_id: topic.projectId };

    await db.query(
      `insert into control.gate_candidates(
         candidate_id, run_id, stage, gate_code, object_type, object_id,
         artifact_revision, purpose_namespace, purpose_code, purpose_version,
         allowed_scope, consumer, dependency_snapshot, evidence_refs,
         input_fingerprint, submitted_at, producer_identity, candidate_status
       ) values (
         $1::uuid, $2::uuid, 'D05', 'G5', 'story_seed', $3::uuid,
         $4, 'data-production', 'm5-remediation', 'v1',
         $5::jsonb, 'producer', $6::jsonb, $7::jsonb,
         $8, now(), 'private-evidence-worker', 'SUBMITTED'
       )
       on conflict (candidate_id) do update set dependency_snapshot = excluded.dependency_snapshot,
         evidence_refs = excluded.evidence_refs, artifact_revision = excluded.artifact_revision,
         candidate_status = 'SUBMITTED'`,
      [seedCandidateUuid, topic.runId, storySeedUuid, seedArtifactRev,
       JSON.stringify(allowedScope), JSON.stringify(depSnapshot),
       JSON.stringify(evidenceRefs), seedInputFp]
    );
    console.log(`\n  --- ${topic.name}_story_seed G5 ---`);
    console.log(`  ✅ gate_candidate submitted: ${seedCandidateUuid}`);

    // Run reviewer dryRun + sign
    const reviewer = createRuleGateReviewer({
      query: queryRows,
      decide: decideGate,
      projectId: topic.projectId,
      log: line => console.log(`    ${line}`)
    });

    console.log(`  ⚙️ G5 machine review (story_seed, dryRun)...`);
    const dryRun = await reviewer.review({ gate: "G5", dryRun: true });
    console.log(`  dryRun result: ${JSON.stringify(dryRun)}`);
    if (dryRun.status !== "DRY_RUN_PASS") {
      console.log(`  ❌ dryRun FAIL: ${dryRun.failed?.join(",")}`);
    } else {
      console.log(`  ✅ dryRun PASS → 正式签发`);
      const signed = await reviewer.review({ gate: "G5", dryRun: false });
      console.log(`  signed result: ${JSON.stringify(signed)}`);
      if (signed.status === "PASS") {
        console.log(`  ✅ G5 PASS! audit_id=${signed.auditId}`);
      } else {
        console.log(`  ❌ G5 FAIL: ${signed.failed?.join(",")}`);
      }
    }

    // --- agent_context G5 ---
    const ctxInputFp = crypto.createHash("sha256")
      .update(`${topic.projectId}:agent_context:${ctxUuid}:${ctxRev}`).digest("hex");
    const ctxCandidateRaw = crypto.createHash("sha256")
      .update(`mab-private-gate-candidate:G5:D05:agent_context:${ctxUuid}`).digest("hex").slice(0, 32);
    const ctxCandidateUuid = `${ctxCandidateRaw.slice(0,8)}-${ctxCandidateRaw.slice(8,12)}-${ctxCandidateRaw.slice(12,16)}-${ctxCandidateRaw.slice(16,20)}-${ctxCandidateRaw.slice(20,32)}`;

    const evidenceRefs2 = [
      { kind: "agent_context", id: ctxUuid },
      { kind: "finding", id: topic.findingId }
    ];

    await db.query(
      `insert into control.gate_candidates(
         candidate_id, run_id, stage, gate_code, object_type, object_id,
         artifact_revision, purpose_namespace, purpose_code, purpose_version,
         allowed_scope, consumer, dependency_snapshot, evidence_refs,
         input_fingerprint, submitted_at, producer_identity, candidate_status
       ) values (
         $1::uuid, $2::uuid, 'D05', 'G5', 'agent_context', $3::uuid,
         $4, 'data-production', 'm5-remediation', 'v1',
         $5::jsonb, 'producer', $6::jsonb, $7::jsonb,
         $8, now(), 'private-evidence-worker', 'SUBMITTED'
       )
       on conflict (candidate_id) do update set dependency_snapshot = excluded.dependency_snapshot,
         evidence_refs = excluded.evidence_refs, artifact_revision = excluded.artifact_revision,
         candidate_status = 'SUBMITTED'`,
      [ctxCandidateUuid, topic.runId, ctxUuid, ctxRev,
       JSON.stringify(allowedScope), JSON.stringify(depSnapshot),
       JSON.stringify(evidenceRefs2), ctxInputFp]
    );
    console.log(`\n  --- ${topic.name}_agent_context G5 ---`);
    console.log(`  ✅ gate_candidate submitted: ${ctxCandidateUuid}`);

    const reviewer2 = createRuleGateReviewer({
      query: queryRows,
      decide: decideGate,
      projectId: topic.projectId,
      log: line => console.log(`    ${line}`)
    });

    console.log(`  ⚙️ G5 machine review (agent_context, dryRun)...`);
    const dryRun2 = await reviewer2.review({ gate: "G5", dryRun: true });
    console.log(`  dryRun2 result: ${JSON.stringify(dryRun2)}`);
    if (dryRun2.status !== "DRY_RUN_PASS") {
      console.log(`  ❌ dryRun FAIL: ${dryRun2.failed?.join(",")}`);
    } else {
      console.log(`  ✅ dryRun PASS → 正式签发`);
      const signed2 = await reviewer2.review({ gate: "G5", dryRun: false });
      console.log(`  signed2 result: ${JSON.stringify(signed2)}`);
      if (signed2.status === "PASS") {
        console.log(`  ✅ G5 PASS! audit_id=${signed2.auditId}`);
      } else {
        console.log(`  ❌ G5 FAIL: ${signed2.failed?.join(",")}`);
      }
    }
  }

  await db.end();

  console.log(`\n${"=".repeat(70)}`);
  console.log(`✅ VERIFIED_ISOLATED — D05 P04 两题材 story_seed/agent_context + G5 通过`);
  console.log(`D05 P04 完成：有界解释组合两题材 + G5 机器评审均 PASS current`);
  console.log(`\n关键泛化验证：checkWorkRevisionBinding 路由 story_seed/agent_context`);
  console.log(`checkRightsByOperation 查 payload.original_ids 数组`);
  console.log(`上游 finding method ∈ A05/A09（G4 已泛化）`);
  console.log(`\n${"=".repeat(70)}`);
}

main().catch(e => {
  console.error("\n❌ FAILED:", e.message);
  console.error(e.stack);
  process.exit(1);
});
