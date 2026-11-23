// 隔离库内：按当前时刻逐级重签 G0→G5 当前有效资格（同一作品链）。
// 复用历史 CONSUMED 候选的精确字段；dependency_snapshot 的 audit_id/digest 替换为新签上游真实值。
// 不改旧 audit、不复用历史 PASS；清理的是草稿态 SUBMITTED 候选（非不可变审计）。
// 安全围栏：仅允许 loopback 且库名含 dev/isolat/test 的隔离库，拒绝生产/云端目标。
// 用法：node scripts/reissue-m5-gate-chain-isolation.mjs（读 .env.local 的 DATABASE_URL）。
// 幂等：已有当前有效 audit 的对象自动跳过；资格有效期 6 天，过期后可重跑。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";

const require = createRequire(import.meta.url);
const { randomUUID } = require("node:crypto");
const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2]; }
process.env.DATABASE_URL = env.DATABASE_URL;

const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = require("node:crypto").createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}
const MACHINE_TOKEN = mintSessionToken(MACHINE_SIGNER_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET);
// 安全围栏：只在本机隔离库运行，拒绝生产/云端目标。
{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  const isolated = /dev|isolat|test/.test(name);
  if (!loopback || !isolated) {
    throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}（仅允许 loopback 且库名含 dev/isolat/test）`);
  }
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}
const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();

const decideGate = async (decision) => {
  await db.query("begin");
  try {
    await db.query("set role mohen_gate_signer_m5_machine");
    await db.query(`SET mohen.session_token = '${MACHINE_TOKEN}'`);
    const res = await db.query(
      `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
      [decision.candidateId, decision.requestId, decision.result,
       decision.ruleVersion, decision.validUntil,
       JSON.stringify(decision.receipt), decision.expectedAuditId]);
    await db.query("commit");
    await db.query("reset role");
    return res.rows[0].gate_audit_id;
  } catch (err) {
    try { await db.query("rollback"); } catch {}
    try { await db.query("reset role"); } catch {}
    throw err;
  }
};
const reviewer = createRuleGateReviewer({ query: queryRows, decide: decideGate, projectId: PROJECT_ID,
  log: (l) => console.log(`    ${l}`) });

const VALID_UNTIL = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

// 逐级：gate, object_id, 该对象历史候选 gate_code(用来取字段), 上游 gate（G0 无上游）
// 现行合同 purpose（历史候选的旧 purpose 已不匹配评审器，按当前 gate-contracts v3 覆盖）
const PURPOSE_BY_GATE = {
  G3: { ns: "world", code: "explain_bounded", ver: "v1" },
  G4: { ns: "G4.interpretation.v1", code: "BE", ver: "v1" },
};
const LEVELS = [
  { gate: "G0", objectId: "b0a11000-0000-4000-8000-000000000005", upstream: null },
  { gate: "G1", objectId: "ff227f15-b9b5-c37f-b309-52ad6120b5dc", upstream: "G0" },
  { gate: "G2", objectId: "0c9c3a44-1b2e-1cd7-2a86-5c4009cd7402", upstream: "G1" },
  { gate: "G3", objectId: "54c21e1a-adab-4663-eceb-fa4aa9cea753", upstream: "G2" },
  { gate: "G4", objectId: "b31f534e-33eb-5b80-3034-e6ecde9e2b20", upstream: "G3" },
  { gate: "G5", objectId: "0c69d986-af38-e597-d892-b9f8585828d7", upstream: "G4" },
  { gate: "G5", objectId: "a228d400-f9bf-a831-bb39-0ed4531742e1", upstream: "G4" },
  { gate: "G5", objectId: "4d5e0488-3c80-f9e3-70b3-17c534705fcd", upstream: "G4" },
  { gate: "G5", objectId: "01719b9f-b955-843c-f594-8ae8d0cefb75", upstream: "G4" },
];

// 新签 audit 缓存：gate -> [audit row]
const signedByGate = {};

async function clearSubmittedForGate(gate) {
  const r = await db.query(
    `delete from control.gate_candidates where gate_code=$1 and candidate_status='SUBMITTED' returning candidate_id`, [gate]);
  if (r.rowCount) console.log(`  CLEARED_SUBMITTED ${gate} count=${r.rowCount}`);
}

async function reissueLevel(level) {
  const { gate, objectId, upstream } = level;
  console.log(`\n=== REISSUE ${gate} ${objectId.slice(0,8)} (upstream ${upstream}) ===`);
  // 1. 取该对象历史 CONSUMED 候选
  const old = await db.query(
    `select run_id, stage, object_type, artifact_revision, purpose_namespace, purpose_code, purpose_version,
            allowed_scope, consumer, dependency_snapshot, evidence_refs, input_fingerprint, producer_identity
      from control.gate_candidates
      where gate_code=$1 and object_id=$2 and candidate_status='CONSUMED'
      order by submitted_at desc limit 1`, [gate, objectId]);
  if (!old.rows.length) throw new Error(`NO_CONSUMED_CANDIDATE:${gate}:${objectId}`);
  const c = old.rows[0];

  // 2. 构造 dependency_snapshot：按上游 gate 找一条当前有效的新签 audit
  let deps = [];
  if (upstream) {
    const audits = signedByGate[upstream] || [];
    if (!audits.length) throw new Error(`NO_SIGNED_UPSTREAM:${upstream}`);
    // 取第一条当前有效上游 audit，按其真实字段构造依赖
    const up = audits[0];
    deps = [{
      gate_code: up.gate_code, stage: up.stage, object_type: up.object_type, object_id: up.object_id,
      gate_audit_id: up.gate_audit_id, artifact_revision: up.artifact_revision,
      qualification_digest: up.qualification_digest,
    }];
  }

  // 3. 清空该 gate 的 SUBMITTED 草稿候选（避免评审器误签）
  await clearSubmittedForGate(gate);

  // 4. 提交新候选（purpose 按现行合同覆盖）
  const pur = PURPOSE_BY_GATE[gate];
  const ns = pur ? pur.ns : c.purpose_namespace;
  const code = pur ? pur.code : c.purpose_code;
  const ver = pur ? pur.ver : c.purpose_version;
  // director_plan 的历史 revision 由旧逻辑产生、无法重现；用现行函数实时算权威 revision。
  let artifactRev = c.artifact_revision;
  if (gate === "G5" && c.object_type === "director_plan") {
    const rr = await db.query(`select control.artifact_revision_for('director_plan',$1::uuid) rev`, [objectId]);
    if (!rr.rows[0]?.rev) throw new Error(`DP_REVISION_UNAVAILABLE:${objectId}`);
    artifactRev = rr.rows[0].rev;
    console.log(`  DP_REV_RECOMPUTED old=${String(c.artifact_revision).slice(0,12)} new=${artifactRev.slice(0,12)}`);
  }
  const candidateId = randomUUID();
  await db.query(
    `insert into control.gate_candidates(
       candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
       purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
       dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
     values ($1::uuid,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14::jsonb,$15,now(),$16,'SUBMITTED')`,
    [candidateId, c.run_id, c.stage, gate, c.object_type, objectId, artifactRev,
     ns, code, ver, JSON.stringify(c.allowed_scope), c.consumer,
     JSON.stringify(deps), JSON.stringify(c.evidence_refs), c.input_fingerprint, c.producer_identity]
  );
  console.log(`  CANDIDATE_SUBMITTED ${candidateId}`);

  // 5. dryRun → 签发
  const dry = await reviewer.review({ gate, dryRun: true });
  console.log(`  DRYRUN ${dry.status} failed=${JSON.stringify(dry.failed || [])}`);
  if (dry.status !== "DRY_RUN_PASS") throw new Error(`DRYRUN_FAIL:${gate}:${JSON.stringify(dry.failed || [])}`);
  const signed = await reviewer.review({ gate, dryRun: false });
  console.log(`  SIGNED ${signed.status} audit=${signed.auditId} failed=${JSON.stringify(signed.failed || [])}`);
  if (signed.status !== "PASS") throw new Error(`SIGN_FAIL:${gate}:${JSON.stringify(signed.failed || [])}`);

  // 6. 读新 audit 真实字段，缓存给下一级
  const a = await db.query(
    `select gate_audit_id, gate_code, stage, object_type, object_id, artifact_revision,
            qualification_digest, valid_until, current_valid
      from control.gate_audits where gate_audit_id=$1::uuid`, [signed.auditId]);
  signedByGate[gate] = signedByGate[gate] || [];
  signedByGate[gate].push(a.rows[0]);
  console.log(`  AUDIT_OK ${signed.auditId} valid_until=${a.rows[0].valid_until}`);
}

let exitCode = 0;
try {
  // 先检查各 gate 是否已有当前有效 audit（幂等：有则跳过重签）
  for (const lv of LEVELS) {
    const cur = await db.query(
      `select gate_audit_id, artifact_revision, qualification_digest, gate_code, stage, object_type, object_id, valid_until
        from control.gate_audits
        where gate_code=$1 and object_id=$2 and result='PASS' and current_valid
          and (valid_until is null or valid_until>now())
        order by signed_at desc limit 1`, [lv.gate, lv.objectId]);
    if (cur.rows.length) {
      signedByGate[lv.gate] = signedByGate[lv.gate] || [];
      signedByGate[lv.gate].push(cur.rows[0]);
      console.log(`SKIP_VALID ${lv.gate} ${lv.objectId.slice(0,8)} audit=${cur.rows[0].gate_audit_id}`);
    }
  }
  for (const lv of LEVELS) {
    const cached = (signedByGate[lv.gate] || []).some(a => a.object_id === lv.objectId);
    if (!cached) await reissueLevel(lv);
  }
  console.log("\n=== RESULT ===");
  for (const g of Object.keys(signedByGate)) {
    for (const a of signedByGate[g]) console.log(`${g} audit=${a.gate_audit_id} valid_until=${a.valid_until}`);
  }
} catch (err) {
  exitCode = 1;
  console.error(`CHAIN_REISSUE_ERROR ${err.message}`);
} finally {
  await db.end();
}
process.exit(exitCode);
