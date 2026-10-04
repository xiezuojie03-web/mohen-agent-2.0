// scripts/check-naming-map.mjs
// 目的（RECON-02 方案 A · 2026-10-04 项目拥有者裁定）：把「概念名 ≠ 物理名」固定成设计后，
// 用一道机器守卫防止它重新滑回「按宪法名查表查不到」的旧坑：
//   - 真库每张表必须在本映射（naming-map.json）里被登记，或显式豁免；新增表不登记 → 红。
//   - 映射里写的物理名必须真的在 supabase/migrations 中存在；映射指向不存在的表 → 红。
// 与 check-production-registry.mjs 同源机制：只读 supabase/migrations 的 create table，不直连数据库。
import fs from "node:fs";
import path from "node:path";

const MAP = "specs/data-production/naming-map.json";
const MIG = "supabase/migrations";

let failed = false;
const bad = (m) => { console.error("NAMING_ERROR " + m); failed = true; };

if (!fs.existsSync(MAP)) { console.error(`MISSING ${MAP}`); process.exit(1); }
let map;
try { map = JSON.parse(fs.readFileSync(MAP, "utf8")); }
catch (e) { console.error(`NAMING_ERROR JSON 解析失败 ${MAP}: ${(e && e.message) || e}`); process.exit(1); }

const physical = map.physical_tables || {};
const conceptToPhysical = map.concept_to_physical || {};

// ---------- 扫真库实际表名 ----------
const actual = new Set();
if (fs.existsSync(MIG)) {
  for (const f of fs.readdirSync(MIG).filter((x) => x.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(MIG, f), "utf8");
    for (const m of sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
      actual.add(m[1]);
    }
  }
}

// ---------- ① 真库每张表必须被登记 ----------
for (const t of actual) {
  if (!(t in physical)) bad(`真库表 "${t}" 未在 naming-map.json 登记（新增表须登记或显式豁免，RECON-02 方案 A）`);
}

// ---------- ② 映射里的物理名必须真实存在 ----------
for (const [physicalName, meta] of Object.entries(physical)) {
  if (!actual.has(physicalName)) {
    bad(`naming-map.json 登记的物理表 "${physicalName}" 在 supabase/migrations 中找不到 create table（映射指向不存在的表）`);
  }
}

// ---------- ③ 概念名不可指向两张不同物理表（重复映射自检） ----------
const seen = {};
for (const [concept, physicalName] of Object.entries(conceptToPhysical)) {
  if (typeof physicalName === "string") {
    if (seen[concept] && seen[concept] !== physicalName) bad(`概念名 "${concept}" 映射到多张物理表：${seen[concept]} / ${physicalName}`);
    seen[concept] = physicalName;
  }
}

console.log(
  `NAMING_MAP schema=v${map.schema_version} ` +
  `registered=${Object.keys(physical).length} actual_tables=${actual.size} ` +
  `concept_mappings=${Object.keys(conceptToPhysical).length}`
);
if (failed) console.error("NAMING_ERROR 命名映射与真库不一致 → 须登记新表或修正映射（RECON-02 方案 A）");
process.exit(failed ? 1 : 0);
