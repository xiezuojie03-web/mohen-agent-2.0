// pipelines/research/research-runner.mjs — Discovery 生产链 runner（D01–D05 · Legacy-first）
//
// 用法：node pipelines/research/research-runner.mjs --scope LR-ADS-01 [--max-obs 3000] [--top-k 20]
//
// 启动前四道闸（任一不齐即不启动 / 降级为 DRY_RUN）：
//   ① 生产注册表：D01–D05 必须各自**恰好**命中一条声明，且 production_mode=discovery、
//      truth_write_ceiling=0（主协议 §5.2「未声明作业整轮不启动」）
//   ② 写范围：本次要写的表必须是注册表声明的 write_scope 子集（越界即停）
//   ③ MOHEN_WRITE_ENABLED=true（否则 DRY_RUN，只算不写）
//   ④ MOHEN_ENV ∈ {dev, staging}（写模式下必须）
//
// 为什么先算后写：DRY_RUN 与 WRITE 共用同一套计算（research-pipeline.mjs），
// 否则"预演 100 条、真跑 80 条"的分叉会让守卫与报告都失去意义。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, queryValue, PROJECT_ROOT } from "../../packages/data-access/src/index.mjs";
import {
  FETCHED, loadLexicon, d01Inventory, d02Observations, d03Mentions, d04Association, d05Selection,
  writeInventory, writeObservations, writeMentions, writeDependencies,
  writeSignals, writeCandidates, writeTasks, persist, loadCandidates,
} from "./research-pipeline.mjs";

// ---- args ----
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SCOPE = arg("scope", "LR-ADS-01");
// [2026-10-03 · 全量挖干] 默认值提高到"尽量读完"：轮转配额保证全部来源都被覆盖。
const MAX_OBS = Number(arg("max-obs", "20000"));
const MAX_PER_SOURCE = Number(arg("max-per-source", "500"));
const TOP_K = Number(arg("top-k", "20"));
const ONLY = arg("sources", "");
// --reset：重跑同一 scope 前先清掉旧 run（级联删除 8 张子表）。
// 用途：首轮曾因全局预算上限只覆盖部分来源，重跑深度版时旧结果会与新的并存、造成重复候选。
const RESET = args.includes("--reset");

const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";
if (WRITE && !(ENV === "dev" || ENV === "staging")) {
  console.error("STOP 写模式要求 MOHEN_ENV ∈ {dev, staging}，实际 " + ENV);
  process.exit(2);
}
const MODE = WRITE ? "WRITE" : "DRY_RUN";

// ---- 闸 ① 生产注册表 ----
const REG_PATH = path.join(PROJECT_ROOT, "specs/data-production/production-registry.json");
const reg = JSON.parse(fs.readFileSync(REG_PATH, "utf8"));
const JOBS = [
  "research.source-inventory", "research.content-observation", "research.mention-dependency",
  "research.association-scan", "research.humanistic-selection",
];
const declared = new Map();
for (const id of JOBS) {
  const hits = reg.jobs.filter((e) => e.id === id);
  if (hits.length !== 1) { console.error(`STOP ${id} 未在生产注册表中唯一声明（命中 ${hits.length}）`); process.exit(3); }
  const e = hits[0];
  if (e.production_mode !== "discovery") { console.error(`STOP ${id} production_mode=${e.production_mode}，应为 discovery`); process.exit(3); }
  if (e.truth_write_ceiling !== 0) { console.error(`STOP ${id} truth_write_ceiling=${e.truth_write_ceiling}，必须为 0`); process.exit(3); }
  if (e.unattended !== "allowed") { console.error(`STOP ${id} unattended=${e.unattended}，不允许无人值守`); process.exit(3); }
  declared.set(id, e);
}

// ---- 闸 ② 写范围 ----
const ALLOWED_TABLES = new Set();
for (const e of declared.values()) for (const t of e.write_scope || []) ALLOWED_TABLES.add(t);
const PLAN_TABLES = [
  "research_run", "research_source_inventory", "research_observation", "research_mention",
  "research_source_dependency", "research_signal", "research_association_candidate", "research_task",
];
for (const t of PLAN_TABLES) {
  if (!ALLOWED_TABLES.has(t)) { console.error(`STOP 本次要写的表 ${t} 不在任何 research 作业的 write_scope 内`); process.exit(3); }
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

console.log(`RESEARCH_RUN ${SCOPE} mode=${MODE} run_id=${RUN_ID} files=${files.length} max_obs=${MAX_OBS}`);

if (WRITE && RESET) {
  const n = await queryValue(
    `with del as (delete from research_run where research_scope = :'sc' returning 1) select count(*)::int from del`,
    { sc: SCOPE }
  );
  console.log(`RESET 已清除 scope=${SCOPE} 的旧 run：${n} 个`);
}

// ---- 登记 run（仅写模式）----
if (WRITE) {
  await run(
    `insert into research_run (run_id,job_id,production_mode,research_scope,params,status,write_enabled)
     values (:'rid'::uuid,'research.pipeline','discovery',:'sc',:'pm'::jsonb,'running',true)`,
    { rid: RUN_ID, sc: SCOPE, pm: JSON.stringify({ files: files.length, max_obs: MAX_OBS, top_k: TOP_K }) }
  );
}

const t0 = Date.now();
// D01
const { inv, parsed } = await d01Inventory({ run_id: RUN_ID, files });
// D02
const { obs, bySource } = d02Observations({ run_id: RUN_ID, inv, parsed, maxPerSource: MAX_PER_SOURCE, maxObs: MAX_OBS });
// D03
const { mentions, deps } = d03Mentions({ run_id: RUN_ID, obs, lexicon });
// D04
const { signals, candidates } = d04Association({ run_id: RUN_ID, obs, mentions });
// selection_policy（D05 契约）：**< 35 且未跨来源 → 仅保留 Signal，不进候选池**。
// 这不是"为了让数字好看"——单来源共现按定义不构成"新而可研究的候选"（G-LINK 反噪声）。
const kept = candidates.filter((c) => c.avs_score >= 35 || c._nSrc > 1);
const dropped_signal_only = candidates.length - kept.length;
// D05（先算，因为 disposition 要随候选一起落库）
const { selected, tasks, buckets, sorted } = d05Selection({ run_id: RUN_ID, candidates: kept, topK: TOP_K });
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

const stats = {
  scope: SCOPE, mode: MODE, run_id: RUN_ID,
  sources_total: files.length,
  inventory: inv.length,
  readable: inv.filter((x) => x.readability === "readable").length,
  catalog_only: inv.filter((x) => x.readability === "catalog_only").length,
  unreadable: inv.filter((x) => x.readability === "unreadable").length,
  observations: obs.length,
  observations_with_locator: obs.filter((o) => o.locator).length,
  mentions: mentions.length,
  mentions_resolved: mentions.filter((m) => m.resolution === "resolved").length,
  dependencies: deps.length,
  signals: signals.length,
  signals_total_pairs: candidates.length,
  dropped_signal_only,
  candidates: kept.length,
  cross_source_candidates: kept.filter((c) => c._nSrc > 1).length,
  buckets,
  selected: selected.length,
  tasks: tasks.length,
  elapsed_s: Number(elapsed),
};
console.log("STATS " + JSON.stringify(stats));

// ---- 落库（仅写模式）----
let written = 0;
if (WRITE) {
  written += await persist(writeInventory(inv));
  written += await persist(writeObservations(obs));
  written += await persist(writeMentions(mentions));
  written += await persist(writeDependencies(deps));
  written += await persist(writeSignals(signals));
  written += await persist(writeCandidates(kept));
  written += await persist(writeTasks(tasks));
  await run(`update research_run set status='completed', finished_at=now() where run_id=:'rid'::uuid`, { rid: RUN_ID });
  console.log(`WROTE rows=${written}`);
} else {
  console.log("DRY_RUN 未落库（设置 MOHEN_WRITE_ENABLED=true 且 MOHEN_ENV=dev 才写）");
}

// ---- 报告 ----
const topRows = WRITE ? await loadCandidates(RUN_ID) : sorted.slice(0, 30);
const md = [];
md.push(`# ${SCOPE} · Discovery Research 首轮执行报告`);
md.push("");
md.push(`> 模式 **${MODE}** ｜ run_id \`${RUN_ID}\` ｜ 产物目录 \`${path.relative(PROJECT_ROOT, OUT_DIR)}\``);
md.push(`> 依据：C3 V1.2 §2.9 · 主协议 V3.0 §12.2 · R16（Legacy-first）。**0 自动 Truth Promotion。**`);
md.push("");
md.push("## 1. 统计");
md.push("");
md.push("| 指标 | 值 |");
md.push("|---|---|");
for (const [k, v] of Object.entries(stats)) {
  md.push(`| ${k} | ${typeof v === "object" ? JSON.stringify(v) : v} |`);
}
md.push("");
md.push("## 2. 来源盘点（前 20）");
md.push("");
md.push("| 来源 | 载体类型 | 可读性 | Observation 数 |");
md.push("|---|---|---|---|");
for (const s of inv.slice(0, 20)) {
  md.push(`| ${s.source_ref} | ${s.carrier_type} | ${s.readability} | ${bySource[s.source_ref] || 0} |`);
}
md.push("");
md.push("## 3. Top 关联候选（按 AVS）");
md.push("");
md.push("| AVS | 主体 | 客体 | 处置 | 为什么有意思 |");
md.push("|---|---|---|---|---|");
for (const c of topRows.slice(0, 30)) {
  const wi = String(c.why_interesting || c.why || "").replace(/\|/g, "/").slice(0, 110);
  md.push(`| ${c.avs_score} | ${c.subject_ref} | ${c.object_ref} | ${c.disposition || (c.avs_score >= 35 ? "selected" : "long_tail")} | ${wi} |`);
}
md.push("");
md.push("## 4. 判读");
md.push("");
md.push(`- **跨来源候选 ${stats.cross_source_candidates} / ${stats.candidates}**：跨来源（非同一份材料的重复共现）才是"新而可研究"的信号。`);
md.push(`- **单来源候选 AVS 已被压到 34 以下**：反噪声规则（near / same_source / mentioned_in 不得单独形成高优先候选）在代码内生效，不是写在文档里。`);
md.push(`- **Selected ${stats.selected} 个**转入 \`research_task\`（directed_research），**未创建 review_queue** —— 首轮不制造人工债务。`);
if (stats.buckets.signal_only > stats.candidates * 0.8) {
  md.push(`- ⚠️ **STOP/REFINE 信号**：${stats.buckets.signal_only} 个候选低于 35 分（仅保留 Signal），说明本轮素材以弱共现为主，应先调算法/换载体，**不要扩大抓取**。`);
}
md.push("");
fs.writeFileSync(path.join(OUT_DIR, "result.md"), md.join("\n"), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "progress.json"), JSON.stringify({ stats, top: topRows.slice(0, 30) }, null, 2), "utf8");
console.log(`REPORT ${path.relative(PROJECT_ROOT, path.join(OUT_DIR, "result.md"))}`);
console.log("NEXT 跑 pnpm guard:research 校验本轮未越界（0 Truth 写入 / 0 自动晋级）");
