// scripts/check-promotion-gate.mjs
// 目的：把「晋级闸门通则」（C3 §4.2）变成**可核对**的东西 —— 只读、不阻断写入。
//
// 通则：**任何表要把一行标成"可用 / 已发布"级别，必须能在 `evidence_gate_audit` 找到该对象的门禁记录。**
//
// 为什么需要它（实测背景）：
//   · 全库"晋级闸门"触发器只有 4 个（claims_require_evidence / discovery_not_publishable_guard /
//     review_queue_tier_c_guard / vel_confirmed_requires_evidence），**各管各的**，
//     没有一条管"从候选晋级到可用/已发布"；
//   · `verification_status` 枚举有 8 个值，实测**只用了 2 个**（candidate / evidence_linked）；
//     `verified` 与 `published` 全库 **0 行** —— 也就是说"没有违规"目前是因为**没人走到那一步**，
//     而不是因为有闸门拦着。本守卫让这件事**一旦发生就能被看见**。
//
// 检查项：
//   ① 对每个"可晋级"表：统计被标成可用/已发布、却**没有**对应门禁审计记录的行 → 逐表报出
//   ② 覆盖率：哪些表的门禁审计**一行都没有**（说明门禁从未在该表上跑过）
//   ③ 结构：表/列必须在真库中存在（防写错）
//   DB 不可达 → WARN 并跳过（离线可跑）。
//
// 只读保证：本脚本**只执行 SELECT**，不含任何 INSERT/UPDATE/DDL。
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

// 「可晋级」表清单：表 → (状态列, object_type, 视为"可用"的取值)
// 说明：object_type 取值来自 evidence_gate_audit 实际出现过的 7 类对象。
// [C6 · 2026-10-05] 末端状态取值与 supabase/migrations/202610050011 的 constraint trigger **逐字对齐**：
// 'verified' / 'published' 是既有口径，'adjudicated' / 'runtime_eligible' 是 C3 §4.1 的档位名。
// 两者必须同增同减 —— 守卫写着、库里没有（或反过来）正是本仓付过代价的失败模式。
// claims 不在此列：它的闸门是 `claims_require_evidence`（按 evidence_ids，不是按审计行），故口径保持原样。
const END_STATES = ["adjudicated", "runtime_eligible", "verified", "published"];
const GATED = [
  { table: "entities", col: "status", objectType: "entity", usable: END_STATES },
  { table: "relations", col: "status", objectType: "relation", usable: END_STATES },
  { table: "claims", col: "status", objectType: "claim", usable: ["verified", "published"] },
  { table: "evidence", col: "verification_status", objectType: "evidence", usable: END_STATES },
  { table: "visual_assets", col: "eligibility_status", objectType: "visual_asset", usable: ["gate_passed"] },
  { table: "historical_spatial_relations", col: "status", objectType: "historical_spatial_relation", usable: END_STATES },
  { table: "historical_features", col: "review_status", objectType: "historical_feature", usable: END_STATES },
  { table: "cultural_relation_claims", col: "review_status", objectType: "cultural_relation_claim", usable: END_STATES },
  { table: "cultural_meaning_candidates", col: "review_status", objectType: "cultural_meaning_candidate", usable: END_STATES },
  { table: "cultural_present_connections", col: "review_status", objectType: "cultural_present_connection", usable: END_STATES },
];

let failed = false;
const bad = (m) => { console.error("PROMOTION_GATE_ERROR " + m); failed = true; };

const cols = await queryRows(
  `select table_name, column_name from information_schema.columns where table_schema='public'`
);
const colSet = new Set(cols.map((r) => `${r.table_name}.${r.column_name}`));

// 主键列（用于与 evidence_gate_audit.object_id 比对）
async function pkOf(t) {
  const rows = await queryRows(
    `select a.attname as col
       from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = :'tbl'::regclass and i.indisprimary`,
    { tbl: t }
  );
  return rows.length ? rows[0].col : null;
}

let dbNote = "";
const violations = [];
const coverage = [];
try {
  for (const g of GATED) {
    if (!colSet.has(`${g.table}.${g.col}`)) { bad(`${g.table}.${g.col} 在真库中不存在（清单写错？）`); continue; }
    const pk = await pkOf(g.table);
    if (!pk) { bad(`${g.table} 没有主键，无法与门禁审计比对`); continue; }

    const list = g.usable.map((v) => `'${v}'`).join(",");
    // ★ 状态列是枚举时（entities / relations / evidence 用的是 `verification_status`），
    // 直接 `col in ('adjudicated', …)` 会让 PG 把字面量转成枚举而报错；
    // 转 text 再比较，非法字面量只是"不命中"（与迁移 202610050011 同一处坑）。
    const n = Number(await queryValue(
      `select count(*)::int from ${g.table} t
        where t.${g.col}::text in (${list})
          and not exists (
            select 1 from evidence_gate_audit a
             where a.object_type = :'ot' and a.object_id = t.${pk}::text)`,
      { ot: g.objectType }
    ));
    const marked = Number(await queryValue(
      `select count(*)::int from ${g.table} where ${g.col}::text in (${list})`
    ));
    const audited = Number(await queryValue(
      `select count(*)::int from evidence_gate_audit where object_type = :'ot'`, { ot: g.objectType }
    ));
    coverage.push({ table: g.table, col: g.col, marked, audited });
    if (n > 0) violations.push(`${g.table}.${g.col}（object_type=${g.objectType}）：**${n} 行**标为可用却无门禁记录（该列已标可用共 ${marked} 行）`);
  }
} catch (e) {
  dbNote = "WARN DB 不可达，跳过核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 140);
}

for (const v of violations) bad(v);

if (dbNote) console.error(dbNote);
console.log(`PROMOTION_GATE gated_tables=${GATED.length} violations=${violations.length} db_checked=${dbNote ? 0 : GATED.length}`);
for (const c of coverage) {
  const flag = c.audited === 0 ? "  ⚠️ 该表门禁审计 0 行（门禁从未在此表上跑过）" : "";
  console.log(`  · ${c.table}.${c.col}  已标可用=${c.marked}  门禁审计行=${c.audited}${flag}`);
}
process.exit(failed ? 1 : 0);
