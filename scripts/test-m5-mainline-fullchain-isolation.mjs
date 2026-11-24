#!/usr/bin/env node
/**
 * M5 正式主线作品贯通验证（隔离库，主线真实对象 d9d48901 / b2143002）。
 *
 * 目标：让正式主线 Task b2143002 → Project d9d48901 → Root → D00-D05 知识成果，
 *   真正在同一 Project 下建立 DirectorPlan → Work → WorkRevision 正式正文，
 *   取得独立 G5，再经 ST-08 投稿 → ST-09 审核 → 精确发布 → WATCH → 撤权。
 *
 * 复用（不新建第二套）：
 *   - reissue-m5-gate-chain-isolation.mjs 的逐级重签 + sign_gate_candidate + mohen_gate_signer_m5_machine
 *   - test-st10-third-topic-fullchain-isolation.mjs 的 persist/G5/全链模式
 *   - test-m5-same-object-business-loop-isolation.mjs 的投稿/审核/发布/WATCH/撤权正反断言
 *
 * 主线真实素材（隔离库既有历史产物，progress 3420-3525 行有回执）：
 *   Project d9d48901 / Task b2143002 / 原件 f474b91b / 来源 9aa03207
 *   G0 36ea7ffc / G1 d26163e9 / G2 ec737b0a / G3 0c30a997 / G4 finding 749414aa
 *   G5 素材 world_projection e76a01ce / story_seed cebc75b3 / agent_context 0a920342
 *
 * 边界：仅 loopback 隔离库；不改生产；不改 RLS；不伪造会话/PASS；非自签（机器 Gate signer + rule reviewer）；
 *   不复用历史 PASS；新 plan/work/revision 为同 Project 新创作正文，不覆盖历史。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";
import { PUBLISHED_WORKS_SQL, STUDIO_REVISION_WATCHABLE_SQL } from "../apps/web/lib/publication-watch-sql.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && m[2] !== "") env[m[1]] = m[2]; }
process.env.DATABASE_URL = env.DATABASE_URL;

// 安全围栏：只在本机隔离库运行。
{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!loopback || !/dev|isolat|test/.test(name)) throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const PROJECT_ID = "d9d48901-3aa3-4424-b50f-965d6749ee8e";
const TASK_ID = "b2143002-5867-4873-9cae-21e0aebccb51";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const OTHER_PROJECT_ID = "b0a11000-0000-4000-8000-000000000099";
const OPERATOR_ID = "b0a11000-0000-4000-8000-0000000000b2";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const ORIGINAL_ID = "f474b91b-07f0-47ab-94dc-20dc7f55e518";
// 云端正式 run 为 b9989b90（不在隔离库）；隔离库新 G5 候选必须引用库内真实存在的 run，
// 用主线 D03/D04/D05 的真实 run ffb4430e（gate_candidates_run_id_fkey 要求）。
const CLOUD_RUN_ID = "b9989b90-fd8a-4d50-b4b4-6f3cca7fb049";
const RUN_ID = "ffb4430e-bc11-4e18-824e-4e6f492ea432";

const G0 = "36ea7ffc-d5bd-4dd2-909f-ab0724b0b1d3";
const G1 = "d26163e9-85a4-ed0a-a51d-64fcef26ccd5";
const G2 = "ec737b0a-7506-e279-755b-fd85a12051b5";
const G3 = "0c30a997-4202-885b-ce3b-bce58db4ffc9";
const G4 = "749414aa-9539-78a5-0a4e-007abedfbd9d";
const SEED = "cebc75b3-b4c6-b16e-35b3-f76b82794aa7";
const CTX = "0a920342-42ae-23e8-2bbd-ee334ad40de1";
const PROJ = "e76a01ce-24b9-7f97-52cf-12142880a81c";

const ROOT_REF = `m5-mainline-${TASK_ID.slice(0, 8)}`;
const uuidFrom = (label) => { const h = crypto.createHash("sha256").update(`mab-m5-mainline:${label}`).digest("hex").slice(0, 32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; };
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const DELEGATION_ID = uuidFrom(`delegation:${PROJECT_ID}:${TASK_ID}`);
const PLAN_ID = uuidFrom(`plan:${PROJECT_ID}:${TASK_ID}:朱家角水路与集镇`);
const WORK_ID = uuidFrom(`work:${PROJECT_ID}:${TASK_ID}:朱家角`);
const REVISION_ID = uuidFrom(`rev:${WORK_ID}:rev1`);
const SNAPSHOT_ID = uuidFrom(`snapshot:${REVISION_ID}`);
const VALID_UNTIL = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${payload}.${sig}`;
}
const MACHINE_TOKEN = mintSessionToken(MACHINE_SIGNER_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET);

const results = { PASS: [], FAIL: [], FINDING: [] };
const pass = (k, d) => { results.PASS.push(k); console.log(`  PASS ${k}${d ? ` -- ${d}` : ""}`); };
const fail = (k, d) => { results.FAIL.push(k); console.log(`  FAIL ${k}${d ? ` -- ${d}` : ""}`); };
const finding = (k, d) => { results.FINDING.push(k); console.log(`  FINDING ${k}${d ? ` -- ${d}` : ""}`); };
const expectReject = async (label, fn, pattern) => {
  let rejected = false, msg = "";
  try { await fn(); } catch (e) { rejected = true; msg = e instanceof Error ? e.message : String(e); }
  if (!rejected || (pattern && !new RegExp(pattern).test(msg))) { fail(label, `expected reject ${pattern}, got rejected=${rejected} msg=${msg.slice(0,140)}`); return false; }
  pass(label, msg.slice(0, 100)); return true;
};

async function main() {
  console.log("=".repeat(78));
  console.log("M5 正式主线作品贯通（隔离库，主线真实对象）");
  console.log(`project=${PROJECT_ID} task=${TASK_ID} root=${ROOT_REF}`);
  console.log(`plan=${PLAN_ID} work=${WORK_ID} revision=${REVISION_ID}`);
  console.log("=".repeat(78));
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const reset = async () => { try { await db.query("RESET ROLE"); } catch {} try { await db.query("RESET ALL"); } catch {} };
  const asOperator = async (sql, params) => {
    await db.query("BEGIN");
    try { await db.query("SET LOCAL ROLE mohen_editorial_operator"); const r = await db.query(sql, params); await db.query("COMMIT"); return r.rows[0]?.result ?? r.rows[0]; }
    catch (e) { try { await db.query("ROLLBACK"); } catch {} throw e; }
    finally { try { await db.query("RESET ROLE"); } catch {} }
  };
  const decideGate = async (decision) => {
    await db.query("begin");
    try {
      await db.query("set role mohen_gate_signer_m5_machine");
      await db.query(`SET mohen.session_token = '${MACHINE_TOKEN}'`);
      const res = await db.query(`select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [decision.candidateId, decision.requestId, decision.result, decision.ruleVersion, decision.validUntil, JSON.stringify(decision.receipt), decision.expectedAuditId]);
      await db.query("commit"); await db.query("reset role");
      return res.rows[0].gate_audit_id;
    } catch (e) { try { await db.query("rollback"); } catch {} try { await db.query("reset role"); } catch {} throw e; }
  };
  const reviewer = (id) => createRuleGateReviewer({ query: queryRows, decide: decideGate, projectId: PROJECT_ID, log: (l) => console.log(`      ${l}`) });
  const auditRow = async (gateAuditId) => (await db.query(
    `select gate_audit_id::text, gate_code, stage, object_type, object_id::text, artifact_revision, qualification_digest
       from control.gate_audits where gate_audit_id=$1`, [gateAuditId])).rows[0];
  const depOf = (r, gate) => ({ gate_code: gate, stage: r.stage, object_type: r.object_type, object_id: r.object_id, artifact_revision: r.artifact_revision, gate_audit_id: r.gate_audit_id, qualification_digest: r.qualification_digest });

  // ---------- Step 0: 前置事实核查 ----------
  try {
    const pre = (await db.query(
      `select (select count(*)::int from studio.projects where project_id=$1 and lifecycle_status='ACTIVE' and owner_user_id=$2) project,
              (select count(*)::int from public.research_tasks where task_id=$3 and owner_user_id=$2) task,
              (select count(*)::int from studio.private_originals where original_id=$4 and project_id=$1 and state='STORED_VERIFIED') original,
              (select count(*)::int from source.sources where source_id='9aa03207-6d60-4984-8c1f-347df2532842') source,
              (select count(*)::int from publication.works where project_id=$1) existing_works`,
      [PROJECT_ID, OWNER_ID, TASK_ID, ORIGINAL_ID])).rows[0];
    console.log(`  preflight project=${pre.project} task=${pre.task} original=${pre.original} source=${pre.source} existing_works=${pre.existing_works}`);
    if (!pre.project || !pre.task || !pre.original || !pre.source) throw new Error("主线前置对象缺失");
    pass("preflight_mainline", `主线 Project/Task/原件/来源齐备，现有 works=${pre.existing_works}`);
  } catch (e) { fail("preflight_mainline", e.message); await reset(); await db.end(); return report(); }

  // ---------- Step 1: 逐级重签 G0→G4（复用历史 CONSUMED 候选，非自签、非复用 PASS） ----------
  const signed = {};
  const PURPOSE = { G3: {ns:"world",code:"explain_bounded",ver:"v1"}, G4: {ns:"G4.interpretation.v1",code:"BE",ver:"v1"} };
  const LEVELS = [
    {gate:"G0",obj:G0,up:null}, {gate:"G1",obj:G1,up:"G0"}, {gate:"G2",obj:G2,up:"G1"},
    {gate:"G3",obj:G3,up:"G2"}, {gate:"G4",obj:G4,up:"G3"},
  ];
  try {
    for (const lv of LEVELS) {
      const cur = (await db.query(`select gate_audit_id,artifact_revision,qualification_digest,gate_code,stage,object_type,object_id
        from control.gate_audits where gate_code=$1 and object_id=$2 and result='PASS' and current_valid
          and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`,[lv.gate,lv.obj])).rows[0];
      if (cur) { (signed[lv.gate] ||= []).push(cur); console.log(`  SKIP_VALID ${lv.gate} ${lv.obj.slice(0,8)} audit=${cur.gate_audit_id}`); continue; }
      const old = (await db.query(`select run_id,stage,object_type,artifact_revision,purpose_namespace,purpose_code,purpose_version,
          allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,producer_identity
        from control.gate_candidates where gate_code=$1 and object_id=$2 and candidate_status='CONSUMED'
        order by submitted_at desc limit 1`,[lv.gate,lv.obj])).rows[0];
      if (!old) throw new Error(`NO_CONSUMED_CANDIDATE ${lv.gate} ${lv.obj}`);
      let deps = [];
      if (lv.up) { const ups = signed[lv.up] || []; if (!ups.length) throw new Error(`NO_SIGNED_UPSTREAM ${lv.up}`); deps = [depOf(ups[0], lv.up)]; }
      await db.query(`delete from control.gate_candidates where gate_code=$1 and object_id=$2 and candidate_status='SUBMITTED'`,[lv.gate,lv.obj]);
      const pur = PURPOSE[lv.gate]; const ns = pur?pur.ns:old.purpose_namespace; const code = pur?pur.code:old.purpose_code; const ver = pur?pur.ver:old.purpose_version;
      const cid = uuidFrom(`cand:${lv.gate}:${lv.obj}:${Date.now()}`);
      await db.query(`insert into control.gate_candidates(candidate_id,run_id,stage,gate_code,object_type,object_id,artifact_revision,
          purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,submitted_at,producer_identity,candidate_status)
        values($1::uuid,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14::jsonb,$15,now(),$16,'SUBMITTED')`,
        [cid,old.run_id,old.stage,lv.gate,old.object_type,lv.obj,old.artifact_revision,ns,code,ver,
         JSON.stringify(old.allowed_scope),old.consumer,JSON.stringify(deps),JSON.stringify(old.evidence_refs),old.input_fingerprint,old.producer_identity]);
      const dry = await reviewer().review({gate:lv.gate,dryRun:true});
      if (dry.status!=="DRY_RUN_PASS") throw new Error(`DRYRUN_FAIL ${lv.gate} ${dry.failed?.join(",")||dry.status}`);
      const s = await reviewer().review({gate:lv.gate,dryRun:false});
      if (s.status!=="PASS") throw new Error(`SIGN_FAIL ${lv.gate} ${s.failed?.join(",")||s.status}`);
      const a = await auditRow(s.auditId); (signed[lv.gate] ||= []).push(a);
      console.log(`  SIGNED ${lv.gate} audit=${s.auditId}`);
    }
    pass("gate_chain_g0_g4_current", `主线 G0-G4 当前有效资格：${Object.keys(signed).map(g=>g+"="+signed[g].length).join(" ")}`);
  } catch (e) { fail("gate_chain_g0_g4_current", e.message); await reset(); await db.end(); return report(); }

  // ---------- Step 2: 重签 G5 素材（world_projection / story_seed / agent_context） ----------
  const g5mat = {};
  try {
    for (const [kind, obj] of [["world_projection",PROJ],["story_seed",SEED],["agent_context",CTX]]) {
      const cur = (await db.query(`select gate_audit_id,artifact_revision,qualification_digest,gate_code,stage,object_type,object_id
        from control.gate_audits where gate_code='G5' and object_type=$1 and object_id=$2 and result='PASS' and current_valid
          and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`,[kind,obj])).rows[0];
      if (cur) { g5mat[kind] = depOf(cur,"G5"); console.log(`  SKIP_VALID G5 ${kind} ${obj.slice(0,8)}`); continue; }
      const old = (await db.query(`select run_id,stage,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,
          dependency_snapshot,evidence_refs,input_fingerprint,producer_identity
        from control.gate_candidates where gate_code='G5' and object_type=$1 and object_id=$2 and candidate_status='CONSUMED'
        order by submitted_at desc limit 1`,[kind,obj])).rows[0];
      if (!old) throw new Error(`NO_G5_CANDIDATE ${kind}`);
      const deps = [depOf(signed["G4"][0],"G4")];
      await db.query(`delete from control.gate_candidates where gate_code='G5' and object_type=$1 and object_id=$2 and candidate_status='SUBMITTED'`,[kind,obj]);
      const cid = uuidFrom(`cand:G5:${kind}:${obj}:${Date.now()}`);
      await db.query(`insert into control.gate_candidates(candidate_id,run_id,stage,gate_code,object_type,object_id,artifact_revision,
          purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,submitted_at,producer_identity,candidate_status)
        values($1::uuid,$2,$3,'G5',$4,$5::uuid,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,now(),$15,'SUBMITTED')`,
        [cid,old.run_id,old.stage,kind,obj,old.artifact_revision,old.purpose_namespace,old.purpose_code,old.purpose_version,
         JSON.stringify(old.allowed_scope),old.consumer,JSON.stringify(deps),JSON.stringify(old.evidence_refs),old.input_fingerprint,old.producer_identity]);
      const dry = await reviewer().review({gate:"G5",dryRun:true});
      if (dry.status!=="DRY_RUN_PASS") throw new Error(`G5_MAT_DRYRUN_FAIL ${kind} ${dry.failed?.join(",")||dry.status}`);
      const s = await reviewer().review({gate:"G5",dryRun:false});
      if (s.status!=="PASS") throw new Error(`G5_MAT_SIGN_FAIL ${kind} ${s.failed?.join(",")||s.status}`);
      g5mat[kind] = depOf(await auditRow(s.auditId),"G5");
      console.log(`  SIGNED G5 ${kind} audit=${s.auditId}`);
    }
    pass("mainline_g5_material_current", `主线 G5 素材当前有效：${Object.keys(g5mat).join(",")}`);
  } catch (e) { fail("mainline_g5_material_current", e.message); await reset(); await db.end(); return report(); }

  const signNewG5 = async (objectType, objectId, artifactRevision, deps, evidenceRefs) => {
    // 幂等：若已有当前有效独立 G5 且指纹一致，直接复用，不重复签发。
    const existing = (await db.query(`select gate_audit_id,artifact_revision from control.gate_audits
      where gate_code='G5' and object_type=$1 and object_id=$2 and result='PASS' and current_valid
        and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`,[objectType,objectId])).rows[0];
    if (existing && existing.artifact_revision === artifactRevision) {
      console.log(`  REUSE_G5 ${objectType} ${objectId.slice(0,8)} audit=${existing.gate_audit_id}`);
      return auditRow(existing.gate_audit_id);
    }
    await db.query(`delete from control.gate_candidates where gate_code='G5' and object_type=$1 and object_id=$2 and candidate_status='SUBMITTED'`,[objectType,objectId]);
    const cid = uuidFrom(`cand:G5:${objectType}:${objectId}:${Date.now()}`);
    await db.query(`insert into control.gate_candidates(candidate_id,run_id,stage,gate_code,object_type,object_id,artifact_revision,
        purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,submitted_at,producer_identity,candidate_status)
      values($1::uuid,$2::uuid,'D05','G5',$3,$4::uuid,$5,'data-production','m5-remediation','v1',$6::jsonb,'producer',
        $7::jsonb,$8::jsonb,$9,now(),'private-evidence-worker','SUBMITTED')`,
      [cid,RUN_ID,objectType,objectId,artifactRevision,JSON.stringify({project_id:PROJECT_ID}),JSON.stringify(deps),JSON.stringify(evidenceRefs),
       sha(`${PROJECT_ID}:${objectType}:${objectId}:${artifactRevision}`)]);
    const dry = await reviewer().review({gate:"G5",dryRun:true});
    if (dry.status!=="DRY_RUN_PASS") throw new Error(`NEW_G5_DRYRUN_FAIL ${objectType} ${dry.failed?.join(",")||dry.status}`);
    const s = await reviewer().review({gate:"G5",dryRun:false});
    if (s.status!=="PASS") throw new Error(`NEW_G5_SIGN_FAIL ${objectType} ${s.failed?.join(",")||s.status}`);
    return auditRow(s.auditId);
  };

  // ---------- Step 3: 建立主线委托 + 正式 DirectorPlan 正文 + 独立 G5 ----------
  let planG5;
  try {
    await db.query("BEGIN");
    await db.query(`insert into studio.delegations(delegation_id,project_id,root_task_ref,root_task_id,root_task_snapshot,
        subtask_ref,delegation_series_id,delegation_revision_no,requester,executor,provider,engine_version,
        input_manifest,allowed_actions,transfer_rights_decision,policy_version,expires_at,budget_limit,currency,
        request_hash,idempotency_key,output_schema,created_at)
      values($1::uuid,$2,$3,$4::uuid,$5::jsonb,$6,$7::uuid,$8,$9::uuid,$10,$11,$12::text,
        $13::jsonb,$14::text[],$15::jsonb,$16,$17,0,'USD',$18,$19,$20,now())
      on conflict (delegation_id) do nothing`,
      [DELEGATION_ID,PROJECT_ID,ROOT_REF,TASK_ID,JSON.stringify({task_id:TASK_ID,project_id:PROJECT_ID}),
       `mainline:${TASK_ID}:subtask`,DELEGATION_ID,1,OWNER_ID,'mohen-mainline-agent','mainline','v1',
       JSON.stringify({original_id:ORIGINAL_ID,finding_id:G4}),['director_plan','work_revision'],JSON.stringify({basis:"owner_authorization"}),
       'v1',new Date(Date.now()+30*24*3600*1000).toISOString(),sha(`mainline:${TASK_ID}`),`mainline:${TASK_ID}`,'mohen.mainline.v1']);
    const snapshotHash = sha(`${PROJECT_ID}:${TASK_ID}:${ORIGINAL_ID}:${G3}:${G4}`);
    const sourceRefs = [{kind:"source",id:"9aa03207-6d60-4984-8c1f-347df2532842"},{kind:"original",id:ORIGINAL_ID},{kind:"finding",id:G4}];
    await db.query(`insert into public.director_plans(plan_id,brief,topic,plan_a,plan_b,facts,finding,selected,beats,
        owner_user_id,source_ids,project_id,delegation_id,root_task_ref,research_snapshot_hash,research_source_refs)
      values($1::uuid,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9::jsonb,$10::uuid,$11::jsonb,$12::uuid,$13::uuid,$14,$15,$16::jsonb)
      on conflict (plan_id) do nothing`,
      [PLAN_ID,"朱家角 water-and-market 主线正式导演方案","朱家角：方志可证的水路与集镇事实及解释边界",
       JSON.stringify({selection:"evidence_bounded",justification:"以地名志原文与 A05 finding 为骨架，区分可证事实与解释"}),
       JSON.stringify({alternative:["chronological","actor_portrait"],reason:"证据密度集中于单条地名志，按关系而非时间线组织"}),
       JSON.stringify({original_ids:[ORIGINAL_ID],finding_ids:[G4],qualification:"UNASSESSED"}),
       JSON.stringify({finding_id:G4,statement:"方志所载朱家角水路连接集镇空间，可证事实与解释须分层"}),
       "relation_matrix",
       JSON.stringify([{kind:"quote",content:"地名志·朱家角原文锚点",duration_ms:30000},{kind:"caution",content:"单条来源不外推全镇史实",duration_ms:30000}]),
       OWNER_ID, JSON.stringify(sourceRefs.map(r=>r.id)), PROJECT_ID, DELEGATION_ID, ROOT_REF, snapshotHash, JSON.stringify(sourceRefs)]);
    // §19.1 封套：Studio 表承载 method/depends_on/qualification，不复制正文；payload.original_ids 供 G5 权利校验。
    await db.query(`insert into studio.director_plans(plan_id,project_id,title,method_id,method_version,h1_discovery_refs,h2_decisions,h3_beats,
        alternative_plans,media_refs,depends_on_story_seeds,depends_on_agent_contexts,depends_on_projections,qualification,payload,created_at)
      values($1::uuid,$2,$3,'H1H2H3','source-sha256:mab-m5-isolated',$4::uuid[],$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,
        $9::uuid[],$10::uuid[],$11::uuid[],'UNASSESSED',$12::jsonb,now())
      on conflict (plan_id) do nothing`,
      [PLAN_ID,PROJECT_ID,"朱家角：方志可证事实与解释边界",`{${G4}}`,
       JSON.stringify({selection:"relation_matrix"}),JSON.stringify([{kind:"quote",content:"地名志锚点"}]),
       JSON.stringify({alternative:["chronological"]}),JSON.stringify([]),
       `{${SEED}}`,`{${CTX}}`,`{${PROJ}}`,JSON.stringify({original_ids:[ORIGINAL_ID],body:{original_ids:[ORIGINAL_ID]}})]);
    await db.query("COMMIT");
    const rev = (await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[PLAN_ID])).rows[0].rev;
    if (!rev || !/^[0-9a-f]{64}$/i.test(rev)) throw new Error(`plan fingerprint invalid ${rev}`);
    const deps = [depOf(signed["G4"][0],"G4"), g5mat.world_projection, g5mat.story_seed, g5mat.agent_context].filter(Boolean);
    planG5 = await signNewG5("director_plan", PLAN_ID, rev, deps, [{kind:"director_plan",id:PLAN_ID,artifact_revision:rev},{kind:"finding",id:G4}]);
    pass("mainline_director_plan_g5", `正式 plan 正文+独立 G5 ${planG5.gate_audit_id.slice(0,8)}，绑定 Project/Root/delegation/snapshot`);
  } catch (e) { try{await db.query("rollback");}catch{} fail("mainline_director_plan_g5", e.message); await reset(); await db.end(); return report(); }

  // ---------- Step 4: 建立正式 Work + WorkRevision 正文 + 独立 G5 ----------
  let revG5;
  try {
    await db.query("BEGIN");
    await db.query(`insert into publication.works(work_id,title,creator,owner_user_id,project_id)
      values($1::uuid,$2,$3,$4::uuid,$5::uuid) on conflict (work_id) do nothing`,
      [WORK_ID,"朱家角·方志可证事实与解释边界·修订1","formal-mainline-body-authority",OWNER_ID,PROJECT_ID]);
    const content = {director_source:{plan_id:PLAN_ID,artifact_revision:planG5.artifact_revision},topic:"朱家角",beats:[],source_refs:[{kind:"source",id:"9aa03207-6d60-4984-8c1f-347df2532842"}]};
    const contentHash = sha(JSON.stringify(content));
    await db.query(`insert into publication.work_revisions(revision_id,work_id,revision_no,title,description,content,status)
      values($1::uuid,$2::uuid,$3,$4,$5,$6::jsonb,'draft') on conflict (revision_id) do nothing`,
      [REVISION_ID,WORK_ID,1,"朱家角·修订1","主线正式正文权威归位",JSON.stringify({...content,content_hash:contentHash})]);
    // 幂等重放：仅当封套缺失（或 payload 尚未写入 method_id）时才插入/重建；
    // 若已被投稿快照外键引用，绝不删除封套（避免破坏外键），直接沿用既有正确封套。
    const envExists = (await db.query(
      `select count(*)::int n from studio.work_revisions where revision_id=$1::uuid and project_id=$2::uuid
         and payload->>'method_id'='H1H2H3'`,[REVISION_ID,PROJECT_ID])).rows[0].n;
    if (!envExists) {
      await db.query(`delete from studio.work_revisions where revision_id=$1::uuid and project_id=$2::uuid`,[REVISION_ID,PROJECT_ID]);
      await db.query(`insert into studio.work_revisions(work_id,revision_id,revision_no,project_id,creator_id,title,content_hash,content,beats,
        source_and_rights_refs,depends_on_director_plan,depends_on_story_seeds,depends_on_agent_contexts,depends_on_projections,payload,formal_revision_id)
      values($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid,$12::uuid[]::uuid[],$13::uuid[]::uuid[],$14::uuid[]::uuid[],$15::jsonb,$2::uuid)
      on conflict (revision_id) do nothing`,
      [WORK_ID,REVISION_ID,1,PROJECT_ID,"formal-mainline-body-authority","朱家角·修订1",contentHash,JSON.stringify(content),JSON.stringify([]),
       JSON.stringify([{kind:"source",id:"9aa03207-6d60-4984-8c1f-347df2532842",rights_basis:"owner_authorization"}]),PLAN_ID,
       `{${SEED}}`,`{${CTX}}`,`{${PROJ}}`,JSON.stringify({formal:true,method_id:"H1H2H3",original_ids:[ORIGINAL_ID],
         body:{original_ids:[ORIGINAL_ID],depends_on_director_plan:PLAN_ID}})]);
    }
    await db.query("COMMIT");
    const rev = (await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev",[REVISION_ID])).rows[0].rev;
    if (!rev || !/^[0-9a-f]{64}$/i.test(rev)) throw new Error(`revision fingerprint invalid ${rev}`);
    const deps = [depOf(signed["G4"][0],"G4"), depOf(planG5,"G5"), g5mat.world_projection, g5mat.story_seed, g5mat.agent_context].filter(Boolean);
    revG5 = await signNewG5("work_revision", REVISION_ID, rev, deps, [{kind:"work_revision",id:REVISION_ID,artifact_revision:rev},{kind:"director_plan_ref",ref:PLAN_ID}]);
    const check = (await db.query(`select r.work_id::text, r.revision_id::text, w.project_id::text, e.formal_revision_id::text
      from publication.work_revisions r join publication.works w on w.work_id=r.work_id join studio.work_revisions e on e.revision_id=r.revision_id
      where r.revision_id=$1`,[REVISION_ID])).rows[0];
    if (check.work_id!==WORK_ID || check.project_id!==PROJECT_ID || check.formal_revision_id!==REVISION_ID) throw new Error(`body authority broken ${JSON.stringify(check)}`);
    pass("mainline_work_revision_g5", `正式 revision+封套绑定同 Project；独立 G5 ${revG5.gate_audit_id.slice(0,8)}`);
  } catch (e) { try{await db.query("rollback");}catch{} fail("mainline_work_revision_g5", e.message); await reset(); await db.end(); return report(); }

  // ---------- Step 5: 同一对象锚点校验 ----------
  try {
    const a = (await db.query(`select p.project_id::text,p.lifecycle_status,d.root_task_id::text,d.root_task_ref,
        dp.project_id::text plan_project,dp.delegation_id::text plan_deleg,dp.root_task_ref plan_root,dp.research_snapshot_hash,
        w.project_id::text work_project,r.work_id::text rev_work, e.formal_revision_id::text
      from studio.projects p join studio.delegations d on d.project_id=p.project_id and d.delegation_id=$2::uuid
      join public.director_plans dp on dp.project_id=p.project_id and dp.plan_id=$3::uuid
      join publication.works w on w.project_id=p.project_id and w.work_id=$4::uuid
      join publication.work_revisions r on r.work_id=w.work_id and r.revision_id=$5::uuid
      join studio.work_revisions e on e.revision_id=r.revision_id where p.project_id=$1::uuid`,
      [PROJECT_ID,DELEGATION_ID,PLAN_ID,WORK_ID,REVISION_ID])).rows[0];
    const checks = {project:a?.project_id===PROJECT_ID,active:a?.lifecycle_status==="ACTIVE",root:a?.root_task_id===TASK_ID,
      rootref:a?.root_task_ref===ROOT_REF,plan_project:a?.plan_project===PROJECT_ID,plan_deleg:a?.plan_deleg===DELEGATION_ID,
      plan_root:a?.plan_root===ROOT_REF,snapshot:/^[a-f0-9]{64}$/.test(a?.research_snapshot_hash||""),work_project:a?.work_project===PROJECT_ID,
      rev_work:a?.rev_work===WORK_ID,envelope:a?.formal_revision_id===REVISION_ID};
    const broken = Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
    if (broken.length) throw new Error(`anchor broken ${broken.join(",")} ${JSON.stringify(a)}`);
    pass("mainline_same_object_anchor", "主线 Project/Root/Delegation/Plan/Work/Revision/封套全部同一对象");
  } catch (e) { fail("mainline_same_object_anchor", e.message); await reset(); await db.end(); return report(); }

  // ---------- Step 6: ST-08 投稿快照 + 跨 Project 反向 ----------
  try {
    const r = (await db.query(`select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4) as result`,[SNAPSHOT_ID,REVISION_ID,PROJECT_ID,OWNER_ID])).rows[0].result;
    const info = typeof r==="string"?JSON.parse(r):r;
    if (info.revision_id!==REVISION_ID || info.snapshot_id!==SNAPSHOT_ID) throw new Error("投稿未绑定同一 revision");
    pass("mainline_st08_snapshot", `${info.idempotent?"幂等复用":"新建"} 冻结快照绑定同 revision/Project`);
  } catch (e) { fail("mainline_st08_snapshot", e.message); }
  await expectReject("mainline_st08_wrong_project_rejected", () => db.query(
    `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4)`,[crypto.randomUUID(),REVISION_ID,OTHER_PROJECT_ID,OWNER_ID]),"NOT_FOUND|PRIVATE_SUBMISSION_REVISION_NOT_FOUND|REVISION_NOT_FOUND");

  // ---------- Step 7: ST-09 自审拒绝 + 退回阻断发布 ----------
  const creatorId = "formal-mainline-body-authority";
  await expectReject("mainline_st09_self_review_rejected", () => asOperator(
    `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,'self',$5)`,[crypto.randomUUID(),WORK_ID,REVISION_ID,creatorId,`mainline-self-${Date.now()}`]),"OPERATOR_CONFLICT");
  const nonce = Date.now();
  try {
    const req = await asOperator(`select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'CHANGES_REQUESTED',$4,$5,$6) as result`,
      [crypto.randomUUID(),WORK_ID,REVISION_ID,OPERATOR_ID,"mainline changes",`mainline-chg-${nonce}`]);
    if (req.decision!=="CHANGES_REQUESTED") throw new Error("退回未记录");
    pass("mainline_st09_changes_requested", "独立 Operator 退回决策 appended");
  } catch (e) { fail("mainline_st09_changes_requested", e.message); }
  const ptrQ = async () => (await db.query(`select publication_id::text,studio_revision_id::text from publication.published_pointers where work_id=$1`,[WORK_ID])).rows[0]||null;
  const ptrBefore = await ptrQ();
  await expectReject("mainline_changes_blocks_publish", () => asOperator(
    `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5)`,[crypto.randomUUID(),WORK_ID,REVISION_ID,OPERATOR_ID,`mainline-pub-block-${nonce}`]),"PUBLISH_DECISION_REQUIRED");
  if ((await ptrQ())?.publication_id !== ptrBefore?.publication_id) fail("mainline_failed_publish_keeps_pointer","退回态发布失败破坏旧指针");
  else pass("mainline_failed_publish_keeps_pointer","退回态发布被拒，旧指针未变");
  try {
    const appr = await asOperator(`select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,$5,$6) as result`,
      [crypto.randomUUID(),WORK_ID,REVISION_ID,OPERATOR_ID,"mainline approved",`mainline-appr-${nonce}`]);
    const d = (await db.query(`select revision_id::text,project_id::text,knowledge_gate_audit_id::text,decision from publication.editorial_decisions where decision_id=$1`,[appr.decision_id])).rows[0];
    if (d.revision_id!==REVISION_ID || d.project_id!==PROJECT_ID || d.knowledge_gate_audit_id!==revG5.gate_audit_id || d.decision!=="APPROVED") throw new Error(`批准绑定错误 ${JSON.stringify(d)}`);
    pass("mainline_st09_approved_same_object","APPROVED 精确绑定同 revision/Project/Revision G5；运营批准未代签 Gate");
  } catch (e) { fail("mainline_st09_approved_same_object", e.message); }

  // ---------- Step 8: 精确发布 —— Owner 2026-11-24 批准 display 权后，走正向发布 ----------
  // 权利事实：Owner 2026-11-24 明确批准来源 9aa03207 的 display 权（scripts/approve-m5-mainline-display-right.mjs 落库，
  //   rights_evidence.public_display_authorizations 留痕），download/adapt/redistribute/external_processing 仍 HOLD。
  //   发布闸只检查 display 一项，现应满足。仍不伪造：自审/非 operator 负例照验。
  const pubId = uuidFrom(`pub:${WORK_ID}:${nonce}`);
  try {
    const rights = await db.query(
      `select rights_by_action->>'display' display from source.sources where source_id='9aa03207-6d60-4984-8c1f-347df2532842'`);
    if (rights.rows[0]?.display !== 'allowed') throw new Error(`display 权未批准: ${rights.rows[0]?.display}`);
    pass("mainline_display_right_approved","Owner 2026-11-24 批准 display 权已落库且留痕");
  } catch (e) { fail("mainline_display_right_approved", e.message); }
  try {
    const pub = await asOperator(`select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5) as result`,[pubId,WORK_ID,REVISION_ID,OPERATOR_ID,`mainline-pub-${nonce}`]);
    if (pub.publication_id!==pubId) throw new Error("publication_id 不匹配");
    const p = await ptrQ();
    if (!p || p.studio_revision_id!==REVISION_ID || p.publication_id!==pubId) throw new Error(`指针错误 ${JSON.stringify(p)}`);
    pass("mainline_publish_exact_pointer",`正式主线已发布：指针 publication=${pubId.slice(0,8)} → revision=${REVISION_ID.slice(0,8)}`);
  } catch (e) { fail("mainline_publish_exact_pointer", e.message); }
  await expectReject("mainline_publish_self_operator_rejected", () => asOperator(
    `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5)`,[crypto.randomUUID(),WORK_ID,REVISION_ID,creatorId,`mainline-pub-self-${nonce}`]),"OPERATOR_REQUIRED");

  // ---------- Step 9: WATCH —— 同一正式 revision 可消费 + 错 revision / 匿名反向 ----------
  const publishedSQL = PUBLISHED_WORKS_SQL;
  const watchableSQL = STUDIO_REVISION_WATCHABLE_SQL.replace(/:'wid'/g,"$1").replace(/:'rid'/g,"$2");
  try {
    const listed = (await db.query(publishedSQL)).rows.find(w=>w.work_id===WORK_ID && w.revision_id===REVISION_ID);
    if (!listed) throw new Error("WATCH 未列出同正式 revision");
    const w = (await db.query(watchableSQL,[WORK_ID,REVISION_ID])).rows;
    if (!w.length || w[0].ok!==1) throw new Error("WATCH 未放行同 revision");
    pass("mainline_watch_same_revision","WATCH 列表与逐请求放行均指向同正式 revision");
  } catch (e) { fail("mainline_watch_same_revision", e.message); }
  try { const wrong=(await db.query(watchableSQL,[WORK_ID,crypto.randomUUID()])).rows; if(wrong.some(r=>r.ok===1)) throw new Error("错 revision 放行"); pass("mainline_watch_wrong_revision_rejected","错 revision 不放行"); }
  catch (e) { fail("mainline_watch_wrong_revision_rejected", e.message); }
  try {
    await db.query("BEGIN"); await db.query("SET LOCAL ROLE anon"); let denied=false;
    try { await db.query(publishedSQL); } catch { denied=true; } await db.query("ROLLBACK");
    if (denied) pass("mainline_watch_anonymous_denied","anon 无指针表读取权"); else finding("mainline_watch_anonymous_denied","anon 可读发布列表，需另核边界，不记 PASS");
  } catch(e){ try{await db.query("ROLLBACK");}catch{} fail("mainline_watch_anonymous_denied",e.message); } finally { try{await db.query("RESET ROLE");}catch{} }

  // ---------- Step 10: 撤权即时失效 + 历史保留 + 幂等 ----------
  let wdId;
  try {
    const wd = await asOperator(`select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) as result`,
      [crypto.randomUUID(),WORK_ID,pubId,OPERATOR_ID,"mainline withdraw",`mainline-wd-${nonce}`]);
    if (!wd.pointer_removed) throw new Error("撤权未删指针");
    if (await ptrQ()) throw new Error("撤权后指针仍在");
    const w=(await db.query(watchableSQL,[WORK_ID,REVISION_ID])).rows; if(w.some(r=>r.ok===1)) throw new Error("撤权后 WATCH 仍放行");
    const listed=(await db.query(publishedSQL)).rows.find(x=>x.work_id===WORK_ID); if(listed) throw new Error("撤权后仍列出作品");
    const hist=(await db.query(`select count(*)::int n from publication.publication_snapshots where publication_id=$1`,[pubId])).rows[0].n;
    if (hist!==1) throw new Error("撤权后历史快照未保留");
    pass("mainline_withdraw_immediate_invalidation","正式主线撤权后新请求即时阻断，历史快照保留");
    wdId=(await db.query(`select withdrawal_id::text id from publication.withdrawals where work_id=$1 order by created_at desc limit 1`,[WORK_ID])).rows[0]?.id;
  } catch (e) { fail("mainline_withdraw_immediate_invalidation", e.message); }
  if (wdId) {
    try { const again=await asOperator(`select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) as result`,
        [wdId,WORK_ID,pubId,OPERATOR_ID,"repeat",`mainline-wd-${nonce}`]);
      if (again.idempotent!==true || again.withdrawal_id!==wdId) throw new Error("重复撤权未幂等");
      pass("mainline_withdraw_idempotent","重复撤权幂等返回原记录");
    } catch(e){ fail("mainline_withdraw_idempotent", e.message); }
  }
  finding("mainline_independent_reviewer_identity","作品级审核由独立 Operator（非 Creator）执行且自审被拒；Owner 已登记为唯一 Reviewer（progress 1613/LEDGER 116），但作品级终签的人身份在脚本中以非用户 operator 标签执行，真实 UI 身份仍需 Owner 侧证明，本脚本不冒充");

  await db.end();
  report();
}
function report() {
  console.log("\n"+"=".repeat(78));
  console.log("M5 MAINLINE REPORT —— 正式主线作品贯通（隔离库，主线真实对象）");
  console.log("=".repeat(78));
  console.log(`\nPASS (${results.PASS.length}):`); results.PASS.forEach(p=>console.log(`   ${p}`));
  if(results.FAIL.length){console.log(`\nFAIL (${results.FAIL.length}):`);results.FAIL.forEach(f=>console.log(`   ${f}`));}
  if(results.FINDING.length){console.log(`\nFINDING (${results.FINDING.length}):`);results.FINDING.forEach(f=>console.log(`   ${f}`));}
  console.log(`\n${results.FAIL.length===0?"MAINLINE_VERIFIED_ISOLATED":"NOT_PASS"}`);
  console.log("=".repeat(78));
  process.exit(results.FAIL.length===0?0:1);
}
main().catch(e=>{console.error("FATAL:",e);process.exit(2);});
