// scripts/check-source-gate.mjs
// 目的：让来源门禁成为**真的会被读、且可核对**的东西。
//
// 为什么必须有这道守卫（本仓已付过的代价）：
//   `data/fixtures/source-providers.json` 声称 S1–S4 门禁，文档三处写「取回必须遵守」，
//   但**全仓没有一行代码读它** —— 它什么也没挡住（实测 341 张外镇图照样入库）。
//   守卫的第 ④ 项就是专门用来防止这类"文档里写着、代码里没有"重演的。
//
// 检查项：
//   ① 结构完整：每个 provider 必须有 canonical / tier / evidence_allowed / basis / ops_status
//      + 运维表三项（rate_limit / failure_notes / last_verified）——B-08 收口，守卫强制校验存在性
//   ② 别名不重复归属（同一写法不能既属 A 又属 B）
//   ③ 真库里出现过的**每一个** provider 字符串都必须能解析 → 否则红
//      ★ 这一条让**所有写入路径**都受约束，无需逐个改造 20 多个写脚本
//   ④ 该文件必须真的被代码 import（防重蹈覆辙）
//   ⑤ ops_status=todo 的条目数与 needs_owner_confirmation 数（**报出但不判红**——那是待补/待确认清单，不是错误）
//
// DB 不可达时跳过 ③ 并打印 WARN，保证 pnpm guard 在离线环境仍可运行。
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, queryRows } from "../packages/data-access/src/index.mjs";
import { loadSourceGate, resolveProvider, SOURCE_GATE_PATH } from "../packages/data-access/src/source-gate.mjs";

const TIERS = new Set(["S1", "S2", "S3", "S4", "LEGACY", "SELF"]);
const ORIGINS = new Set(["external", "derived", "coined"]);
const REQUIRED = ["canonical", "origin", "tier", "evidence_allowed", "basis", "ops_status", "rate_limit", "failure_notes", "last_verified"];
let failed = false;
const bad = (m) => { console.error("SOURCE_GATE_ERROR " + m); failed = true; };

// ---------- ① 结构 ----------
if (!fs.existsSync(SOURCE_GATE_PATH)) { console.error(`MISSING ${SOURCE_GATE_PATH}`); process.exit(1); }
let gate;
try { gate = loadSourceGate(); }
catch (e) { console.error(`SOURCE_GATE_ERROR fixtures 解析失败：${(e && e.message) || e}`); process.exit(1); }

if (gate.raw.schema !== "mohen.source-providers") bad(`schema 应为 "mohen.source-providers"，实际 "${gate.raw.schema}"`);
if (typeof gate.raw.schema_version !== "number") bad("schema_version 必须是数字");
if (!gate.providers.length) bad("providers 为空");

for (const p of gate.providers) {
  const tag = p && p.canonical ? p.canonical : "(无 canonical)";
  for (const k of REQUIRED) {
    if (p[k] === undefined || p[k] === null || p[k] === "") bad(`${tag}: 缺字段 ${k}`);
  }
  if (p.tier && !TIERS.has(p.tier)) bad(`${tag}: tier "${p.tier}" 不在 ${[...TIERS].join("/")} 之内`);
  if (![true, false, "modern_spatial_only"].includes(p.evidence_allowed)) {
    bad(`${tag}: evidence_allowed 必须是 true / false / "modern_spatial_only"，实际 ${JSON.stringify(p.evidence_allowed)}`);
  }
  if (!Array.isArray(p.aliases)) bad(`${tag}: aliases 必须是数组`);
  if (p.tier === "S4" && p.evidence_allowed === true) bad(`${tag}: S4 不得 evidence_allowed=true`);
  if ((p.tier === "LEGACY" || p.tier === "SELF") && p.evidence_allowed === true) {
    bad(`${tag}: ${p.tier} 不得 evidence_allowed=true（旧库需重做 provenance；自产产物不是来源）`);
  }

  // ---- 标识符出身（identifier_policy）：防止"只有名字、没有定义" ----
  // 背景：`scc_legacy` 的定义一直躺在 tasks/TASK-0009 里，却没有任何东西把它与 DB 里的值连起来。
  // 代码里的名字会被测试逼着解释（改它一堆地方报错）；**只进数据的名字没有任何东西逼它** ——
  // 所以必须由守卫来逼。
  if (p.origin !== undefined && !ORIGINS.has(p.origin)) {
    bad(`${tag}: origin "${p.origin}" 不在 ${[...ORIGINS].join(" / ")} 之内`);
  }
  if (p.origin === "derived" || p.origin === "coined") {
    if (!p.defined_at) bad(`${tag}: origin=${p.origin} 必须给出 defined_at（指向定义所在处）`);
    else if (!fs.existsSync(path.join(PROJECT_ROOT, p.defined_at))) {
      bad(`${tag}: defined_at "${p.defined_at}" 在仓内不存在 —— 定义指针已失效`);
    }
  }
  if (p.origin === "coined" && (p.definition === undefined || String(p.definition).trim() === "")) {
    bad(`${tag}: origin=coined 必须给出 definition（一句话说清它指什么）`);
  }
}

// ---------- ② 别名重复归属 ----------
for (const d of gate.duplicateAliases) {
  bad(`别名冲突："${d.key}" 同时被 ${d.claimed_by.join(" 与 ")} 声明`);
}

// ---------- ③ 真库 provider 全覆盖 ----------
let dbNote = "";
let dbRows = null;
try {
  dbRows = await queryRows(`select provider, count(*)::int as c from source_records group by 1 order by 2 desc`);
} catch (e) {
  dbNote = "WARN DB 不可达，跳过真库核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 120);
}
const unknown = [];
let canonicalHit = 0;
if (dbRows) {
  for (const r of dbRows) {
    const res = resolveProvider(r.provider);
    if (!res.known) unknown.push(`${r.provider}（${r.c} 条）`);
    else canonicalHit++;
  }
  if (unknown.length) {
    console.error(`SOURCE_GATE_ERROR 真库中有 ${unknown.length} 个 provider 字符串未登记 —— 所有写入路径都受此约束：`);
    for (const u of unknown) console.error("     " + u);
    console.error("     处置：在 " + path.relative(PROJECT_ROOT, SOURCE_GATE_PATH) + " 里为它建 canonical 条目（或加 alias）。");
    failed = true;
  }
}

// ---------- ④ 该文件必须真的被代码 import ----------
const SCAN_DIRS = ["pipelines", "scripts", "packages", "tools"];
const HITS = [];
function walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (["node_modules", ".git", ".next"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".mjs") || e.name.endsWith(".ts")) {
      const t = fs.readFileSync(p, "utf8");
      if (t.includes("source-gate")) HITS.push(path.relative(PROJECT_ROOT, p));
    }
  }
}
for (const d of SCAN_DIRS) walk(path.join(PROJECT_ROOT, d));
const importers = HITS.filter((h) => !h.endsWith("source-gate.mjs"));
if (!importers.length) {
  bad("没有任何代码 import source-gate —— 这正是 source-providers.json 当初失效的方式（文档写着、代码里没有）");
}

// ---------- ⑤ 待补 / 待确认（报出，不判红） ----------
const opsTodo = gate.providers.filter((p) => p.ops_status === "todo").map((p) => p.canonical);
const confirmNeeded = gate.providers.filter((p) => p.needs_owner_confirmation === true).map((p) => p.canonical);
const openQuestions = Array.isArray(gate.raw.open_questions) ? gate.raw.open_questions : [];

if (dbNote) console.error(dbNote);
console.log(
  `SOURCE_GATE providers=${gate.providers.length} aliases=${gate.providers.reduce((a, p) => a + (p.aliases || []).length, 0)} ` +
  `db_providers=${dbRows ? dbRows.length : "n/a"} resolved=${canonicalHit} unknown=${unknown.length} ` +
  `importers=${importers.length} ops_todo=${opsTodo.length} needs_owner_confirmation=${confirmNeeded.length} ` +
  `open_questions=${openQuestions.length}`
);
if (opsTodo.length) console.log(`  ops_status=todo（待补 限流/失败经验/最后验证日期）：${opsTodo.join(", ")}`);
else console.log("  ops_status: 全部 documented（B-08 运维表三项已落地，守卫强制校验）");
if (confirmNeeded.length) console.log(`  needs_owner_confirmation（分级待拥有者确认）：${confirmNeeded.join(", ")}`);
if (openQuestions.length) for (const q of openQuestions) console.log(`  open_question：${q}`);
process.exit(failed ? 1 : 0);
