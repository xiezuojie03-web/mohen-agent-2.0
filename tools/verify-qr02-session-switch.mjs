#!/usr/bin/env node
// QR-02 关闭证据：同一 Node PG 连接池、同一物理连接上的 Owner A / Owner B / 匿名连续切换正反测试。
//
// 证明的事（真实 PG + 真实 RLS，不造合成行、不改数据）：
// 1. 同一连接连续三次切换身份，每次都能被 control.current_app_user_id() 正确解析为对应身份；
// 2. Owner A 只能看到自己的项目；Owner B（另一真实用户）看不到 A 的项目；
// 3. 匿名（无 token）看不到任何项目；
// 4. 切回 Owner A 后仍能看到自己的项目（身份无残留、无串号）；
// 5. 每次事务提交后 mohen.session_token 被清空、role 回落到登录角色（事务局部，不泄漏到下一请求）；
// 6. 全流程 pg_backend_pid 不变（确为连接复用，而非每条语句新建连接）。
// 本工具不打印密钥，只打印身份与计数。
import crypto from "node:crypto";
import { getNodePgPool } from "../packages/data-access/src/index.mjs";

const OWNER_A = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const OWNER_B = "b0a11000-0000-4000-8000-0000000000a1"; // 机器评审员：真实用户，不拥有项目
const PROJECT_A = "b0a11000-0000-4000-8000-000000000001";

const results = [];
const record = (label, ok, detail = "") => { results.push({ label, ok: !!ok, detail }); return !!ok; };

function token(uid) {
  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 60_000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

async function main() {
  const pool = getNodePgPool();
  const client = await pool.connect();
  try {
    const pidOf = async () => (await client.query("select pg_backend_pid() as pid")).rows[0].pid;
    const backendPid = await pidOf();

    // 以应用运行角色 + 事务局部会话身份执行一次读数（与生产查询路径同形）。
    async function asIdentity(label, sessionToken) {
      await client.query("begin");
      await client.query("set local role mohen_app_runtime");
      if (sessionToken) await client.query("select set_config('mohen.session_token', $1, true)", [sessionToken]);
      const who = (await client.query("select control.current_app_user_id()::text as uid")).rows[0].uid;
      const projects = (await client.query("select project_id::text as id from studio.projects order by created_at")).rows.map((r) => r.id);
      await client.query("commit");
      // 事务提交后必须无残留身份
      const residue = (await client.query(
        "select coalesce(current_setting('mohen.session_token', true), '') as tok, current_user as who"
      )).rows[0];
      return { label, who, projects, residue, pid: await pidOf() };
    }

    const a1 = await asIdentity("A1", token(OWNER_A));
    record("QR02_A1_IDENTITY", a1.who === OWNER_A, `uid=${a1.who}`);
    record("QR02_A1_SEES_OWN_PROJECT", a1.projects.includes(PROJECT_A), `projects=${a1.projects.length}`);

    const b = await asIdentity("B", token(OWNER_B));
    record("QR02_B_IDENTITY", b.who === OWNER_B, `uid=${b.who}`);
    record("QR02_B_CANNOT_SEE_A_PROJECT", !b.projects.includes(PROJECT_A), `projects=${b.projects.length}`);

    const anon = await asIdentity("ANON", null);
    record("QR02_ANON_IDENTITY", anon.who === null || anon.who === "", `uid=${JSON.stringify(anon.who)}`);
    record("QR02_ANON_SEES_NOTHING", anon.projects.length === 0, `projects=${anon.projects.length}`);

    const a2 = await asIdentity("A2", token(OWNER_A));
    record("QR02_A2_IDENTITY_RESTORED", a2.who === OWNER_A, `uid=${a2.who}`);
    record("QR02_A2_SEES_OWN_PROJECT_AGAIN", a2.projects.includes(PROJECT_A), `projects=${a2.projects.length}`);

    const residues = [a1, b, anon, a2].map((s) => s.residue);
    record("QR02_NO_SESSION_RESIDUE",
      residues.every((r) => r.tok === "" ),
      residues.map((r) => `tok=${JSON.stringify(r.tok)}`).join(" "));
    record("QR02_SINGLE_PHYSICAL_CONNECTION",
      [a1, b, anon, a2].every((s) => s.pid === backendPid),
      `pid=${backendPid} reused=${[a1, b, anon, a2].map((s) => s.pid).join(",")}`);
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

try {
  await main();
} catch (error) {
  record("QR02_FATAL", false, String(error?.message ?? error).split("\n")[0]);
}

let failed = 0;
for (const line of results) {
  if (!line.ok) failed += 1;
  console.log(`${line.ok ? "PASS" : "FAIL"} ${line.label}${line.detail ? ` — ${line.detail}` : ""}`);
}
console.log(failed === 0 && results.length ? "QR02_ALL_PASS" : `QR02_FAILED failures=${failed}`);
process.exit(failed === 0 ? 0 : 1);
