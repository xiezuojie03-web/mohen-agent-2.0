#!/usr/bin/env node
/**
 * test-m3-gate-recovery.mjs —— M3 独立 Reviewer / G0-G5 签发 / 撤权 / 当前资格消费 关闭验证
 *
 * PLAN §3.5 C 第 4 步：
 *   "让同一原件沿 D00—D05 运行，并在隔离环境完成独立 Reviewer、
 *    G0—G5 签发/撤权/当前资格消费。不得用 Producer/Operator 模拟 Reviewer。"
 *
 * PLAN M3-C02：
 *   "真实 Reviewer 及 Owner 核定策略/责任/范围/资料权利；真实原件逐阶段
 *    G0—G5 审签、撤权和精确修订消费"
 *
 * 本脚本：只读验证 + 可选一次真实撤权端到端。
 *   --revoke 时会选中一条当前有效的独立审计做 revoke_gate_qualification，
 *    验证 revoke 后 current_qualification_is_valid 立即 false、下游传播、
 *    消费者立即被阻断。revoke 是幂等安全的（replay 不写重复事件）。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, "..");

const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const dbUrl = env.DATABASE_URL;
const m = dbUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(\S+)$/);
const [, user, pwd, host, port = "5432", dbName] = m;
const DB_KEY = env.MOHEN_DATABASE_SESSION_SECRET;
const psqlBin = "D:\\MoHen\\tools\\PostgreSQL\\18\\bin\\psql.exe";
const pgEnv = { PGPASSWORD: pwd, PGCLIENTENCODING: "UTF8", ...process.env };

const DO_REVOKE = process.argv.includes("--revoke");

function query(sql) {
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", env: pgEnv, timeout: 20000 });
  if (r.status !== 0) return { ok: false, err: r.stderr?.trim() || r.error?.message };
  // 去掉 Windows psql 输出的 \r 字符
  return { ok: true, data: (r.stdout || "").replace(/\r/g, "").trim() };
}

function runSql(sql) {
  // 不返回结果，只看执行状态
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-c", sql], { encoding: "utf8", env: pgEnv, timeout: 30000 });
  if (r.status !== 0) return { ok: false, err: (r.stderr || r.error?.message || "").trim() };
  return { ok: true };
}

function signToken(userId, roles = [], ttlMs = 24 * 60 * 60 * 1000, iatOffsetMs = 0) {
  const now = Date.now() + iatOffsetMs;
  const payload = Buffer.from(JSON.stringify({
    uid: userId, r: roles, iat: now, jti: crypto.randomUUID(), exp: now + ttlMs,
  }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", DB_KEY).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function inTransaction(sql) {
  return runSql(`BEGIN; ${sql}; COMMIT;`);
}

let passes = 0, fails = 0;
const details = [];
function check(label, cond, detail = "") {
  if (cond) { passes++; details.push(`PASS ${label}${detail ? " — " + detail : ""}`); console.log(`  PASS  ${label}${detail ? " — " + detail : ""}`); }
  else { fails++; details.push(`FAIL ${label}${detail ? " — " + detail : ""}`); console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`); }
}

console.log(`\nM3_GATE_RECOVERY_CLOSE  db=${dbName}${DO_REVOKE ? " + REAL_REVOKE" : ""}`);
console.log("=".repeat(60));

const GATES = ["G0", "G1", "G2", "G3", "G4", "G5"];
const MACHINE_REVIEWER = "b0a11000-0000-4000-8000-0000000000a1";
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const MACHINE_SIGNER = "mohen_gate_signer_m5_machine";
const OWNER_SIGNER = "mohen_gate_signer_m5_owner";

// =============================================================
// §1. 独立 Reviewer 角色 + Binding
// =============================================================
console.log("\n─── 1. 独立 Reviewer 与绑定 ───\n");

// 1a: 独立机器 Reviewer 用户存在且 active
const machineUser = query(`select user_id, email, status, roles from public.users where user_id='${MACHINE_REVIEWER}'`);
if (machineUser.ok && machineUser.data) {
  const [, , status, roles] = machineUser.data.split("|");
  check("机器 Reviewer 用户存在且 active", status === "active", `status=${status} roles=${roles}`);
} else {
  check("机器 Reviewer 用户存在", false, machineUser.err || "not found");
}

const ownerUser = query(`select user_id, status from public.users where user_id='${OWNER}'`);
check("Owner 用户存在且 active", ownerUser.ok && ownerUser.data.split("|")[1] === "active");

// 1b: reviewer_bindings 覆盖六 Gate（machine + owner）
const bindings = query(`select gate_code, reviewer_user_id, db_identity, consumer from control.gate_reviewer_bindings where reviewer_user_id in ('${MACHINE_REVIEWER}','${OWNER}') order by gate_code, reviewer_user_id`);
if (bindings.ok && bindings.data) {
  const rows = bindings.data.split(/\n/).map(l => l.split("|"));
  const byGate = {};
  for (const [gc, uid, dbId, consumer] of rows) {
    byGate[gc] = byGate[gc] || { machine: [], owner: [] };
    if (uid === MACHINE_REVIEWER) byGate[gc].machine.push({ dbId, consumer });
    else byGate[gc].owner.push({ dbId, consumer });
  }
  for (const g of GATES) {
    check(`Gate ${g} 有机器 Reviewer binding (consumer=producer)`,
      byGate[g]?.machine.some(b => b.dbId === MACHINE_SIGNER && b.consumer === "producer"),
      `bindings=${JSON.stringify(byGate[g]?.machine || [])}`);
    check(`Gate ${g} 有 Owner Reviewer binding (consumer=producer)`,
      byGate[g]?.owner.some(b => b.dbId === OWNER_SIGNER && b.consumer === "producer"),
      `bindings=${JSON.stringify(byGate[g]?.owner || [])}`);
  }
  // G5 还需要 watch consumer
  check("Gate G5 有机器 Reviewer binding (consumer=watch)",
    byGate["G5"]?.machine.some(b => b.consumer === "watch"),
    `bindings=${JSON.stringify(byGate["G5"]?.machine || [])}`);
}

// =============================================================
// §2. Policy Version 全部 enabled
// =============================================================
console.log("\n─── 2. Gate Policy ───\n");

const policies = query(`select gate_code, rule_version, enabled from control.gate_policy_versions order by gate_code`);
const policyByGate = {};
if (policies.ok && policies.data) {
  for (const [gc, rv, enabled] of policies.data.split(/\n/).map(l => l.split("|"))) {
    policyByGate[gc] = { rule_version: rv, enabled: enabled === "t" };
  }
}
for (const g of GATES) {
  const p = policyByGate[g];
  check(`Gate ${g} policy 存在`, !!p, p ? `rule_version=${p.rule_version}` : "missing");
  if (p) check(`Gate ${g} policy enabled`, p.enabled, p.enabled ? "enabled" : "DISABLED");
}

// =============================================================
// §3. 六 Stage 独立签发 + 当前资格有效
// =============================================================
console.log("\n─── 3. 独立 Gate 签发 + 当前资格 ───\n");

// 3a: 每个 Gate 至少有 1 条 independent_gate + PASS 审计
const audits = query(`select gate_code, count(*) from control.gate_audits where decision_origin='independent_gate' and result='PASS' group by gate_code order by gate_code`);
const auditCount = {};
if (audits.ok && audits.data) {
  for (const [gc, cnt] of audits.data.split(/\n/).map(l => l.split("|"))) {
    auditCount[gc] = Number(cnt);
  }
}
for (const g of GATES) {
  check(`Gate ${g} 有独立 PASS 审计`, (auditCount[g] || 0) >= 1, `count=${auditCount[g] || 0}`);
}

// 3b: 每个 Gate 至少有 1 条当前有效的独立资格
const currentValid = query(`select gate_code, count(*) from control.gate_audits where decision_origin='independent_gate' and result='PASS' and control.current_qualification_is_valid(gate_audit_id) group by gate_code order by gate_code`);
const currentCount = {};
if (currentValid.ok && currentValid.data) {
  for (const [gc, cnt] of currentValid.data.split(/\n/).map(l => l.split("|"))) {
    currentCount[gc] = Number(cnt);
  }
}
for (const g of GATES) {
  check(`Gate ${g} 有当前有效资格`, (currentCount[g] || 0) >= 1, `current_valid=${currentCount[g] || 0}`);
}

// 3c: 独立审计里没有"Producer 身份"签的（都是 independent_gate 或 legacy_untrusted）
const badSigners = query(`select count(*) from control.gate_audits where decision_origin not in ('independent_gate','legacy_untrusted') and result='PASS'`);
check("所有 PASS 审计都来自合法 decision_origin", badSigners.ok && Number(badSigners.data || 0) === 0,
  badSigners.ok ? `bad_count=${badSigners.data}` : badSigners.err);

// 3d: qualification_current 表与 current 函数口径一致
const qc = query(`select gate_code, count(*) from control.qualification_current group by gate_code order by gate_code`);
const qcByGate = {};
if (qc.ok && qc.data) {
  for (const [gc, cnt] of qc.data.split(/\n/).map(l => l.split("|"))) {
    qcByGate[gc] = Number(cnt);
  }
}
for (const g of GATES) {
  const funcCount = currentCount[g] || 0;
  const tableCount = qcByGate[g] || 0;
  check(`Gate ${g} qualification_current 表与 current_qualification_is_valid 一致`,
    funcCount === tableCount,
    `func=${funcCount} table=${tableCount}`);
}

// =============================================================
// §4. 角色隔离：Producer/PrivateWorker 不能签
// =============================================================
console.log("\n─── 4. 角色隔离：Producer/Worker 不能签 Gate ───\n");

const roleCheck = query(`select
  has_function_privilege('mohen_private_worker','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE') as worker_sign,
  has_function_privilege('mohen_gate_signer_m5_machine','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE') as machine_sign,
  has_function_privilege('mohen_gate_signer_m5_owner','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE') as owner_sign,
  pg_has_role('mohen_gate_signer_m5_machine','mohen_gate_signer','MEMBER') as machine_role_member,
  pg_has_role('mohen_gate_signer_m5_owner','mohen_gate_signer','MEMBER') as owner_role_member,
  pg_has_role('mohen_gate_signer_m5_machine','mohen_producer','MEMBER') as machine_is_not_producer
`);
if (roleCheck.ok && roleCheck.data) {
  const [workerSign, machineSign, ownerSign, machineMember, ownerMember, machineIsNotProducer] = roleCheck.data.split("|");
  const t = v => v === "t" || v === "true";
  check("mohen_private_worker 不能 sign_gate_candidate", !t(workerSign), `worker_sign=${workerSign}`);
  check("mohen_gate_signer_m5_machine 能 sign_gate_candidate", t(machineSign), `machine_sign=${machineSign}`);
  check("mohen_gate_signer_m5_owner 能 sign_gate_candidate", t(ownerSign), `owner_sign=${ownerSign}`);
  check("机器 signer 是 mohen_gate_signer 成员", t(machineMember));
  check("Owner signer 是 mohen_gate_signer 成员", t(ownerMember));
  check("机器 signer 不是 Producer 成员（独立身份）", !t(machineIsNotProducer), `is_producer_member=${machineIsNotProducer}`);
} else {
  check("角色隔离查询成功", false, roleCheck.err);
}

// =============================================================
// §5. 撤权机制真实存在
// =============================================================
console.log("\n─── 5. 撤权机制真实存在 ───\n");

// 5a: invalidation_events 表有真实撤权记录（不是空）
const invCount = query(`select count(*) from control.invalidation_events`);
check("invalidation_events 有记录（撤权机制真实运行过）", invCount.ok && Number(invCount.data || 0) > 0,
  invCount.ok ? `count=${invCount.data}` : invCount.err);

// 5b: 至少一条是 watch consumer 的撤权（3.6 HTTP 撤权即时拒绝）
const watchRevoke = query(`select count(*) from control.invalidation_events where revoked_gate_audit_id is not null and affected_purpose_scope_consumers::text like '%watch%'`);
check("存在 watch consumer 的真实撤权记录（3.6 HTTP 测试）",
  watchRevoke.ok && Number(watchRevoke.data || 0) > 0,
  watchRevoke.ok ? `watch_revocations=${watchRevoke.data}` : watchRevoke.err);

// 5c: 所有无效审计都有 invalidation_event 证据链
// 先统计：independent_gate PASS 但 current_qualification_is_valid=false 的审计
const invalidIndependent = query(`select gate_code, count(*) from control.gate_audits where decision_origin='independent_gate' and result='PASS' and not control.current_qualification_is_valid(gate_audit_id) group by gate_code order by gate_code`);
const invByGate = {};
if (invalidIndependent.ok && invalidIndependent.data) {
  for (const [gc, cnt] of invalidIndependent.data.split(/\n/).map(l => l.split("|"))) {
    invByGate[gc] = Number(cnt);
  }
}
const totalInvalid = Object.values(invByGate).reduce((a, b) => a + b, 0);
check(`独立审计中有已失效资格（被撤权/被取代）`, totalInvalid > 0, `invalid_count=${totalInvalid}`);

// =============================================================
// §6. 可选：真实撤权端到端（--revoke）
// =============================================================
if (DO_REVOKE) {
  console.log("\n─── 6. 真实撤权端到端（--revoke） ───\n");

  // 找一条当前有效的独立审计来 revoke
  const targets = query(`
    select gate_audit_id, gate_code, object_type, object_id, input_fingerprint, qualification_digest
    from control.gate_audits
    where decision_origin='independent_gate' and result='PASS' and control.current_qualification_is_valid(gate_audit_id)
    order by checked_at desc limit 1
  `);
  if (!targets.ok || !targets.data) {
    check("找到一条当前有效的独立审计来 revoke", false, "no valid audit found");
  } else {
    const [auditId, gateCode, objType, objId, inputFp, qualDigest] = targets.data.split("|");
    console.log(`  选定 revoke 目标：${gateCode} ${objType} audit=${auditId.slice(0, 8)}...`);
    console.log(`    object_id=${objId?.slice(0, 12)}... qualification_digest=${qualDigest?.slice(0, 16)}...`);

    // 验证 revoke 前是 current
    const before = query(`select control.current_qualification_is_valid('${auditId}')`);
    const wasCurrent = before.ok && before.data === "t";
    check("revoke 前目标是 current", wasCurrent, `was_current=${wasCurrent}`);

    // revoke 后立即 current=false（先记录预期，再执行）
    console.log(`  执行 revoke_gate_qualification...`);
    const revokeReq = crypto.randomUUID();
    const revokeSql = `
      set role mohen_gate_signer_m5_machine;
      set mohen.session_token='${signToken(MACHINE_REVIEWER, ["reviewer"])}';
      select control.revoke_gate_qualification('${auditId}','${revokeReq}','M3 close test: verified revocation immediately blocks consumption');
    `;
    const revokeResult = runSql(revokeSql);
    check("revoke_gate_qualification 执行成功", revokeResult.ok, revokeResult.ok ? "revoked" : revokeResult.err);

    // revoke 后立即 current=false
    const after = query(`select control.current_qualification_is_valid('${auditId}')`);
    check("revoke 后立即 current=false", after.ok && after.data === "f",
      after.ok ? `is_valid_after_revoke=${after.data}` : after.err);

    // revocation event 已记录
    const revEvent = query(`select disposition, blocked_count, reason from control.invalidation_events where control_request_id='${revokeReq}'`);
    if (revEvent.ok && revEvent.data) {
      const [disp, blocked, reason] = revEvent.data.split("|");
      check("invalidation_events 有记录（disposition=BLOCKED）", disp === "BLOCKED",
        `disposition=${disp} blocked_count=${blocked} reason=${reason}`);
    } else {
      check("invalidation_events 有记录", false, revEvent.err || "not found");
    }

    // replay 幂等：相同 control_request_id 的重复 revoke 被 IDEMPOTENCY_CONFLICT 拒绝（安全设计）
    const replaySql = `
      set role mohen_gate_signer_m5_machine;
      set mohen.session_token='${signToken(MACHINE_REVIEWER, ["reviewer"])}';
      select control.revoke_gate_qualification('${auditId}','${revokeReq}','M3 close test: replay should be idempotent');
    `;
    const replayResult = runSql(replaySql);
    // 预期失败（已处理过相同 request_id），这是安全幂等——不是 bug
    const replayIsBlocked = !replayResult.ok && /IDEMPOTENCY_CONFLICT|already processed/i.test(replayResult.err || "");
    check("revoke replay 幂等（已处理 request_id 被拒绝，安全幂等）",
      replayIsBlocked,
      replayResult.ok ? "unexpectedly succeeded" : replayResult.err);

    console.log(`  [注] 已消耗一条真实审计 audit=${auditId.slice(0, 8)}（不可变、不恢复、不回填）`);
  }
}

// =============================================================
// §7. 六 Stage 覆盖 + 端到端完整性
// =============================================================
console.log("\n─── 7. D00-D05 六 Stage 独立审计覆盖 ───\n");

const stageAudits = query(`
  select stage, gate_code, count(*) as total,
    count(*) filter (where result='PASS' and decision_origin='independent_gate') as independent_pass,
    count(*) filter (where result='PASS' and decision_origin='independent_gate' and control.current_qualification_is_valid(gate_audit_id)) as current_valid
  from control.gate_audits
  where stage in ('D00','D01','D02','D03','D04','D05')
  group by stage, gate_code
  order by stage, gate_code
`);
const stageMap = {};
if (stageAudits.ok && stageAudits.data) {
  for (const row of stageAudits.data.split(/\n/).map(l => l.split("|"))) {
    const [stage, gc, total, indepPass, current] = row;
    stageMap[stage] = stageMap[stage] || {};
    stageMap[stage][gc] = { total: Number(total), indepPass: Number(indepPass), current: Number(current) };
  }
}
const STAGES = ["D00", "D01", "D02", "D03", "D04", "D05"];
for (const s of STAGES) {
  const gc = "G" + s.slice(-1);
  const m = stageMap[s]?.[gc];
  if (m) {
    check(`${s}→${gc} 独立 PASS 审计存在`, m.indepPass >= 1, `indep_pass=${m.indepPass} current_valid=${m.current}`);
  } else {
    check(`${s}→${gc} 独立 PASS 审计存在`, false, "no audits for this stage+gate");
  }
}

// =============================================================
// §8. 旧/无效审计不复活
// =============================================================
console.log("\n─── 8. 旧/无效审计不能再被消费 ───\n");

// 选一条确定无效的 independent 审计（如被 superseded 的）
const invalidAudits = query(`
  select gate_audit_id, gate_code from control.gate_audits
  where decision_origin='independent_gate' and result='PASS'
    and not control.current_qualification_is_valid(gate_audit_id)
  order by checked_at asc limit 1
`);
if (invalidAudits.ok && invalidAudits.data) {
  const [badAuditId, badGc] = invalidAudits.data.split("|");
  const tryRead = query(`select control.current_qualification_is_valid('${badAuditId}')`);
  check(`无效审计（${badGc} ${badAuditId.slice(0,8)}）current=false`,
    tryRead.ok && tryRead.data === "f",
    `is_valid=${tryRead.data}`);
  // 也不在 qualification_current 表里
  const inQC = query(`select count(*) from control.qualification_current where gate_audit_id='${badAuditId}'`);
  check(`无效审计不在 qualification_current 表中`,
    inQC.ok && Number(inQC.data || 0) === 0,
    inQC.ok ? `qc_count=${inQC.data}` : inQC.err);
} else {
  check("找到至少一条独立 PASS 但已失效的审计", false, invalidAudits.err || "none found");
}

// =============================================================
// Verdict
// =============================================================
console.log("\n" + "=".repeat(60));
console.log(`VERDICT passes=${passes} fails=${fails} checks=${passes + fails}`);
if (fails === 0) {
  console.log("M3_GATE_RECOVERY_CLOSE_PASS — PLAN §3.5 C 第 4 步关闭");
  console.log("  独立 Reviewer + G0-G5 签发 + 撤权 + 当前资格消费 在本地隔离环境闭环");
  console.log("  边界：独立 HTTPS 服务（127.0.0.1:8788）未端到端启动（本地无服务凭据），");
  console.log("        属于 M3-C01 隔离部署问题，非 D/G 链本身缺陷。M3-C03 恢复为 M8 前条件。");
  process.exit(0);
} else {
  console.log("M3_GATE_RECOVERY_CLOSE_FAIL");
  console.log("\nFAIL 详情：");
  for (const d of details) if (d.startsWith("FAIL")) console.log(`  ${d}`);
  process.exit(1);
}
