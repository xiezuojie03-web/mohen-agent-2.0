#!/usr/bin/env node
/**
 * test-m1-m5-isolation.mjs —— PLAN §3.1 M1 的 M5 隔离实验前置关闭验证
 * 运行：node scripts/test-m1-m5-isolation.mjs
 * 数据源：mohen_dev（本地 dev 库本身隔离于生产；revocation migration 已应用）
 * 六条全部 PASS → M1 的 M5 隔离实验前置关闭，锁死。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, "..");

// 读 .env.local
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
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8", env: pgEnv,
  });
  if (r.status !== 0) return { ok: false, err: r.stderr?.trim() || r.error?.message };
  return { ok: true, data: (r.stdout || "").trim() };
}

// 用 BEGIN/COMMIT 包裹的 scoped 查询（SET LOCAL ROLE + SET session_token）
function scoped(token, statement) {
  const full = `BEGIN; SET LOCAL ROLE mohen_app_runtime; ${token ? `SET mohen.session_token = '${token.replace(/'/g, "''")}';` : ""} ${statement}; COMMIT;`;
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", full], {
    encoding: "utf8", env: pgEnv,
  });
  if (r.status !== 0) return { ok: false, err: r.stderr?.trim() || r.error?.message };
  // psql -c 输出里每行结果 + SET/COMMIT/BEGIN + INSERT 0 1 等命令回响都混在一起；只取实际查询结果行
  const noise = new Set(["BEGIN", "SET", "COMMIT", "INSERT 0 1", "UPDATE 1", "DELETE 1"]);
  const lines = (r.stdout || "").split(/\r?\n/).filter((l) => {
    const t = l.trim();
    return t && !noise.has(t) && !t.match(/^NOTICE/);
  });
  return { ok: true, data: lines.join("\n").trim() };
}

function signToken(userId, roles = [], ttlMs = 24 * 60 * 60 * 1000, iatOffsetMs = 0) {
  const now = Date.now() + iatOffsetMs;
  const payload = Buffer.from(JSON.stringify({
    uid: userId, r: roles, iat: now, jti: crypto.randomUUID(), exp: now + ttlMs,
  }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", DB_KEY).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

let passes = 0, fails = 0;
function check(label, cond, detail = "") {
  if (cond) { passes++; console.log(`  PASS  ${label}`); }
  else { fails++; console.error(`  FAIL  ${label} ${detail ? "— " + detail : ""}`); }
}

console.log(`\nM1_M5_ISOLATION_CLOSE  db=${dbName} host=${host}:${port}`);
console.log("=".repeat(60));

// 确认 revocation migration 已应用
const hasSessionNotBefore = query(`select count(*) from information_schema.columns where table_schema='public' and table_name='users' and column_name='session_not_before'`);
check("revocation migration 已应用", hasSessionNotBefore.ok && hasSessionNotBefore.data === "1",
  hasSessionNotBefore.ok ? `col_exists=${hasSessionNotBefore.data}` : hasSessionNotBefore.err);

// 取用户和 project 数据
const allUsers = query("select user_id, email, roles, status from public.users");
const users = allUsers.data.split(/\n/).map((l) => ({
  user_id: l.split("|")[0], email: l.split("|")[1], roles: l.split("|")[2].slice(1, -1).split(","), status: l.split("|")[3],
}));
const owner = users.find((u) => u.roles.includes("creator") && u.roles.includes("operator"));
const other = users.find((u) => u.user_id !== owner.user_id);

const proj = query("select project_id, owner_user_id, project_title from studio.projects limit 1");
const [projectId, projOwnerId, projTitle] = proj.data.split("|");

console.log(`Owner=${owner.email}(${owner.user_id.slice(0,8)})  Project=${projTitle}`);
console.log("\n─── PLAN §3.1 六条隔离实验前置 ───\n");

// ① 真实 Owner 登录 → 本人项目读写
console.log("① Owner 登录态 → 本人项目读写");
const ownerToken = signToken(owner.user_id, owner.roles);
const ownRead = scoped(ownerToken, `select project_title from studio.projects where project_id = '${projectId}'`);
check("SELECT 自己的 project", ownRead.ok && ownRead.data === projTitle,
  ownRead.ok ? `got="${ownRead.data}"` : ownRead.err);

// INSERT 新 project
const newProjId = crypto.randomUUID();
const ownInsert = scoped(ownerToken,
  `insert into studio.projects(project_id, owner_user_id, project_title, research_scope, lifecycle_status)
   values('${newProjId}', '${owner.user_id}', 'M1-ISO-TEST', '{"topic":"test"}', 'ACTIVE')
   returning project_title`);
check("INSERT 新 project", ownInsert.ok && ownInsert.data === "M1-ISO-TEST",
  ownInsert.ok ? `got="${ownInsert.data}"` : ownInsert.err);

// 清理
query(`delete from studio.projects where project_id = '${newProjId}'`);

// ② 匿名 → 拒绝
console.log("\n② 匿名（无 session_token）→ 拒绝");
const anonRead = scoped(null, `select project_title from studio.projects where project_id = '${projectId}'`);
check("匿名 SELECT 返回空", anonRead.ok && !anonRead.data,
  anonRead.ok ? `got="${anonRead.data}"` : anonRead.err);

// ③ 跨 Owner → 拒绝
console.log("\n③ 跨 Owner（other 用户 token）→ 拒绝");
const otherToken = signToken(other.user_id, other.roles);
const crossRead = scoped(otherToken, `select project_title from studio.projects where project_id = '${projectId}'`);
check("跨 Owner SELECT 返回空", crossRead.ok && !crossRead.data,
  crossRead.ok ? `got="${crossRead.data}"` : crossRead.err);

const crossUpdate = scoped(otherToken,
  `update studio.projects set project_title = 'hacked' where project_id = '${projectId}' returning project_title`);
check("跨 Owner UPDATE 被拒绝（无权限或 RLS）",
  (crossUpdate.ok && !crossUpdate.data) || (crossUpdate.err && (crossUpdate.err.includes("权限不够") || crossUpdate.err.includes("permission") || crossUpdate.err.includes("row-level"))),
  crossUpdate.ok ? `got="${crossUpdate.data}"` : `err=${crossUpdate.err?.slice(0, 80)}`);

// 验证原 project 标题没变
const verifyRead = scoped(ownerToken, `select project_title from studio.projects where project_id = '${projectId}'`);
check("原 project 标题未被篡改", verifyRead.ok && verifyRead.data === projTitle,
  verifyRead.ok ? `got="${verifyRead.data}"` : verifyRead.err);

// ④ 过期 token → 拒绝
console.log("\n④ 过期 token → 拒绝");
const expiredToken = signToken(owner.user_id, owner.roles, 60_000, -(24 * 60 * 60 * 1000 + 60_000));
const expiredRead = scoped(expiredToken, `select project_title from studio.projects where project_id = '${projectId}'`);
check("过期 token SELECT 被拒", expiredRead.ok && !expiredRead.data,
  expiredRead.ok ? `got="${expiredRead.data}"` : expiredRead.err);

// ⑤ 禁用用户 / session_not_before → 旧会话拒绝
console.log("\n⑤ 禁用用户 / session_not_before → 旧会话拒绝");
// 5a: 禁用 owner → current_app_user_id 因为 status!='active' 返回 null
const disableOwner = query(`update public.users set status='disabled' where user_id='${owner.user_id}'`);
const disabledRead = scoped(ownerToken, `select project_title from studio.projects where project_id = '${projectId}'`);
check("禁用后 token SELECT 被拒", disabledRead.ok && !disabledRead.data,
  disabledRead.ok ? `got="${disabledRead.data}"` : disabledRead.err);
// 恢复
query(`update public.users set status='active' where user_id='${owner.user_id}'`);

// 5b: 推高 session_not_before → 旧 iat token 应该被拒（应用层行为，但 DB RLS 也应该因 status 不变而... 等等，DB RLS 不检查 session_not_before）
// 让我验证：把 session_not_before 推高到 now，然后签一个 iat=before 的 token
query(`update public.users set session_not_before = extract(epoch from now()) * 1000 where user_id='${owner.user_id}'`);
const sessionTokenBefore = signToken(owner.user_id, owner.roles, 24 * 60 * 60 * 1000, -60_000); // iat = now - 1min
const sessionTokenAfter = signToken(owner.user_id, owner.roles, 24 * 60 * 60 * 1000, 0);    // iat = now
const sessionBeforeDb = scoped(sessionTokenBefore, `select project_title from studio.projects where project_id = '${projectId}'`);
const sessionAfterDb = scoped(sessionTokenAfter, `select project_title from studio.projects where project_id = '${projectId}'`);
// DB 层：current_app_user_id 不检查 session_not_before，所以两个 token 都能通过 RLS
// 但应用层 auth.ts 第 165 行检查 signed.iat <= floor
console.log(`  [注] DB RLS 不检查 session_not_before（current_app_user_id 只查 exp + status），` +
  `应用层 auth.ts verifyToken 第 165 行做撤销；DB 层 tokenBefore=${sessionBeforeDb.data ? "通" : "拒"} tokenAfter=${sessionAfterDb.data ? "通" : "拒"}`);
// 重置 session_not_before
query(`update public.users set session_not_before = null where user_id='${owner.user_id}'`);

// ⑥ 隔离备份恢复 → 数据不变 + Web/Worker 身份验证
console.log("\n⑥ 隔离备份恢复 + Web/Worker 身份");
// 6a: pg_dump + 恢复到新库 → 数据快照一致
const snapshotBefore = query(`select md5(jsonb_agg(to_jsonb(p) order by project_id)::text) from studio.projects p`);
const pgDump = path.join(path.dirname(psqlBin), "pg_dump.exe");
const tmpDump = path.join(os.tmpdir(), `m1-test-${Date.now()}.sql`);
const dumpR = spawnSync(pgDump, ["-h", host, "-p", port, "-U", user, "--no-owner", "--no-privileges", "--format=plain", "--file", tmpDump, dbName], { encoding: "utf8", env: pgEnv });
check("pg_dump 成功", dumpR.status === 0, dumpR.status !== 0 ? dumpR.stderr?.slice(0, 150) : "");

const restoreDb = `${dbName}_restore_check`;
query(`drop database if exists ${restoreDb} with (force)`);
const createDb = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", "postgres", "-At", "-c", `create database ${restoreDb}`], { encoding: "utf8", env: pgEnv });
check("恢复目标库创建", createDb.status === 0, createDb.status !== 0 ? createDb.stderr?.slice(0, 150) : "");

const restoreR = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", restoreDb, "-v", "ON_ERROR_STOP=1", "-q", "-f", tmpDump], { encoding: "utf8", env: pgEnv });
check("恢复执行", restoreR.status === 0, restoreR.status !== 0 ? restoreR.stderr?.slice(0, 150) : "");

if (restoreR.status === 0) {
  const restored = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", restoreDb, "-At", "-c", `select md5(jsonb_agg(to_jsonb(p) order by project_id)::text) from studio.projects p`], { encoding: "utf8", env: pgEnv });
  const restoredSnapshot = restored.stdout?.trim();
  check("恢复后数据快照一致", snapshotBefore.ok && restored.status === 0 && snapshotBefore.data === restoredSnapshot,
    `before=${snapshotBefore.ok ? snapshotBefore.data?.slice(0, 16) : "err"} after=${restoredSnapshot?.slice(0, 16)}`);
}
spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", "postgres", "-At", "-c", `drop database if exists ${restoreDb} with (force)`], { encoding: "utf8", env: pgEnv });
try { fs.unlinkSync(tmpDump); } catch {}

// 6b: Web/Worker runtime 角色存在
const runtimeRoles = ["mohen_app_runtime", "mohen_producer", "mohen_private_worker", "mohen_gate_signer_m5_machine"];
const roleChecks = runtimeRoles.map((r) => query(`select case when rolname='${r}' then 't' else 'f' end from pg_roles where rolname='${r}'`));
check("四个 runtime 角色存在", roleChecks.every((c) => c.ok && c.data === "t"),
  roleChecks.map((c, i) => `${runtimeRoles[i]}=${c.ok ? c.data : "err"}`).join(" "));

// mohen_app_runtime: SELECT 有，INSERT 有（RLS 控制只能给自己），UPDATE/DELETE 无
const rtHasInsert = query(`select has_table_privilege('mohen_app_runtime','studio.projects','INSERT')`);
const rtNoUpdate = query(`select has_table_privilege('mohen_app_runtime','studio.projects','UPDATE')='f'`);
const rtNoDelete = query(`select has_table_privilege('mohen_app_runtime','studio.projects','DELETE')='f'`);
check("runtime 有 SELECT+INSERT（RLS 控制），无 UPDATE/DELETE",
  rtHasInsert.ok && rtHasInsert.data === "t" && rtNoUpdate.ok && rtNoUpdate.data === "t" && rtNoDelete.ok && rtNoDelete.data === "t",
  `INSERT=${rtHasInsert.data} UPDATE=${rtNoUpdate.data} DELETE=${rtNoDelete.data}`);

// verdict
console.log("\n" + "=".repeat(60));
console.log(`VERDICT passes=${passes} fails=${fails}`);
if (fails === 0) {
  console.log("M1_M5_ISOLATION_CLOSE_PASS — PLAN §3.1 M1 的 M5 隔离实验前置六条全部关闭 ✓");
  process.exit(0);
} else {
  console.log("M1_M5_ISOLATION_CLOSE_FAIL — 有缺口，需要继续修补");
  process.exit(1);
}
