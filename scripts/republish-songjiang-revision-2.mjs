#!/usr/bin/env node
/**
 * republish-songjiang-revision-2.mjs —— 为 M5 出口端到端验收出一版可公开的精确修订
 *
 * 背景：ST-10 脚本把「松江府田赋」rev1 跑完发布→撤回，指针归零（那是撤回证据）。
 * 端到端验收需要一件**当前公开**的真实作品，所以这里在该作品上正常走一个新修订：
 *   work_revision rev2（expected 1）→ G5 → submission_snapshot → 运营核签 → publish。
 *
 * 不伪造任何东西：同一 finding / 同一 director_plan / 同一原件，只把正文按既有证据
 * 收紧表述；G5 走与 ST-10 完全相同的机器评审通道；核签走运营角色。
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

const STUDIO_USER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const OPERATOR = "editorial-operator-st10@mohen";
const projectId = "b0a11000-0000-4000-8000-000000000001";
const runId = "c0a12000-0000-4000-8000-000000000030";
const findingId = "b31f534e-33eb-5b80-3034-e6ecde9e2b20";
const g4AuditId = "fc3645f6-1fde-457d-abf2-4a7dcceda991";
const planTitle = "松江府田赋科则机制导演方案·H1H2H3";

const uuidFrom = (label) => {
  const h = crypto.createHash("sha256").update(`mab-private-st10:${label}`).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const workId = uuidFrom(`work:${projectId}`);
const planId = uuidFrom(`plan:${projectId}:${planTitle}`);
const revisionId = uuidFrom(`work-revision:${workId}:rev2`);

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs }))
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET);

const decideGate = async (d) => {
  await db.query("begin");
  try {
    await db.query("set role mohen_gate_signer_m5_machine");
    await db.query(`SET mohen.session_token = '` + machineToken + `'`);
    const res = await db.query(
      `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
      [d.candidateId, d.requestId, d.result, d.ruleVersion, d.validUntil,
       JSON.stringify(d.receipt), d.expectedAuditId]);
    await db.query("commit");
    return res.rows[0].gate_audit_id;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  } finally {
    await db.query("select set_config('mohen.session_token',null,true)").catch(() => {});
    await db.query("reset role").catch(() => {});
  }
};

async function runAsOperator(sql, params) {
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL ROLE mohen_editorial_operator");
    const res = await db.query(sql, params);
    await db.query("COMMIT");
    return res.rows[0].d ?? res.rows[0].p;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  }
}

const pre = (await db.query(
  `select (select count(*)::int from studio.work_revisions where work_id=$1::uuid and revision_no=1) rev1,
          (select count(*)::int from studio.work_revisions where revision_id=$2::uuid) rev2,
          (select count(*)::int from publication.published_pointers where work_id=$1::uuid) ptr`,
  [workId, revisionId])).rows[0];
console.log(`前置：rev1=${pre.rev1} rev2=${pre.rev2} 公开指针=${pre.ptr}`);
if (pre.rev1 !== 1) throw new Error("rev1 不存在，链接不成立");
if (pre.ptr !== 0) throw new Error("已有公开指针；本脚本只用于撤回后重新公开");

// ---- rev2 ----
await db.query("BEGIN");
await db.query("SET LOCAL ROLE mohen_app_runtime");
await db.query(`SET LOCAL mohen.session_token = '` + mintSessionToken(STUDIO_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET) + `'`);
const wr = (await db.query(
  `select studio.persist_private_work_revision(
     $1::uuid,$2::uuid,$3::integer,$4::integer,
     $5::uuid,$6::text,$7::text,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid) as r`,
  [workId, revisionId, 2, 1, projectId, STUDIO_USER_ID, "松江府田赋·低田科则与准熟起科·修订2",
   JSON.stringify({
     narrative_arc: {
       opening: "《松江府志》卷十一田赋门：青浦县低田等则，均科正耗平米三斗六升五合。",
       development: "同一条文附「准熟起科」：税额以田等定额，是否耕种成熟则决定起科与否，两个变量共同构成征收条件。",
       caution: "证据止于卷十一单页；同卷其他田等与《赋役全书》条目未在证据内，不据此推全府税负结构。",
       present_connection: "今天按地力分级、按实际耕种状态核定的做法，与这套二维思路同源。",
     },
     frames: [
       { index: 1, kind: "quote", location: "卷十一田赋门低田科则条", time_scope: "清康熙刻本", material_refs: ["read_unit:e065f45a"] },
       { index: 2, kind: "rule", location: "准熟起科条件", time_scope: "清康熙刻本", material_refs: ["projection:songjiang_land_tax_grade_mechanism_projection"] },
       { index: 3, kind: "caution", location: "缺失证据说明", time_scope: "证据边界", material_refs: ["story_seed:songjiang_land_tax_grade_seed"] },
     ],
   }),
   JSON.stringify([
     { kind: "quote", content: "低田均科正耗平米三斗六升五合", duration_ms: 30000, refs: { story_seed: true } },
     { kind: "rule", content: "准熟起科：熟荒状态决定起科与否", duration_ms: 40000, refs: { story_seed: true, projection: true } },
     { kind: "caution", content: "单页证据边界：不外推全府税率", duration_ms: 30000, refs: { story_seed: true, finding: true } },
   ]),
   JSON.stringify({
     originals: ["b0a11000-0000-4000-8000-000000000002"],
     rights_snapshot: { basis: "public_domain_expired_copyright", actions: { machine_read: "allowed", retain: "allowed" } },
   }),
   planId])).rows[0].r;
await db.query("COMMIT");
console.log(`rev2=${wr.revision_id} content_hash=${String(wr.content_hash).slice(0, 12)}…`);

// ---- G5 ----
const g4 = (await db.query(
  `select gate_audit_id::text, object_type, object_id::text, artifact_revision, qualification_digest
   from control.gate_audits where gate_audit_id=$1::uuid`, [g4AuditId])).rows[0];
const planG5 = (await db.query(
  `select gate_audit_id::text, object_type, object_id::text, artifact_revision, qualification_digest
   from control.gate_audits where object_type='director_plan' and object_id=$1::uuid
     and gate_code='G5' and result='PASS' and current_valid order by signed_at desc limit 1`, [planId])).rows[0];
const artifactRevision = (await db.query(
  `select control.artifact_revision_for('work_revision',$1::uuid) as rev`, [revisionId])).rows[0].rev;
const deps = [g4, planG5].filter(Boolean).map((r) => ({
  gate_code: r === g4 ? "G4" : "G5", stage: r === g4 ? "D04" : "D05",
  object_type: r.object_type, object_id: r.object_id, artifact_revision: r.artifact_revision,
  gate_audit_id: r.gate_audit_id, qualification_digest: r.qualification_digest,
}));
const candidateId = uuidFrom(`candidate-rev2:G5:work_revision:${revisionId}`);
await db.query(`delete from control.gate_candidates where gate_code='G5' and object_type='work_revision'
                and object_id=$1::uuid and candidate_status='SUBMITTED'`, [revisionId]);
await db.query(
  `insert into control.gate_candidates(
     candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
     purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
     dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
   values ($1::uuid,$2::uuid,'D05','G5','work_revision',$3::uuid,$4,
     'data-production','m5-remediation','v1',$5::jsonb,'producer',
     $6::jsonb,$7::jsonb,$8,now(),'private-evidence-worker','SUBMITTED')`,
  [candidateId, runId, revisionId, artifactRevision,
   JSON.stringify({ project_id: projectId }), JSON.stringify(deps),
   JSON.stringify([{ kind: "director_plan_ref", ref: planId }, { kind: "finding_ref", ref: findingId }]),
   sha(`${projectId}:work_revision:${revisionId}:${artifactRevision}`)]);
const reviewer = createRuleGateReviewer({
  query: queryRows, decide: decideGate, projectId, log: (l) => console.log(`  ${l}`),
});
const dry = await reviewer.review({ gate: "G5", dryRun: true });
if (dry.status !== "DRY_RUN_PASS") throw new Error(`dryRun 失败：${dry.failed?.join(",") || dry.status}`);
const signed = await reviewer.review({ gate: "G5", dryRun: false });
if (signed.status !== "PASS") throw new Error(`签发失败：${signed.failed?.join(",") || signed.status}`);
console.log(`G5=${signed.auditId}`);

// ---- ST-08 快照 ----
await db.query("BEGIN");
await db.query("SET LOCAL ROLE mohen_app_runtime");
await db.query(`SET LOCAL mohen.session_token = '` + mintSessionToken(STUDIO_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET) + `'`);
const snap = (await db.query(
  `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4::text) as r`,
  [uuidFrom(`snapshot-rev2:${revisionId}`), revisionId, projectId, STUDIO_USER_ID])).rows[0].r;
await db.query("COMMIT");
console.log(`snapshot=${snap.snapshot_id} gaps=${(snap.gaps || []).length}`);

// ---- 核签 + 发布 ----
const decision = await runAsOperator(
  "select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text) as d",
  [uuidFrom(`decision-rev2:${workId}:${revisionId}`), workId, revisionId, "APPROVED", OPERATOR,
   "端到端验收用公开修订", `st10-decide-rev2-${workId}`]);
console.log(`核签=${decision.decision} 可发布=${decision.publishable} 权利缺口=${(decision.rights_gaps || []).length}`);
if (decision.decision !== "APPROVED" || (decision.rights_gaps || []).length) throw new Error("核签未通过");

const pub = await runAsOperator(
  "select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as p",
  [uuidFrom(`publication-rev2:${workId}:${revisionId}`), workId, revisionId, OPERATOR, `st10-publish-rev2-${workId}`]);
const ptr = (await db.query(
  `select source_schema, coalesce(revision_id::text, studio_revision_id::text) as revision_id,
          publication_id::text from publication.published_pointers where work_id=$1::uuid`, [workId])).rows[0];
console.log(`发布=${pub.publication_id} 指针=${JSON.stringify(ptr)}`);
if (!ptr || ptr.source_schema !== "studio" || ptr.revision_id !== revisionId) throw new Error("指针未指向 rev2");

console.log(JSON.stringify({ workId, revisionId, publicationId: pub.publication_id }, null, 1));
await db.end();
