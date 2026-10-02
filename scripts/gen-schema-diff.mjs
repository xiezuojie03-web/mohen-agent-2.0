// scripts/gen-schema-diff.mjs
// 全库实测对照：宪法（C3 V1.1）要求的全部对象 vs 真实 PostgreSQL 现状
// 宪法对象清单来源：C3 §2.1–§2.5（L0–L7）· §5.3（Visual Asset）· §6.1（schema 分组与 18 张最小核心表）
// 真实落点：grep supabase/migrations 并经本次 live 查询复核（不依赖 09-26 旧审计的静态结论）
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

const OUT = path.join("tasks/results", "SCHEMA-DIFF-20261002.html");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const live = await queryRows(`select table_name from information_schema.tables where table_schema='public'`);
const liveSet = new Set(live.map((r) => r.table_name));
const views = await queryRows(`select table_name from information_schema.views where table_schema='public'`);
const viewSet = new Set(views.map((r) => r.table_name));
const rowsOf = new Map();
for (const t of liveSet) rowsOf.set(t, Number(await queryValue(`select count(*) from "${t}"`)));

// 宪法对象 → 真实落点（分组依据 C3 §6.1；判定沿用迁移 map 的 KEEP/NEW/DEFERRED 语义，但 live 复核）
const G = [
 ["L0 Source", [
  ["source_record", "source_records", "KEEP", "仅复数名差"],
  ["source_version", null, "NEW", "版本/checksum 维度未建模（低优先）"],
  ["raw_item", null, "DESIGN", "有意设计：raw 永留文件系统，靠 source_records.raw_path 指针"],
  ["ingestion_run", "ingest_runs", "KEEP", "仅复数名差"],
 ]],
 ["L1 Evidence", [
  ["evidence_fragment", "evidence_fragments", "KEEP", "另 001 evidence 为高层对象"],
  ["evidence_assessment", "evidence_gate_audit", "SPLIT", "无独立 assessment 表，语义分散在 audit + status 字段"],
  ["claim_evidence_link", "claim_evidence", "KEEP", "去 link 后缀"],
  ["conflict_set", "cultural_conflicts", "KEEP", "加 cultural_ 前缀"],
  ["human_review", "human_review_decisions", "KEEP", "加 _decisions"],
 ]],
 ["L2 Cultural World", [
  ["entity", "entities", "KEEP", "复数"],
  ["event", "cultural_events", "KEEP", "加 cultural_ 前缀"],
  ["relation_claim", "cultural_relation_claims", "DUAL", "⚠ 与 relations(001) 双存储并存"],
  ["change", "historical_change_records", "KEEP", "加 historical_ 前缀"],
  ["historical_space_claim", "historical_spatial_slices", "SPLIT", "拆为 5 张表（slices/features/anchors/change_records/spatial_relations）"],
  ["external_node", null, "NEW", "P1：关系扩展时需要"],
  ["visual_asset", "visual_assets", "KEEP", "复数"],
  ["visual_link", "visual_entity_links", "KEEP", "加 _entity_；带 2 个触发器守门"],
 ]],
 ["L3 Meaning", [
  ["meaning_candidate", "cultural_meaning_candidates", "KEEP", "加 cultural_ 前缀"],
  ["present_connection", "cultural_present_connections", "KEEP", "加 cultural_ 前缀"],
  ["open_question", null, "NEW", "P1：发现感关键，建议补"],
 ]],
 ["L4 Discovery", [
  ["world_projection", null, "DEFERRED", "doc 自认可后建；现由运行时 UNION 充当"],
  ["discovery_candidate", "discovery_candidates", "KEEP", "复数"],
  ["story_seed", null, "DEFERRED", "符合「Story 不是事实」"],
  ["agent_context_view", null, "DEFERRED", "派生/可重算"],
 ]],
 ["L5 Experience", [
  ["ExperienceState 等", null, "DEFERRED", "冻结 JSON 承载，符合「仅需要持久化时才建」"],
 ]],
 ["L6/L7 LATER", [
  ["Contribution/Trace/活态文化", null, "LATER", "doc 标 LATER，不应现在建"],
 ]],
];

// C3 §6.1 spatial / runtime_read 分组里的对象（上面未单列的）
const EXTRA = [
 ["spatial", "modern_location", null, "NEW", "P1「需要，防止空间混淆」；缺失与「现代坐标≠历史位置」红线冲突"],
 ["spatial", "spatial_anchor", "historical_feature_anchors", "KEEP", "以 historical_ 前缀实现"],
 ["spatial", "geometry_claim", null, "DEFERRED", "不提前批量生产历史 geometry，符合红线"],
 ["runtime_read", "materialized view", "effective_visual_assets", "KEEP", "视图形式，非表"],
];

const badge = (k) => ({
 KEEP: '<span class="b ok">已建</span>', NEW: '<span class="b no">未建</span>',
 DESIGN: '<span class="b dg">设计选择</span>', SPLIT: '<span class="b sp">拆分</span>',
 DUAL: '<span class="b du">双存储</span>', DEFERRED: '<span class="b df">延后</span>',
 LATER: '<span class="b df">LATER</span>',
}[k] || k);

const rowOf = (t) => t && liveSet.has(t) ? rowsOf.get(t) : null;
const cell = (t) => {
  if (!t) return `<span class="no">—</span>`;
  if (!liveSet.has(t)) return `<code>${esc(t)}</code> <span class="no">不存在</span>`;
  const n = rowsOf.get(t);
  return `<code>${esc(t)}</code> <span class="${n ? "yes" : "warn"}">${n} 行</span>`;
};

let nKeep = 0, nNew = 0, nEmpty = 0, nOther = 0;
for (const [, list] of G) for (const [, real, kind] of list) {
  if (kind === "KEEP") { nKeep++; if (real && liveSet.has(real) && rowsOf.get(real) === 0) nEmpty++; }
  else if (kind === "NEW") nNew++; else nOther++;
}
for (const [, , real, kind] of EXTRA) { if (kind === "KEEP") nKeep++; else if (kind === "NEW") nNew++; else nOther++; }

// 真库有、宪法未列的工程表
const mapped = new Set();
for (const [, list] of G) for (const [, real] of list) if (real) mapped.add(real);
for (const [, , real] of EXTRA) if (real) mapped.add(real);
const extra = [...liveSet].filter((t) => !mapped.has(t)).sort();

const html = `<!doctype html><meta charset="utf-8"><title>宪法要求 vs 真实数据库 · 全量对照</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1240px;margin:0 auto;padding:26px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:26px 0 8px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:16px;line-height:1.7}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
th{background:#f1f3f6;text-align:left;padding:9px 10px}td{padding:8px 10px;border-top:1px solid #eef0f3;vertical-align:top}
tr:hover td{background:#fafbfc}
.yes{color:#16a34a;font-weight:600}.no{color:#dc2626;font-weight:600}.warn{color:#b45309;font-weight:600}
.b{font-size:11px;padding:2px 8px;border-radius:11px;font-weight:600;white-space:nowrap}
.b.ok{background:#dcfce7;color:#15803d}.b.no{background:#fee2e2;color:#b91c1c}.b.dg{background:#e0e7ff;color:#3730a3}
.b.sp{background:#fef3c7;color:#92400e}.b.du{background:#fce7f3;color:#9d174d}.b.df{background:#f1f5f9;color:#475569}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px}.card .v{font-size:24px;font-weight:700}.card .k{font-size:12px;color:#6b7280}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin:10px 0}
.bad{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin:10px 0}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin:10px 0}
</style>
<div class="wrap">
<h1>宪法要求 vs 真实数据库 · 全量对照</h1>
<div class="sub">宪法对象清单：C3 V1.1 §2.1–§2.5（L0–L7 八层）· §5.3（Visual Asset 字段组）· §6.1（schema 分组与「最小核心表 18 张以内」）<br>
真实侧：<b>本次 live 查询实测</b>（${liveSet.size} 表 + ${viewSet.size} 视图），并复核 <code>supabase/migrations</code>（8 个迁移）。<b>不依赖 09-26 旧审计的静态结论。</b><br>
生成：${new Date().toISOString()}</div>

<div class="cards">
<div class="card"><div class="v">${liveSet.size}</div><div class="k">真实表总数</div></div>
<div class="card"><div class="v yes">${nKeep}</div><div class="k">宪法对象已落表</div></div>
<div class="card"><div class="v no">${nNew}</div><div class="k">真缺口（未建）</div></div>
<div class="card"><div class="v warn">${[...rowsOf].filter(([, v]) => v === 0).length}</div><div class="k">空表（0 行）</div></div>
<div class="card"><div class="v">${extra.length}</div><div class="k">真库独有的工程表</div></div>
</div>

${G.map(([g, list]) => `<h2>${g}</h2><table><tr><th>宪法对象</th><th>真实落点（live）</th><th>状态</th><th>说明</th></tr>
${list.map(([doc, real, kind, note]) => `<tr><td><code>${esc(doc)}</code></td><td>${cell(real)}</td><td>${badge(kind)}</td><td style="font-size:12px;color:#4b5563">${esc(note)}</td></tr>`).join("")}
</table>`).join("")}

<h2>C3 §6.1 分组中未单列的对象</h2>
<table><tr><th>分组</th><th>宪法对象</th><th>真实落点</th><th>状态</th><th>说明</th></tr>
${EXTRA.map(([g, doc, real, kind, note]) => `<tr><td><code>${g}</code></td><td><code>${esc(doc)}</code></td><td>${cell(real)}</td><td>${badge(kind)}</td><td style="font-size:12px;color:#4b5563">${esc(note)}</td></tr>`).join("")}
</table>

<h2>真库有、宪法未列的工程表（${extra.length}）</h2>
<table><tr><th>表</th><th>行数</th><th>作用（工程侧）</th></tr>
${extra.map((t) => `<tr><td><code>${esc(t)}</code></td><td class="${rowsOf.get(t) ? "yes" : "warn"}">${rowsOf.get(t)}</td><td style="font-size:12px;color:#4b5563">${{ legacy_mappings: "旧→新 ID 映射（迁移可追溯）", relations: "早期简化关系（与 cultural_relation_claims 并存 ⚠）", relation_evidence: "关系↔证据关联", evidence: "高层证据对象（001）", evidence_gate_audit: "Evidence Gate 审计流水", review_queue: "候选池 / 人工裁决队列", knowledge_paths: "知识脉络", knowledge_path_steps: "知识脉络步骤", claims: "Claim 对象", ingest_runs: "采集过程", source_records: "来源主记录" }[t] || "项目工程表"}</td></tr>`).join("")}
</table>

<h2>五个结构性差异（按严重度）</h2>
<div class="bad"><b>1. 命名分叉（最该修）</b>：宪法 PART VI 用<b>单数</b>（<code>source_record / event / relation_claim / visual_asset / evidence_fragment / human_review</code>），
真库是<b>复数 + 前缀</b>（<code>source_records / cultural_events / cultural_relation_claims / visual_assets / evidence_fragments / human_review_decisions</code>）。
后果：任何按宪法名写 SQL 或查 schema 的人都会误判表是否存在 —— <b>我前面把已存在的 <code>visual_entity_links</code> 误判为缺失，就是活例</b>。</div>
<div class="bad"><b>2. 双 relation 存储</b>：<code>relations</code>(001，${rowsOf.get("relations")} 行) 与 <code>cultural_relation_claims</code>(008，${rowsOf.get("cultural_relation_claims")} 行) 并存，
宪法假设单一 <code>relation_claim</code>。Agent 会读到两份不一致的关系。</div>
<div class="note"><b>3. epistemic 双轴未建模</b>：<code>verification_status</code>（8 值，管道阶段）与 <code>epistemic_status</code>（6 值，认识档位）两条轴并存，宪法只写了后者，读 status 易混淆。</div>
<div class="note"><b>4. 三个 P1 缺口未建</b>：<code>modern_location</code>（触及「现代坐标≠历史位置」红线）、<code>open_question</code>、<code>external_node</code>。
其中 <code>modern_location</code> 自 09-26 审计识别后一直停在「待你拍板」。</div>
<div class="ok"><b>5. raw 不进库（设计选择，非缺陷）</b>：<code>raw_item</code> 无表是有意为之 —— raw 永留文件系统，库只存元数据 + <code>raw_path</code> 指针。
但宪法未写明此决策，应补一句对齐。</div>

<h2>结论</h2>
<div class="note">
<b>概念覆盖率：高。</b>L0–L5 几乎所有宪法对象在真库都有落点，红线由触发器落地（如 <code>vel_confirmed_requires_evidence</code>、<code>review_queue_tier_c_guard</code>、<code>discovery_not_publishable_guard</code>）。<br>
<b>物理/命名一致性：低。</b>单数 vs 复数+前缀的分叉，是造成「以为缺表」的根源。<br>
<b>真空缺仅 3 个 P1</b>：<code>modern_location</code>、<code>open_question</code>、<code>external_node</code>；另有 <code>source_version</code> 为低优先主动取舍。<br>
<b>真实风险不在「表缺」，而在「表建了没填」</b>：如 <code>visual_entity_links</code> 已建但仅 ${rowsOf.get("visual_entity_links")} 行；<code>cultural_conflicts</code> ${rowsOf.get("cultural_conflicts")} 行等。
</div>
</div>`;

fs.writeFileSync(OUT, html, "utf8");
console.log("written " + OUT + " tables=" + liveSet.size + " keep=" + nKeep + " new=" + nNew + " extra=" + extra.length);
