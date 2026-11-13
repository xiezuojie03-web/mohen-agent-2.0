#!/usr/bin/env node
/**
 * test-st10-third-topic-fullchain-isolation.mjs —— 第三题材全链隔离验证
 *
 * 题材：「松江府田赋」（模板项目 b0a11000-…-0001，来源「松江府志7」b0a11000-…-0004，
 *        rights_by_action 九动作全 allowed —— 全库唯一 display=allowed 来源）。
 *
 * 这条链的每个环节都已在之前批次单独验证过（朱家角 / 七宝），但它们都在 ST-09
 * 发布闸被「display 未显式许可」挡住，只证明了失败关闭。本题材用真实公版素材
 * 把**发布正面成功路径**跑通：
 *   D05 P02 world_projection → G5
 *   D05 P04 story_seed / agent_context → 各自 G5
 *   ST-05 director_plan → G5
 *   ST-07 work_revision → G5
 *   ST-08 submission_snapshot
 *   ST-09 运营核签 APPROVED → publish_exact_revision 成功（指针切到 studio 精确修订）
 *        → WATCH 读路径（生产 SQL）读到该修订
 *        → withdraw_publication 撤回 → 指针消失、快照与撤回记录留痕、幂等重放
 *
 * 设计原文：KALC §11「CAS 发布只指向批准且当下合法的不可变 WorkRevision；新版本失败
 *           不破坏旧合法发布指针」、KAD2 §7 ST-09、AGENT 合同 §6.2「作品发布后同一
 *           合法 WorkRevision@rev 供 WATCH 消费，不另建第二作品」。
 *
 * 不做的事：不伪造许可、不代签 G、不改动任何 legacy 发布指针、不碰生产库。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";
import { PUBLISHED_WORKS_SQL, STUDIO_REVISION_WATCHABLE_SQL }
  from "../apps/web/lib/publication-watch-sql.mjs";

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

const T = {
  name: "松江府田赋",
  projectId: "b0a11000-0000-4000-8000-000000000001",
  runId: "c0a12000-0000-4000-8000-000000000030",
  findingId: "b31f534e-33eb-5b80-3034-e6ecde9e2b20",
  g4AuditId: "fc3645f6-1fde-457d-abf2-4a7dcceda991",
  originalId: "b0a11000-0000-4000-8000-000000000002",
  projectionKey: "songjiang_land_tax_grade_mechanism_projection",
  seedKey: "songjiang_land_tax_grade_seed",
  contextKey: "songjiang_land_tax_grade_agent_ctx",
  planTitle: "松江府田赋科则机制导演方案·H1H2H3",
  workTitle: "松江府田赋·低田科则与准熟起科·修订1",
};

const uuidFrom = (label) => {
  const h = crypto.createHash("sha256").update(`mab-private-st10:${label}`).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");

const workId = uuidFrom(`work:${T.projectId}`);
const seedId = uuidFrom(`seed:${T.projectId}:${T.seedKey}`);
const contextId = uuidFrom(`ctx:${T.projectId}:${T.contextKey}`);
const projectionDigest = sha(`st10:${T.projectId}:${T.findingId}:${T.originalId}:${T.projectionKey}`);
const projectionId = (() => {
  const h = sha(`mab-private-world-projection:${projectionDigest}`).slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
})();
const planId = uuidFrom(`plan:${T.projectId}:${T.planTitle}`);
const revisionId = uuidFrom(`work-revision:${workId}:rev1`);

const results = { PASS: [], FAIL: [] };
const pass = (k, d) => { results.PASS.push(k); console.log(`  ✅ ${k}${d ? ` —— ${d}` : ""}`); };
const fail = (k, d) => { results.FAIL.push(k); console.log(`  ❌ ${k}${d ? ` —— ${d}` : ""}`); };

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw)
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

async function main() {
  console.log("=".repeat(78));
  console.log("第三题材全链：「松江府田赋」D05 → G5 → ST-05 → ST-07 → ST-08 → ST-09 发布 → 撤回");
  console.log(`project=${T.projectId}  来源=松江府志7（九动作全 allowed）`);
  console.log("=".repeat(78));

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const secret = env.MOHEN_DATABASE_SESSION_SECRET;
  const studioToken = mintSessionToken(STUDIO_USER_ID, secret);
  const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);

  const reset = async () => {
    try { await db.query("RESET ROLE"); } catch {}
    try { await db.query("RESET ALL"); } catch {}
  };
  const asStudio = async () => {
    await db.query("SET LOCAL ROLE mohen_app_runtime");
    await db.query(`SET LOCAL mohen.session_token = '${studioToken}'`);
  };

  // ---------- Step 0: 前置事实核查（缺一项就停，不硬造） ----------
  console.log("\n  --- Step 0: 前置事实核查 ---");
  try {
    const pre = (await db.query(
      `select (select count(*)::int from studio.private_originals o where o.original_id=$1::uuid and o.project_id=$2::uuid
                and o.state='STORED_VERIFIED') originals,
              (select count(*)::int from control.production_runs r where r.run_id=$3::uuid
                and r.architecture_generation='mohen.six-stage.v1'
                and r.scope->>'project_id'=$7) runs,
              (select count(*)::int from control.gate_audits ga where ga.gate_audit_id=$4::uuid
                and ga.gate_code='G4' and ga.object_type='finding' and ga.object_id=$5::uuid
                and ga.result='PASS' and ga.current_valid) g4,
              (select count(*)::int from source.sources s where s.source_id='b0a11000-0000-4000-8000-000000000004'
                and s.rights_by_action->>'display'='allowed'
                and s.rights_by_action->>'quote'='allowed'
                and s.rights_by_action->>'download'='allowed'
                and s.rights_by_action->>'adapt'='allowed'
                and s.rights_by_action->>'redistribute'='allowed'
                and s.rights_by_action->>'external_processing'='allowed') rights,
              (select count(*)::int from publication.publication_snapshots ps where ps.work_id=$6::uuid) snapshots,
              (select count(*)::int from publication.withdrawals w where w.work_id=$6::uuid) withdrawals`,
      [T.originalId, T.projectId, T.runId, T.g4AuditId, T.findingId, workId, T.projectId])).rows[0];
    console.log(`  原件=${pre.originals} 生产运行=${pre.runs} G4=${pre.g4} 六动作权利=${pre.rights}` +
      ` 已有发布快照=${pre.snapshots} 已有撤回=${pre.withdrawals}`);
    if (!pre.originals) throw new Error("原件不是 STORED_VERIFIED 或不属于本项目");
    if (!pre.runs) throw new Error("没有绑定该项目的 mohen.six-stage.v1 生产运行");
    if (!pre.g4) throw new Error("上游 finding 没有 current G4 PASS");
    if (!pre.rights) throw new Error("来源未对发布所需动作显式 allowed");
    if (pre.snapshots || pre.withdrawals) {
      throw new Error("该作品已有发布/撤回记录；本脚本是一次性正面路径证据，不重放覆盖历史");
    }
    pass("preflight_facts", "原件/运行/G4/权利齐备，且无历史发布记录");
  } catch (err) {
    fail("preflight_facts", err.message);
    await db.end();
    return report();
  }

  // ---------- G5 机器评审（与既有批次同一签发器，不新增第二套） ----------
  const decideGate = async (decision) => {
    await db.query("begin");
    try {
      await db.query("set role mohen_gate_signer_m5_machine");
      await db.query(`SET mohen.session_token = '` + machineToken + `'`);
      const res = await db.query(
        `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [decision.candidateId, decision.requestId, decision.result,
         decision.ruleVersion, decision.validUntil,
         JSON.stringify(decision.receipt), decision.expectedAuditId]);
      await db.query("commit");
      return res.rows[0].gate_audit_id;
    } catch (err) {
      try { await db.query("rollback"); } catch {}
      throw err;
    } finally {
      try { await db.query("select set_config('mohen.session_token',null,true)"); } catch {}
      try { await db.query("reset role"); } catch {}
    }
  };

  const g4Dependency = async () => {
    const r = (await db.query(
      `select gate_audit_id::text, object_type, object_id::text, artifact_revision, qualification_digest
       from control.gate_audits where gate_audit_id=$1`, [T.g4AuditId])).rows[0];
    if (!r) throw new Error("G4 审计不存在");
    return [{
      gate_code: "G4", stage: "D04", object_type: r.object_type, object_id: r.object_id,
      artifact_revision: r.artifact_revision, gate_audit_id: r.gate_audit_id,
      qualification_digest: r.qualification_digest,
    }];
  };
  const g5AuditOf = async (objectType, objectId) => {
    const r = (await db.query(
      `select gate_audit_id::text, object_type, object_id::text, artifact_revision, qualification_digest
       from control.gate_audits
       where object_type=$1 and object_id=$2 and gate_code='G5' and result='PASS' and current_valid
       order by signed_at desc limit 1`, [objectType, objectId])).rows[0];
    return r ? {
      gate_code: "G5", stage: "D05", object_type: r.object_type, object_id: r.object_id,
      artifact_revision: r.artifact_revision, gate_audit_id: r.gate_audit_id,
      qualification_digest: r.qualification_digest,
    } : null;
  };

  /** 提交候选 → 机器评审（dryRun 先跑）→ 正式签发。 */
  const submitAndSignG5 = async (objectType, objectId, deps, evidenceRefs) => {
    const artifactRevision = (await db.query(
      `select control.artifact_revision_for($1,$2::uuid) as rev`, [objectType, objectId])).rows[0]?.rev;
    if (!artifactRevision) throw new Error(`artifact_revision 为空：${objectType}`);
    const candidateId = uuidFrom(`candidate:G5:${objectType}:${objectId}`);
    await db.query(
      `delete from control.gate_candidates
        where gate_code='G5' and object_type=$1 and object_id=$2 and candidate_status='SUBMITTED'`,
      [objectType, objectId]);
    await db.query(
      `insert into control.gate_candidates(
         candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
         purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
         dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
       values ($1::uuid,$2::uuid,'D05','G5',$3,$4::uuid,$5,
         'data-production','m5-remediation','v1',$6::jsonb,'producer',
         $7::jsonb,$8::jsonb,$9,now(),'private-evidence-worker','SUBMITTED')`,
      [candidateId, T.runId, objectType, objectId, artifactRevision,
       JSON.stringify({ project_id: T.projectId }), JSON.stringify(deps), JSON.stringify(evidenceRefs),
       sha(`${T.projectId}:${objectType}:${objectId}:${artifactRevision}`)]);

    const reviewer = createRuleGateReviewer({
      query: queryRows, decide: decideGate, projectId: T.projectId,
      log: (line) => console.log(`    ${line}`),
    });
    const dryRun = await reviewer.review({ gate: "G5", dryRun: true });
    if (dryRun.status !== "DRY_RUN_PASS") {
      throw new Error(`dryRun 失败：${dryRun.failed?.join(",") || dryRun.status}`);
    }
    const signed = await reviewer.review({ gate: "G5", dryRun: false });
    if (signed.status !== "PASS") throw new Error(`签发失败：${signed.failed?.join(",") || signed.status}`);
    return signed.auditId;
  };

  // ---------- Step 1: D05 P02 world_projection ----------
  console.log("\n  --- Step 1: D05 P02 world_projection persist + G5 ---");
  try {
    const spec = {
      projection_key: T.projectionKey,
      payload: {
        statement: "低田等则以『均科正耗平米三斗六升五合』定额，并以『准熟起科』把熟荒状态作为第二个征税变量。",
        variables: [
          { name: "田等", observed: "低田", source: "《松江府志》卷十一田赋门" },
          { name: "熟荒状态", observed: "准熟起科", source: "《松江府志》卷十一田赋门" },
        ],
        scope_note: "单页读取，仅覆盖卷十一所见低田一项科则；其他田等与《赋役全书》条目未在证据内，不据此外推全府税负。",
        projection_kind: "institutional_rule",
      },
    };
    await db.query("BEGIN");
    await asStudio();
    const saved = (await db.query(
      `select studio.persist_private_world_projection($1::uuid,$2::uuid,$3::text,$4::uuid,$5::uuid,$6::jsonb) as r`,
      [T.originalId, projectionId, projectionDigest, T.runId, T.findingId, JSON.stringify(spec)])).rows[0].r;
    await db.query("COMMIT");
    console.log(`  projection_id=${saved.projection_id} artifact_revision=${String(saved.artifact_revision).slice(0, 12)}…`);
    const auditId = await submitAndSignG5("world_projection", projectionId, await g4Dependency(),
      [{ kind: "world_projection", id: projectionId, artifact_revision: saved.artifact_revision },
       { kind: "finding", id: T.findingId }]);
    pass("p02_projection_g5", `audit=${String(auditId).slice(0, 8)}…`);
  } catch (err) {
    await db.query("rollback").catch(() => {});
    fail("p02_projection_g5", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 2: D05 P04 story_seed / agent_context ----------
  console.log("\n  --- Step 2: D05 P04 story_seed + agent_context persist + G5 ---");
  try {
    await db.query("BEGIN");
    await asStudio();
    const seed = (await db.query(
      `select studio.persist_private_story_seed($1::uuid,$2::text,$3::uuid[],$4::jsonb) as r`,
      [seedId, T.seedKey, [T.findingId], JSON.stringify({
        title: "田等赋则：一条科则里的两个变量",
        narrative_question: "一条低田科则为何同时写明税额与『准熟起科』？这对理解江南赋役传统意味着什么？",
        original_ids: [T.originalId],
        payload: {
          opening_hook: "『均科正耗平米三斗六升五合』——一个精确到合的税额。",
          tension: "税额看似只由田等决定，但『准熟起科』把土地的实际耕种状态也写进了征收条件。",
          caution: "证据只有卷十一单页；同卷其他田等与《赋役全书》未核对，不能据此描述全府税负结构。",
        },
      })])).rows[0].r;
    const ctx = (await db.query(
      `select studio.persist_private_agent_context($1::uuid,$2::text,$3::uuid[],$4::jsonb) as r`,
      [contextId, T.contextKey, [T.findingId], JSON.stringify({
        original_ids: [T.originalId],
        payload: {
          reading_context: "读者面对一份清代方志的赋役门类，容易把科则读成孤立数字。",
          interpretive_frame: "把科则读成『田等 × 熟荒状态』的二维规则，而不是单一税率。",
          guardrail: "不把单页科则外推为全府税率，也不把制度条文当作实际征收记录。",
        },
      })])).rows[0].r;
    await db.query("COMMIT");
    console.log(`  story_seed=${seed.story_seed_id}  agent_context=${ctx.agent_context_id}`);

    const seedDeps = await g4Dependency();
    const seedAudit = await submitAndSignG5("story_seed", seedId, seedDeps,
      [{ kind: "story_seed", id: seedId, artifact_revision: seed.artifact_revision },
       { kind: "finding", id: T.findingId }]);
    const ctxAudit = await submitAndSignG5("agent_context", contextId, seedDeps,
      [{ kind: "agent_context", id: contextId, artifact_revision: ctx.artifact_revision },
       { kind: "finding", id: T.findingId }]);
    pass("p04_seed_ctx_g5", `seed=${String(seedAudit).slice(0, 8)}… ctx=${String(ctxAudit).slice(0, 8)}…`);
  } catch (err) {
    await db.query("rollback").catch(() => {});
    fail("p04_seed_ctx_g5", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 3: ST-05 director_plan ----------
  console.log("\n  --- Step 3: ST-05 director_plan persist + G5 ---");
  try {
    await db.query("BEGIN");
    await asStudio();
    const plan = (await db.query(
      `select studio.persist_private_director_plan(
         $1::uuid,$2::uuid,$3::text,
         ARRAY[$4]::uuid[], ARRAY[$5]::uuid[], ARRAY[$6]::uuid[],
         ARRAY[]::uuid[], $7::jsonb, $8::jsonb, $9::jsonb) as r`,
      [planId, T.projectId, T.planTitle,
       seedId, contextId, projectionId,
       JSON.stringify({
         selection: "variable_matrix",
         alternatives: [
           { name: "chronological_tax_reform", reason: "按赋役改革时间线推进，但证据只有卷十一单页，撑不起时间跨度" },
           { name: "actor_portrait", reason: "以征税者/纳税人为主角，但证据内没有具体行动者" },
         ],
         justification: "A06 制度机制 finding：以科则的两个变量（田等、熟荒）为骨架，最贴合现有证据密度",
       }),
       JSON.stringify([
         { kind: "quote", content: "低田均科正耗平米三斗六升五合：税额以田等为变量定额", duration_ms: 30000 },
         { kind: "rule", content: "准熟起科：熟荒状态作为第二个变量进入征收条件", duration_ms: 40000 },
         { kind: "caution", content: "单页证据之外暂不外推：同卷其他田等与《赋役全书》对照仍缺", duration_ms: 30000 },
       ]),
       JSON.stringify({ alternative_plans: {}, media_refs: [] })])).rows[0].r;
    await db.query("COMMIT");
    console.log(`  plan_id=${planId} artifact_revision=${String(plan.artifact_revision).slice(0, 12)}…`);

    const deps = [
      ...(await g4Dependency()),
      ...(await g5AuditOf("story_seed", seedId) ? [await g5AuditOf("story_seed", seedId)] : []),
      ...(await g5AuditOf("agent_context", contextId) ? [await g5AuditOf("agent_context", contextId)] : []),
      ...(await g5AuditOf("world_projection", projectionId) ? [await g5AuditOf("world_projection", projectionId)] : []),
    ];
    const auditId = await submitAndSignG5("director_plan", planId, deps,
      [{ kind: "director_plan", id: planId, artifact_revision: plan.artifact_revision },
       { kind: "story_seed", id: seedId }, { kind: "agent_context", id: contextId },
       { kind: "world_projection", id: projectionId }]);
    pass("st05_director_plan_g5", `audit=${String(auditId).slice(0, 8)}…`);
  } catch (err) {
    await db.query("rollback").catch(() => {});
    fail("st05_director_plan_g5", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 4: ST-07 work_revision ----------
  console.log("\n  --- Step 4: ST-07 work_revision persist + G5 ---");
  try {
    await db.query("BEGIN");
    await asStudio();
    const wr = (await db.query(
      `select studio.persist_private_work_revision(
         $1::uuid,$2::uuid,$3::integer,$4::integer,
         $5::uuid,$6::text,$7::text,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid) as r`,
      [workId, revisionId, 1, 0, T.projectId, STUDIO_USER_ID, T.workTitle,
       JSON.stringify({
         narrative_arc: {
           opening: "《松江府志》卷十一田赋门：青浦县低田等则均科正耗平米三斗六升五合。",
           development: "同一条文附『准熟起科』——税额之外，土地是否耕种成熟也决定如何起科。",
           caution: "证据止于卷十一单页；同卷其余田等与《赋役全书》未在证据内，不据此推全府税负。",
           present_connection: "读今天的『按地力分级、按实际耕种状态核定』，会看到同一套二维思路的延长线。",
         },
         frames: [
           { index: 1, kind: "quote", location: "卷十一田赋门低田科则条", time_scope: "清康熙刻本", material_refs: [`read_unit:${"e065f45a"}`] },
           { index: 2, kind: "rule", location: "准熟起科条件", time_scope: "清康熙刻本", material_refs: [`projection:${T.projectionKey}`] },
           { index: 3, kind: "caution", location: "缺失证据说明", time_scope: "证据边界", material_refs: [`story_seed:${T.seedKey}`] },
         ],
       }),
       JSON.stringify([
         { kind: "quote", content: "低田均科正耗平米三斗六升五合", duration_ms: 30000, refs: { story_seed: true } },
         { kind: "rule", content: "准熟起科：熟荒状态决定起科与否", duration_ms: 40000, refs: { story_seed: true, projection: true } },
         { kind: "caution", content: "单页证据边界：不外推全府税率", duration_ms: 30000, refs: { story_seed: true, finding: true } },
       ]),
       JSON.stringify({
         originals: [T.originalId],
         rights_snapshot: { basis: "public_domain_expired_copyright", actions: { machine_read: "allowed", retain: "allowed" } },
       }),
       planId])).rows[0].r;
    await db.query("COMMIT");
    console.log(`  revision_id=${wr.revision_id} content_hash=${String(wr.content_hash).slice(0, 12)}…`);

    const deps = [
      ...(await g4Dependency()),
      ...(await g5AuditOf("director_plan", planId) ? [await g5AuditOf("director_plan", planId)] : []),
    ];
    const auditId = await submitAndSignG5("work_revision", revisionId, deps,
      [{ kind: "director_plan_ref", ref: planId }, { kind: "finding_ref", ref: T.findingId }]);
    pass("st07_work_revision_g5", `audit=${String(auditId).slice(0, 8)}…`);
  } catch (err) {
    await db.query("rollback").catch(() => {});
    fail("st07_work_revision_g5", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 5: ST-08 submission_snapshot ----------
  console.log("\n  --- Step 5: ST-08 submission_snapshot ---");
  try {
    await db.query("BEGIN");
    await asStudio();
    const snap = (await db.query(
      `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4::text) as r`,
      [uuidFrom(`snapshot:${revisionId}`), revisionId, T.projectId, STUDIO_USER_ID])).rows[0].r;
    await db.query("COMMIT");
    console.log(`  snapshot_id=${snap.snapshot_id} publication_eligible=${snap.publication_eligible} gaps=${(snap.gaps || []).length}`);
    if (!snap.snapshot_id) throw new Error("未返回 snapshot_id");
    if (String(snap.revision_id) !== revisionId) throw new Error("快照未绑定精确修订");
    pass("st08_snapshot", `gaps=${(snap.gaps || []).length}`);
  } catch (err) {
    await db.query("rollback").catch(() => {});
    fail("st08_snapshot", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 6: ST-09 运营核签 ----------
  console.log("\n  --- Step 6: ST-09 运营核签 EditorialDecision ---");
  let publicationId = null;
  try {
    const decisionId = uuidFrom(`decision:${workId}:${revisionId}`);
    const res = await runAsOperator(db, "select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text) as d",
      [decisionId, workId, revisionId, "APPROVED", OPERATOR, "第三题材发布正面路径验证", `st10-decide-${workId}`]);
    const d = res;
    console.log(`  decision=${d.decision} publishable=${d.publishable} rights_gaps=${(d.rights_gaps || []).length} idempotent=${d.idempotent}`);
    if (d.decision !== "APPROVED") throw new Error("核签结果不是 APPROVED");
    if (String(d.revision_id) !== revisionId) throw new Error("核签未绑定精确修订");
    if ((d.rights_gaps || []).length !== 0) throw new Error(`权利仍有缺口：${(d.rights_gaps || []).map(g => g.code).join(",")}`);
    if (d.publishable !== true) throw new Error("核签未判定可发布");
    pass("st09_decision_approved", "权利缺口=0，publishable=true");
  } catch (err) {
    fail("st09_decision_approved", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 7: ST-09 发布（正面成功路径） ----------
  console.log("\n  --- Step 7: ST-09 publish_exact_revision ---");
  const legacyPtrBefore = (await db.query(
    `select count(*)::int n from publication.published_pointers where source_schema='publication'`)).rows[0].n;
  try {
    publicationId = uuidFrom(`publication:${workId}:${revisionId}`);
    const res = await runAsOperator(db,
      "select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as p",
      [publicationId, workId, revisionId, OPERATOR, `st10-publish-${workId}`]);
    console.log(`  publication_id=${res.publication_id} artifact_revision=${String(res.artifact_revision).slice(0, 12)}… scope=${res.scope}`);
    if (String(res.revision_id) !== revisionId) throw new Error("发布对象不是精确修订");

    const ptr = (await db.query(
      `select source_schema, revision_id::text, studio_revision_id::text, publication_id::text
       from publication.published_pointers where work_id=$1`, [workId])).rows[0];
    if (!ptr) throw new Error("公开指针未写入");
    if (ptr.source_schema !== "studio") throw new Error(`指针来源=${ptr.source_schema}`);
    if (ptr.revision_id !== null) throw new Error("studio 指针不应同时指 legacy 修订");
    if (ptr.studio_revision_id !== revisionId) throw new Error("指针未指向精确修订");
    if (ptr.publication_id !== res.publication_id) throw new Error("指针未绑定发布快照");

    const legacyPtrAfter = (await db.query(
      `select count(*)::int n from publication.published_pointers where source_schema='publication'`)).rows[0].n;
    if (legacyPtrAfter !== legacyPtrBefore) throw new Error(`legacy 指针被动到：${legacyPtrBefore}→${legacyPtrAfter}`);
    pass("st09_publish_success", `指针切到 studio 精确修订，legacy 指针仍 ${legacyPtrAfter} 条未动`);
  } catch (err) {
    fail("st09_publish_success", err.message);
    await reset(); await db.end(); return report();
  }

  // ---------- Step 8: WATCH 读路径（生产 SQL 直验） ----------
  console.log("\n  --- Step 8: WATCH 读路径 ---");
  await reset();
  try {
    const published = await queryRows(PUBLISHED_WORKS_SQL);
    const mine = published.find(w => w.work_id === workId);
    if (!mine) throw new Error("listPublished 生产 SQL 读不到该 studio 发布");
    if (mine.source_schema !== "studio") throw new Error(`来源标记=${mine.source_schema}`);
    if (mine.revision_id !== revisionId) throw new Error("读到的不是精确修订");
    if (!mine.content || !String(mine.content).includes("三斗六升五合")) throw new Error("读到的内容不是本修订正文");
    const legacyRows = published.filter(w => w.source_schema === "publication").length;
    pass("watch_list_reads_studio", `listPublished 共 ${published.length} 部（legacy ${legacyRows} + studio 1）`);

    const watchable = await queryRows(STUDIO_REVISION_WATCHABLE_SQL, { wid: workId, rid: revisionId });
    if (watchable.length !== 1) throw new Error("studio 当前资格复核未通过");
    pass("watch_studio_current_recheck", "指针+快照绑定、未撤回、G5 当前、artifact_revision 未移动");

    // 负向：把 artifact_revision 挪动后必须读不到。
    // 用与生产同一条 SQL（仅把命名参数换成位置参数），在同一连接的事务内观察未提交状态。
    const watchableOnTx = STUDIO_REVISION_WATCHABLE_SQL.replace(/:'wid'/g, "$1").replace(/:'rid'/g, "$2");
    await db.query("BEGIN");
    try {
      await db.query(`update studio.work_revisions set content = content || '{"tamper":"post-publish"}'::jsonb
                      where revision_id=$1`, [revisionId]);
      const after = await db.query(watchableOnTx, [workId, revisionId]);
      if (after.rows.length !== 0) throw new Error("内容被改动后仍然可读");
      pass("watch_negative_artifact_moved", "修订被改动 → studio 复核立刻拒绝");
    } finally {
      await db.query("rollback");
    }
  } catch (err) {
    await db.query("rollback").catch(() => {});
    fail("watch_readpath", err.message);
  }

  // ---------- Step 9: ST-09 撤回 ----------
  console.log("\n  --- Step 9: ST-09 withdraw_publication ---");
  try {
    const withdrawalId = uuidFrom(`withdrawal:${workId}:${publicationId}`);
    const res = await runAsOperator(db,
      "select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text) as w",
      [withdrawalId, workId, publicationId, OPERATOR, "第三题材撤回路径验证", `st10-withdraw-${workId}`]);
    if (res.pointer_removed !== true) throw new Error("未声明指针移除");

    const ptr = (await db.query(
      `select count(*)::int n from publication.published_pointers where work_id=$1`, [workId])).rows[0].n;
    if (ptr !== 0) throw new Error(`撤回后仍有 ${ptr} 条指针`);
    const kept = (await db.query(
      `select (select count(*)::int from publication.publication_snapshots where work_id=$1) snaps,
              (select count(*)::int from publication.withdrawals where work_id=$1) withdrawals,
              (select count(*)::int from publication.editorial_decisions where work_id=$1) decisions`,
      [workId])).rows[0];
    if (kept.snaps !== 1 || kept.withdrawals !== 1 || kept.decisions !== 1) {
      throw new Error(`历史留痕不完整 snaps=${kept.snaps} withdrawals=${kept.withdrawals} decisions=${kept.decisions}`);
    }
    pass("st09_withdraw", `指针=0，历史快照/核签/撤回各保留 1 条`);

    const republishGuard = await queryRows(STUDIO_REVISION_WATCHABLE_SQL, { wid: workId, rid: revisionId });
    if (republishGuard.length !== 0) throw new Error("撤回后仍判定可消费");
    const published = await queryRows(PUBLISHED_WORKS_SQL);
    if (published.some(w => w.work_id === workId)) throw new Error("撤回后 WATCH 列表仍能读到");
    pass("watch_after_withdraw", "撤回后 WATCH 读路径与当前复核均不再返回该作品");

    // 幂等重放：同 key 撤回不再新增记录
    const replay = await runAsOperator(db,
      "select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text) as w",
      [crypto.randomUUID(), workId, publicationId, OPERATOR, "重放", `st10-withdraw-${workId}`]);
    const wd = (await db.query(`select count(*)::int n from publication.withdrawals where work_id=$1`, [workId])).rows[0].n;
    if (replay.idempotent !== true || wd !== 1) throw new Error(`重放未幂等 idempotent=${replay.idempotent} n=${wd}`);
    pass("st09_withdraw_idempotent", "同 key 重放返回原撤回记录，未新增行");
  } catch (err) {
    fail("st09_withdraw", err.message);
  }

  await reset();
  await db.end();
  report();
}

/** 运营身份独立事务：SET LOCAL ROLE 只在事务内生效。 */
async function runAsOperator(db, sql, params) {
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL ROLE mohen_editorial_operator");
    const res = await db.query(sql, params);
    await db.query("COMMIT");
    return res.rows[0].d ?? res.rows[0].p ?? res.rows[0].w;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  }
}

function report() {
  console.log(`\n${"=".repeat(78)}`);
  console.log("VERIFIED_ISOLATED REPORT —— 第三题材全链（松江府田赋）");
  console.log("=".repeat(78));
  console.log(`\n✅ PASS (${results.PASS.length}):`);
  for (const p of results.PASS) console.log(`   ${p}`);
  if (results.FAIL.length) {
    console.log(`\n❌ FAIL (${results.FAIL.length}):`);
    for (const f of results.FAIL) console.log(`   ${f}`);
  }
  console.log(`\n${results.FAIL.length === 0 ? "✅ VERIFIED_ISOLATED" : "❌ NOT PASS"}`);
  console.log("=".repeat(78));
  process.exit(results.FAIL.length === 0 ? 0 : 1);
}

main().catch((err) => { console.error("FATAL:", err); process.exit(2); });
