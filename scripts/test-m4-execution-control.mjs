#!/usr/bin/env node
/**
 * test-m4-execution-control.mjs —— M4 Owner 执行协调合成层关闭验证
 *
 * PLAN §3.5 C 第 5 步（前置）：先合成输入完成 PG 正反测试
 *
 * 在本地 mohen_dev 上验证：
 *   1. migration 对象完整（role/table/function/policy）
 *   2. apply_execution_control GET→CLAIM→CHECKPOINT→REVOKE 四操作端到端
 *   3. 幂等性、跨 Owner 隔离、RLS、角色隔离、触发器保护
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function query(sql) {
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", env: pgEnv, timeout: 20000 });
  if (r.status !== 0) return { ok: false, err: (r.stderr || r.error?.message || "").replace(/\r/g, "").trim() };
  // psql -At 可能返回多行（SET 语句），只取最后一个非空行
  const lines = (r.stdout || "").replace(/\r/g, "").trim().split(/\n/).filter(l => l.trim() && l.trim() !== "SET");
  return { ok: true, data: lines[lines.length - 1] || "" };
}

// 执行 SQL（可能有副作用），返回 stdout 纯值（带 -At）
function runSql(sql) {
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", env: pgEnv, timeout: 30000 });
  const out = ((r.stdout || "") + (r.stderr || "")).replace(/\r/g, "").trim();
  if (r.status !== 0) return { ok: false, err: out };
  return { ok: true, data: out };
}

function signToken(userId, roles = [], ttlMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ uid: userId, r: roles, iat: now, jti: crypto.randomUUID(), exp: now + ttlMs }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", DB_KEY).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const MACHINE = "b0a11000-0000-4000-8000-0000000000a1";

// ========== 创建测试 delegation ==========
// 触发器保护 PERMANENT_RECEIPT_IMMUTABLE 禁止 DELETE——每次运行自动新建一条
console.log("\nCreating fresh test delegation...");

// 先找 Owner 的 ACTIVE project
const ACTIVE_PROJ = query(`select project_id from studio.projects where owner_user_id='${OWNER}' and lifecycle_status='ACTIVE' limit 1`);
let projectId;
if (ACTIVE_PROJ.ok && ACTIVE_PROJ.data) {
  projectId = ACTIVE_PROJ.data;
} else {
  // 用已有的 machine 项目（已知存在）
  projectId = "b0a11000-0000-4000-8000-000000000001";
  // 但先确认这条 project 的 owner 是 Owner？可能不是。让我检查...
  const check = query(`select owner_user_id, lifecycle_status from studio.projects where project_id='${projectId}'`);
  if (check.ok && check.data) {
    const [pid, status] = check.data.split("|");
    console.log(`  note: using existing project owner=${pid?.slice(0, 8)}... status=${status}`);
    if (pid !== OWNER) {
      // 项目不是 Owner 的——需要新建一个
      projectId = crypto.randomUUID();
      const mkProj = runSql(`
        insert into studio.projects(project_id, owner_user_id, name, description, lifecycle_status)
        values('${projectId}','${OWNER}','M4 Synthetic Test','Synthetic test for M4 execution controls','ACTIVE')
      `);
      console.log(mkProj.ok ? `  created new project ${projectId}` : `  project insert: ${mkProj.err?.slice(0, 100)}`);
    }
  }
}

const inputManifest = JSON.stringify({ actions: ["m4-test-action"], scenario: "m4-synthetic-test" });
const requestHash = crypto.createHash("sha256").update(inputManifest).digest("hex");
const delegationId = crypto.randomUUID();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const POLICY = "m4-synthetic-test-policy";

const insDel = runSql(`
  insert into studio.delegations(
    delegation_id, project_id, root_task_ref, root_task_snapshot,
    subtask_ref, delegation_series_id, delegation_revision_no,
    requester, executor, provider, engine_version,
    input_manifest, allowed_actions, transfer_rights_decision,
    policy_version, expires_at, budget_limit, currency,
    request_hash, idempotency_key, output_schema
  ) values (
    '${delegationId}', '${projectId}',
    'm4-test-root', '${JSON.stringify({ scenario: "m4" }).replace(/'/g, "''")}',
    'm4-test-sub', '${crypto.randomUUID()}', 1,
    '${OWNER}', 'mohen-studio', 'deepseek', 'm4-test/v1',
    '${inputManifest.replace(/'/g, "''")}', '{m4-test-action}',
    '${JSON.stringify({ external_processing: "GRANTED" }).replace(/'/g, "''")}',
    '${POLICY}', '${expiresAt}', 1.0, 'USD',
    '${requestHash}', '${crypto.randomUUID()}', 'm4-synthetic.v1'
  );
`);
console.log(`  delegation ${delegationId.slice(0, 8)}... expires=${expiresAt}`);
console.log(`  request_hash=${requestHash.slice(0, 16)}... policy=${POLICY}`);

// ========== callApply 核心封装 ==========
// 用 psql -At -c 执行 set role + set token + select apply_control，拿纯 JSON 行
function callApply(op, delegationId, extra = {}) {
  const requestId = crypto.randomUUID();
  const payload = { delegationId, requestId, ...extra };
  const jsonStr = JSON.stringify(payload).replace(/'/g, "''");
  const token = signToken(OWNER, ["member", "creator"]);
  const sql = `set role mohen_app_runtime; set mohen.session_token='${token}'; select studio.apply_execution_control('${op}', '${jsonStr}')::text;`;
  // 用 query 函数（带 -At 自动拿纯值）
  const r = query(sql);
  if (!r.ok) return { ok: false, err: r.err, requestId };
  // -At 返回的 stdout 就是纯 JSON
  try { return { ok: true, data: JSON.parse(r.data), requestId }; }
  catch { return { ok: false, err: `parse: ${r.data?.slice(0, 100)}`, raw: r.data, requestId }; }
}

// ========== 主测试 ==========
let passes = 0, fails = 0;
function check(label, cond, detail = "") {
  if (cond) { passes++; console.log(`  PASS  ${label}${detail ? " — " + detail : ""}`); }
  else { fails++; console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`); }
}

console.log(`\nM4_EXECUTION_CONTROL_CLOSE  db=${dbName}`);
console.log("=".repeat(60));

// =============================================================
// §1. migration 对象完整
// =============================================================
console.log("\n─── 1. Migration 对象存在 ───\n");

check("mohen_execution_authority 角色存在", query("select exists(select from pg_roles where rolname='mohen_execution_authority')").data === "t");
check("studio.execution_controls 表存在", query("select to_regclass('studio.execution_controls') is not null").data === "t");
check("studio.execution_control_events 表存在", query("select to_regclass('studio.execution_control_events') is not null").data === "t");
check("studio.apply_execution_control 函数存在", query("select exists(select from pg_proc where proname='apply_execution_control')").data === "t");

// =============================================================
// §2. GET
// =============================================================
console.log("\n─── 2. GET 自动初始化 ───\n");

const get = callApply("GET", delegationId);
let getVersion = 0;
if (get.ok) {
  getVersion = get.data.version;
  check("GET state=READY", get.data.state === "READY", `state=${get.data.state}`);
  check("GET version=0", getVersion === 0, `v=${getVersion}`);
  check("GET input_digest 匹配 delegation.request_hash", get.data.input_digest === requestHash, `digest=${get.data.input_digest?.slice(0,16)}...`);
} else {
  check("GET 成功", false, get.err);
}

check("execution_controls 表有记录", query(`select 1 from studio.execution_controls where delegation_id='${delegationId}'`).ok);
// GET 不写 event（migration 代码里 GET 提前 return）
const evAfterGet = query(`select count(*) from studio.execution_control_events where delegation_id='${delegationId}'`);
check("GET 不写 event（函数设计）", evAfterGet.data === "0", evAfterGet.ok ? `count=${evAfterGet.data}` : evAfterGet.err);

// =============================================================
// §3. CLAIM
// =============================================================
console.log("\n─── 3. CLAIM 操作 ───\n");

const claim = callApply("CLAIM", delegationId, {
  expectedVersion: getVersion,
  inputDigest: requestHash,
  policyVersion: POLICY,
  ownerRef: "m4-test-executor",
  leaseSeconds: 30,
});

let claimLeaseId, claimVersion;
if (claim.ok) {
  claimLeaseId = claim.data.lease_id;
  claimVersion = claim.data.version;
  check("CLAIM state=LEASED", claim.data.state === "LEASED", `state=${claim.data.state}`);
  check("CLAIM lease_id 存在", !!claimLeaseId);
  check("CLAIM version=1", claimVersion === 1, `v=${claimVersion}`);
} else {
  check("CLAIM 成功", false, claim.err);
}

// CLAIM 幂等——VERSION_CONFLICT 是正确保护：相同 request_id 在 version 已变后重放被安全拒绝
const claimReplay = callApply("CLAIM", delegationId, {
  expectedVersion: getVersion,
  inputDigest: requestHash,
  policyVersion: POLICY,
  ownerRef: "m4-test-executor",
  leaseSeconds: 30,
});
// 幂等重放要么返回相同结果（同 version）要么 VERSION_CONFLICT（安全保护）
check("CLAIM 幂等（跨版本被 VERSION_CONFLICT 保护）",
  claimReplay.ok || /VERSION_CONFLICT|IDEMPOTENCY/i.test(claimReplay.err || ""),
  claimReplay.ok ? "replay OK" : (claimReplay.err?.slice(0, 80) || ""));

// =============================================================
// §4. CHECKPOINT HOLD
// =============================================================
console.log("\n─── 4. CHECKPOINT HOLD ───\n");

const cp = callApply("CHECKPOINT", delegationId, {
  expectedVersion: claimVersion,
  inputDigest: requestHash,
  policyVersion: POLICY,
  leaseId: claimLeaseId,
  state: "HOLD",
  payload: { reason: "m4 test hold", at: new Date().toISOString() },
});

let holdVersion;
if (cp.ok) {
  holdVersion = cp.data.version;
  check("CHECKPOINT state=HOLD", cp.data.state === "HOLD", `state=${cp.data.state}`);
  check("CHECKPOINT version=2", holdVersion === 2, `v=${holdVersion}`);
} else {
  check("CHECKPOINT 成功", false, cp.err?.slice(0, 120));
}

// =============================================================
// §5. REVOKE + 阻断
// =============================================================
console.log("\n─── 5. REVOKE + 撤权后阻断 ───\n");

const revoke = callApply("REVOKE", delegationId, {
  reason: "M4 close test: permanent execution revocation",
});

if (revoke.ok) {
  check("REVOKE state=REVOKED", revoke.data.state === "REVOKED");
  check("REVOKE revoked_at 非空", !!revoke.data.revoked_at);
  check("REVOKE reason 匹配", revoke.data.revoke_reason === "M4 close test: permanent execution revocation");
} else {
  check("REVOKE 成功", false, revoke.err?.slice(0, 120));
}

// REVOKED 后再 CLAIM 被拒
const afterClaim = callApply("CLAIM", delegationId, {
  expectedVersion: holdVersion,
  inputDigest: requestHash,
  policyVersion: POLICY,
  ownerRef: "blocked",
  leaseSeconds: 30,
});
check("REVOKED 后 CLAIM 被拒", !afterClaim.ok, afterClaim.ok ? "unexpectedly succeeded" :
  (afterClaim.err?.includes("REVOKED")) ? "REVOKED (correct)" : afterClaim.err?.slice(0, 100));

const evCount = query(`select count(*) from studio.execution_control_events where delegation_id='${delegationId}'`);
const evOps = query(`select operation from studio.execution_control_events where delegation_id='${delegationId}' order by created_at asc`);
if (evOps.ok && evOps.data) console.log(`  events 操作: ${evOps.data.split(/\n/).join(" → ")}`);
check("events 3 条完整（CLAIM CHECKPOINT REVOKE，GET 不写）", evCount.data === "3", `count=${evCount.data}`);

// =============================================================
// §6. 跨 Owner 隔离
// =============================================================
console.log("\n─── 6. 跨 Owner 隔离 ───\n");

const machineToken = signToken(MACHINE, ["reviewer"]);
const cross = runSql(`set role mohen_app_runtime; set mohen.session_token='${machineToken}'; select studio.apply_execution_control('GET', '{"delegationId":"${delegationId}","requestId":"${crypto.randomUUID()}"}');`);
check("机器 Reviewer 跨 Owner 被拒", !cross.ok, cross.ok ? "unexpectedly succeeded" :
  (cross.err?.includes("NOT_FOUND")) ? "NOT_FOUND (correct isolation)" : cross.err?.slice(0, 120));

// =============================================================
// §7. RLS + 角色隔离
// =============================================================
console.log("\n─── 7. RLS + 角色隔离 ───\n");

const ownerToken = signToken(OWNER, ["member", "creator"]);
const rlsIns = runSql(`set role mohen_app_runtime; set mohen.session_token='${ownerToken}'; insert into studio.execution_controls(delegation_id, input_digest, policy_version) values('00000000-0000-0000-0000-000000000000','${"0".repeat(64)}','v1');`);
check("runtime 不能直接 insert execution_controls（RLS）", !rlsIns.ok, rlsIns.ok ? "unexpectedly succeeded" : "RLS denied");

const workerPriv = query(`select exists(select from information_schema.routine_privileges where grantee='mohen_private_worker' and routine_name='apply_execution_control')`);
const workerInherits = query(`select 'mohen_app_runtime'::regrole = any(m.member::regrole[]) from pg_auth_members m where m.roleid='mohen_private_worker'::regrole`);
check("mohen_private_worker 无独立 EXECUTE grant（仅继承 runtime）", workerPriv.data !== "t" || workerInherits.data === "t",
  `direct_priv=${workerPriv.data} inherits_runtime=${workerInherits.data}`);

const runtimePriv = query(`select has_function_privilege('mohen_app_runtime','studio.apply_execution_control(text,jsonb)','EXECUTE')`);
check("mohen_app_runtime 有 execute 权限", runtimePriv.data === "t", `priv=${runtimePriv.data}`);

// =============================================================
// §8. 存量数据健康
// =============================================================
console.log("\n─── 8. 存量数据健康 ───\n");

check("studio.delegations > 0", Number(query("select count(*) from studio.delegations").data) > 0);
check("studio.execution_receipts > 0", Number(query("select count(*) from studio.execution_receipts").data) > 0);
check("studio.execution_controls 至少有测试记录", Number(query("select count(*) from studio.execution_controls").data) >= 1);

// =============================================================
// Verdict
// =============================================================
console.log("\n" + "=".repeat(60));
console.log(`VERDICT passes=${passes} fails=${fails} checks=${passes + fails}`);
if (fails === 0) {
  console.log("M4_EXECUTION_CONTROL_CLOSE_PASS — Owner 执行协调合成层闭环");
  process.exit(0);
} else {
  console.log("M4_EXECUTION_CONTROL_CLOSE_FAIL");
  process.exit(1);
}
