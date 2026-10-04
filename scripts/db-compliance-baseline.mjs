// db-compliance-baseline.mjs — 只读合规基线（既有库 vs 协议 V2.0）
//
// 设计原则（MECHANISM-01 §8.6 / §8.3）：
//   · 本脚本**只发 SELECT 与 information_schema 查询**，绝不写库、绝不改数据。
//   · 冻结项（1246 夜跑图 / SHL-LEGACY-COORDS / visual_assets 写死 depicted_period / ESC-04 数据部分）
//     仅作"测量"，明确标注 FROZEN，不计入可立即处置的差距。
//   · 待拥有者裁定的 A 组（RECON-02 / ESC-02 / ESC-03 / ESC-05①③）标注 BLOCKED。
//
// 产出：tasks/results/DATA-PRODUCTION-BASELINE-01-result.md

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "tasks", "results", "DATA-PRODUCTION-BASELINE-01-result.md");

// ---------- 只读查询定义 ----------
const Q = [
  { id: "env", title: "当前连接数据库", sql: `select current_database() as db`, note: "确认测的是哪个库" },
  { id: "tables", title: "公开基表清单", sql: `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name`, note: "应有 ~28 张" },
  { id: "triggers", title: "各表门禁触发器（gate 覆盖）", sql: `select event_object_table as tbl, count(*) as n from information_schema.triggers where trigger_schema='public' group by 1 order by 1`, note: "已知 4 个：claims_require_evidence / discovery_not_publishable_guard / review_queue_tier_c_guard / vel_confirmed_requires_evidence" },
  { id: "sr_total", title: "source_records 总行数", sql: `select count(*) as n from source_records` },
  { id: "providers", title: "source_records 去重 provider 分布", sql: `select provider, count(*) as n from source_records group by provider order by n desc`, note: "真库 provider 字符串须能被 source-providers.json 归一解析（B-09）" },
  { id: "ent_status", title: "entities.status 取值分布", sql: `select status, count(*) from entities group by status order by 2 desc`, note: "状态表达应收敛到 C3 §4.1 一套（现状 8 种，B组）" },
  { id: "ent_dup", title: "entities.canonical_name 重复组数", sql: `select count(*) as dup_groups from (select canonical_name from entities group by canonical_name having count(*)>1) s`, note: "MECHANISM-01 记 367 组；属 E 组标识符治理（非冻结）" },
  { id: "claim_status", title: "claims.status 取值分布", sql: `select status, count(*) from claims group by status order by 2 desc` },
  { id: "ev_verif", title: "evidence.verification_status 取值分布", sql: `select verification_status, count(*) from evidence group by verification_status order by 2 desc`, note: "MECHANISM-01：8 个值仅用 verified/published" },
  { id: "ega_total", title: "evidence_gate_audit 总行数", sql: `select count(*) as n from evidence_gate_audit` },
  { id: "ega_cov", title: "evidence_gate_audit 按 object_type 覆盖", sql: `select object_type, count(*) from evidence_gate_audit group by object_type order by 2 desc`, note: "cultural_* 全未覆盖（B组）" },
  { id: "rq_total", title: "review_queue 总行数", sql: `select count(*) as n from review_queue` },
  { id: "rq_triage", title: "review_queue 三分分布", sql: `select coalesce(triage_outcome,'<null>') as triage, status, count(*) from review_queue group by 1,2 order by 1,2`, note: "AUTO/HOLD/REJECT 三分（M2 第四条）" },
  { id: "va_total", title: "visual_assets 总行数 [FROZEN]", sql: `select count(*) as n from visual_assets`, frozen: true },
  { id: "va_elig", title: "visual_assets.eligibility_status 分布 [FROZEN]", sql: `select eligibility_status, count(*) from visual_assets group by 1 order by 2 desc`, frozen: true, note: "R15 后默认 pending_review；既有图未处置" },
  { id: "cultural", title: "cultural_* 表存在性", sql: `select table_name from information_schema.tables where table_schema='public' and table_name like 'cultural_%' order by 1` },
  { id: "legacy_coords", title: "historical_features SHL-LEGACY-COORDS [FROZEN]", sql: `select count(*) as n, count(*) filter (where confidence=0) as zero_conf, count(*) filter (where cardinality(evidence_ids)=0) as no_ev from historical_features where slice_id='SHL-LEGACY-COORDS'`, frozen: true, note: "B-10：零证据零置信，数据处置冻结" },
  { id: "ingest_runs", title: "ingest_runs 总行数", sql: `select count(*) as n from ingest_runs`, note: "B-03：未来写入的 run 级归因闭合；既有 727 图仍无 run" },
];

async function runQuery(q) {
  try {
    const rows = await queryRows(q.sql);
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: String(e.message || e).split("\n")[0] };
  }
}

function rowsToMd(rows, cap = 60) {
  if (!rows.length) return "_（0 行）_\n";
  const cols = Object.keys(rows[0]);
  const show = rows.slice(0, cap);
  let md = "| " + cols.join(" | ") + " |\n";
  md += "| " + cols.map(() => "---").join(" | ") + " |\n";
  for (const r of show) md += "| " + cols.map((c) => String(r[c] ?? "")).join(" | ") + " |\n";
  if (rows.length > cap) md += `\n_（仅显示前 ${cap} / 共 ${rows.length} 行）_\n`;
  return md;
}

// ---------- 跑相关 guard:* ----------
const GUARDS = ["registry", "identifiers", "acquisition", "source-gate", "reconciliation", "promotion", "triage", "escalations"];
function runGuards() {
  const out = [];
  for (const g of GUARDS) {
    try {
      const r = execSync(`pnpm guard:${g}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
      out.push({ g, ok: true, tail: r.trim().split("\n").slice(-6).join("\n") });
    } catch (e) {
      const msg = e.stdout ? e.stdout.toString() : "" + (e.stderr ? e.stderr.toString() : "");
      out.push({ g, ok: false, tail: msg.trim().split("\n").slice(-8).join("\n") });
    }
  }
  return out;
}

// ---------- 主流程 ----------
const db = (await queryValue(`select current_database()`).catch(() => null)) || "(未知)";
const guardResults = runGuards();
const sections = [];
for (const q of Q) {
  const res = await runQuery(q);
  let body;
  if (res.ok) {
    body = rowsToMd(res.rows, q.id === "providers" ? 40 : 30);
  } else {
    body = `_查询失败（列/表可能不存在或连接问题）：\`${res.error}\`_`;
  }
  const tag = q.frozen ? " 🧊FROZEN" : "";
  const note = q.note ? `\n> 注：${q.note}\n` : "";
  sections.push(`### ${q.title}${tag}\n\n\`\`\`sql\n${q.sql}\n\`\`\n${body}${note}`);
}

const guardMd = guardResults
  .map((r) => `**guard:${r.g}** — ${r.ok ? "✅ PASS" : "❌ FAIL"}\n\`\`\`\n${r.tail || "(无输出)"}\n\`\`\``)
  .join("\n\n");

const now = new Date().toISOString().slice(0, 19).replace("T", " ");
const md = `# DATA-PRODUCTION-BASELINE-01 · 既有库 vs 协议 V2.0 合规基线（只读）

- **生成时间**：${now}
- **目标库**：\`${db}\`
- **依据协议**：\`specs/data-production/MoHen_Data_Production_Protocol.md\` V2.0
- **性质**：**只读测量**，未执行任何写/DDL；冻结项仅测量不处置。
- **冻结边界**：1246 夜跑图 · SHL-LEGACY-COORDS · visual_assets 写死 depicted_period · ESC-04 数据部分 —— 标注 🧊FROZEN，不计入可处置差距。
- **A 组 BLOCKED**：RECON-02 命名分叉 · ESC-02 双 relation · ESC-03 modern_location · ESC-05①③ —— 需拥有者裁定，不擅自动。

---

## 1｜守卫运行（guard:* 协议层校验）

${guardMd}

---

## 2｜既有库测量（只读 SQL）

${sections.join("\n\n")}

---

## 3｜差距初判（供下一步完善，待分类）

> 本表为读数的**初步归类**，最终处置范围须遵守上方冻结/A 组边界。

| 维度 | 读数 | 归类 |
|---|---|---|
| provider 字符串能否被 source-providers.json 解析 | 见 §2 providers + guard:source-gate | A:若 guard 通过则已闭合；否则 B-09 残留 |
| 状态表达种数（entities/claims/evidence） | 见 §2 各 status 分布 | B 组（收敛，非冻结） |
| evidence_gate_audit 是否覆盖 cultural_* | 见 §2 ega_cov + cultural | B 组（覆盖缺失） |
| visual_assets.eligibility_status | 见 §2 va_elig 🧊 | FROZEN，不处置 |
| review_queue 三分是否齐备 | 见 §2 rq_triage | 已落地（M2），核对即可 |
| entities.canonical_name 重名 | 见 §2 ent_dup | E 组（标识符治理，非冻结） |
| SHL-LEGACY-COORDS 零证据 | 见 §2 legacy_coords 🧊 | FROZEN（B-10） |

*基线完成。后续"完善既有库"应逐项对照本基线，仅对 B 组 / E 组（非冻结）动作，且始终保持只读可回滚。*
`;

fs.writeFileSync(OUT, md, "utf8");
console.log(`✅ 基线已写入 ${OUT}`);
console.log(`   目标库=${db}  表查询 ${Q.length} 项  守卫 ${guardResults.length} 项`);
for (const r of guardResults) console.log(`   guard:${r.g} -> ${r.ok ? "PASS" : "FAIL"}`);
