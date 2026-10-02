// scripts/check-identifier-registry.mjs
// 目的：让「我们自己造的标识符」不再变成孤儿。
//
// 为什么需要它（本仓已付过的代价）：
//   同一批 AI 起的名，命运相反 ——
//     · `T11-C1…C5` 进了**代码**（类型、测试、运行时字段）→ 改它一堆地方报错 → **被迫解释**，活得很好；
//     · `scc_legacy` 只进了**数据**（DB 里一个字符串）→ 改它什么都不报错 → **没人解释**，挂了 10 天，
//       而它的定义一直躺在 tasks/TASK-0009 里，只需两分钟就能搜到。
//   结论：**只进数据的名字没有任何东西逼它被解释，所以必须由守卫来逼。**
//
// 范围（项目拥有者 2026-10-02 选定「范围 C」）：
//   只覆盖真库中**可以随便写**的词表型标识符（无 CHECK 约束的 text[] 标签列 + 自由文本方法代号）。
//   CHECK 约束的枚举定义在 supabase/migrations，本守卫**不去复制**（复制＝制造平行真源）。
//
// 检查项：
//   ① schema / schema_version
//   ② 每个列条目结构完整（column / kind / why；fixed→values[]；pattern→patterns[]）
//   ③ origin 合法；derived / coined 的 defined_at 必须真实存在；coined 必须有非空 definition
//   ④ pattern 必须是能编译的正则
//   ⑤ 登记的列必须真实存在于真库（防写错表名/列名）
//   ⑥ **真库实际取值必须被覆盖**：fixed 列 ⊆ 已登记值；pattern 列每个值必须命中某条规则
//      ★ 这一条是核心：新增任何标签/代号而未登记 → 红
//   DB 不可达时跳过 ⑤⑥ 并 WARN，保证 pnpm guard 离线可跑。
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, queryRows } from "../packages/data-access/src/index.mjs";

const REG = "specs/data-production/identifier-registry.json";
const ORIGINS = new Set(["external", "derived", "coined"]);
let failed = false;
const bad = (m) => { console.error("IDENTIFIER_REGISTRY_ERROR " + m); failed = true; };

if (!fs.existsSync(REG)) { console.error(`MISSING ${REG}`); process.exit(1); }
let reg;
try { reg = JSON.parse(fs.readFileSync(REG, "utf8")); }
catch (e) { console.error(`IDENTIFIER_REGISTRY_ERROR JSON 解析失败：${(e && e.message) || e}`); process.exit(1); }

// ---------- ①②③④ ----------
if (reg.schema !== "mohen.identifier-registry") bad(`schema 应为 "mohen.identifier-registry"，实际 "${reg.schema}"`);
if (typeof reg.schema_version !== "number") bad("schema_version 必须是数字");
const cols = Array.isArray(reg.columns) ? reg.columns : [];
if (!cols.length) bad("columns 为空");

function checkEntry(tag, e, valueField) {
  if (e.origin !== undefined && !ORIGINS.has(e.origin)) bad(`${tag}: origin "${e.origin}" 不在 ${[...ORIGINS].join(" / ")} 之内`);
  if (e.origin === "derived" || e.origin === "coined") {
    if (!e.defined_at) bad(`${tag}: origin=${e.origin} 必须给出 defined_at`);
    else if (!fs.existsSync(path.join(PROJECT_ROOT, e.defined_at))) bad(`${tag}: defined_at "${e.defined_at}" 在仓内不存在 —— 定义指针已失效`);
  }
  if (e.origin === "coined" && (e.definition === undefined || String(e.definition).trim() === "")) {
    bad(`${tag}: origin=coined 必须给出 definition（一句话说清它指什么）`);
  }
  if (valueField === "value" && !e.value) bad(`${tag}: 缺 value`);
}

let valueCount = 0;
let patternCount = 0;
for (const c of cols) {
  const tag = c && c.column ? c.column : "(无 column)";
  if (!c.column || !c.kind) { bad(`${tag}: 缺 column 或 kind`); continue; }
  if (!c.why) bad(`${tag}: 缺 why（说明为什么这一列在范围内）`);
  if (c.kind === "fixed") {
    if (!Array.isArray(c.values) || !c.values.length) { bad(`${tag}: kind=fixed 必须有非空 values[]`); continue; }
    for (const v of c.values) { checkEntry(`${tag}[${v && v.value}]`, v, "value"); valueCount++; }
  } else if (c.kind === "pattern") {
    if (!Array.isArray(c.patterns) || !c.patterns.length) { bad(`${tag}: kind=pattern 必须有非空 patterns[]`); continue; }
    for (const p of c.patterns) {
      if (!p.match) { bad(`${tag}: pattern 条目缺 match`); continue; }
      try { new RegExp(p.match); } catch (e) { bad(`${tag}: match "${p.match}" 不是合法正则`); continue; }
      checkEntry(`${tag}[${p.match}]`, p, "match");
      patternCount++;
    }
  } else {
    bad(`${tag}: kind 必须是 fixed 或 pattern，实际 "${c.kind}"`);
  }
}

// ---------- ⑤⑥ 真库核对 ----------
let dbNote = "";
let checkedCols = 0;
let covered = 0;
const uncovered = [];
try {
  const dbCols = await queryRows(
    `select table_name, column_name, udt_name from information_schema.columns where table_schema='public'`
  );
  const dbMap = new Map(dbCols.map((r) => [`${r.table_name}.${r.column_name}`, r.udt_name]));
  for (const c of cols) {
    if (!dbMap.has(c.column)) { bad(`${c.column}: 该列在真库中不存在（写错表名/列名？）`); continue; }
    const [tbl, col] = c.column.split(".");
    // 是否是数组列必须**看真库类型**，不能看 kind ——
    // 例：hr_constraint 是 text[] 但用 pattern 规则（编号非固定词表）。
    const isArray = dbMap.get(c.column) === "_text";
    const rows = await queryRows(
      isArray
        ? `select distinct unnest(${col})::text as v from ${tbl} where ${col} is not null`
        : `select distinct ${col}::text as v from ${tbl} where ${col} is not null and ${col} <> ''`
    );
    checkedCols++;
    for (const r of rows) {
      const v = r.v;
      if (v === null || v === undefined || v === "") continue;
      if (c.kind === "fixed") {
        if (!c.values.some((x) => x.value === v)) uncovered.push(`${c.column} → "${v}"`);
        else covered++;
      } else {
        if (!c.patterns.some((p) => new RegExp(p.match).test(v))) uncovered.push(`${c.column} → "${v}"`);
        else covered++;
      }
    }
  }
} catch (e) {
  dbNote = "WARN DB 不可达，跳过真库取值核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 140);
}
if (uncovered.length) {
  console.error(`IDENTIFIER_REGISTRY_ERROR 真库中有 ${uncovered.length} 个取值未登记 —— 词表型标识符必须逐个声明出身与定义：`);
  for (const u of uncovered.slice(0, 25)) console.error("     " + u);
  if (uncovered.length > 25) console.error(`     … 其余 ${uncovered.length - 25} 个省略`);
  console.error(`     处置：在 ${REG} 对应列的 values[] 里补一条（origin / definition / defined_at），或补一条 pattern 规则。`);
  failed = true;
}

if (dbNote) console.error(dbNote);
console.log(
  `IDENTIFIER_REGISTRY schema=v${reg.schema_version} columns=${cols.length} fixed_values=${valueCount} ` +
  `patterns=${patternCount} db_checked_columns=${checkedCols} covered_values=${covered} uncovered=${uncovered.length}`
);
process.exit(failed ? 1 : 0);
