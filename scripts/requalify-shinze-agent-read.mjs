#!/usr/bin/env node
/**
 * M5 段2「定向核验」落地（金泽项目 a2b0cf23）：为已合格的链对象补签 agent 消费用途
 * （mohen.research/agent_read/1）资格审计，使统一检索（studio-research L5 读模型 +
 * retrieve-formal L0-L4 桥）能按 qualification_allows 找到当前合格材料。
 *
 * 依据：knowledge_route QUALIFICATION_REQUIRED 的设计正道是「先定向核验，不重新获取」。
 * 既有链对象已有 producer 用途的当前有效审计（run 21d9603f，11-30 到期）；
 * 本脚本只对同一对象、同一 artifact_revision 补签 agent 用途资格：
 *   - G2 material_evidence 0df18664（L2 层：方志逐字证据）
 *   - G5 world_projection  4dd2a3f3（L5 层：金泽事实投影）
 * 依赖快照逐字指向 producer 用途上游审计（loadUpstream 强制 producer 上游）。
 *
 * 不改检查逻辑：候选经 rule-gate-reviewer（consumer='agent' 参数化加载）完整
 * 确定性检查（权利/摘要/绑定），机器签发者 mohen_gate_signer_m5_machine 签发，非自签。
 * G3/G4 有用途白名单（world/*、G4.interpretation.v1/*）、L0/L1/L3 有对象类型错配
 * （source_version/read_unit/claim_revision ≠ source/read_run/relation_claim），
 * 属设计层缺口，本批不硬改，如实记录。
 *
 * 安全围栏：仅 loopback 隔离库；幂等（已有当前有效 agent 审计则跳过）；不碰生产/RLS。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";

const { randomUUID } = crypto;
const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && m[2] !== "") env[m[1]] = m[2]; }
process.env.DATABASE_URL = env.DATABASE_URL;

{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  if (!["127.0.0.1", "localhost", "::1"].includes(host) || !/dev|isolat|test/.test(name))
    throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const PROJECT_ID = "a2b0cf23-edba-42ec-8c44-0911eb52855e";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const PURPOSE = { ns: "mohen.research", code: "agent_read", ver: "1" };

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}
const secret = env.MOHEN_DATABASE_SESSION_SECRET;
if (typeof secret !== "string" || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
const MACHINE_TOKEN = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
const decideGate = async (decision) => {
  await db.query("begin");
  try {
    await db.query("set role mohen_gate_signer_m5_machine");
    await db.query(`SET mohen.session_token = '${MACHINE_TOKEN}'`);
    const res = await db.query(`select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
      [decision.candidateId, decision.requestId, decision.result, decision.ruleVersion, decision.validUntil,
       JSON.stringify(decision.receipt), decision.expectedAuditId]);
    await db.query("commit"); await db.query("reset role");
    return res.rows[0].gate_audit_id;
  } catch (err) {
    try { await db.query("rollback"); } catch {}
    try { await db.query("reset role"); } catch {}
    throw err;
  }
};
const reviewer = createRuleGateReviewer({
  query: queryRows, decide: decideGate, projectId: PROJECT_ID, consumer: "agent",
  log: (l) => console.log(`    ${l}`),
});

// 对象与上游（金泽链 run 21d9603f，当前有效 producer 审计已核实）
const LEVELS = [
  { gate: "G2", object_type: "material_evidence", object_id: "0df18664-7578-edc1-1efd-6198bb0aef28", upstream_gate: "G1" },
  { gate: "G5", object_type: "world_projection", object_id: "4dd2a3f3-e396-1c67-8088-a94282216809", upstream_gate: "G4" },
];

const results = { pass: [], fail: [], skip: [] };
const pass = (k, d) => { results.pass.push(k); console.log(`  PASS ${k}${d ? ` -- ${d}` : ""}`); };
const fail = (k, d) => { results.fail.push(k); console.log(`  FAIL ${k}${d ? ` -- ${d}` : ""}`); };

async function currentAgentAudit(gate, object_id) {
  const r = await db.query(
    `select gate_audit_id, valid_until::text from control.gate_audits
      where gate_code=$1 and object_id=$2::uuid and result='PASS' and current_valid
        and (valid_until is null or valid_until>now())
        and consumer='agent' and purpose_namespace=$3 and purpose_code=$4 and purpose_version=$5
      order by signed_at desc limit 1`,
    [gate, object_id, PURPOSE.ns, PURPOSE.code, PURPOSE.ver]);
  return r.rows[0] || null;
}

async function currentProducerAudit(gate, object_type, object_id) {
  const r = await db.query(
    `select gate_audit_id, gate_code, stage, object_type, object_id::text as object_id,
            artifact_revision, qualification_digest
      from control.gate_audits
      where gate_code=$1 and object_type=$2 and object_id=$3::uuid and result='PASS'
        and current_valid and (valid_until is null or valid_until>now())
      order by signed_at desc limit 1`,
    [gate, object_type, object_id]);
  return r.rows[0] || null;
}

try {
  // 0) 机器签发者的 agent 用途评审绑定（provision 模式，幂等）：
  //    sign_gate_candidate 要求签发者对 (gate, purpose, consumer, scope) 有当前有效绑定。
  {
    const need = ["G2", "G5"];
    const existing = (await db.query(
      `select gate_code from control.gate_reviewer_bindings
        where reviewer_user_id=$1::uuid and db_identity='mohen_gate_signer_m5_machine'
          and purpose_namespace=$2 and purpose_code=$3 and purpose_version=$4 and consumer='agent'
          and active and now()>=valid_from and now()<valid_until`, [MACHINE_SIGNER_USER_ID, PURPOSE.ns, PURPOSE.code, PURPOSE.ver])).rows.map((r) => r.gate_code);
    for (const gate of need.filter((g) => !existing.includes(g))) {
      await db.query(
        `insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,
           purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref,active)
         values ($1::uuid,'mohen_gate_signer_m5_machine',$2,$3,$4,$5,'agent',$6::jsonb,
           now(),now()+interval '30 days',$7,true)`,
        [MACHINE_SIGNER_USER_ID, gate, PURPOSE.ns, PURPOSE.code, PURPOSE.ver,
         JSON.stringify({ requested_action: "read", project_id: PROJECT_ID }),
         "m5.shinze-agent-read.requalification.2026-11-25"]);
      console.log(`  BINDING_DECLARED ${gate} agent/${PURPOSE.ns}/${PURPOSE.code} scope=read+金泽项目`);
    }
    if (existing.length) console.log(`  BINDING_EXISTS ${existing.join(",")}`);
  }

  for (const lv of LEVELS) {
    console.log(`\n=== REQUALIFY ${lv.gate} ${lv.object_type} ${lv.object_id.slice(0, 8)} ===`);
    const existingAgent = await currentAgentAudit(lv.gate, lv.object_id);
    if (existingAgent) {
      results.skip.push(`${lv.gate}:${lv.object_id.slice(0, 8)}`);
      console.log(`  SKIP 已有当前有效 agent 审计 ${existingAgent.gate_audit_id} 至 ${existingAgent.valid_until}`);
      continue;
    }

    // 历史候选字段（同一对象的 producer CONSUMED 候选）
    const old = (await db.query(
      `select run_id, stage, object_type, artifact_revision, evidence_refs, input_fingerprint, producer_identity
        from control.gate_candidates
        where gate_code=$1 and object_id=$2::uuid and candidate_status='CONSUMED'
        order by submitted_at desc limit 1`, [lv.gate, lv.object_id])).rows[0];
    if (!old) { fail(`${lv.gate}:no_consumed_candidate`, "无历史 CONSUMED 候选可复用字段"); continue; }

    // 上游 producer 审计（按上游 gate 的对象查链上当前有效审计）
    // G2 上游 = G1 read_unit 55144a55；G5 上游 = G4 finding e1b13de5（金泽链实测对象）。
    const upstreamObjects = { G1: ["read_unit", "55144a55-b8f9-a7e3-71df-9ea375236f37"], G4: ["finding", "e1b13de5-b517-cb6b-566d-a0f439201ad3"] };
    const [upType, upId] = upstreamObjects[lv.upstream_gate];
    const upAudit = await currentProducerAudit(lv.upstream_gate, upType, upId);
    if (!upAudit) { fail(`${lv.gate}:no_current_upstream`, `${lv.upstream_gate} 无当前有效 producer 审计`); continue; }
    const deps = [{
      gate_code: upAudit.gate_code, stage: upAudit.stage, object_type: upAudit.object_type,
      object_id: upAudit.object_id, gate_audit_id: upAudit.gate_audit_id,
      artifact_revision: upAudit.artifact_revision, qualification_digest: upAudit.qualification_digest,
    }];

    // 清理本对象残留的 agent SUBMITTED 草稿（幂等重试）
    const cleared = await db.query(
      `delete from control.gate_candidates
        where gate_code=$1 and object_id=$2::uuid and consumer='agent' and candidate_status='SUBMITTED'
        returning candidate_id`, [lv.gate, lv.object_id]);
    if (cleared.rowCount) console.log(`  CLEARED_STALE agent SUBMITTED x${cleared.rowCount}`);

    // 提交 agent 用途候选（同一对象/同一 revision/同一 run）
    const candidateId = randomUUID();
    await db.query(
      `insert into control.gate_candidates(
         candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
         purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
         dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
       values ($1::uuid,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14::jsonb,$15,now(),$16,'SUBMITTED')`,
      [candidateId, old.run_id, old.stage, lv.gate, old.object_type, lv.object_id, old.artifact_revision,
       PURPOSE.ns, PURPOSE.code, PURPOSE.ver,
       JSON.stringify({ requested_action: "read", project_id: PROJECT_ID }), "agent",
       JSON.stringify(deps), JSON.stringify(old.evidence_refs), old.input_fingerprint, old.producer_identity]);
    console.log(`  CANDIDATE_SUBMITTED ${candidateId} purpose=${PURPOSE.ns}/${PURPOSE.code}`);

    // dry-run 完整确定性检查
    const dry = await reviewer.review({ gate: lv.gate, dryRun: true });
    if (dry.status !== "DRY_RUN_PASS") {
      fail(`${lv.gate}:dryrun`, JSON.stringify(dry.failed || dry.status));
      continue;
    }
    console.log(`  DRYRUN_PASS checks=${Object.keys(dry.checks || {}).join(",")}`);
    const signed = await reviewer.review({ gate: lv.gate, dryRun: false });
    if (signed.status !== "PASS") { fail(`${lv.gate}:sign`, JSON.stringify(signed.failed || signed.status)); continue; }
    const a = (await db.query(`select valid_until::text from control.gate_audits where gate_audit_id=$1::uuid`, [signed.auditId])).rows[0];
    pass(`${lv.gate}:agent_read_signed`, `audit=${signed.auditId} 至 ${a?.valid_until}`);
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`REQUALIFY REPORT: ${results.pass.length} PASS / ${results.fail.length} FAIL / ${results.skip.length} SKIP`);
  results.fail.forEach((f) => console.log(`  FAIL ${f}`));
  console.log(`${"=".repeat(70)}`);
  process.exit(results.fail.length ? 1 : 0);
} finally {
  await db.end();
}