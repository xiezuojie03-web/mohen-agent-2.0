// 检查本地 PG 的 M5 关键表/函数现状（只读，用 pg 直连 .env.local 的 DATABASE_URL）
import fs from "node:fs";
import pg from "pg";

function loadEnv(key) {
  for (const p of [".env.local", ".env"]) {
    if (fs.existsSync(p)) {
      const line = fs.readFileSync(p, "utf8").split("\n").find((l) => l.startsWith(key + "="));
      if (line) return line.split("=").slice(1).join("=").trim();
    }
  }
  return null;
}

const url = loadEnv("DATABASE_URL");
if (!url) { console.log("DATABASE_URL 未找到"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 2 });

const tables = [
  ["publication", "works"],
  ["publication", "work_revisions"],
  ["publication", "published_pointers"],
  ["control", "gate_audits"],
  ["control", "qualification_current"],
  ["control", "gate_policy_versions"],
  ["control", "work_publication_decisions"],
  ["public", "users"],
];
try {
  for (const [s, t] of tables) {
    const r = await pool.query(
      "select count(*)::int as n from information_schema.tables where table_schema=$1 and table_name=$2",
      [s, t]
    );
    console.log(`${s}.${t}: ${r.rows[0].n ? "存在" : "缺失"}`);
  }
  const f = await pool.query("select count(*)::int as n from pg_proc where proname='qualification_allows'");
  console.log(`qualification_allows 函数: ${f.rows[0].n ? "存在" : "缺失"}`);
  for (const [s, t] of tables) {
    try {
      const c = await pool.query(`select count(*)::int as n from ${s}.${t}`);
      console.log(`  ${s}.${t} 行数: ${c.rows[0].n}`);
    } catch (e) { console.log(`  ${s}.${t} 行数: (查询失败)`); }
  }
  console.log("MOHEN_G5_CONTEXTS 已配置:", Boolean(process.env.MOHEN_G5_CONTEXTS));
  console.log("MOHEN_ALLOW_SELF_REVIEW:", process.env.MOHEN_ALLOW_SELF_REVIEW ?? "(未设置)");
} finally {
  await pool.end();
}
