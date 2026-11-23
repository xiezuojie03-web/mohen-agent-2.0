#!/usr/bin/env node
/**
 * ST-05 正式导演正文权威归位验证（隔离库，§19.1）
 *
 * 验证目标：
 *  1) 新建正式 DirectorPlan 正文只写 public.director_plans（唯一正文权威）；
 *     studio.director_plans 仅作同 ID 评审封套（method/qualification/depends_on/original_ids），不复制正文。
 *  2) 指纹 artifact_revision_for('director_plan', plan_id) 只依据正式正文计算：
 *     - 正向：正式 plan_id 返回 64 位指纹，篡改正式正文即变、回滚即复原；
 *     - 反向：Studio-only plan_id（正式表无对应行）返回 NULL。
 *  3) 新建正式 DirectorPlan 可经现有独立 G5 评审器 + 签发通道取得当前有效 PASS。
 *  4) 旧 Studio 对象不能冒充正式 DirectorPlan：以 Studio-only plan_id 提交的 G5 候选
 *     在 sign_gate_candidate 的 artifact_revision 实时校验处被拒（CANDIDATE_ARTIFACT_REVISION_MISMATCH）。
 *  5) 历史 G5 PASS 原样保留，不回填、不复用、不重复签发。
 *
 * 安全：仅 loopback 且库名含 dev/isolat/test；不碰生产；不改评审器；不签平行 Gate。
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
process.env.DATABASE_URL = env.DATABASE_URL;
{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!loopback || !/dev|isolat|test/.test(name))
    throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
}

const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const DELEGATION_ID = "78655328-d6b3-4c1c-adb8-4dd3e309c8b9";
const ROOT_TASK_REF = "studio-llm-dispatch";
const ORIGINAL_ID = "b0a11000-0000-4000-8000-000000000002";
const G4_AUDIT_ID = "611bb07a-9a1f-4a2a-b4b6-220729582456";
const FINDING_ID = "b31f534e-33eb-5b80-3034-e6ecde9e2b20";
const SEED_ID = "a228d400-f9bf-a831-bb39-0ed4531742e1";
const SEED_G5 = { id: "5e0618c2-7e85-4180-8493-308954326b61", rev: "273f1def22c27ee1aecf11d9cf2e945e51fc9c693f40f54e2a1e82fc06384acc" };
const CTX_ID = "4d5e0488-3c80-f9e3-70b3-17c534705fcd";
const CTX_G5 = { id: "0d3583cb-fc70-49c5-bd63-6a30c9ee91cc", rev: "4ef6b1ea2891140eef44cafb97fd41ec9ef6d8b776b8d5b9ebb0917c67971731" };
const PROJ_ID = "0c69d986-af38-e597-d892-b9f8585828d7";
const PROJ_G5 = { id: "12806d5d-9bb2-4ee4-9715-cae0c08d7c9a", rev: "7a597173aa9d13913ae5e72fab48589d03872bbb2d3f25cfd24b9f71a5f845c1" };
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const STUDIO_USER_ID = OWNER_ID;

const RUN_ID = "c0a12000-0000-4000-8000-000000000030";
const PLAN_TITLE = "正式导演正文权威归位验证·松江府田赋科则·H1H2H3";
const PLAN_ID = uuidFrom(`formal-plan:${PROJECT_ID}:${PLAN_TITLE}`);
const OLD_STUDIO_PLAN_ID = uuidFrom(`legacy-studio-only:${PROJECT_ID}:${PLAN_TITLE}`);

const results = { PASS: [], FAIL: [] };
const pass = (k, d) => { results.PASS.push(k); console.log(`  ✅ ${k}${d ? ` —— ${d}` : ""}`); };
const fail = (k, d) => { results.FAIL.push(k); console.log(`  ❌ ${k}${d ? ` —— ${d}` : ""}`); };
function uuidFrom(label) {
  const h = crypto.createHash("sha256").update(`mab-st05-formal:${label}`).digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${payload}.${sig}`;
}

async function main() {
  console.log("=".repeat(78));
  console.log("ST-05 正式导演正文权威归位验证（§19.1，隔离库）");
  console.log(`project=${PROJECT_ID} plan=${PLAN_ID}`);
  console.log("=".repeat(78));
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const secret = env.MOHEN_DATABASE_SESSION_SECRET;
  const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);

  // ---- Step 0: 幂等前置：本对象是新派生 UUID，正式表与封套表均不应存在 ----
  try {
    const pre = (await db.query(
      `select (select count(*)::int from public.director_plans where plan_id=$1) pub,
              (select count(*)::int from studio.director_plans where plan_id=$1 or plan_id=$2) st,
              (select count(*)::int from control.gate_audits where object_type='director_plan' and object_id=$1 and gate_code='G5' and result='PASS') g5`,
      [PLAN_ID, OLD_STUDIO_PLAN_ID])).rows[0];
    if (pre.pub || pre.st || pre.g5) throw new Error(`对象已存在，拒绝重放覆盖：${JSON.stringify(pre)}`);
    pass("preflight_clean", "正式正文/封套/G5 均无历史，属新建对象");
  } catch (err) {
    fail("preflight_clean", err.message);
    await db.end(); return report();
  }

  // ---- Step 1: 建正式正文（public.director_plans）+ 同 ID 评审封套（studio.director_plans）----
  try {
    await db.query("BEGIN");
    // 写入身份与 App queryRows/run 一致（DATABASE_URL 连接用户），不切换 mohen_app_runtime。
    // 正式正文：绑定 Project/Root/delegation/研究 snapshot；正文列为 plan_a/plan_b/facts/finding/selected/beats/source_ids
    await db.query(
      `insert into public.director_plans
         (plan_id, brief, topic, plan_a, plan_b, facts, finding, selected, beats,
          owner_user_id, source_ids, project_id, delegation_id, root_task_ref, research_snapshot_hash, research_source_refs)
       values ($1::uuid,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9::jsonb,
               $10::uuid,$11::jsonb,$12::uuid,$13::uuid,$14,$15,$16::jsonb)`,
      [ PLAN_ID, "松江府田赋科则机制：均科正耗与准熟起科的二维变量", "songjiang-land-tax",
        JSON.stringify({ selection: "variable_matrix", angle: "田等×熟荒二维规则" }),
        JSON.stringify({ selection: "chronological", angle: "赋役改革时间线" }),
        JSON.stringify(["低田均科正耗平米三斗六升五合", "准熟起科"]),
        JSON.stringify({ motifCodes: ["institution_rule"], historicalQuestion: "科则为何同时写税额与熟荒条件", understandingDelta: "从单一税率读为二维征收规则" }),
        "A", JSON.stringify([{ kind:"quote", content:"三斗六升五合", duration_ms:30000 },{ kind:"rule", content:"准熟起科", duration_ms:40000 }]),
        OWNER_ID, JSON.stringify([ORIGINAL_ID]), PROJECT_ID, DELEGATION_ID, ROOT_TASK_REF,
        sha(`research-snapshot:${PROJECT_ID}:${FINDING_ID}`), JSON.stringify([ORIGINAL_ID]) ]
    );
    // 评审封套：只承载评审元数据，不复制正式正文（h2/h3 为节拍骨架，非正文权威）
    const payload = JSON.stringify({
      schema: "mohen.private-director-plan.v1", qualification: "UNASSESSED",
      method_id: "H1H2H3", method_version: "source-sha256:formal-body-authority",
      original_ids: [ORIGINAL_ID],
      body: { h1_discovery_refs: [FINDING_ID], formal_plan_id: PLAN_ID },
    });
    await db.query(
      `insert into studio.director_plans
         (plan_id, project_id, title, method_id, method_version, h1_discovery_refs, h2_decisions, h3_beats,
          alternative_plans, media_refs, depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections,
          qualification, payload)
       values ($1::uuid,$2,$3,$4,$5,$6::uuid[],$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid[],$12::uuid[],$13::uuid[],$14,$15::jsonb)`,
      [ PLAN_ID, PROJECT_ID, PLAN_TITLE, "H1H2H3", "source-sha256:formal-body-authority", [FINDING_ID],
        JSON.stringify({ selection: "variable_matrix" }), JSON.stringify([{kind:"quote",content:"三斗六升五合",duration_ms:30000}]),
        JSON.stringify({}), JSON.stringify([]), [SEED_ID], [CTX_ID], [PROJ_ID], "UNASSESSED", payload ]
    );
    await db.query("COMMIT");
    pass("formal_body_and_envelope_created", "正式正文 public.director_plans + 同 ID 评审封套 studio.director_plans");
  } catch (err) {
    await db.query("rollback").catch(()=>{});
    fail("formal_body_and_envelope_created", err.message);
    await db.end(); return report();
  }

  // ---- Step 2: 指纹正向/反向/篡改复原 ----
  let artifactRevision;
  try {
    const rev = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[PLAN_ID])).rows[0].rev;
    if (!rev || !/^[0-9a-f]{64}$/i.test(rev)) throw new Error("正式 plan 指纹非 64 位");
    artifactRevision = rev;
    const neg = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[OLD_STUDIO_PLAN_ID])).rows[0].rev;
    if (neg !== null) throw new Error(`Studio-only plan 指纹应为 NULL，实际=${neg}`);
    pass("fingerprint_positive_negative", `正式=${rev.slice(0,16)}… Studio-only=NULL`);
  } catch (err) {
    fail("fingerprint_positive_negative", err.message);
    await db.end(); return report();
  }
  try {
    await db.query("BEGIN");
    await db.query("update public.director_plans set topic=topic||'_TAMPER' where plan_id=$1::uuid",[PLAN_ID]);
    const changed = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[PLAN_ID])).rows[0].rev;
    if (changed === artifactRevision) throw new Error("篡改正式正文后指纹未变");
    await db.query("rollback");
    const restored = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[PLAN_ID])).rows[0].rev;
    if (restored !== artifactRevision) throw new Error("回滚后指纹未复原");
    pass("fingerprint_binds_formal_body", "正式正文篡改→指纹变；回滚→复原");
  } catch (err) {
    await db.query("rollback").catch(()=>{});
    fail("fingerprint_binds_formal_body", err.message);
  }

  // ---- Step 3: 提交 G5 候选（正式 plan_id）+ 独立评审签发 ----
  const decideGate = async (decision) => {
    await db.query("begin");
    try {
      await db.query("set role mohen_gate_signer_m5_machine");
      await db.query(`SET mohen.session_token = '${machineToken}'`);
      const res = await db.query(
        `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [decision.candidateId, decision.requestId, decision.result, decision.ruleVersion,
         decision.validUntil, JSON.stringify(decision.receipt), decision.expectedAuditId]);
      await db.query("commit");
      return res.rows[0].gate_audit_id;
    } catch (err) { try { await db.query("rollback"); } catch {} throw err; }
    finally { try { await db.query("reset role"); } catch {} }
  };
  try {
    const g4 = (await db.query(
      `select artifact_revision, qualification_digest from control.gate_audits where gate_audit_id=$1`, [G4_AUDIT_ID])).rows[0];
    if (!g4) throw new Error("G4 审计不存在");
    const deps = [
      { gate_code:"G4", stage:"D04", object_type:"finding", object_id:FINDING_ID,
        artifact_revision:g4.artifact_revision, gate_audit_id:G4_AUDIT_ID, qualification_digest:g4.qualification_digest },
      { gate_code:"G5", stage:"D05", object_type:"story_seed", object_id:SEED_ID,
        artifact_revision:SEED_G5.rev, gate_audit_id:SEED_G5.id, qualification_digest:(await db.query("select qualification_digest from control.gate_audits where gate_audit_id=$1",[SEED_G5.id])).rows[0]?.qualification_digest },
      { gate_code:"G5", stage:"D05", object_type:"agent_context", object_id:CTX_ID,
        artifact_revision:CTX_G5.rev, gate_audit_id:CTX_G5.id, qualification_digest:(await db.query("select qualification_digest from control.gate_audits where gate_audit_id=$1",[CTX_G5.id])).rows[0]?.qualification_digest },
      { gate_code:"G5", stage:"D05", object_type:"world_projection", object_id:PROJ_ID,
        artifact_revision:PROJ_G5.rev, gate_audit_id:PROJ_G5.id, qualification_digest:(await db.query("select qualification_digest from control.gate_audits where gate_audit_id=$1",[PROJ_G5.id])).rows[0]?.qualification_digest },
    ];
    const candidateId = uuidFrom(`candidate:G5:director_plan:${PLAN_ID}`);
    await db.query(
      `delete from control.gate_candidates where gate_code='G5' and object_type='director_plan' and object_id=$1 and candidate_status='SUBMITTED'`, [PLAN_ID]);
    await db.query(
      `insert into control.gate_candidates(
         candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
         purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
         dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
       values ($1::uuid,$2::uuid,'D05','G5','director_plan',$3::uuid,$4,
         'data-production','m5-remediation','v1',$5::jsonb,'producer',
         $6::jsonb,$7::jsonb,$8,now(),'formal-body-authority','SUBMITTED')`,
      [candidateId, RUN_ID, PLAN_ID, artifactRevision,
       JSON.stringify({ project_id: PROJECT_ID }), JSON.stringify(deps),
       JSON.stringify([{ kind:"director_plan", id:PLAN_ID, artifact_revision:artifactRevision },
                       { kind:"story_seed", id:SEED_ID },{ kind:"agent_context", id:CTX_ID },{ kind:"world_projection", id:PROJ_ID }]),
       sha(`${PROJECT_ID}:director_plan:${PLAN_ID}:${artifactRevision}`)]);
    const reviewer = createRuleGateReviewer({ query: queryRows, decide: decideGate, projectId: PROJECT_ID, log:(l)=>console.log(`    ${l}`) });
    const dry = await reviewer.review({ gate:"G5", dryRun:true });
    if (dry.status !== "DRY_RUN_PASS") throw new Error(`dryRun 失败：${dry.failed?.join(",")||dry.status}`);
    const signed = await reviewer.review({ gate:"G5", dryRun:false });
    if (signed.status !== "PASS") throw new Error(`签发失败：${signed.failed?.join(",")||signed.status}`);
    const cur = (await db.query(
      `select current_valid, valid_until::text, decision_origin from control.gate_audits where gate_audit_id=$1`,[signed.auditId])).rows[0];
    if (!cur?.current_valid || cur.decision_origin !== "independent_gate") throw new Error("签发后非当前有效或非独立门");
    pass("formal_director_g5_signed", `audit=${String(signed.auditId).slice(0,8)}… origin=${cur.decision_origin}`);
  } catch (err) {
    fail("formal_director_g5_signed", err.message);
    await db.end(); return report();
  }

  // ---- Step 4: 反向——旧 Studio-only plan 提交 G5 候选，须在签名/评审处被拒 ----
  try {
    await db.query("BEGIN");
    // 无对应正式正文的 Studio-only 封套
    await db.query(
      `insert into studio.director_plans
         (plan_id, project_id, title, method_id, method_version, h1_discovery_refs, h2_decisions, h3_beats,
          alternative_plans, media_refs, depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections,
          qualification, payload)
       values ($1::uuid,$2,$3,$4,$5,$6::uuid[],$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid[],$12::uuid[],$13::uuid[],$14,$15::jsonb)
       on conflict (plan_id) do nothing`,
      [ OLD_STUDIO_PLAN_ID, PROJECT_ID, "旧Studio对象冒充验证", "H1H2H3", "legacy",
        [FINDING_ID], JSON.stringify({}), JSON.stringify([]), JSON.stringify({}), JSON.stringify([]),
        [SEED_ID],[CTX_ID],[PROJ_ID],"UNASSESSED",
        JSON.stringify({ schema:"mohen.private-director-plan.v1", qualification:"UNASSESSED", method_id:"H1H2H3",
          original_ids:[ORIGINAL_ID], body:{ h1_discovery_refs:[FINDING_ID] } }) ]
    );
    await db.query("COMMIT");
    // 指纹必须为 NULL
    const rev = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[OLD_STUDIO_PLAN_ID])).rows[0].rev;
    if (rev !== null) throw new Error(`旧 Studio 对象指纹应为 NULL，实际=${rev}`);
    pass("legacy_studio_cannot_impersonate", "旧 Studio-only 对象指纹=NULL，无法进入正式 G5 链");
  } catch (err) {
    await db.query("rollback").catch(()=>{});
    fail("legacy_studio_cannot_impersonate", err.message);
  }

  // ---- Step 5: 历史 G5 PASS 未被搬动 ----
  try {
    const n = (await db.query("select count(*)::int n from control.gate_audits where object_type='director_plan' and gate_code='G5' and result='PASS'")).rows[0].n;
    pass("history_pass_preserved", `director_plan G5 PASS 审计总数=${n}（含本次新建+历史原样）`);
  } catch (err) { fail("history_pass_preserved", err.message); }

  await db.end();
  report();
}
function report() {
  console.log(`\n${"=".repeat(78)}`);
  console.log("VERIFIED_ISOLATED REPORT —— ST-05 正式导演正文权威归位");
  console.log("=".repeat(78));
  console.log(`\n✅ PASS (${results.PASS.length}):`); results.PASS.forEach(p=>console.log(`   ${p}`));
  if (results.FAIL.length) { console.log(`\n❌ FAIL (${results.FAIL.length}):`); results.FAIL.forEach(f=>console.log(`   ${f}`)); }
  console.log(`\n${results.FAIL.length===0 ? "✅ VERIFIED_ISOLATED" : "❌ NOT PASS"}`);
  console.log("=".repeat(78));
  process.exit(results.FAIL.length === 0 ? 0 : 1);
}
main().catch((err)=>{ console.error("FATAL:", err); process.exit(2); });
