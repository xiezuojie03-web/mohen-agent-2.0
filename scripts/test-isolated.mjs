// scripts/test-isolated.mjs
// 测试写库隔离（2026-10-02 · ESC-05 处置）
//
// 问题（实测）：`pnpm test` 直连本机 `mohen_dev`。2026-10-02 一次全量测试在 **7 秒内**
//   向 `evidence_gate_audit` 写入 **9016 行 visual_asset 审计**（另 entity 23261 / evidence 12982…），
//   覆盖了全部 1288 张图片 → 使"1246 张夜跑图片 0 条门禁记录"由**当前事实**变成**历史事实**；
//   又因套件不幂等，重复运行会让断言计数漂移（实测 15 → 30）。
//
// 设计：**真库永不被测试触碰**（by construction，而不是靠人记得）
//   1) 从 .env.local 读真库名 → 建/重置同名 + `_test` 的测试库；
//   2) pg_dump 真库 → 灌入测试库（结构与数据快照）；
//   3) 用 `DATABASE_URL` 覆盖指向测试库来跑 vitest（data-access 只在该变量**未设置**时才读 .env.local，
//      故环境变量覆盖有效）；
//   4) 跑完对比：测试库被改了多少（= 测试写了什么）／真库是否**一行未动**（= 隔离成立）。
//
// 注：测试库**保留**供检视，加 `--drop` 跑完删除；`--no-run` 只做建库与灌数据。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = process.env.MOHEN_PSQL_PATH ? path.dirname(process.env.MOHEN_PSQL_PATH) : "D:\\MoHen\\tools\\PostgreSQL\\18\\bin";
const PSQL = path.join(BIN, "psql.exe");
const PG_DUMP = path.join(BIN, "pg_dump.exe");
const ARGS = process.argv.slice(2);
const NO_RUN = ARGS.includes("--no-run");
const DROP_AFTER = ARGS.includes("--drop");

// 关键表：用于前后比对（V1.4 更新：第一代 public 37 表已随 M2 迁移 DROP，
// 比对面切换为当前 42 表 schema 的关键落点）
const KEY_TABLES = [
  "source.sources",
  "source.raw_items",
  "evidence.material_evidence",
  "world.entities",
  "world.relation_claims",
  "world.conflicts",
  "meaning.findings",
  "meaning.open_questions",
  "read_model.world_projections",
  "read_model.map_timeline_projections",
  "read_model.discovery_paths",
  "read_model.story_seeds",
  "control.gate_audits",
];

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  const text = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnvLocal();
const url = env.DATABASE_URL;
if (!url) { console.error("STOP 未在 .env.local 找到 DATABASE_URL"); process.exit(2); }
const m = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(\S+)$/);
if (!m) { console.error("STOP 无法解析 DATABASE_URL"); process.exit(2); }
const [, user, password, host, port = "5432", srcDb] = m;
if (srcDb.endsWith("_test")) { console.error(`STOP 源库名 "${srcDb}" 本身以 _test 结尾 —— 拒绝自我复制`); process.exit(2); }
const testDb = `${srcDb}_test`;
const testUrl = url.replace(/\/[^/]+$/, `/${testDb}`);
const pgEnv = { ...process.env, PGPASSWORD: password, PGCLIENTENCODING: "UTF8" };

const run = (bin, args, opts = {}) => {
  const r = spawnSync(bin, args, { env: pgEnv, encoding: "utf8", ...opts });
  if (r.status !== 0) {
    console.error(`STOP ${path.basename(bin)} ${args.join(" ")} 失败（exit ${r.status}）`);
    if (r.stderr) console.error(String(r.stderr).trim().slice(0, 600));
    process.exit(2);
  }
  return (r.stdout || "").trim();
};
const admin = (sql) => run(PSQL, ["-h", host, "-p", port, "-U", user, "-d", "postgres", "-At", "-c", sql]);
const onDb = (db, sql) => run(PSQL, ["-h", host, "-p", port, "-U", user, "-d", db, "-At", "-c", sql]);

function counts(db) {
  const out = {};
  for (const t of KEY_TABLES) {
    out[t] = Number(onDb(db, `select count(*) from ${t}`));
  }
  return out;
}

console.log(`TEST_ISOLATION src=${srcDb} test=${testDb} host=${host}:${port}`);

// ── 1) 真库基线（跑测试之前）──────────────────────────────────────────────
const srcBefore = counts(srcDb);
console.log(`  真库基线：${KEY_TABLES.map((t) => `${t}=${srcBefore[t]}`).join(" ")}`);

// ── 2) 建/重置测试库 ──────────────────────────────────────────────────────
admin(`drop database if exists ${testDb} with (force)`);
admin(`create database ${testDb}`);
console.log(`  已重建测试库 ${testDb}`);

// ── 3) 真库 → 测试库 结构与数据快照 ────────────────────────────────────────
const tmp = path.join(os.tmpdir(), `mohen-test-snapshot-${Date.now()}.sql`);
run(PG_DUMP, ["-h", host, "-p", port, "-U", user, "--no-owner", "--no-privileges", "--format=plain", "--file", tmp, srcDb]);
console.log(`  已导出真库快照（${(fs.statSync(tmp).size / 1024).toFixed(0)} KB）→ 灌入测试库`);
run(PSQL, ["-h", host, "-p", port, "-U", user, "-d", testDb, "-v", "ON_ERROR_STOP=1", "-q", "-f", tmp]);
fs.unlinkSync(tmp);

const testBefore = counts(testDb);
const mismatch = KEY_TABLES.filter((t) => testBefore[t] !== srcBefore[t]);
if (mismatch.length) {
  console.error(`STOP 快照不一致：${mismatch.map((t) => `${t} 真库=${srcBefore[t]} 测试库=${testBefore[t]}`).join("；")}`);
  process.exit(2);
}
console.log(`  快照一致 ✓ ${KEY_TABLES.map((t) => `${t}=${testBefore[t]}`).join(" ")}`);

if (NO_RUN) { console.log("  --no-run：已停在建库与灌数据（未跑测试）"); process.exit(0); }

// ── 4) 在测试库上跑 vitest ────────────────────────────────────────────────
console.log(`  运行 vitest（DATABASE_URL → ${testDb}，MOHEN_WRITE_ENABLED=true）`);
const r = spawnSync("pnpm", ["vitest", "run"], {
  cwd: ROOT, stdio: "inherit", shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: testUrl, MOHEN_WRITE_ENABLED: "true", MOHEN_ENV: "test" },
});
const testExit = r.status === null ? 1 : r.status;

// ── 5) 隔离验证 + 测试写了什么 ────────────────────────────────────────────
const srcAfter = counts(srcDb);
const testAfter = counts(testDb);
const srcDirty = KEY_TABLES.filter((t) => srcAfter[t] !== srcBefore[t]);
const wrote = KEY_TABLES.filter((t) => testAfter[t] !== testBefore[t]);

console.log("");
console.log(`ISOLATION_VERDICT real_db_untouched=${srcDirty.length === 0 ? "YES" : "NO"}`);
if (srcDirty.length) {
  console.error(`  ⚠️ 真库被改动：${srcDirty.map((t) => `${t} ${srcBefore[t]}→${srcAfter[t]}`).join("；")}`);
} else {
  console.log(`  真库一行未动 ✓（${KEY_TABLES.map((t) => `${t}=${srcAfter[t]}`).join(" ")}）`);
}
console.log(`  测试在测试库写入了：${wrote.length ? wrote.map((t) => `${t} ${testBefore[t]}→${testAfter[t]}`).join("；") : "无（本次未改动任何关键表）"}`);
console.log(`  vitest exit=${testExit}；测试库 ${testDb} 保留供检视${DROP_AFTER ? "（随后删除）" : ""}`);

if (DROP_AFTER) admin(`drop database if exists ${testDb} with (force)`);
process.exit(srcDirty.length ? 3 : testExit);
