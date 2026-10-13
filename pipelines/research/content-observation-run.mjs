// pipelines/research/content-observation-run.mjs — 数据库治理第一阶段 · D02 内容解读层（唯一执行入口）
//
// 范围（项目拥有者 2026-10-05 裁定）：
//   · 唯一执行入口 = research-pipeline.mjs 的 research.content-observation 作业（D02）。
//   · 只读不抽：只生成 Observation / Mention；禁止写实体 / 关系 / 候选（D04/D05 一概不跑），
//     禁止任何 Truth Promotion（truth_write_ceiling = 0，库层 CHECK 兜底）。
//   · 禁用 unattended-runner 的 C1–C6 旧路线。
//   · 每条 Observation 必须带 locator / region / uncertainty（region 由 D02 派生，库层 + 守卫双校验）。
//   · 交付「来源材料被内容解读的覆盖率」报告，不以新增条数论英雄。
//
// 用法：
//   node pipelines/research/content-observation-run.mjs --scope DBGOV-D02-01 [--max-obs 20000] [--max-per-source 500] [--sources a.json,b.json]
//   MOHEN_WRITE_ENABLED=true MOHEN_ENV=dev node pipelines/research/content-observation-run.mjs --scope DBGOV-D02-01
//
// 落库表（全部 research_*，零 Truth）：research_run / research_source_inventory /
//   research_observation / research_mention / research_source_dependency。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, queryValue, PROJECT_ROOT } from "../../packages/data-access/src/index.mjs";
import {
  FETCHED, loadLexicon, d01Inventory, d02Observations, d03Mentions,
  writeInventory, writeObservations, writeMentions, writeDependencies,
  persist,
} from "./research-pipeline.mjs";

// ---- args ----
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SCOPE = arg("scope", "DBGOV-D02-01");
const MAX_OBS = Number(arg("max-obs", "20000"));
const MAX_PER_SOURCE = Number(arg("max-per-source", "500"));
const ONLY = arg("sources", "");
// --reset：重跑前清掉同 scope 的旧 run（级联删除 research_* 子表）。
const RESET = args.includes("--reset");

const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";
if (WRITE && !(ENV === "dev" || ENV === "staging")) {
  console.error("STOP 写模式要求 MOHEN_ENV ∈ {dev, staging}，实际 " + ENV);
  process.exit(2);
}
const MODE = WRITE ? "WRITE" : "DRY_RUN";

// ---- 闸 ① 生产注册表（仅本阶段用到的 3 个 research 作业）----
const REG_PATH = path.join(PROJECT_ROOT, "specs/data-production/production-registry.json");
const reg = JSON.parse(fs.readFileSync(REG_PATH, "utf8"));
const JOBS = ["research.source-inventory", "research.content-observation", "research.mention-dependency"];
const declared = new Map();
for (const id of JOBS) {
  const hits = reg.jobs.filter((e) => e.id === id);
  if (hits.length !== 1) { console.error(`STOP ${id} 未在生产注册表中唯一声明（命中 ${hits.length}）`); process.exit(3); }
  const e = hits[0];
  if (e.production_mode !== "discovery") { console.error(`STOP ${id} production_mode=${e.production_mode}（须 discovery）`); process.exit(3); }
  if (e.truth_write_ceiling !== 0) { console.error(`STOP ${id} truth_write_ceiling=${e.truth_write_ceiling}（须 0）`); process.exit(3); }
  if (e.unattended !== "allowed") { console.error(`STOP ${id} unattended=${e.unattended}（不允许）`); process.exit(3); }
  declared.set(id, e);
}

// ---- 闸 ② 写范围（只许 research_*，绝不许 Truth 表）----
const ALLOWED_TABLES = new Set();
for (const e of declared.values()) for (const t of e.write_scope || []) ALLOWED_TABLES.add(t);
const PLAN_TABLES = [
  "research_run", "research_source_inventory", "research_observation",
  "research_mention", "research_source_dependency",
];
const TRUTH_TABLES = ["entities", "claims", "relations", "cultural_relation_claims", "visual_assets",
  "evidence", "source_records", "historical_features", "historical_feature_anchors", "knowledge_paths"];
for (const t of PLAN_TABLES) {
  if (!ALLOWED_TABLES.has(t)) { console.error(`STOP 计划写 ${t} 不在本阶段作业 write_scope 内`); process.exit(3); }
  if (TRUTH_TABLES.includes(t)) { console.error(`STOP 计划写 Truth 表 ${t} —— 违反只读不抽`); process.exit(3); }
}

// ---- 素材（只读）----
if (!fs.existsSync(FETCHED)) { console.error(`STOP Legacy Reservoir 不可读：${FETCHED}`); process.exit(3); }
let files = fs.readdirSync(FETCHED).filter((f) => f.endsWith(".json")).sort();
if (ONLY) {
  const want = new Set(ONLY.split(",").map((s) => s.trim()).filter(Boolean));
  files = files.filter((f) => want.has(f));
}
if (!files.length) { console.error("STOP 没有可用素材文件"); process.exit(3); }

// ---- 词表（只读 legacy 自带材料；用于 mention 解析，绝不写 Entity）----
const lexicon = await loadLexicon();
console.log(`LEXICON places=${lexicon.places.size} persons=${lexicon.persons.size}`);

const RUN_ID = crypto.randomUUID();
const OUT_DIR = path.join(PROJECT_ROOT, "tasks", "results", `${SCOPE}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
fs.mkdirSync(OUT_DIR, { recursive: true });
console.log(`CONTENT_OBSERVATION ${SCOPE} mode=${MODE} run_id=${RUN_ID} files=${files.length} max_obs=${MAX_OBS} max_per_source=${MAX_PER_SOURCE}`);

// ---- 登记 run（仅写模式）----
if (WRITE && RESET) {
  const n = await queryValue(
    `with del as (delete from research_run where research_scope = :'sc' returning 1) select count(*)::int from del`,
    { sc: SCOPE }
  );
  console.log(`RESET 已清除 scope=${SCOPE} 的旧 run：${n} 个`);
}
if (WRITE) {
  await run(
    `insert into research_run (run_id,job_id,production_mode,research_scope,params,status,write_enabled)
     values (:'rid'::uuid,'research.content-observation','discovery',:'sc',:'pm'::jsonb,'running',true)`,
    { rid: RUN_ID, sc: SCOPE, pm: JSON.stringify({ files: files.length, max_obs: MAX_OBS, max_per_source: MAX_PER_SOURCE, phase: "D02-content-observation" }) }
  );
}

const t0 = Date.now();
// D01 · 来源盘点（只读，确定可读性）
const { inv, parsed } = await d01Inventory({ run_id: RUN_ID, files });
// D02 · 内容级观察（必须带 locator/region/uncertainty）
const { obs, bySource, fragsBySource } = d02Observations({ run_id: RUN_ID, inv, parsed, maxPerSource: MAX_PER_SOURCE, maxObs: MAX_OBS });
// D03 · 只读 Mention（允许 unresolved，绝不制造 unknown Entity）
const { mentions, deps } = d03Mentions({ run_id: RUN_ID, obs, lexicon });
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// ═══════════════════════════════════════════════════════════════════════════════
// 落库（仅写模式；只读不抽：不写 D04 候选 / D05 任务 / 任何 Truth 表）
// ═══════════════════════════════════════════════════════════════════════════════
let written = 0;
if (WRITE) {
  written += await persist(writeInventory(inv));
  written += await persist(writeObservations(obs));
  written += await persist(writeMentions(mentions));
  written += await persist(writeDependencies(deps));
  await run(`update research_run set status='completed', finished_at=now() where run_id=:'rid'::uuid`, { rid: RUN_ID });
  console.log(`WROTE rows=${written}（research_run+inventory+observation+mention+dependency，零 Truth）`);
} else {
  console.log("DRY_RUN 未落库（设 MOHEN_WRITE_ENABLED=true 且 MOHEN_ENV=dev 才写）");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 覆盖率报告（不以新增条数论英雄）
// ═══════════════════════════════════════════════════════════════════════════════
const isVisualCarrier = (c) => c === "image_catalog" || c === "historical_map";
const readable = inv.filter((x) => x.readability === "readable");
const catalogOnly = inv.filter((x) => x.readability === "catalog_only");
const unreadable = inv.filter((x) => x.readability === "unreadable");
const visualSources = readable.filter((x) => isVisualCarrier(x.carrier_type));
const textReadable = readable.filter((x) => !isVisualCarrier(x.carrier_type)); // D02 实际可读文本源

const totalFrags = Object.values(fragsBySource).reduce((a, b) => a + b, 0);
const totalObs = obs.length;
// 配额内可覆盖片段（每源上限 maxPerSource）
const quotaFrags = Object.entries(fragsBySource).reduce((a, [s, n]) => a + Math.min(n, MAX_PER_SOURCE), 0);
const obsCoverage = quotaFrags > 0 ? Math.min(100, (totalObs / quotaFrags) * 100) : 0;
const fullCoverage = totalFrags > 0 ? (totalObs / totalFrags) * 100 : 0;

// 真正被读（≥1 Observation）的来源
const readSources = new Set(obs.map((o) => o.source_id));
const textReadableRead = textReadable.filter((x) => readSources.has(x.source_ref)).length;
const sourceLevelCoverage = textReadable.length > 0 ? (textReadableRead / textReadable.length) * 100 : 0;

// 未读来源（明确原因，不靠条数掩盖）
const readReasons = [];
for (const s of inv) {
  if (readSources.has(s.source_ref)) continue;
  const frags = fragsBySource[s.source_ref] || 0;
  let why = "quota_exhausted";
  if (s.readability === "unreadable") why = "unreadable";
  else if (s.readability === "catalog_only") why = "catalog_only（仅结构/目录，无正文）";
  else if (isVisualCarrier(s.carrier_type)) why = "visual_carrier（无正文段落，需图读层，本轮不覆盖）";
  else if (frags === 0) why = "no_text_content（可读但无正文片段，如纯坐标/ID 数据）";
  readReasons.push({ source: s.source_ref, carrier: s.carrier_type, readability: s.readability, why, frags });
}

// 按载体类型聚合
const carrierAgg = {};
const addAgg = (c, k, v = 1) => { carrierAgg[c] = carrierAgg[c] || { sources: 0, readable: 0, frags: 0, obs: 0 }; carrierAgg[c][k] += v; };
for (const s of inv) addAgg(s.carrier_type, "sources");
for (const s of readable) addAgg(s.carrier_type, "readable");
for (const [s, n] of Object.entries(fragsBySource)) addAgg((inv.find((x) => x.source_ref === s) || {}).carrier_type || "?", "frags", n);
for (const [s, n] of Object.entries(bySource)) addAgg((inv.find((x) => x.source_ref === s) || {}).carrier_type || "?", "obs", n);

const modalityDist = {};
const readinessDist = {};
let obsWithLocator = 0, obsWithRegion = 0, obsWithUncertainty = 0;
for (const o of obs) {
  modalityDist[o.modality] = (modalityDist[o.modality] || 0) + 1;
  readinessDist[o.association_readiness] = (readinessDist[o.association_readiness] || 0) + 1;
  if (o.locator) obsWithLocator++;
  if (o.region) obsWithRegion++;
  if (o.uncertainty) obsWithUncertainty++;
}
const mentionsResolved = mentions.filter((m) => m.resolution === "resolved").length;

const report = {
  scope: SCOPE, mode: MODE, run_id: RUN_ID,
  sources_total: inv.length,
  readable: readable.length,
  text_readable: textReadable.length,
  visual_carrier_readable: visualSources.length,
  catalog_only: catalogOnly.length,
  unreadable: unreadable.length,
  // 覆盖率（核心指标）
  text_fragments_total: totalFrags,
  observations: totalObs,
  coverage_within_quota_pct: Number(obsCoverage.toFixed(1)),
  coverage_full_pct: Number(fullCoverage.toFixed(1)),
  source_level_coverage_pct: Number(sourceLevelCoverage.toFixed(1)),
  text_readable_sources_read: `${textReadableRead}/${textReadable.length}`,
  // 质量（每条 Observation 三件套）
  obs_with_locator: obsWithLocator,
  obs_with_region: obsWithRegion,
  obs_with_uncertainty: obsWithUncertainty,
  modality: modalityDist,
  association_readiness: readinessDist,
  // 只读不抽
  mentions: mentions.length,
  mentions_resolved: mentionsResolved,
  mentions_unresolved: mentions.length - mentionsResolved,
  entities_written: 0,
  relations_written: 0,
  candidates_written: 0,
  truth_promotions: 0,
  dependencies: deps.length,
  elapsed_s: Number(elapsed),
  unread_sources: readReasons,
  carrier_agg: carrierAgg,
};
console.log("REPORT " + JSON.stringify(report, null, 0));

// ---- 报告 markdown（覆盖率为主角）----
const pct = (n, d) => (d > 0 ? ((n / d) * 100).toFixed(1) : "0.0");
const md = [];
md.push(`# ${SCOPE} · 来源材料内容解读覆盖率报告（D02 内容解读层）`);
md.push("");
md.push(`> 模式 **${MODE}** ｜ run_id \`${RUN_ID}\` ｜ 阶段 = 数据库治理第一阶段 · 只读内容观察（D02）+ 只读 Mention（D03）`);
md.push(`> 唯一入口 \`research-pipeline.mjs\` 的 \`research.content-observation\` 作业。**0 实体 / 0 关系 / 0 候选 / 0 Truth Promotion。**`);
md.push("");
md.push("## 0. 一句话结论（以覆盖率为准，不以条数论英雄）");
md.push("");
md.push(`- **来源级覆盖**：可读文本来源 ${textReadableRead}/${textReadable.length} 已被内容解读（**${pct(textReadableRead, textReadable.length)}%**）。`);
md.push(`- **片段级覆盖（配额内）**：${totalObs} 条 Observation 覆盖了 ${quotaFrags} 个可抽样文本片段中的 **${pct(totalObs, quotaFrags)}%**（每源上限 ${MAX_PER_SOURCE}）。`);
md.push(`- **片段级覆盖（全量）**：占全量文本片段 ${totalFrags} 的 **${pct(totalObs, totalFrags)}%**（超出配额的源未全读，见 §4）。`);
md.push(`- **未读来源 ${readReasons.length} 个**（见 §4 名单与原因）—— 这是本阶段真正要补的缺口，不是"新增条数"。`);
md.push("");
md.push("## 1. 来源可读取总览");
md.push("");
md.push("| 指标 | 值 |");
md.push("|---|---|");
md.push(`| 来源总数 | ${inv.length} |`);
md.push(`| 可读（readable） | ${readable.length} |`);
md.push(`| └ 其中可读文本源（D02 实际覆盖对象） | ${textReadable.length} |`);
md.push(`| └ 其中视觉载体（无正文段落，本轮不覆盖） | ${visualSources.length} |`);
md.push(`| 仅目录/结构（catalog_only） | ${catalogOnly.length} |`);
md.push(`| 不可解析（unreadable） | ${unreadable.length} |`);
md.push(`| 文本片段总数（可读文本源） | ${totalFrags} |`);
md.push("");
md.push("## 2. 覆盖率（核心指标）");
md.push("");
md.push("| 覆盖率口径 | 分子 | 分母 | 覆盖 % |");
md.push("|---|---|---|---|");
md.push(`| 来源级（可读文本源被读到） | ${textReadableRead} | ${textReadable.length} | **${pct(textReadableRead, textReadable.length)}%** |`);
md.push(`| 片段级（配额内可抽样） | ${totalObs} | ${quotaFrags} | **${pct(totalObs, quotaFrags)}%** |`);
md.push(`| 片段级（全量文本片段） | ${totalObs} | ${totalFrags} | ${pct(totalObs, totalFrags)}% |`);
md.push("");
md.push(`> 说明：为防字母序靠后的来源被饿死（首轮缺陷），采用轮转配额（每源上限 ${MAX_PER_SOURCE}）。超出配额的大源按此口径为"未全读"，不计入分母失真。`);
md.push("");
md.push("## 3. 按载体类型的覆盖率");
md.push("");
md.push("| 载体类型 | 来源数 | 可读 | 文本片段 | Observation | 覆盖%（配额内） |");
md.push("|---|---|---|---|---|---|");
for (const [c, a] of Object.entries(carrierAgg)) {
  const frags = a.frags || 0, o = a.obs || 0;
  const qf = Math.min(frags, MAX_PER_SOURCE * (a.readable || 0));
  md.push(`| ${c} | ${a.sources} | ${a.readable} | ${frags} | ${o} | ${pct(o, qf || frags)}% |`);
}
md.push("");
md.push("## 4. 未读来源名单（本阶段要补的缺口）");
md.push("");
md.push(`共 **${readReasons.length}** 个来源未被内容解读：`);
md.push("");
md.push("| 来源 | 载体 | 可读性 | 原因 |");
md.push("|---|---|---|---|");
for (const r of readReasons) md.push(`| ${r.source} | ${r.carrier} | ${r.readability} | ${r.why} |`);
md.push("");
md.push("## 5. Observation 质量（每条必须 locator/region/uncertainty）");
md.push("");
md.push("| 校验项 | 满足数 / 总数 |");
md.push("|---|---|");
md.push(`| 带 locator | ${obsWithLocator}/${totalObs} |`);
md.push(`| 带 region | ${obsWithRegion}/${totalObs} |`);
md.push(`| 带 uncertainty | ${obsWithUncertainty}/${totalObs} |`);
md.push("");
md.push("modality 分布：" + JSON.stringify(modalityDist));
md.push("");
md.push("association_readiness 分布：" + JSON.stringify(readinessDist));
md.push("");
md.push("## 6. 只读不抽 · 安全确认");
md.push("");
md.push(`- Observation：${totalObs}（已落库=${WRITE}）`);
md.push(`- Mention：${mentions.length}（resolved=${mentionsResolved}，unresolved=${mentions.length - mentionsResolved}，**未制造任何 Entity**）`);
md.push(`- 来源依赖登记（转引/同源）：${deps.length}`);
md.push(`- **实体写入 = 0 ｜ 关系写入 = 0 ｜ 候选写入 = 0 ｜ Truth Promotion = 0**`);
md.push("");
md.push("## 7. 逐来源明细");
md.push("");
md.push("| 来源 | 载体 | 可读性 | 文本片段 | Observation | 覆盖%（配额内） |");
md.push("|---|---|---|---|---|---|");
for (const s of inv) {
  const frags = fragsBySource[s.source_ref] || 0;
  const o = bySource[s.source_ref] || 0;
  const qf = Math.min(frags, MAX_PER_SOURCE);
  if (s.readability !== "readable" || isVisualCarrier(s.carrier_type)) {
    md.push(`| ${s.source_ref} | ${s.carrier_type} | ${s.readability} | ${frags} | ${o} | —（非文本可读源） |`);
  } else {
    md.push(`| ${s.source_ref} | ${s.carrier_type} | ${s.readability} | ${frags} | ${o} | ${pct(o, qf || frags)}% |`);
  }
}
md.push("");
md.push(`> 生成于 ${new Date().toISOString()}，耗时 ${elapsed}s。`);
fs.writeFileSync(path.join(OUT_DIR, "coverage-report.md"), md.join("\n"), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`COVERAGE_REPORT ${path.relative(PROJECT_ROOT, path.join(OUT_DIR, "coverage-report.md"))}`);
console.log("NEXT 跑 pnpm guard:research 校验 0 Truth 写入 / 0 自动晋级 / 每条 Observation 有定位");
