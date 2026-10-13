// pipelines/legacy/unattended-runner.mjs
// 常驻无人值守生产 runner（**按需触发 + 截止时间**，非定时调度）：
//   · 用户现在发指令 → 本进程 detached 常驻 → 按 --until 截止时间自动收尾
//   · 每个周期只处理 1 个作业，job 间 sleep --interval-min 分钟（刻意减速，非秒级冲刺）
//   · 三道闸：MOHEN_WRITE_ENABLED!=true → DRY_RUN；MOHEN_ENV∈{dev,staging}
//   · 停止条件：截止时间 / STOP 文件 / 连续 3 次作业失败 / 写权限异常
//   · 幂等：按 legacy_id / checksum 跳过；可安全重复运行
//   · 到点输出：progress.json + runner.log + 执行报告 result.md
// 用法: node unattended-runner.mjs --until 06:00 [--interval-min 6] [--tag UNATTENDED-<date>]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";
import { resolveProvider } from "../../packages/data-access/src/source-gate.mjs";
import { assertAcquisitionDeclared, buildAcquisitionMeta } from "../../packages/data-access/src/acquisition-gate.mjs";

const LEGACY_SOURCE = "hushang_legacy";
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";

// ---- args ----
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const UNTIL = arg("until", "06:00");
const INTERVAL_MIN = Number(arg("interval-min", "6"));
const TAG = arg("tag", "UNATTENDED-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""));
const ONLY = arg("only", ""); // 仅跑指定作业（id 或 kind，逗号分隔）；用于单阶段验收
const OUT_DIR = path.join("tasks/results", TAG);
const STOP_FILE = path.join(OUT_DIR, "STOP");

const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";
if (WRITE && !(ENV === "dev" || ENV === "staging")) { console.error("STOP env"); process.exit(2); }
const MODE = WRITE ? "WRITE" : "DRY_RUN";

const uuid = () => crypto.randomUUID();
const sha = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

function cutoffDate(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const c = new Date(now); c.setHours(h, m, 0, 0);
  if (c <= now) c.setDate(c.getDate() + 1); // 明早
  return c;
}
const CUTOFF = cutoffDate(UNTIL);

// ═══════════════════════════════════════════════════════════════════════════════
// 启动决策（2026-10-02 · M1.2 生产注册表 + M1.3 preflight）
//
// 顺序刻意如此：**所有拒绝都发生在创建输出目录之前** —— 被拒绝的一轮不留下任何产物。
//
// 两道闸：
//   ① 生产注册表（M1.2）：未声明 / 声明不唯一的作业 → 整轮不启动（exit 3）；
//      unattended:"forbidden" 的作业 → 确定性剔除（不是失败，不计入连续失败）。
//   ② preflight（M1.3）：已声明允许、但**此刻前置条件不满足**的作业 → 开跑前剔除并告知。
//
// 为什么必须有 ②（本项目已付过的代价）：
//   图片作业因"源无法唯一确定"抛错 → 连续 3 次失败 → STOPPED_CONSECUTIVE_FAILURES
//   → **整轮报废**，后面 58 个安全的来源作业一个都跑不到。
//   「配置不全」与「跑出错」是两件事：前者应当在开跑前用确定性检查挡下，而不是烧掉一整轮。
//
// preflight 的边界：只做**确定性前置检查**（文件在不在 / 结构能不能解析 / 唯一性够不够），
// 不读业务内容、不做判断、不预测结果质量。
// ═══════════════════════════════════════════════════════════════════════════════
// 以下两组 import 分别对应「作业队列 / 生产注册表」与「执行报告三形态」两组机制，
// 故与各自使用处相邻（ESM 顶层声明会被提升，位置不影响语义）。
import { buildJobs, matchEntries, SOURCE_FILES } from "./unattended-jobs.mjs";
import { buildReport, renderMarkdown, renderHtml } from "./unattended-report.mjs";

const REGISTRY_PATH = "specs/data-production/production-registry.json";
let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
} catch (e) {
  console.error(`STOP 无法读取生产注册表 ${REGISTRY_PATH}：${(e && e.message) || e}`);
  console.error("     无人值守作业必须先在注册表里声明（协议 §12 / M1.2）。读不到注册表 = 不调度。");
  process.exit(3);
}
const REG_ENTRIES = Array.isArray(registry.jobs) ? registry.jobs : [];
const ALL_JOBS = buildJobs();
const RESOLVED = ALL_JOBS.map((j) => ({ job: j, hits: matchEntries(REG_ENTRIES, j.id) }));

// ---- 闸 ① 生产注册表 ----
const unresolved = RESOLVED.filter((r) => r.hits.length !== 1);
if (unresolved.length) {
  console.error(`STOP ${unresolved.length} 个作业未在生产注册表中唯一声明 —— 一律不调度：`);
  for (const r of unresolved) console.error(`     ${r.job.id}  (kind=${r.job.kind})  命中 ${r.hits.length} 条`);
  console.error(`     处置：在 ${REGISTRY_PATH} 里声明该作业（required_fields 全填），或从队列中移除。`);
  process.exit(3);
}
const forbidden = [];
const declared = RESOLVED.filter((r) => {
  const e = r.hits[0];
  if (e.unattended === "forbidden") {
    forbidden.push({ id: r.job.id, reason: e.unattended_reason || "(未写理由)" });
    return false;
  }
  return true;
}).map((r) => r.job);

// ---- 闸 ③ 来源门禁（2026-10-02 · M4.1）----
// 本批写库所用的 provider 必须已在 data/fixtures/source-providers.json 登记。
// **这不是新规则**，是让既有规则（SOURCE_REGISTRY 的 S1–S4 分级）真正生效——
// 它此前全仓无一行代码读取，因此"文档里写着、代码里没有"，什么也没挡住。
const gateInfo = resolveProvider(LEGACY_SOURCE);
if (!gateInfo.known) {
  console.error(`STOP 来源门禁拒绝：写库用的 provider "${LEGACY_SOURCE}" 未登记 —— 一律不调度。`);
  console.error("     处置：在 data/fixtures/source-providers.json 为它建 canonical 条目（tier / evidence_allowed / basis 必填）。");
  process.exit(3);
}

// ---- 闸 ② preflight ----
const readArr = (doc, keys) => keys.map((k) => doc[k]).find((a) => Array.isArray(a)) || [];

// [2026-10-03 · 缺陷修复] `queryRows` 走 psql --csv，**jsonb 列返回的是字符串**，不是对象。
// 原写法 `r.metadata_json.kind` 恒为 undefined ——「排除诗词源」与「图片源唯一确定」两个判断
// **从未真正生效**，4 个图片作业因此每次都被 preflight 静默剔除（一条照片也没写进库）。
const metaOf = (r) => {
  try { return typeof r.metadata_json === "string" ? JSON.parse(r.metadata_json) : (r.metadata_json || {}); }
  catch { return {}; }
};

/** 图片源必须唯一可确定（否则会像 727 张照片那样整批挂错 provenance）。 */
async function resolveImageSource() {
  const rows = await queryRows(
    `select source_id, title, content_type, metadata_json from source_records where provider=:'p'`,
    { p: LEGACY_SOURCE }
  );
  // [2026-10-03 · 全量挖干] 优先使用「图片批次专属来源」（metadata.kind = 'image_source'）。
  // 为什么：原逻辑要在 59 条 hushang_legacy 里"非诗词"者恰好 1 条才算唯一，实测永远不唯一，
  // 于是图片作业每次都被 preflight 静默剔除 —— 727 张可入库的照片被制度卡住，一条也没写。
  // 现在给图片批次建一条专属锚点来源，图片归属唯一确定，不再挂在「诗词」源上（2026-10-02 根因 1）。
  const dedicated = rows.filter((r) => metaOf(r).kind === "image_source");
  if (dedicated.length === 1) return { total: rows.length, candidates: dedicated };
  const candidates = rows.filter((r) => {
    const kind = metaOf(r).kind;
    return kind !== "poem_source" && !/诗词|poem/i.test(r.title || "");
  });
  return { total: rows.length, candidates };
}

let _imgSrc = null;
async function imageSourceCached() { if (!_imgSrc) _imgSrc = await resolveImageSource(); return _imgSrc; }

/** 只回答"这个作业现在能不能开跑"；不回答结果对不对。
 *  **铁律：检查项必须与作业实际会做的事一致——过严会静默丢掉合法工作。** */
async function preflight(j) {
  // 无本地源文件的生产作业（DB 操作）：直接放行，由各自 handler 操作数据库。
  if (j.kind === "source" && !j.file) return { ok: true };
  if (["gate", "evidence", "extraction", "resolution", "weave", "imagelink", "extid", "extvis", "nameres"].includes(j.kind)) return { ok: true };

  // 绑定单文件的作业（source 单文件 / images / coords）：必须能定位到本地源文件。
  const p = path.join(FETCHED, j.file);
  if (!fs.existsSync(p)) return { ok: false, reason: `源文件不存在：${j.file}` };
  if (j.kind === "source") return { ok: true, bytes: fs.statSync(p).size };

  if (j.kind === "images") {
    const r = await imageSourceCached();
    if (r.candidates.length !== 1) {
      return { ok: false, reason: `图片源无法唯一确定（hushang_legacy 源 ${r.total} 条，其中非诗词 ${r.candidates.length} 条）—— 须先为图片批次建立专属 source_record` };
    }
  }

  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { ok: false, reason: "JSON 解析失败" }; }
  // [2026-10-03 · 全量挖干] 键表过窄会让结构不同的来源被静默剔除（commons 两个批次曾因此一条未入）。
  // 与下方 jobImages 的读法保持一致，否则"preflight 说能跑、实际读到空数组"。
  const arr = j.kind === "coords"
    ? readArr(doc, ["filled", "items", "coords", "results", "data"])
    : readArr(doc, ["items", "images", "results", "data", "rows", "records", "entries", "list", "candidates", "known", "searched"]);
  if (!arr.length) return { ok: false, reason: "未识别出条目数组（JSON 结构不符）" };
  return { ok: true, entries: arr.length };
}

const preflightExcluded = [];
const RUNNABLE = [];
for (const j of declared) {
  let r;
  try { r = await preflight(j); }
  catch (e) { r = { ok: false, reason: "preflight 抛错：" + ((e && e.message) || e) }; }
  if (r.ok) RUNNABLE.push(j);
  else preflightExcluded.push({ id: j.id, kind: j.kind, reason: r.reason });
}

if (!RUNNABLE.length) {
  console.error("NOTHING_TO_RUN 本轮没有任何作业可跑（全部被注册表或 preflight 排除）：");
  for (const x of forbidden) console.error(`     [注册表 forbidden] ${x.id} — ${x.reason}`);
  for (const x of preflightExcluded) console.error(`     [preflight] ${x.id} — ${x.reason}`);
  console.error("     未创建任何输出目录，也未改动数据库。");
  process.exit(0);
}

// ---- 通过两道闸：现在才创建输出目录与日志 ----
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG = path.join(OUT_DIR, "runner.log");
const PROGRESS = path.join(OUT_DIR, "progress.json");
const log = (s) => { const line = `[${new Date().toISOString()}] ${s}\n`; fs.appendFileSync(LOG, line); process.stdout.write(line); };

const progress = { tag: TAG, mode: MODE, env: ENV, cutoff: CUTOFF.toISOString(), interval_min: INTERVAL_MIN,
  started_at: new Date().toISOString(), jobs: {}, counters: { jobs_done: 0, jobs_failed: 0, inserted: 0 }, failures: [], verdict: "" };
const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2), "utf8");

let jobs = RUNNABLE;
if (ONLY) {
  const set = new Set(ONLY.split(",").map((x) => x.trim()).filter(Boolean));
  jobs = RUNNABLE.filter((j) => set.has(j.id) || set.has(j.kind));
  log(`--only filter: ${RUNNABLE.length}→${jobs.length} (matched "${ONLY}")`);
}
progress.registry = {
  path: REGISTRY_PATH, entries: REG_ENTRIES.length,
  queued: ALL_JOBS.length, declared: declared.length, runnable: jobs.length,
  forbidden, preflight_excluded: preflightExcluded,
  source_gate: { provider: LEGACY_SOURCE, canonical: gateInfo.canonical, tier: gateInfo.tier, evidence_allowed: gateInfo.evidence_allowed },
};
for (const x of forbidden) log(`SKIP [注册表 forbidden]  ${x.id} — ${x.reason}`);
for (const x of preflightExcluded) log(`SKIP [preflight]  ${x.id} — ${x.reason}`);
log(`source-gate: ${LEGACY_SOURCE} → ${gateInfo.canonical}（${gateInfo.tier}，evidence_allowed=${gateInfo.evidence_allowed}）`);
log(`registry=${REGISTRY_PATH} entries=${REG_ENTRIES.length} queued=${ALL_JOBS.length} declared=${declared.length} runnable=${jobs.length} forbidden=${forbidden.length} preflight_excluded=${preflightExcluded.length}`);

// ── [M2 第四条 · B-03] 本轮 run 登记（run 级归因）──────────────────────────────
// 此前"本批"只能按时间窗口径（断点 B-03：727 张图无任何 ingest_runs 行）。
// 从本轮起：WRITE 模式先登记 ingest_runs，所有分诊行带 ingest_run_id 出生
// （迁移 202610020009）；DRY_RUN 不写库，故无 run 行（报告归因仍为时间窗口径）。
let ingestRunId = null;
if (WRITE) {
  ingestRunId = await queryValue(
    `insert into ingest_runs (pipeline_name, source_scope) values ('unattended-runner', :'scope') returning ingest_run_id::text`,
    { scope: TAG }
  );
  progress.ingest_run_id = ingestRunId;
  log(`ingest_run registered: ${ingestRunId}`);
}
save();

// ---- 作业实现 ----

// ── [M2 第四条 · B-02 正解] review_queue 三分（迁移 202610020009）─────────────
// 「任何写入 Candidate 及以上层的作业，必须同时产生 review_queue 行（AUTO/HOLD/REJECT 三分）」
// —— 不是回头补旧数据（那是冻结中的 M5），而是让**未来**每次候选写入都带分诊记录出生。
// 三分语义（协议 #5；库层触发器 guard_review_queue_triage 强制出生形态）：
//   auto   = 确定性晋级（Tier C 禁止；必记规则 review_note）
//   hold   = 隔离区（出生 pending，定案权在人）
//   reject = 自动拒绝（出生 rejected；对象未成为候选也留痕）
// on conflict do nothing：同 run 同对象幂等（唯一部分索引 uq_review_queue_triage_per_run）。
const triHold = (ot, oid, rc, sum, tier = "C") =>
  ({ ot, oid, tier, rc, sum, tri: "hold", st: "pending" });
const triReject = (ot, oid, rc, sum) =>
  ({ ot, oid, tier: "C", rc, sum, tri: "reject", st: "rejected",
     note: "rule: unattended-runner fail-closed（协议 #5 REJECT）" });

async function recordTriage(rows) {
  if (!WRITE || !ingestRunId || !rows.length) return 0;
  await runMany(rows.map((t) => ({
    sql: `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status,review_note,triage_outcome,ingest_run_id)
          values (:'ot',:'oid',:'tier',:'rc',:'sum',:'st',:'note',:'tri',:'rid'::uuid)
          on conflict do nothing`,
    params: { note: null, ...t, rid: ingestRunId },
  })));
  return rows.length;
}

async function snapshotOne(file) {
  const p = path.join(FETCHED, file);
  if (!fs.existsSync(p)) return { inserted: 0, skipped: 1, note: "file-missing:" + file };
  const txt = fs.readFileSync(p, "utf8");
  const cs = sha(txt);
  if (!WRITE) return { inserted: 0, would_insert: 1, note: "source_record:" + file };
  await run(`insert into source_records (source_id,provider,title,creator,source_date,content_type,license_code,checksum,raw_path,metadata_json)
    values (:'sid'::uuid,:'p',:'t','沪上经纬旧库',null,'application/json','legacy-transfer',:'cs',:'rp',:'mj'::jsonb)
    on conflict (provider,checksum) do nothing`,
    { sid: uuid(), p: LEGACY_SOURCE, t: "沪上经纬-" + file, cs, rp: `<RAW_STORE>/legacy/hushang/${file}`, mj: JSON.stringify({ kind: "legacy_source_file", file }) });
  const rawDir = path.join(RAW_STORE, "legacy", "hushang");
  fs.mkdirSync(rawDir, { recursive: true });
  const dest = path.join(rawDir, file);
  if (!fs.existsSync(dest)) fs.copyFileSync(p, dest);
  return { inserted: 1 };
}

async function jobSource(j) {
  return snapshotOne(j.file);
}

// N02（协议 §1.1 阶段 02 · L0 来源刷新）：全量重扫旧库预抓取 JSON，幂等登记 source_records + Raw 快照。
async function jobSourceRefresh(j) {
  let inserted = 0, skipped = 0, would = 0;
  for (const f of SOURCE_FILES) {
    const r = await snapshotOne(f);
    inserted += r.inserted || 0; would += r.would_insert || 0; skipped += r.skipped || 0;
  }
  return { ok: true, total: SOURCE_FILES.length, inserted, would_insert: would, skipped };
}

async function jobImages(j) {
  const p = path.join(FETCHED, j.file);
  if (!fs.existsSync(p)) return { ok: false, skipped: true, note: "file-missing" };
  let doc; try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { ok: false, note: "bad-json" }; }
  const arr = ["items", "images", "results", "data", "rows", "records", "entries", "list", "candidates", "known", "searched"]
    .map((k) => doc[k]).find((a) => Array.isArray(a)) || [];
  // [2026-10-02 修复 · 根因 1] 原为无 ORDER BY / 无过滤的 `select source_id ... where provider=:'p'`，取"任意一行"。
  // 实际后果：727 张照片被挂到名为「沪上经纬诗词-souyun_poems_by_person.json」的源记录上，provenance 完全错位。
  // 现要求"图片源"唯一可确定；否则 fail loud，绝不猜。
  const srcCandidates = await queryRows(
    `select source_id, title, content_type, metadata_json from source_records where provider=:'p'`,
    { p: LEGACY_SOURCE }
  );
  const dedicated = srcCandidates.filter((r) => metaOf(r).kind === "image_source");
  const imageSources = dedicated.length === 1 ? dedicated : srcCandidates.filter((r) => {
    const kind = metaOf(r).kind;
    return kind !== "poem_source" && !/诗词|poem/i.test(r.title || "");
  });
  if (imageSources.length !== 1) {
    throw new Error(
      `jobImages: 图片源无法唯一确定（hushang_legacy 源 ${srcCandidates.length} 条，其中非诗词 ${imageSources.length} 条）。` +
      `拒绝猜测——须先为图片批次建立专属 source_record 后重跑。`
    );
  }
  const srcId = imageSources[0].source_id;

  // [2026-10-02 修复 · 根因 2] 跨批幂等：原只按 legacy_id 去重，而各脚本 legacy_id 规则不同
  // （`https:…` / `File:标题` / `sha(url)` / `hushang-jingwei:shl:…`），导致同一张图被重复入库（实测 14 组）。
  const exist = await queryRows(`select legacy_id, file_path from visual_assets`);
  const normUrl = (u) => String(u || "").split("?")[0].trim();
  const existSet = new Set(exist.map((r) => r.legacy_id).filter(Boolean));
  const existPaths = new Set(exist.map((r) => normUrl(r.file_path)).filter(Boolean));

  const items = [];
  const triage = []; // [M2 第四条] 每个候选层写入必须带 review_queue 三分行出生
  let skipped = 0, badStatus = 0, unverified = 0, notImage = 0;
  for (const im of arr) {
    const url = im.url || im.thumb || im.file_path || im.image || null;
    if (!url) { skipped++; continue; } // 无 URL＝无法识别对象，无从分诊（只计数）

    // [2026-10-02 修复 · 根因 3] 原为 fail-open：`im._http` 缺失或 status 为 0/null 时整条判断短路，
    // 坏链接直接入库（实际后果：23 张 HTTP 非 200 死链入库）。现改为 fail-closed：未知域状态未知一律不收。
    // [2026-10-04 加固] Commons 等可信域的规范 URL（无 _http 状态）视为可用候选（仍 pending_review，不自动晋级），避免 38 张图这类 backlog 被静默丢弃。
    const TRUSTED_HOSTS = ["upload.wikimedia.org", "commons.wikimedia.org"];
    const host = (() => { try { return new URL(String(url)).host; } catch { return ""; } })();
    const httpStatus = im._http && im._http.status != null ? Number(im._http.status) : null;
    if (httpStatus == null) {
      if (TRUSTED_HOSTS.includes(host)) { /* 可信域：按 pending_review 收，仍不自动晋级 */ }
      else { unverified++; triage.push(triReject("visual_asset", String(url), "http_status_unknown", "HTTP 状态未知，fail-closed 不收")); continue; }
    } else if (httpStatus !== 200) { badStatus++; triage.push(triReject("visual_asset", String(url), "http_status_not_200", `HTTP ${httpStatus}，死链不收`)); continue; }

    // [2026-10-02 修复 · 根因 4] 非图片类型不再冒充 asset_type='image'（实测 29 个 .djvu 古籍扫描 + 1 个 .webm 视频）。
    const ext = (String(url).split("?")[0].match(/\.([a-z0-9]+)$/i) || [, ""])[1].toLowerCase();
    if (!["jpg", "jpeg", "png", "gif", "webp", "tif", "tiff", "bmp", "svg"].includes(ext)) { notImage++; triage.push(triReject("visual_asset", String(url), "non_image_mime", `非图片扩展名 .${ext}，拒绝冒充 image`)); continue; }

    const lid = String(url);
    if (existSet.has(lid) || existPaths.has(normUrl(url))) { skipped++; continue; }
    existSet.add(lid);
    existPaths.add(normUrl(url));
    if (!WRITE) continue;
    const aid = uuid();
    items.push({
      // [2026-10-02 修复 · 根因 5] 显式写入资格标记，不再依赖列默认 '{}'（"未排除即可用"）。
      // 未过门禁的新增图片一律标 pending_heritage_review，不再被静默视为可用。
      sql: `insert into visual_assets (asset_id,source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id,eligibility_tags)
            values (:'aid'::uuid,:'sid'::uuid,'image',:'fp',null,'unknown',:'rt',:'cs',:'lid',array['pending_heritage_review'])`,
      params: { aid, sid: srcId, fp: url, rt: im.license || "上海图书馆/Wikimedia 开放数据（授权待确认）", cs: sha(url), lid },
    });
    // [M2 第四条] auto_promote_policy=none → 一律 hold（B-02：候选图片必须进 review_queue）
    triage.push(triHold("visual_asset", aid, "pending_heritage_review", "候选图片：未过门禁（G0–G4 未评估），待人审（HR-5 / 协议 #5）"));
  }
  if (WRITE && items.length) await runMany(items);
  const triaged = await recordTriage(triage);
  return { ok: true, total: arr.length, inserted: items.length, triaged, skipped, bad_status: badStatus, unverified_status: unverified, not_image: notImage };
}

async function jobCoords(j) {
  const p = path.join(FETCHED, j.file);
  if (!fs.existsSync(p)) return { ok: false, skipped: true, note: "file-missing" };
  let doc; try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { ok: false, note: "bad-json" }; }
  const filled = Array.isArray(doc.filled) ? doc.filled : [];
  const entRows = await queryRows(`select entity_id, legacy_id from entities where legacy_id is not null`);
  const entMap = new Map(entRows.map((r) => [r.legacy_id, r.entity_id]));
  const existA = await queryRows(`select anchor_key from historical_feature_anchors`);
  const existASet = new Set(existA.map((r) => r.anchor_key));
  const triage = []; // [M2 第四条] 候选层写入必须带 review_queue 三分行出生
  let matched = 0, inserted = 0;
  for (const f of filled) {
    if (!(f.lat != null && f.lng != null)) continue;
    const eid = entMap.get(f.id);
    if (!eid) {
      // [M2 第四条] 注册表 hold_reasons: missing_entity_match —— 实体匹配失败必须 HOLD 留痕，不得静默丢弃
      triage.push(triHold("wikidata_item", "wd:" + f.id, "missing_entity_match",
        `旧库实体未匹配（Wikidata ${f.qid || f.id}）：${f.name || "(无名)"}`));
      continue;
    }
    matched++;
    const akey = "wd:" + f.id;
    if (existASet.has(akey)) continue;
    existASet.add(akey);
    if (!WRITE) continue;
    const fid = uuid();
    const anchorId = uuid();
    const fkey = "wd-feat:" + f.id;
    await run(`insert into historical_features
      (feature_id,feature_key,slice_id,feature_type,canonical_label,historical_labels,modern_labels,label_variants_note,
       geometry_type,geometry_note,attested_time_evidence_backed,legacy_only_assertions,attested_historical_existence,
       current_survival_or_site,historical_position_status,current_position_status,name_continuity_status,change_status,
       historical_source_refs,current_source_refs,evidence_ids,confidence,review_status,uncertainty_note,entity_id)
      values (:'fid'::uuid,:'fkey','SHL-LEGACY-COORDS','entity',:'cname','{}','{}','','point','',false,'{}','unknown',
       'unknown','unresolved','official_or_provider_object_point','unknown','unknown','{}','{}','{}',0,'candidate','',:'eid'::uuid)
      on conflict (feature_key) do nothing`,
      { fid, fkey, cname: f.name || f.id, eid });
    await run(`insert into historical_feature_anchors
      (anchor_id,anchor_key,feature_id,anchor_kind,spatial_status,geometry_type,coord_system,location_raw,lat,lng,
       crs_note,source_label,source_locator,exact_object_point,historical_position_proof,note)
      values (:'aid'::uuid,:'akey',:'fid'::uuid,'provider_current_object_point','official_or_provider_object_point','point',
       'WGS84',null,${Number(f.lat)},${Number(f.lng)},'','Wikidata P625',:'sloc',false,false,'现代坐标(Wikidata)；非历史位置证明')
      on conflict (anchor_key) do nothing`,
      { aid: anchorId, akey, fid, sloc: "wikidata:" + (f.qid || f.id) });
    inserted++;
    // [M2 第四条] 协议 #5 明令：历史地图锚点/空间重建 → HOLD；auto_promote_policy=none → 全部 hold
    triage.push(triHold("historical_feature", fid, "historical_spatial_requires_human",
      "现代坐标候选（SHL-LEGACY-COORDS）：空间内容必须有人值守判断（协议 #5 / #10）"));
    triage.push(triHold("historical_feature_anchor", anchorId, "historical_spatial_requires_human",
      "现代坐标锚点（Wikidata P625，WGS84）：非历史位置证明，待人审"));
  }
  const triaged = await recordTriage(triage);
  return { ok: true, filled: filled.length, matched, inserted, triaged };
}

// ── [C4 · 2026-10-04] unattended.image-link：1246 图（R25 解冻部分）并入主线 ──────
// 老项目 1246 张图此前库里只有 URL：无题录、无归属、无链接（"图有量、点开仍是零"）。
// 题录其实一直在老项目预抓取 JSON 里，只是入库时被丢弃：
//   · census727（上图记忆）：title / desc / place / town_hint / _file / _key
//   · commons519（Wikimedia）：File 标题 / description / date / towns[]
// 本作业从 Raw（FETCHED 目录）**离线重放**题录（0 网络请求），做三件事：
//   ① 题录 → evidence（L1，可定位回 JSON 条目）；
//   ② 图-实体链接（对象级 R1 点名 → suspected；镇域归属 R3 → unconfirmed）；
//   ③ 资格判定（G0 归属 / G1 身份 / G3 空间 / G4 证据）→ evidence_gate_audit 留痕。
// 红线（冻结项不处置）：**不修改 visual_assets 任何列**（pending/excluded 状态表达收敛留 C6）；
//   link_status 一律非 confirmed（confirmed 需人审 + 门禁，本作业零自动晋级）；
//   产物全部随生 review_queue 三分（有题录但身份未决才进人审，避免长尾制造人工债务）。
const IMAGE_BATCHES = [
  { file: "shanghai_images_census_20260905.json", arrKey: "items", batch: "census727" },
  { file: "commons_images.json", arrKey: "images", batch: "commons519" },
];
// 遗产对象字典：只用**已冻结的遗产对象**（老项目移植实体），刻意排除 C2 的 `unattended-ce:*`
// 启发式候选 —— 那批里混有「包括村 / 版的书」这类噪声，拿它点名等于批量误挂。
const DICT_STOP = new Set(["地名叠影", "古今叠影", "地名志沿革", "建置沿革", "传说掌故", "遗址", "其它", "其他", "人物", "事件"]);
// 题录标题形如「圆津禅院 · 建置沿革」「泰安桥 · 传说掌故」：类别后缀不是对象名，须剥掉后再匹配。
const stripCaptionTitle = (s) =>
  String(s || "")
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .split(/[·•|｜]/)[0]
    .replace(/[（(【].*?[)）】]/g, "")
    .trim();
const normUrlForMatch = (u) => String(u || "").split("?")[0].trim();

/** 题录索引：规范化 URL → {batch, cap, towns[], date, srcFile, locator}。纯本地读 Raw，无网络。 */
function buildCaptionIndex() {
  const idx = new Map();
  const missing = [];
  for (const b of IMAGE_BATCHES) {
    const p = path.join(FETCHED, b.file);
    if (!fs.existsSync(p)) { missing.push(b.file); continue; }
    let doc; try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { missing.push(b.file + "(bad-json)"); continue; }
    const arr = Array.isArray(doc[b.arrKey]) ? doc[b.arrKey] : [];
    for (const it of arr) {
      const key = normUrlForMatch(it.url || it.thumb);
      if (!key) continue;
      const towns = (Array.isArray(it.towns) && it.towns.length ? it.towns : (it.town_hint ? [it.town_hint] : []))
        .map((t) => String(t || "").trim()).filter(Boolean);
      // 题录文本：census 用 title/place（desc 是长叙事，含大量地名，会制造误命中，不参与点名匹配）；
      // commons 用 File 标题去后缀（description 多为英文/拼音重复标题）。
      const capParts = b.batch === "census727"
        ? [it.title, it.place]
        : [stripCaptionTitle(it.title)];
      const cap = capParts.filter((x) => x && String(x).trim()).join(" · ").trim();
      idx.set(key, {
        batch: b.batch, cap, towns, date: it.date || "",
        srcFile: b.file,
        locator: b.file + "#" + b.arrKey + "[url=" + key + "]",
        region: JSON.stringify({ file: b.file, batch: b.batch, url: key, _file: it._file || "", _key: it._key || "", towns }),
        desc: it.desc || it.description || "",
      });
    }
  }
  return { idx, missing };
}

/** 两套字典：镇域（R3 弱归属）与遗产对象（R1 点名）。
 *  为什么要拆开 + 去重（实测踩坑）：
 *   · 老项目移植把同一对象写了两行（`JZ-BLD-001` 与 `hushang-jingwei:entity:JZ-BLD-001`，canonical_name 相同），
 *     不去重会把"重复行"误判成"同名异义"—— 实测 253 张图被假 HOMONYM_CONFLICT 卡住；
 *   · 每个镇既有 `town-金泽` 又有 `place:金泽`，"金泽"既是镇名又出现在叠影实体名里 —— 若不拆字典，
 *     镇域归属会被判成歧义而丢掉。故：镇名一律走镇域字典（一镇一条，确定性择一），对象字典排除镇名。 */
async function buildEntityDict() {
  const ents = await queryRows(
    `select entity_id::text eid, canonical_name cn, entity_type et, legacy_id lid from entities
      where entity_type in ('place','building','town','gazetteer')
        and (legacy_id is null or legacy_id not like 'unattended-ce:%')
      order by entity_id`);

  // ① 镇域字典：entity_type='town' 或 legacy_id 前缀 'place:'（地名志沿革系列）→ 一镇一条
  const townTmp = new Map();
  for (const e of ents) {
    if (!(e.et === "town" || String(e.lid || "").startsWith("place:"))) continue;
    const nm = String(e.cn || "").split(/[·→]/)[0].trim();
    if (nm.length < 2) continue;
    const rank = e.et === "town" ? 0 : 1; // town 类型优先于 place:*（同名同义，取语义更准的一条）
    const cur = townTmp.get(nm);
    if (!cur || rank < cur.rank || (rank === cur.rank && e.eid < cur.eid)) townTmp.set(nm, { eid: e.eid, cn: e.cn, et: e.et, rank });
  }
  const townDict = new Map([...townTmp].map(([k, v]) => [k, { eid: v.eid, cn: v.cn, et: v.et }]));

  // ② 遗产对象字典：building + 古今/地名叠影（OVL）系列；同名按 canonical_name 去重
  const objTmp = new Map();
  for (const e of ents) {
    const isObj = e.et === "building" || String(e.lid || "").includes("-OVL-");
    if (!isObj) continue;
    for (const seg of String(e.cn || "").split(/[·→（）()【】\[\]]/)) {
      const s = seg.trim();
      if (s.length < 2 || DICT_STOP.has(s) || townDict.has(s)) continue;
      if (!objTmp.has(s)) objTmp.set(s, new Map());
      const m = objTmp.get(s);
      if (!m.has(e.cn)) m.set(e.cn, { eid: e.eid, cn: e.cn, et: e.et });
    }
  }
  const objectDict = new Map([...objTmp].map(([k, m]) => [k, [...m.values()].sort((a, b) => (a.eid < b.eid ? -1 : 1))]));
  // 长名优先（"嘉定孔庙" 先于 "嘉定"），避免短名截走长名的归属。
  const objectNames = [...objectDict.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  return { objectDict, objectNames, townDict, entityCount: ents.length };
}

async function jobImageLink(j) {
  const { idx, missing: missingFiles } = buildCaptionIndex();
  if (!idx.size) return { ok: false, note: "题录 JSON 不可读：" + missingFiles.join(",") };
  const { objectDict, objectNames, townDict, entityCount } = await buildEntityDict();
  if (!objectNames.length && !townDict.size) return { ok: false, note: "遗产对象/镇域字典均为空（entities 不可读）" };

  // ① 解冻范围：老项目 1246 图批次（provider=hushang_legacy 且非图片专用锚点源），
  //    且**排除既有 excluded**（那 48 张属冻结处置项，C4 只测量、不处置）。
  const assets = await queryRows(
    `select a.asset_id::text aid, a.file_path fp, a.legacy_id lid, a.depicted_period dp
       from visual_assets a join source_records s on s.source_id = a.source_id
      where s.provider = :'p' and coalesce(s.metadata_json->>'kind','') <> 'image_source'
        and a.eligibility_status <> 'excluded'
        and not exists (select 1 from legacy_mappings lm
                         where lm.legacy_source='unattended-image-link'
                           and lm.legacy_type='visual_asset' and lm.legacy_id = a.asset_id::text)
      order by a.asset_id`, { p: LEGACY_SOURCE });

  // ② 题录证据挂哪个 source_record：题录来自哪个 JSON，就挂那个 JSON 的 source（不再误挂"诗词源"）。
  const srcRows = await queryRows(
    `select source_id::text sid, metadata_json->>'file' f from source_records
      where metadata_json->>'file' in (:'f0', :'f1')`,
    { f0: IMAGE_BATCHES[0].file, f1: IMAGE_BATCHES[1].file });
  const srcByFile = new Map(srcRows.map((r) => [r.f, r.sid]));

  const evRows = [], linkRows = [], auditRows = [], triageRows = [], mapRows = [];
  let inScope = 0, withCaption = 0, unmatchedCaption = 0, objLinks = 0, townLinks = 0;
  let homonym = 0, noCaption = 0, townUnresolved = 0;
  const detCount = { named_object: 0, town_scope_only: 0, identity_unresolved: 0 };
  const batchCount = {};
  const townCount = {};

  for (const a of assets) {
    inScope++;
    const rec = idx.get(normUrlForMatch(a.fp)) || idx.get(normUrlForMatch(a.lid));
    batchCount[rec ? rec.batch : "unmatched"] = (batchCount[rec ? rec.batch : "unmatched"] || 0) + 1;
    const aid = a.aid;

    // ── ① 题录证据（有题录才建；无 locator 的题录不存在 —— locator 指向 JSON 条目本身）──
    let evId = null;
    if (rec && rec.cap) {
      withCaption++;
      const sid = srcByFile.get(rec.srcFile) || null;
      if (!sid) { unmatchedCaption++; }
      else {
        evId = uuid();
        const qt = (rec.cap + (rec.desc ? " —— " + String(rec.desc).slice(0, 200) : "")).slice(0, 900);
        evRows.push({
          sql: `insert into evidence (evidence_id, source_id, evidence_type, locator, quote_text, region_json,
                 place_hint, extraction_method, confidence, verification_status)
                values (:'eid'::uuid, :'sid'::uuid, 'image', :'loc', :'qt', :'rj'::jsonb, :'ph', 'unattended-image-link', 0.5, 'candidate')`,
          params: { eid: evId, sid, loc: rec.locator, qt, rj: rec.region, ph: rec.towns[0] || null },
        });
        for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"])
          auditRows.push({ ot: "evidence", oid: evId, gc: code, r: "pass",
            rs: `C4-image-link ${code} pass（题录可定位回 ${rec.srcFile}）` });
        triageRows.push(triHold("evidence", evId, "image_caption_candidate",
          `C4 图题录证据（${rec.batch}）：${rec.cap.slice(0, 40)}，待人审`));
      }
    } else {
      noCaption++;
    }

    // ── ② 对象级链接（R1：题录显式点名遗产对象）──
    let determination = "identity_unresolved";
    let objectMatched = false;
    let homonymThis = false;
    const labels = new Set();
    if (rec && rec.cap) {
      const cap = rec.cap;
      const hit = objectNames.find((n) => cap.includes(n));
      if (hit) {
        const ents = objectDict.get(hit);
        if (ents.length > 1) {
          // 同名多实体（如「放生桥」在朱家角与别处）→ 不自选边，HOLD。
          homonym++; homonymThis = true;
          triageRows.push(triHold("visual_asset", aid, "HOMONYM_CONFLICT",
            `C4 题录点名「${hit}」命中 ${ents.length} 个同名遗产对象 → 不自选边，待人审`));
        } else {
          const e = ents[0];
          const label = hit;
          if (!labels.has(label)) {
            labels.add(label);
            const lid = uuid();
            linkRows.push({
              sql: `insert into visual_entity_links
                    (link_id, asset_id, entity_id, depicted_entity_label, link_status, decision_rule,
                     decision_note, link_evidence_id, current_or_historical, name_variant_note,
                     eligibility_tags, generated_by)
                    values (:'lid'::uuid, :'aid'::uuid, :'eid'::uuid, :'lab', 'suspected', 'R1_caption_names_legacy_object',
                     :'dn', :'ev'::uuid, :'coh', :'nvn', array['pending_heritage_review'], 'unattended-image-link')
                    on conflict (asset_id, depicted_entity_label) do nothing`,
              params: { lid, aid, eid: e.eid, lab: label,
                dn: `题录「${rec.cap.slice(0, 40)}」显式点名遗产对象「${hit}」（${e.cn}）`,
                ev: evId, coh: periodKind(rec.date || a.dp), nvn: "" },
            });
            objLinks++;
            triageRows.push(triHold("visual_entity_link", lid, "IMAGE_LINK_SUSPECTED",
              `C4 图-实体链接（对象级 R1）：${hit} ← ${rec.batch}，待人审确认`));
          }
          objectMatched = true;
          determination = "named_object";
        }
      }
    }

    // ── ③ 镇域归属链接（R3：题录/结构给出的镇域，弱归属 —— 镇域不等于具体对象）──
    let townResolved = false;
    // 镇域候选：结构 town_hint/towns[] 优先，其次题录 place 字段（"南翔车站"这类含镇名的写法做包含匹配）
    const townCands = [...((rec && rec.towns) || [])];
    if (rec && rec.place && !townCands.includes(rec.place)) townCands.push(rec.place);
    for (const raw of townCands) {
      let t = raw, ent = townDict.get(raw);
      if (!ent) { const k = [...townDict.keys()].find((x) => raw.includes(x)); if (k) { t = k; ent = townDict.get(k); } }
      if (!ent) continue;
      townResolved = true;
      townCount[t] = (townCount[t] || 0) + 1;
      if (labels.has(t)) continue;
      labels.add(t);
      const lid = uuid();
      linkRows.push({
        sql: `insert into visual_entity_links
              (link_id, asset_id, entity_id, depicted_entity_label, link_status, decision_rule,
               decision_note, link_evidence_id, current_or_historical, name_variant_note,
               eligibility_tags, generated_by)
              values (:'lid'::uuid, :'aid'::uuid, :'eid'::uuid, :'lab', 'unconfirmed', 'R3_town_scope_attribution',
               :'dn', :'ev'::uuid, :'coh', :'nvn', array['pending_heritage_review'], 'unattended-image-link')
              on conflict (asset_id, depicted_entity_label) do nothing`,
        params: { lid, aid, eid: ent.eid, lab: t,
          dn: `题录/结构镇域「${t}」→ 弱归属（镇域不证明具体对象${objectMatched ? "；本图另有对象级链接" : ""}）`,
          ev: evId, coh: periodKind(rec && rec.date || a.dp), nvn: "" },
      });
      townLinks++;
      triageRows.push(triHold("visual_entity_link", lid, "IMAGE_LINK_TOWN_SCOPE",
        `C4 图-实体链接（镇域 R3，unconfirmed）：${t} ← ${rec ? rec.batch : "?"}，待人审`));
      break; // 一张图只挂一个镇域，避免多镇并挂放大误归属
    }
    if (!townResolved) townUnresolved++;
    if (determination === "identity_unresolved" && townResolved) determination = "town_scope_only";
    detCount[determination] = (detCount[determination] || 0) + 1;

    // ── ④ 资格判定留痕（G0 归属 / G1 身份 / G3 空间 / G4 证据）—— 只写 audit，不改资产行 ──
    auditRows.push({ ot: "visual_asset", oid: aid, gc: "G0", r: "pass",
      rs: "C4-image-link G0 pass：图属老项目 1246 批次且 source_record 可解析（R25 解冻范围，非既有 excluded）" });
    if (objectMatched) {
      auditRows.push({ ot: "visual_asset", oid: aid, gc: "G1", r: "pass", rs: "C4-image-link G1 pass：题录显式点名唯一遗产对象" });
    } else if (homonymThis) {
      // 注：evidence_gate_audit.result 库层只允许 pass/fail/pending —— "HOLD（未定案）" 落 pending，
      // 与 C1–C3 的口径一致；判定语义写在 reason 里，不自造第四种结果值。
      auditRows.push({ ot: "visual_asset", oid: aid, gc: "G1", r: "pending", rs: "C4-image-link G1 HOLD：题录点名命中多个同名遗产对象（HOMONYM_CONFLICT），不自选边" });
    } else {
      auditRows.push({ ot: "visual_asset", oid: aid, gc: "G1", r: "pending",
        rs: rec && rec.cap ? "C4-image-link G1 HOLD：题录未点名遗产对象字典内的对象（IMAGE_IDENTITY_UNRESOLVED）"
                           : "C4-image-link G1 HOLD：无题录文本，身份不可判定（IMAGE_IDENTITY_UNRESOLVED）" });
    }
    auditRows.push({ ot: "visual_asset", oid: aid, gc: "G3", r: townResolved ? "pass" : "pending",
      rs: townResolved ? "C4-image-link G3 pass：镇域/place 已解析到遗产对象字典" : "C4-image-link G3 HOLD：TOWN_SCOPE_UNRESOLVED（题录无镇域）" });
    auditRows.push({ ot: "visual_asset", oid: aid, gc: "G4", r: evId ? "pass" : "pending",
      rs: evId ? "C4-image-link G4 pass：链接绑定题录 evidence" : "C4-image-link G4 HOLD：NO_CAPTION_EVIDENCE（无题录可引）" });

    // 有题录但身份未决 = 真不确定项 → 送人审；无题录者只留 audit（避免无信息长尾制造人工债务）。
    if (!objectMatched && rec && rec.cap) {
      triageRows.push(triHold("visual_asset", aid, "IMAGE_IDENTITY_UNRESOLVED",
        `C4 资格判定：有题录「${rec.cap.slice(0, 40)}」但遗产对象字典未收录/同名冲突 → 待人审补实体或判无关`));
    }

    mapRows.push({
      sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id)
            values (:'mid'::uuid, 'unattended-image-link', 'visual_asset', :'lid', 'visual_asset', :'tid', 'candidate', 'unattended-image-link', 0.5, :'rid'::uuid)
            on conflict do nothing`,
      params: { mid: uuid(), lid: aid, tid: aid, rid: ingestRunId },
    });
  }

  if (WRITE) {
    if (evRows.length) await runManyBatched(evRows);
    if (linkRows.length) await runManyBatched(linkRows);
    if (auditRows.length) await runManyBatched(auditRows.map((x) => ({
      sql: `insert into evidence_gate_audit (object_type, object_id, gate_code, result, reason, actor_type)
            values (:'ot', :'oid', :'gc', :'r', :'rs', 'rule')`, params: x })));
    if (mapRows.length) await runManyBatched(mapRows);
    await recordTriage(triageRows);
  }

  return {
    ok: true, dry_run: !WRITE,
    in_scope: inScope, with_caption: withCaption, no_caption: noCaption,
    caption_source_unmatched: unmatchedCaption,
    evidence_new: WRITE ? evRows.length : 0, evidence_would: WRITE ? 0 : evRows.length,
    links_object: WRITE ? objLinks : 0, links_town: WRITE ? townLinks : 0,
    links_object_would: WRITE ? 0 : objLinks, links_town_would: WRITE ? 0 : townLinks,
    homonym_held: homonym, town_unresolved: townUnresolved,
    dict_objects: objectNames.length, dict_towns: townDict.size, dict_entities: entityCount,
    determination: detCount, by_batch: batchCount, top_towns: townCount,
    audit_rows: WRITE ? auditRows.length : 0, triaged: WRITE ? triageRows.length : 0,
    inserted: WRITE ? evRows.length + linkRows.length : 0,
    missing_files: missingFiles,
  };
}

/** depicted period → 现代/历史/未知；**现代照片永不成为历史状态证据**（SKILL Hard Rules）。 */
function periodKind(v) {
  const s = String(v || "");
  const m = s.match(/(1[89]\d{2}|20\d{2})/);
  if (!m) return /现代/.test(s) ? "current" : "unknown";
  const y = Number(m[1]);
  return y >= 2000 ? "current" : (y <= 1949 ? "historical" : "unknown");
}

// ── [C1 · 2026-10-04] unattended.evidence-fragment：L1 证据片段抽取 ─────────────
// 从已入库 source_records 的本地 corpus JSON（沪上经纬一手语料：诗词 content / 宗族 description /
// 人物 notes / 事件 description / 方志 OCR 等）抽取「可定位文本片段」，写入：
//   evidence（父：locator / quote_text / region_json / extraction_method）+ evidence_fragments（quote_fragment）。
// 红线：verification_status 恒 'candidate'，绝不 verified / published；locator 缺 → G0 HOLD（不写）；
// 每条候选出生即带 review_queue HOLD（auto_promote_policy=none）。幂等：source 已抽过则跳过。
const FRAG_PER_SOURCE = Number(process.env.MOHEN_FRAG_PER_SOURCE || "200"); // 每来源片段上限，保均匀覆盖

// ══ C2 · 2026-10-04 · candidate-extraction / deterministic-resolution 常量与工具 ══
const CE_PER_SOURCE = Number(process.env.MOHEN_CE_PER_SOURCE || "120"); // 每来源新候选实体上限，防单一大源主导
const CE_MAX = Number(process.env.MOHEN_CE_MAX || "5000");               // 单批新候选实体总上限
const CE_PAIRS_PER_EVIDENCE = Number(process.env.MOHEN_CE_PAIRS || "3"); // 每证据最多共现关系候选数
const CE_DISC_PER_SOURCE = Number(process.env.MOHEN_CE_DISC || "40");    // 每来源 discovery_candidates 上限

// 地名 / 建筑后缀 → entity_type 启发式
const SUFFIX_BUILDING = "桥寺庙观庵阁塔殿祠院书院学宫城隍亭坊署关";
const SUFFIX_PLACE = "庄镇乡村里都县府城山峰岭湖河浦塘泾浜汇荡泖泽渡埠港嘴坞洲渚巷街市园墟堰坝圩田舍宅泉潭门井";
const SUFFIX_CHARS = (SUFFIX_BUILDING + SUFFIX_PLACE).split("");
const BUILDING_SET = new Set(SUFFIX_BUILDING.split(""));
const TOKEN_RE = new RegExp("([一-鿿]{1,2}(?:" + SUFFIX_CHARS.join("|") + "))", "g");
const NAME_STOP = new Set(["上海", "中国", "江南", "此处", "此地", "吾乡", "故乡", "天下", "人间", "山中", "水边", "城外", "何处", "无地", "上图", "旧志"]);
// 抽取token首字若为文言虚词/动词/方位词，则整串为"X+地名"短语片段（如"之金泽""游金泽""吴中访金泽"），非实体名
const LEADING_STOP = new Set("之其此是于在据有为以而与之及将把被使令见访咏游过入出望登宿饮食宿醉题书读写闻听观看见思忆怀答赠送别和次循沿临傍依对向从自由于至到往来归去行步坐卧隐寓寄赋作吟歌咏寻陪奉酬谒".split(""));
const TOKEN_NUM = /[0-9０-９十百千万亿仟拾]/;

function guessType(name) {
  const last = name.slice(-1);
  if (BUILDING_SET.has(last) || /(?:桥|寺|庙|观|庵|阁|塔|殿|祠|院|书院|学宫|城隍|亭|坊|署|关)$/.test(name)) return "building";
  return "place";
}
function normName(s) {
  if (!s) return "";
  let t = String(s).replace(/[\s　]+/g, "")
    .replace(/^[「『"'（(【]*|[」』"'）)】。，、；：！？,.!?；：…—~～·]+$/g, "")
    .replace(/^(地名|古称|旧名|今名|别称|又名|亦称|俗称)[:：]?/, "");
  return t;
}
// 批量 runMany（避免超大单文件）：每批最多 size 行
async function runManyBatched(rows, size = 3000) {
  if (!rows || !rows.length) return 0;
  let n = 0;
  for (let i = 0; i < rows.length; i += size) {
    await runMany(rows.slice(i, i + size));
    n += Math.min(size, rows.length - i);
  }
  return n;
}

const CJK = /[一-鿿]/;
function isSubstantialText(s) {
  if (s.length < 24 || s.length > 1200) return false;       // 太短/太长都不算实质片段
  if (!CJK.test(s)) return false;                           // 老项目中文语料，必须含中文
  if (/^https?:\/\//.test(s)) return false;                 // 跳过 URL
  if (/data\.library\.sh\.cn|wikidata\.org|upload\.wikimedia|shanghai\.org/.test(s)) return false;
  if (/^[\d\s.,。、;:：\-/()（）]+$/.test(s)) return false;  // 纯数字/标点/编号
  return true;
}

function collectTextFragments(node, out, p = [], depth = 0) {
  if (out.limitReached || depth > 12) return;
  if (typeof node === "string") {
    const s = node.trim();
    if (isSubstantialText(s)) out.push({ text: s, path: p.slice() });
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) { if (out.limitReached) return; collectTextFragments(node[i], out, p.concat([i]), depth + 1); }
    return;
  }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) { if (out.limitReached) return; collectTextFragments(node[k], out, p.concat([k]), depth + 1); }
  }
}

// 长文本按句切分为 <=400 字的可引用片段
function chunkText(text, max = 400) {
  if (text.length <= max) return [text];
  const segs = text.split(/(?<=[。！？；;])/).filter(Boolean);
  const chunks = []; let cur = "";
  for (const s of segs) {
    if ((cur + s).length > max) { if (cur) chunks.push(cur); cur = s; } else cur += s;
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [text.slice(0, max)];
}

async function jobEvidenceFragment(j) {
  // ①  hygiene：残空 verification_status → candidate（保留历史行为）
  const nullBefore = await queryValue("select count(*) from evidence where verification_status is null", {});
  if (WRITE && nullBefore > 0) await run("update evidence set verification_status='candidate' where verification_status is null", {});

  // ②  老项目来源（带本地 corpus 文件），且尚未被本作业抽取过
  const srcRows = await queryRows(
    `select source_id, metadata_json from source_records
      where provider=:'p' and metadata_json->>'file' is not null
      order by source_id`, { p: LEGACY_SOURCE });
  const doneSources = new Set((await queryRows(
    `select distinct source_id::text from evidence where extraction_method='unattended-evidence-fragment'`, {}))
    .map((r) => r.source_id));

  const FRAG_DIRS = [FETCHED];
  let scanned = 0, fileMissing = 0, sourcesSkipped = 0, would = 0, inserted = 0, held = 0;
  const evidenceRows = [], fragRows = [], auditRows = [], triageRows = [];

  for (const s of srcRows) {
    const file = metaOf(s).file;
    if (!file) { sourcesSkipped++; continue; }
    if (doneSources.has(s.source_id)) { sourcesSkipped++; continue; } // 幂等：整源只抽一次
    let pth = null;
    for (const d of FRAG_DIRS) { const c = path.join(d, file); if (fs.existsSync(c)) { pth = c; break; } }
    if (!pth) { fileMissing++; continue; }
    let doc; try { doc = JSON.parse(fs.readFileSync(pth, "utf8")); } catch { fileMissing++; continue; }

    const out = { arr: [] };
    collectTextFragments(doc, out.arr);
    const seen = new Set();
    let perSource = 0;
    scanned++;
    for (const f of out.arr) {
      if (FRAG_PER_SOURCE && perSource >= FRAG_PER_SOURCE) break;       // 每来源上限，保均匀覆盖
      const chunks = chunkText(f.text);
      for (const ch of chunks) {
        if (FRAG_PER_SOURCE && perSource >= FRAG_PER_SOURCE) break;
        const h = sha(ch);
        if (seen.has(h)) continue; seen.add(h);                        // 同源内去重
        const eid = uuid();
        const loc = file + "#" + f.path.join(".");                     // locator 指向语料内位置（无 page 列→进 locator/region_json）
        const region = JSON.stringify({ file, json_path: f.path, source_id: s.source_id });
        evidenceRows.push({
          sql: `insert into evidence (evidence_id, source_id, evidence_type, locator, quote_text, region_json, extraction_method, confidence, verification_status)
                values (:'eid'::uuid, :'sid'::uuid, 'text', :'loc', :'qt', :'rj'::jsonb, 'unattended-evidence-fragment', 0.6, 'candidate')`,
          params: { eid, sid: s.source_id, loc, qt: ch, rj: region },
        });
        // evidence_fragments（quote_fragment NOT NULL）：1:1 挂到 evidence
        const fid = uuid();
        fragRows.push({
          sql: `insert into evidence_fragments (fragment_id, evidence_id, span_type, quote_fragment, usable_for_claim, usage_note)
                values (:'fid'::uuid, :'eid'::uuid, 'generic', :'qf', 'pending', :'un')`,
          params: { fid, eid, qf: ch, un: "corpus json: " + file },
        });
        // G0–G6 审计：locator 在、quote 在 → 全 pass；绝不自动晋级（占位审计，与既有 jobEvidence 一致）
        for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"])
          auditRows.push({ ot: "evidence", oid: eid, gc: code, r: "pass", rs: `C1-evidence-fragment ${code} pass` });
        triageRows.push(triHold("evidence", eid, "corpus_fragment_candidate",
          `C1 corpus 文本片段候选（${file} → ${f.path.join(".")}），待人审晋级`));
        if (WRITE) inserted++; else would++;
        perSource++;
      }
    }
  }

  if (WRITE && evidenceRows.length) {
    await runMany(evidenceRows);
    await runMany(fragRows);
    await runMany(auditRows.map((a) => ({
      sql: `insert into evidence_gate_audit (object_type, object_id, gate_code, result, reason, actor_type)
            values (:'ot', :'oid', :'gc', :'r', :'rs', 'rule')`, params: a })));
    await recordTriage(triageRows);
  }
  const nullAfter = await queryValue("select count(*) from evidence where verification_status is null", {});
  return { ok: true, dry_run: !WRITE, normalized: nullBefore - nullAfter,
    scanned_sources: scanned, file_missing: fileMissing, sources_skipped: sourcesSkipped,
    new_evidence: WRITE ? inserted : 0, new_fragments: WRITE ? inserted : 0,
    would_new: WRITE ? 0 : would, frag_per_source: FRAG_PER_SOURCE };
}

// ── [C2 · 2026-10-04] unattended.candidate-extraction：L2 候选实体 / 关系抽取 ──────
// 消费 C1 证据片段（extraction_method='unattended-evidence-fragment'），抽 Entity / Place /
// Relation 候选，写入候选库（entities / relations / claims / discovery_candidates）。
// 每条候选出生即带 review_queue HOLD 三分行 + G0–G6 审计。零自动晋级（verification_status 恒 candidate）。
// 幂等：已处理的 C1 evidence 由 legacy_mappings(legacy_source='unattended-ce',legacy_type='evidence') 标记跳过；
// 同名候选按 normalized(name+type) 本批去重。Write_scope 中的 cultural_* / historical_spatial_relations
// 属 C3 编织/投影范畴，本作业不落（C2 只建立实体/关系候选蓄水池供其消费）。
async function jobExtraction(j) {
  // ① 已处理的证据（processing provenance）集合
  const doneRows = await queryRows(
    `select legacy_id from legacy_mappings
      where legacy_source='unattended-ce' and legacy_type='evidence'`, {});
  const doneEv = new Set(doneRows.map((r) => r.legacy_id));

  // ② C1 证据（未处理）
  const evRows = await queryRows(
    `select e.evidence_id, e.quote_text, e.place_hint, e.subject_hint, s.metadata_json->>'file' as file
       from evidence e join source_records s on s.source_id = e.source_id
      where e.extraction_method = 'unattended-evidence-fragment'
        and not exists (
          select 1 from legacy_mappings lm
           where lm.legacy_source='unattended-ce' and lm.legacy_type='evidence'
             and lm.legacy_id = e.evidence_id::text)`, {});

  // ③ 本批已建实体（normalized name+type → entity_id），用于本批内去重
  const builtThisRun = new Map(); // key norm+"|"+type -> entity_id
  const perSourceCount = {};      // 每来源新实体计数（保均匀覆盖）
  let totalNew = 0;

  const entityRows = [], relRows = [], claimRows = [], claimEvRows = [], discRows = [];
  const provRows = [], triageRows = [], auditRows = [];
  let evProcessed = 0, relations = 0, claims = 0, discoveries = 0;
  const discPerSource = {};

  for (const ev of evRows) {
    if (doneEv.has(ev.evidence_id)) continue;
    const mentions = []; // {name, type, conf, basis}
    if (ev.place_hint) mentions.push({ name: ev.place_hint, type: "place", conf: 0.55, basis: "place_hint" });
    if (ev.subject_hint) mentions.push({ name: ev.subject_hint, type: "unknown", conf: 0.5, basis: "subject_hint" });
    const text = String(ev.quote_text || "");
    const seenInEv = new Set();
    TOKEN_RE.lastIndex = 0;
    let mm;
    while ((mm = TOKEN_RE.exec(text)) !== null && mentions.length < 16) {
      const raw = mm[1];
      const nm = normName(raw);
      if (nm.length < 2 || NAME_STOP.has(nm)) continue;
      if (LEADING_STOP.has(raw[0]) || TOKEN_NUM.test(raw)) continue;
      const t = guessType(raw);
      const key = nm + "|" + t;
      if (seenInEv.has(key)) continue;
      seenInEv.add(key);
      mentions.push({ name: raw, type: t, conf: 0.42, basis: "heuristic" });
    }

    // 本证据解析出的实体 id 列表（去重）
    const evEntityIds = [];
    for (const mt of mentions) {
      const type = mt.type;
      const key = normName(mt.name) + "|" + type;
      let eid = builtThisRun.get(key);
      if (!eid) {
        const f = ev.file || "?";
        if (totalNew >= CE_MAX) continue;
        if ((perSourceCount[f] || 0) >= CE_PER_SOURCE) continue;
        eid = uuid();
        builtThisRun.set(key, eid);
        perSourceCount[f] = (perSourceCount[f] || 0) + 1;
        totalNew++;
        const legacyCand = "unattended-ce:" + sha(normName(mt.name) + "|" + type);
        entityRows.push({
          sql: `insert into entities (entity_id, entity_type, canonical_name, aliases, confidence, status, legacy_id)
                values (:'eid'::uuid, :'et', :'cn', '{}'::text[], :'cf', 'candidate', :'lid')`,
          params: { eid, et: type, cn: mt.name, cf: mt.conf, lid: legacyCand },
        });
        for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"])
          auditRows.push({ ot: "entity", oid: eid, gc: code, r: "pass", rs: `C2-candidate-extraction ${code} pass` });
        triageRows.push(triHold("entity", eid, "extracted_candidate",
          `C2 候选实体（${mt.basis}）：${mt.name}（${type}）`));
        // 弱归属 claim：实体 → 来源证据（candidate，不晋级 Truth）
        const cid = uuid();
        claimRows.push({
          sql: `insert into claims (claim_id, subject_id, predicate, object_value, certainty, status, review_tier, generated_by)
                values (:'cid'::uuid, :'sid'::uuid, 'candidate_extracted_from', :'ov'::jsonb, :'ct', 'candidate', 'C', 'unattended-candidate-extraction')`,
          params: { cid, sid: eid, ov: JSON.stringify({ basis: mt.basis, source_method: "unattended.candidate-extraction" }), ct: mt.conf },
        });
        claimEvRows.push({
          sql: `insert into claim_evidence (claim_id, evidence_id, support_type) values (:'cid'::uuid, :'eid'::uuid, 'supports')`,
          params: { cid, eid: ev.evidence_id },
        });
        triageRows.push(triHold("claim", cid, "extracted_claim", `C2 候选 claim（${mt.basis}→${mt.name}）`));
        claims++;
      }
      if (!evEntityIds.includes(eid)) evEntityIds.push(eid);
    }

    // 共现关系候选（弱关系，最多 CE_PAIRS_PER_EVIDENCE 对）
    if (evEntityIds.length >= 2) {
      const head = evEntityIds[0];
      const tail = evEntityIds.slice(1, 1 + CE_PAIRS_PER_EVIDENCE);
      for (const oid of tail) {
        const rid = uuid();
        const leg = "unattended-ce-rel:" + sha(ev.evidence_id + "|" + head + "|" + oid);
        relRows.push({
          sql: `insert into relations (relation_id, subject_id, object_id, predicate, confidence, status, legacy_id)
                values (:'rid'::uuid, :'s'::uuid, :'o'::uuid, 'co_mentioned_in', 0.2, 'candidate', :'leg')`,
          params: { rid, s: head, o: oid, leg },
        });
        for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"])
          auditRows.push({ ot: "relation", oid: rid, gc: code, r: "pass", rs: `C2-candidate-extraction ${code} pass` });
        triageRows.push(triHold("relation", rid, "weak_co_mention_candidate",
          `C2 弱共现关系候选（同片段共现，待 C3 编织/晋级）`));
        relations++;
      }
    }

    // discovery_candidates（高价值：多实体共现片段）
    if (evEntityIds.length >= 2) {
      const f = ev.file || "?";
      if ((discPerSource[f] || 0) < CE_DISC_PER_SOURCE) {
        discPerSource[f] = (discPerSource[f] || 0) + 1;
        const did = uuid();
        const dcode = "unattended-ce:" + sha(ev.evidence_id);
        const objNames = mentions.map((m) => m.name).slice(0, 8);
        discRows.push({
          sql: `insert into discovery_candidates
                  (discovery_id, discovery_code, title, objects, relationship_change, evidence_refs, relevance_question, epistemic_status, humanistic_why)
                values (:'did'::uuid, :'dc', :'tt', :'ob'::jsonb, :'rc', :'er'::uuid[], :'rq', 'candidate', :'hw')`,
          params: {
            did, dc: dcode,
            tt: `同片段共现候选：${objNames.slice(0, 3).join("·")} 等 ${objNames.length} 个`,
            ob: JSON.stringify({ entities: objNames, source_file: f }),
            rc: "本片段内多实体共现，构成潜在关系/事件候选",
            er: "{" + ev.evidence_id + "}",
            rq: "该共现能否支撑沪上经纬（金泽/青浦）的实体-关系叙事？",
            hw: "一手语料中多实体同现，是宗族/人物/地方结构叙事的潜在原料；须经 C3 编织与门禁判定。",
          },
        });
        triageRows.push(triHold("discovery_candidate", did, "discovery_from_co_mention",
          `C2 discovery（${objNames.length} 实体共现）`));
        discoveries++;
      }
    }

    // processing provenance（幂等标记；WRITE 才落库）
    provRows.push({
      sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, ingest_run_id)
            values (:'mid'::uuid, 'unattended-ce', 'evidence', :'lid', 'evidence', :'tid', 'candidate', 'candidate-extraction', :'rid'::uuid)
            on conflict do nothing`,
      params: { mid: uuid(), lid: ev.evidence_id, tid: ev.evidence_id, rid: ingestRunId },
    });
    evProcessed++;
  }

  if (WRITE) {
    await runManyBatched(entityRows);
    await runManyBatched(relRows);
    await runManyBatched(claimRows);
    await runManyBatched(claimEvRows);
    await runManyBatched(discRows);
    await runManyBatched(auditRows.map((a) => ({
      sql: `insert into evidence_gate_audit (object_type, object_id, gate_code, result, reason, actor_type)
            values (:'ot', :'oid', :'gc', :'r', :'rs', 'rule')`, params: a })));
    await recordTriage(triageRows);
    await runManyBatched(provRows);
  }
  const inserted = totalNew + relations + claims + discoveries;
  return {
    ok: true, dry_run: !WRITE, inserted,
    evidence_scanned: evRows.length, evidence_processed: evProcessed,
    new_entities: WRITE ? totalNew : 0, would_new_entities: WRITE ? 0 : totalNew,
    new_relations: WRITE ? relations : 0, would_new_relations: WRITE ? 0 : relations,
    new_claims: WRITE ? claims : 0, new_discoveries: WRITE ? discoveries : 0,
    triaged: WRITE ? triageRows.length : 0,
    audit_rows: WRITE ? auditRows.length : 0,
  };
}

// ── [C2 · 2026-10-04] unattended.deterministic-resolution：精确 ID / 强一致对齐 ──
// 把 C2 新候选实体（legacy_id like 'unattended-ce:%'）按 normalized(name)+相同 entity_type
// 对齐到既有 canonical 实体（落 legacy_mappings，记录精确对齐）；同名但类型冲突 → HOMONYM_CONFLICT HOLD；
// 既存同名同类型簇（如 吕颐浩 等锚点）对齐多余项到首个 canonical + HOLD。歧义一律 HOLD，不自选边。
// 幂等：已对齐实体由 legacy_mappings(legacy_source='unattended-ce',legacy_type='entity') 标记跳过。
async function jobResolution(j) {
  const done = await queryRows(
    `select legacy_id from legacy_mappings
      where legacy_source='unattended-ce' and legacy_type='entity'`, {});
  const doneSet = new Set(done.map((r) => r.legacy_id));

  const all = await queryRows(`select entity_id, canonical_name, entity_type, legacy_id from entities`, {});
  const byName = new Map();
  for (const r of all) {
    const nm = normName(r.canonical_name);
    if (!nm) continue;
    if (!byName.has(nm)) byName.set(nm, []);
    byName.get(nm).push({ id: r.entity_id, type: r.entity_type });
  }
  const newOnes = all.filter((r) => String(r.legacy_id || "").startsWith("unattended-ce:") && !doneSet.has(r.entity_id));

  const mapRows = [], triageRows = [];
  let aligned = 0, homonym = 0, resolved_new = 0;

  // 仅对"本次 C2 新候选"做精确对齐：同名 + 同类型 → legacy_mappings 精确对齐；
  // 同名异类型（或无法判定）→ HOMONYM_CONFLICT HOLD，不自选边。
  // 既存同名簇（如 吕颐浩 等多项）属历史数据卫生问题，C2 不做危险批量合并，仅统计上报。
  for (const e of newOnes) {
    const nm = normName(e.canonical_name);
    const matches = (byName.get(nm) || []).filter((m) => m.id !== e.entity_id);
    if (!matches.length) { resolved_new++; continue; }
    const sameType = matches.filter((m) => m.type === e.entity_type);
    if (sameType.length) {
      const canonical = sameType[0].id;
      mapRows.push({
        sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id)
              values (:'mid'::uuid, 'unattended-ce', 'entity', :'lid', 'entity', :'tid'::uuid, 'candidate', 'deterministic-resolution', 0.9, :'rid'::uuid)
              on conflict do nothing`,
        params: { mid: uuid(), lid: e.entity_id, tid: canonical, rid: ingestRunId },
      });
      triageRows.push(triHold("entity", e.entity_id, "ALIGNED_DUPLICATE",
        `C2 确定性对齐：新候选「${e.canonical_name}」与既有实体精确同名同类型 → 对齐（legacy_mappings），待人工确认合并`));
      aligned++;
    } else {
      triageRows.push(triHold("entity", e.entity_id, "HOMONYM_CONFLICT",
        `C2 同名异类型冲突：「${e.canonical_name}」（${e.entity_type}）与既有 ${matches.length} 个同名实体类型不同 → HOLD`));
      homonym++;
    }
  }

  if (WRITE) {
    await runManyBatched(mapRows);
    await recordTriage(triageRows);
  }
  return {
    ok: true, dry_run: !WRITE,
    new_entities_seen: newOnes.length, aligned, homonym_held: homonym,
    resolved_new,
    mappings_written: WRITE ? mapRows.length : 0,
    triaged: WRITE ? triageRows.length : 0, inserted: WRITE ? mapRows.length : 0,
  };
}

// ── [C3 · 2026-10-04] unattended.relation-weave：L3 关系编织（证据绑定 + E1 簇识别）──
// 消费 C2 候选关系（relations legacy_id like 'unattended-ce-rel:*'，status candidate），
// 做：① evidence binding（relation_evidence，证据文本同时含主体与客体实体名 → 绑定）；
// ② E1 金泽桥—水—桥 簇识别（主体/客体为桥或水的空间关系 → 标记 HOLD 候选）；
// ③ 写 legacy_mappings 处理溯源（幂等 on conflict do nothing）；④ 每条关系出生即带 review_queue HOLD。
// 零自动晋级：本作业 truth_write_ceiling=0，绝不晋级 Truth Store；晋级由 gate-projection(env 门控) 完成。
const WEAVE_WATER = new Set("水河湖浦塘泾浜汇荡泖泽渡港".split(""));
function isBridgeName(n) { return /(?:桥|寺|庙|观|庵|阁|塔|殿|祠|院|书院|学宫|城隍|亭|坊|署|关)$/.test(n || ""); }
function isWaterName(n) { const last = String(n || "").slice(-1); return WEAVE_WATER.has(last); }

async function jobWeave(j) {
  const done = await queryRows(
    `select legacy_id from legacy_mappings
      where legacy_source='unattended-weave' and legacy_type='relation'`, {});
  const doneSet = new Set(done.map((r) => r.legacy_id));

  const rels = await queryRows(
    `select r.relation_id, r.legacy_id, r.predicate,
            se.canonical_name as s_name, se.entity_type as s_type,
            oe.canonical_name as o_name, oe.entity_type as o_type
       from relations r
       join entities se on se.entity_id = r.subject_id
       join entities oe on oe.entity_id = r.object_id
      where r.legacy_id like 'unattended-ce-rel:%' and r.status='candidate'
      order by r.relation_id`, {});

  const relEvRows = [], provRows = [], triageRows = [];
  let bound = 0, e1 = 0, wouldBind = 0, processed = 0;

  for (const r of rels) {
    if (doneSet.has(r.legacy_id)) continue;
    processed++;
    const sName = normName(r.s_name), oName = normName(r.o_name);
    let evIds = [];
    if (sName && oName) {
      const rows = await queryRows(
        `select evidence_id from evidence
          where extraction_method='unattended-evidence-fragment'
            and quote_text like :'a' and quote_text like :'b'`,
        { a: "%" + sName + "%", b: "%" + oName + "%" });
      evIds = rows.map((x) => x.evidence_id);
    }
    if (WRITE) {
      for (const eid of evIds) {
        relEvRows.push({
          sql: `insert into relation_evidence (relation_id, evidence_id, support_type)
                values (:'rid'::uuid, :'eid'::uuid, 'supports')
                on conflict do nothing`,
          params: { rid: r.relation_id, eid },
        });
      }
    } else {
      wouldBind += evIds.length;
    }
    if (evIds.length) bound += evIds.length;

    const bridgeWater = (isBridgeName(r.s_name) && isWaterName(r.o_name)) ||
                        (isBridgeName(r.o_name) && isWaterName(r.s_name)) ||
                        (isBridgeName(r.s_name) && isBridgeName(r.o_name));
    if (bridgeWater) {
      e1++;
      triageRows.push(triHold("relation", r.relation_id, "E1_BRIDGE_WATER_CANDIDATE",
        `C3 weave：桥—水—桥 空间关系簇候选（${r.s_name} ↔ ${r.o_name}），待 gate-projection 晋级`));
    } else {
      triageRows.push(triHold("relation", r.relation_id, "woven_relation_candidate",
        `C3 weave：共现关系编织候选（${r.s_name} ↔ ${r.o_name}，证据绑定 ${evIds.length} 条）`));
    }

    provRows.push({
      sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, ingest_run_id)
            values (:'mid'::uuid, 'unattended-weave', 'relation', :'lid', 'relation', :'tid'::uuid, 'candidate', 'relation-weave', :'rid'::uuid)
            on conflict do nothing`,
      params: { mid: uuid(), lid: r.legacy_id, tid: r.relation_id, rid: ingestRunId },
    });
  }

  if (WRITE) {
    await runManyBatched(relEvRows);
    await runManyBatched(provRows);
    await recordTriage(triageRows);
  }
  return {
    ok: true, dry_run: !WRITE,
    relations_seen: rels.length, processed,
    evidence_bindings: WRITE ? bound : wouldBind,
    e1_cluster_candidates: e1,
    prov_written: WRITE ? provRows.length : 0,
    triaged: WRITE ? triageRows.length : 0,
  };
}

// ── [N06 · 2026-10-02] gate-projection：G0–G6 → AUTO/HOLD/REJECT → 刷 L4 只读投影 ──
// 无人值守流水线收口（协议 §1.1 阶段 08–10 / §4.4 / T07 §7）。
// 只动 evidence_gate_audit / review_queue / knowledge_paths（投影）；绝不反写 Truth Store。
// v1 默认不自动晋级：除 E1 确定性空间关系（多证据·无冲突）在 MOHEN_ALLOW_E1_PROMOTE=true 时 AUTO 外，
// 其余一律 HOLD 待人审——与「机器管规模与纪律，人保留文化判断」一致。
// 解析 PG 数组文本（queryRows 把 uuid[] 返回为字符串 "{uuid,uuid}"）→ JS 数组。
function parsePgArray(s) {
  if (Array.isArray(s)) return s;
  if (!s) return [];
  const t = String(s).trim();
  if (t === "{}" || t === "") return [];
  if (t.startsWith("{") && t.endsWith("}")) return t.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
  return [t];
}

async function jobGate(j) {
  const audited = await queryRows(
    `select object_id from evidence_gate_audit where object_type='cultural_relation_claim'`, {});
  const auditedSet = new Set(audited.map((r) => r.object_id));
  const claims = await queryRows(
    `select claim_id, slice_id, claim_type, predicate, subject_feature_key, object_feature_key,
            spatial_scope, epistemic_status, evidence_fragment_ids, conflict_refs
       from cultural_relation_claims
      where array_length(evidence_fragment_ids, 1) > 0
      order by claim_id
      limit 500`,
    {}
  );
  const allowE1 = process.env.MOHEN_ALLOW_E1_PROMOTE === "true";
  const audit = [];
  const triage = [];
  let passed = 0, held = 0, rejected = 0, wouldPromote = 0, projected = 0;

  for (const c of claims) {
    const ev = parsePgArray(c.evidence_fragment_ids);
    const cf = parsePgArray(c.conflict_refs);
    const conflicted = cf.length > 0 || c.epistemic_status === "CONFLICTED";
    const g = {
      G0: c.slice_id ? "pass" : "fail",            // 来源/切片锚定
      G1: c.subject_feature_key ? "pass" : "fail", // 对象身份可解析
      G2: "pass",                                   // 非时间断言默认通过
      G3: "pass",                                   // 008 为人工策展文化断言，空间诚实由人工保证
      G4: ev.length ? "pass" : "fail",              // 证据支撑（硬 Gate）
      G5: conflicted ? "fail" : "pass",             // 冲突 → HOLD
      G6: "pass",
    };
    g.G6 = (g.G0 === "pass" && g.G4 === "pass" && g.G5 === "pass") ? "pass" : "fail";

    const deterministic = ev.length >= 2 && g.G5 === "pass"
      && ["SUPPORTED", "SUPPORTED_CANDIDATE"].includes(c.epistemic_status);
    if (deterministic) wouldPromote++;

    if (!auditedSet.has(String(c.claim_id))) {
      for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"]) {
        audit.push({ ot: "cultural_relation_claim", oid: String(c.claim_id), gc: code, r: g[code], rs: `N06 ${code} ${g[code]}` });
      }
      if (g.G0 === "fail" || g.G4 === "fail") {
        rejected++;
        triage.push(triReject("cultural_relation_claim", String(c.claim_id),
          g.G0 === "fail" ? "G0_SLICE_MISSING" : "G4_NO_EVIDENCE",
          `N06 REJECT ${g.G0 === "fail" ? "G0" : "G4"}`));
      } else if (allowE1 && deterministic) {
        passed++;
        triage.push({ ot: "cultural_relation_claim", oid: String(c.claim_id), tier: "B",
          rc: "E1_DETERMINISTIC_PROMOTE",
          sum: "N06 AUTO-PROMOTE E1 确定性空间关系（多证据·无冲突）",
          tri: "auto", st: "approved",
          note: "rule: N06 E1 deterministic promotion（协议 §4.4 / T07 §7）" });
      } else {
        held++;
        triage.push(triHold("cultural_relation_claim", String(c.claim_id),
          deterministic ? "E1_PENDING_HUMAN" : "NON_E1_HOLD",
          `N06 HOLD：待有人值守晋级（${c.epistemic_status || "?"}）`));
      }
    }
  }

  // ── C3 扩展：门禁 relation（weave 产物，legacy_id like 'unattended-ce-rel:*'）──
  // [C3 关键修正] C2 给全部关系写过「占位 G0–G6 全 pass」审计（C2 result.md：占位全 pass，晋级判定留待 C3）。
  // 若照搬"曾被审计即跳过"，C3 的真实门禁对关系**永远不会执行**（实测 relations 2000 → 审计/分诊全 0）。
  // 故把 C2 占位审计排除：只有被门禁真正评估过（reason 非 C2 占位）的关系才算"已审计"。
  const relAudited = await queryRows(
    `select distinct object_id from evidence_gate_audit
      where object_type='relation'
        and coalesce(reason,'') not like 'C2-candidate-extraction%'`, {});
  const relAuditedSet = new Set(relAudited.map((r) => r.object_id));
  const rels = await queryRows(
    `select r.relation_id, r.predicate,
            se.entity_type as s_type, oe.entity_type as o_type,
            (select count(*) from relation_evidence re where re.relation_id=r.relation_id) as ev_count,
            (select count(*) from relations r2
               where r2.subject_id=r.subject_id and r2.object_id=r.object_id
                 and r2.relation_id <> r.relation_id) as sib_count
       from relations r
       join entities se on se.entity_id=r.subject_id
       join entities oe on oe.entity_id=r.object_id
      where r.legacy_id like 'unattended-ce-rel:%' and r.status='candidate'
      order by r.relation_id
      limit 5000`, {});
  let relPassed = 0, relHeld = 0, relRejected = 0;
  for (const c of rels) {
    const evCount = Number(c.ev_count) || 0;
    const conflicted = (Number(c.sib_count) || 0) > 0;
    const g = {
      G0: evCount > 0 ? "pass" : "fail",   // 证据锚定（relation_evidence 绑定）
      G1: "pass",                            // 主体/客体实体存在
      G2: "pass", G3: "pass",
      G4: evCount > 0 ? "pass" : "fail",     // 硬 Gate：证据支撑
      G5: conflicted ? "fail" : "pass",      // 同主体-客体多谓词 → 冲突 HOLD
      G6: "pass",
    };
    g.G6 = (g.G0 === "pass" && g.G4 === "pass" && g.G5 === "pass") ? "pass" : "fail";
    const e1Spatial = (c.s_type === "building" && (c.o_type === "building" || c.o_type === "place"));
    const deterministic = evCount >= 2 && !conflicted && e1Spatial;
    if (deterministic) wouldPromote++;
    if (!relAuditedSet.has(String(c.relation_id))) {
      for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"])
        audit.push({ ot: "relation", oid: String(c.relation_id), gc: code, r: g[code], rs: `N06-relation ${code} ${g[code]}` });
      if (g.G0 === "fail" || g.G4 === "fail") {
        relRejected++;
        triage.push(triReject("relation", String(c.relation_id),
          g.G0 === "fail" ? "G0_NO_EVIDENCE_BINDING" : "G4_NO_EVIDENCE",
          `N06-relation REJECT ${g.G0 === "fail" ? "G0" : "G4"}`));
      } else if (allowE1 && deterministic) {
        relPassed++;
        triage.push({ ot: "relation", oid: String(c.relation_id), tier: "B",
          rc: "E1_DETERMINISTIC_PROMOTE",
          sum: "N06-relation AUTO-PROMOTE E1 桥—水—桥 确定性空间关系（多证据·无冲突）",
          tri: "auto", st: "approved",
          note: "rule: N06 E1 deterministic promotion（协议 §4.4 / T07 §7）" });
      } else {
        relHeld++;
        triage.push(triHold("relation", String(c.relation_id),
          deterministic ? "E1_PENDING_HUMAN" : "NON_E1_HOLD",
          `N06-relation HOLD：待有人值守晋级（证据 ${evCount} 条）`));
      }
    }
  }

  // ── [C6 · 2026-10-05] 门禁覆盖 cultural_*：meaning / present 两张表此前**从未被门禁评估**
  // （guard:promotion 报「该表门禁审计 0 行」）。本块按它们**实际拥有的字段**给判定：
  // 没有时间 / 坐标字段，就老实写 pending，不冒充 pass —— 覆盖率不能靠"全 pass 占位"刷出来。
  const CULTURAL_EXTRA = [
    { table: "cultural_meaning_candidates", pk: "meaning_id", ot: "cultural_meaning_candidate", ev: "derived_from_claim_ids" },
    { table: "cultural_present_connections", pk: "present_id", ot: "cultural_present_connection", ev: "basis_claim_ids" },
  ];
  let cultAudited = 0, cultHeld = 0, cultRejected = 0;
  for (const t of CULTURAL_EXTRA) {
    const seen = new Set((await queryRows(
      `select distinct object_id from evidence_gate_audit where object_type = :'ot'`, { ot: t.ot })).map((r) => String(r.object_id)));
    const rows = await queryRows(
      `select ${t.pk}::text id, slice_id, subject_feature_key,
              coalesce(array_length(${t.ev}, 1), 0)::int ev_n
         from ${t.table} order by ${t.pk}`, {});
    for (const r of rows) {
      if (seen.has(String(r.id))) continue;
      const g = {
        G0: String(r.slice_id || "").trim() ? "pass" : "fail",
        G1: String(r.subject_feature_key || "").trim() ? "pass" : "fail",
        G2: "pending", G3: "pending",
        G4: Number(r.ev_n) > 0 ? "pass" : "fail",
        G5: "pending",
      };
      g.G6 = (g.G0 === "pass" && g.G1 === "pass" && g.G4 === "pass") ? "pass" : "fail";
      for (const code of ["G0", "G1", "G2", "G3", "G4", "G5", "G6"])
        audit.push({ ot: t.ot, oid: String(r.id), gc: code, r: g[code], rs: `N06-cultural ${code} ${g[code]}` });
      cultAudited++;
      if (g.G0 === "fail" || g.G4 === "fail") {
        cultRejected++;
        triage.push(triReject(t.ot, String(r.id), g.G0 === "fail" ? "G0_SLICE_MISSING" : "G4_NO_EVIDENCE",
          `N06-cultural REJECT ${g.G0 === "fail" ? "G0" : "G4"}`));
      } else {
        cultHeld++;
        triage.push(triHold(t.ot, String(r.id), "NON_E1_HOLD", "N06-cultural HOLD：本类对象无自动晋级路径，待人审"));
      }
    }
  }

  // L4 投影重建（只读：仅写 knowledge_paths / knowledge_path_steps，不反写 Truth Store）
  //
  // [C6 · 2026-10-05 两处真实修复]
  //   ① 关系→证据原先是**每条关系一次 psql 查询**（2923 条 = 2923 次进程启动），实测跑到十几分钟还没完，
  //      被外部中断后投影停在"删完没插完"的状态。改成一次性取 relation_evidence（13k 行）在内存分组。
  //   ② "先删再插"放进**同一个事务**：投影是派生层，崩在中间会留下空投影（实测 L4 路径 2931→0）。
  let projectionRows = [];
  if (WRITE) {
    const ns = "L4-UNATTENDED";
    const relEvMap = new Map();
    for (const r of await queryRows(`select relation_id::text rid, evidence_id::text eid from relation_evidence`)) {
      if (!relEvMap.has(r.rid)) relEvMap.set(r.rid, []);
      relEvMap.get(r.rid).push(r.eid);
    }
    for (const c of claims) {
      const ev = parsePgArray(c.evidence_fragment_ids);
      if (!ev.length) continue;
      const code = ns + "-" + String(c.claim_id).replace(/-/g, "").slice(0, 8);
      const pid = uuid();
      projectionRows.push({
        sql: `insert into knowledge_paths (path_id, path_code, title, purpose_question, status, evidence_coverage, unresolved_breaks, generated_by)
              values (:'pid'::uuid, :'code', :'t', :'pq', 'candidate', :'ec', '[]'::jsonb, 'unattended-runner-N06')`,
        params: { pid, code, t: "金泽关系簇 " + (c.predicate || "?"), pq: "该关系如何支撑金泽体验",
          ec: JSON.stringify({ evidence_ids: ev, covered_steps: ev.length, total_steps: ev.length }) },
      });
      const steps = [{ step_no: 1, step_kind: "relation", ref_id: String(c.claim_id),
        label: "关系断言 " + (c.predicate || "?"), epistemic_status: c.epistemic_status || "candidate", evidence_ids: ev }];
      ev.forEach((eid, k) => steps.push({ step_no: k + 2, step_kind: "claim", ref_id: String(eid),
        label: "证据片段 " + String(eid).slice(0, 8), epistemic_status: "candidate", evidence_ids: [eid] }));
      for (const s of steps) {
        const evLit = "'{" + s.evidence_ids.join(",") + "}'::uuid[]";
        projectionRows.push({
          sql: `insert into knowledge_path_steps (path_id, step_no, step_kind, ref_id, label, epistemic_status, evidence_ids)
                values (:'pid'::uuid, :'n', :'sk', :'rid', :'lb', :'es', ${evLit})`,
          params: { pid, n: s.step_no, sk: s.step_kind, rid: s.ref_id, lb: s.label, es: s.epistemic_status },
        });
      }
      projected++;
    }
    // 关系编织产物投影（namespace L4-WEAVE）
    for (const c of rels) {
      const ev = relEvMap.get(String(c.relation_id)) || [];
      if (!ev.length) continue;
      const code = "L4-WEAVE-" + String(c.relation_id).replace(/-/g, "").slice(0, 8);
      const pid = uuid();
      projectionRows.push({
        sql: `insert into knowledge_paths (path_id, path_code, title, purpose_question, status, evidence_coverage, unresolved_breaks, generated_by)
              values (:'pid'::uuid, :'code', :'t', :'pq', 'candidate', :'ec', '[]'::jsonb, 'unattended-runner-C3')`,
        params: { pid, code, t: "编织关系 " + (c.predicate || "?"), pq: "该关系如何支撑金泽/沪上经纬叙事",
          ec: JSON.stringify({ evidence_ids: ev, covered_steps: ev.length, total_steps: ev.length }) },
      });
      const steps = [{ step_no: 1, step_kind: "relation", ref_id: String(c.relation_id),
        label: "关系 " + (c.predicate || "?"), epistemic_status: "candidate", evidence_ids: ev }];
      ev.forEach((eid, k) => steps.push({ step_no: k + 2, step_kind: "claim", ref_id: String(eid),
        label: "证据片段 " + String(eid).slice(0, 8), epistemic_status: "candidate", evidence_ids: [eid] }));
      for (const s of steps) {
        const evLit = "'{" + s.evidence_ids.join(",") + "}'::uuid[]";
        projectionRows.push({
          sql: `insert into knowledge_path_steps (path_id, step_no, step_kind, ref_id, label, epistemic_status, evidence_ids)
                values (:'pid'::uuid, :'n', :'sk', :'rid', :'lb', :'es', ${evLit})`,
          params: { pid, n: s.step_no, sk: s.step_kind, rid: s.ref_id, lb: s.label, es: s.epistemic_status },
        });
      }
      projected++;
    }
  }

  if (WRITE) {
    if (audit.length) await runMany(audit.map((a) => ({
      sql: `insert into evidence_gate_audit (object_type, object_id, gate_code, result, reason, actor_type)
            values (:'ot', :'oid', :'gc', :'r', :'rs', 'rule')`,
      params: a,
    })));
    await recordTriage(triage);
    if (projectionRows.length) {
      // 一次 psql 会话 = 一个事务：删旧与插新同生共死，中断只会整体回滚，不会留下空投影。
      await runMany([
        "begin",
        `delete from knowledge_path_steps where path_id in (select path_id from knowledge_paths where path_code like 'L4-%')`,
        `delete from knowledge_paths where path_code like 'L4-%'`,
        ...projectionRows,
        "commit",
      ]);
    }
    return { ok: true, claims_scanned: claims.length, relations_scanned: rels.length,
      cultural_audited: cultAudited, cultural_held: cultHeld, cultural_rejected: cultRejected,
      audited: audit.length / 7, passed, held, rejected,
      rel_passed: relPassed, rel_held: relHeld, rel_rejected: relRejected,
      would_promote: wouldPromote, promoted: allowE1 ? (passed + relPassed) : 0, projection_paths: projected };
  }
  return { ok: true, dry_run: true, claims_scanned: claims.length, relations_scanned: rels.length,
    cultural_would_audit: cultAudited,
    would_audit_unaudited: audit.length / 7, would_passed: passed, would_held: held,
    would_rejected: rejected, rel_would_passed: relPassed, rel_would_held: relHeld,
    rel_would_rejected: relRejected, would_promote: wouldPromote,
    projection_paths_would_build: claims.length + rels.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// [C5 · 2026-10-05] 外部扩源：unattended.external-identity（身份线）/ unattended.external-visual（视觉线）
//
// 三条硬规则全部来自本组分批的实测，不是拍脑袋的安全感：
//   ① 地域必判。「普济桥」在 Wikidata 命中 4 项，分属青浦金泽 / 苏州 / 德清，外加一张维基消歧义页。
//      名字相同不等于同一对象，所以必须「P131 属上海各区」或「P625 落在上海外接矩形」二者之一成立才收；
//      两者都判不出来 → 拒收并计数（EXTERNAL_SCOPE_UNRESOLVED）。
//   ② 图像必须由身份指认。Commons 全文检索 `search=金泽` 的 Top3 全是日本石川县金泽市，
//      文本相似度根本无法区分同名异地 —— 故视觉线只按外部权威的身份声明（P18）指认的 File 标题取回。
//   ③ Q-id 只是候选线索。来源表对 Wikidata 的裁决是 S3（仅现代空间）+「Q-id 不得单独支撑断言」，
//      所以身份线**一行 Evidence 都不写**，只写映射与候选。
// ═══════════════════════════════════════════════════════════════════════════════
// User-Agent 必须是纯 ASCII：HTTP 头是 ByteString，含中文会在 fetch 阶段直接抛
// "Cannot convert argument to a ByteString"（实测踩到：中文 UA 让 6 批查询全部空转）。
const EXT_UA = "MoHen-Agent/2.0 (MoHen research pipeline; low-volume retrieval)";
const WD_ENDPOINT = "https://query.wikidata.org/sparql";
const CM_API = "https://commons.wikimedia.org/w/api.php";
const ACQ_EXT_ID = "external-wikidata-identity-scan";
const ACQ_EXT_VIS = "external-commons-visual-scan";
const RAW_EXTERNAL = path.join(RAW_STORE, "external");

// 上海 16 区（含旧写法），用于 P131 判定。
const SH_DISTRICTS = ["上海市", "黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区", "杨浦区",
  "闵行区", "宝山区", "嘉定区", "浦东新区", "金山区", "松江区", "青浦区", "奉贤区", "崇明区",
  "青浦縣", "上海縣", "Shanghai"];
const SH_BBOX = { latMin: 30.66, latMax: 31.88, lngMin: 120.85, lngMax: 122.02 };
// 噪声类型：这类 item 不是世界里的对象，入库只会污染字典。
const NOISE_TYPES = ["消歧義", "消歧义", "維基媒體", "维基媒体", "人類", "人类", "列表", "分類", "分类"];
const EXT_SEED_BATCH = 30;          // 每条 SPARQL 的种子名数量（URL 长度与端点负担的平衡）
const EXT_MAX_SEEDS = Number(process.env.MOHEN_EXT_SEEDS || 400);
const EXT_DISCOVER_LIMIT = Number(process.env.MOHEN_EXT_DISCOVER || 200);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 身份线 → 视觉线的 handoff（同进程内存）。跨批次或单跑视觉线时，回补自 Raw 的重放文件。 */
let EXT_HANDOFF = [];

function readExtHandoff() {
  const dir = path.join(RAW_EXTERNAL, "wikidata");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("handoff-") && f.endsWith(".json"));
  if (!files.length) return [];
  files.sort();
  try { return JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8")) || []; }
  catch { return []; }
}

/** 外部 HTTP 取回：限流/5xx/超时才重试，业务拒收不重试。失败即抛（作业失败，不静默跳过）。 */
async function httpJson(url, tries = 3) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 45000);
      const res = await fetch(url, {
        headers: { "user-agent": EXT_UA, accept: "application/json" },
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) { last = new Error("HTTP " + res.status); await sleep(1500 * (i + 1)); continue; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      last = e;
      await sleep(1200 * (i + 1));
    }
  }
  throw new Error(`外部取回失败（${String(url).slice(0, 70)}…）：${last && last.message}`);
}

const bval = (b, k) => (b && b[k] ? String(b[k].value) : "");
const qidOf = (uri) => String(uri || "").split("/").pop();
const coordOf = (wkt) => {
  const m = String(wkt || "").match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null;
};
const inShanghai = (c) => !!c && c.lat >= SH_BBOX.latMin && c.lat <= SH_BBOX.latMax
  && c.lng >= SH_BBOX.lngMin && c.lng <= SH_BBOX.lngMax;
/** P18 指向 `Special:FilePath/<编码文件名>` → Commons 的 File 标题（视觉线的输入）。 */
const fileFromP18 = (url) => {
  const m = String(url || "").match(/Special:FilePath\/(.+)$/);
  if (!m) return "";
  try { return "File:" + decodeURIComponent(m[1]); } catch { return ""; }
};
const sparqlEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** 按名字检索：VALUES 精确命中中文标签或别名，再取该项的属性（坐标/行政归属/类型/图像）。 */
function buildAlignQuery(names) {
  const vals = names.map((n) => `"${sparqlEscape(n)}"@zh`).join(" ");
  return `SELECT ?qid ?zn ?qidLabel ?qidDescription ?coord ?adminLabel ?typeLabel ?img WHERE {
  VALUES ?zn { ${vals} }
  ?qid rdfs:label|skos:altLabel ?zn .
  OPTIONAL { ?qid wdt:P625 ?coord }
  OPTIONAL { ?qid wdt:P131 ?admin }
  OPTIONAL { ?qid wdt:P31 ?type }
  OPTIONAL { ?qid wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,zh-hans,en". }
}`;
}

/** 发现式查询：上海市境内带遗产认定（P1435）且有中文标签的对象 —— 库里还没有的那部分。 */
function buildDiscoverQuery(limit) {
  return `SELECT DISTINCT ?qid ?qidLabel ?qidDescription ?coord ?img ?adminLabel ?typeLabel WHERE {
  ?qid wdt:P131* wd:Q8686 .
  ?qid wdt:P1435 ?heritage .
  ?qid rdfs:label ?zl . FILTER(lang(?zl) = "zh")
  OPTIONAL { ?qid wdt:P625 ?coord }
  OPTIONAL { ?qid wdt:P18 ?img }
  OPTIONAL { ?qid wdt:P131 ?admin }
  OPTIONAL { ?qid wdt:P31 ?type }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,zh-hans,en". }
} LIMIT ${limit}`;
}

/** 地域判定：只看外部自己声明的行政归属或坐标，不接受任何推断——没有依据就等于没有地域。 */
function extScopeVerdict(it) {
  if (it.type && NOISE_TYPES.some((t) => it.type.includes(t))) return { ok: false, code: "EXTERNAL_TYPE_NOISE" };
  // ★ 行政归属优先于坐标：外部自己说清了属哪里，就以它说的为准。
  //   「坐标落在上海外接矩形」只是**补漏**手段 —— 矩形必然覆盖江苏太仓、浙江嘉善一带，
  //   若允许坐标把 P131 覆盖过去，就会把「太仓直隶州」这类邻省项当成上海对象收进来
  //   （C5 首批实测收进 1 条，已如实记录）。故：有 P131 → 由 P131 定生死。
  if (it.admin) {
    const admined = SH_DISTRICTS.some((d) => it.admin.includes(d) || it.admin.includes(d.replace("区", "")));
    return admined ? { ok: true, via: "P131" } : { ok: false, code: "EXTERNAL_SCOPE_UNRESOLVED" };
  }
  if (it.coord && inShanghai(it.coord)) return { ok: true, via: "bbox" };
  return { ok: false, code: "EXTERNAL_SCOPE_UNRESOLVED" };
}

/** 外部 item 的 P31/P1435 → 本地 entity_type；判不出就 unknown，不猜。 */
function extEntityType(it) {
  const t = `${it.type || ""} ${it.desc || ""}`;
  if (/鎮|镇|村|鄉|乡|街道|弄|巷|区|區|县|縣|市/.test(t)) return "place";
  if (/河|湖|浜|浦|塘|泾|港|江|水道/.test(t)) return "place";
  if (/橋|桥|塔|寺|庙|廟|觀|观|庵|祠|亭|閣|阁|坊|碑|宅|故居|園|园|院|署|堂|教堂|書院|书院|會館|会馆|遺址|遗址|陵|墓/.test(t)) return "building";
  return "unknown";
}

/** C4 遗留清单（624 张有题录图未匹配到的对象名）→ 作为身份线的补充种子。 */
function loadBacklogNames() {
  const p = path.join("tasks/results", "TASK-DATA-20261004-C4-impact.json");
  if (!fs.existsSync(p)) return [];
  try {
    const doc = JSON.parse(fs.readFileSync(p, "utf8"));
    const arr = Array.isArray(doc.unresolved_names) ? doc.unresolved_names : [];
    return arr.map((x) => String((x && x.name) || "").trim()).filter((s) => s.length >= 2 && s.length <= 30);
  } catch { return []; }
}

/** L0：登记一次外部查询 = 一条 source_record + 一份 Raw 快照。 */
async function snapshotExternal({ provider, title, endpoint, query, payload, relDir }) {
  const txt = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const cs = sha(txt);
  const sid = uuid();
  const relPath = path.join("external", relDir, cs.slice(0, 12) + ".json");
  if (WRITE) {
    const dir = path.join(RAW_EXTERNAL, relDir);
    fs.mkdirSync(dir, { recursive: true });
    const abs = path.join(dir, cs.slice(0, 12) + ".json");
    if (!fs.existsSync(abs)) fs.writeFileSync(abs, txt, "utf8");
  }
  return { sid, cs, rawPath: `<RAW_STORE>/${relPath.replace(/\\/g, "/")}`, txt };
}

// ---- C5 · 身份线 ----
async function jobExternalIdentity(j) {
  assertAcquisitionDeclared(ACQ_EXT_ID, "jobExternalIdentity"); // 意图未登记 → 直接失败，不静默取回
  const acq = buildAcquisitionMeta(ACQ_EXT_ID);
  const t0 = Date.now();

  // ① 种子：库内关注对象（排除 C2 启发式候选与本线自产行，避免自己喂自己）
  const entRows = await queryRows(
    `select entity_id::text eid, canonical_name cn, entity_type et from entities
      where entity_type in ('place','building','town','gazetteer','artifact')
        and (legacy_id is null or (legacy_id not like 'unattended-ce:%' and legacy_id not like 'unattended-ext:%'))`);
  const seedMap = new Map(); // name -> Set(entity_id)
  for (const e of entRows) {
    for (const seg of String(e.cn || "").split(/[·→（）()【】\[\]]/)) {
      const s = seg.trim();
      if (s.length < 2 || s.length > 30 || DICT_STOP.has(s)) continue;
      if (!seedMap.has(s)) seedMap.set(s, new Set());
      seedMap.get(s).add(e.eid);
    }
  }
  // 全名索引：外部标签与库内 canonical_name **完全相等**时优先对齐，避免造出第二个同名实体
  //（实测 risk：库里有「金泽镇」，外部标签是「金泽」—— 按片段字典匹配不到，就会凭空多一条）。
  const exactName = new Map();
  for (const e of entRows) {
    const n = String(e.cn || "").trim();
    if (n.length < 2) continue;
    if (!exactName.has(n)) exactName.set(n, new Set());
    exactName.get(n).add(e.eid);
  }
  const localSeeds = new Set(seedMap.keys());
  const backlog = loadBacklogNames();
  let backlogAdded = 0;
  for (const n of backlog) {
    if (localSeeds.has(n) || seedMap.has(n)) continue;
    seedMap.set(n, new Set()); // 无本地实体：命中即代表库外新对象
    backlogAdded++;
  }
  const seeds = [...seedMap.keys()]
    .sort((a, b) => (localSeeds.has(b) - localSeeds.has(a)) || (b.length - a.length) || (a < b ? -1 : 1))
    .slice(0, EXT_MAX_SEEDS);

  // ② 逐批跑 SPARQL + 一次发现式查询
  const rawBatches = [];
  const bindings = [];
  let queries = 0, httpFail = 0;
  for (let i = 0; i < seeds.length; i += EXT_SEED_BATCH) {
    const part = seeds.slice(i, i + EXT_SEED_BATCH);
    const q = buildAlignQuery(part);
    const url = `${WD_ENDPOINT}?format=json&query=${encodeURIComponent(q)}`;
    try {
      const json = await httpJson(url);
      const bs = (json && json.results && Array.isArray(json.results.bindings) ? json.results.bindings : []);
      bindings.push(...bs);
      rawBatches.push({ title: `Wikidata SPARQL · 种子批次 ${Math.floor(i / EXT_SEED_BATCH) + 1}`, query: q, payload: json, n: bs.length });
      queries++;
      await sleep(400); // 礼貌限流：官方要求串行
    } catch (e) { httpFail++; log(`external-identity 查询失败（批次 ${Math.floor(i / EXT_SEED_BATCH) + 1}）：${e.message}`); }
  }
  try {
    const dq = buildDiscoverQuery(EXT_DISCOVER_LIMIT);
    const djson = await httpJson(`${WD_ENDPOINT}?format=json&query=${encodeURIComponent(dq)}`);
    const dbs = (djson && djson.results && Array.isArray(djson.results.bindings) ? djson.results.bindings : []);
    bindings.push(...dbs);
    rawBatches.push({ title: `Wikidata SPARQL · 上海文保发现（P1435）`, query: dq, payload: djson, n: dbs.length });
    queries++;
  } catch (e) { httpFail++; log(`external-identity 发现式查询失败：${e.message}`); }

  // ③ 归并 item（同一 QID 可能在多条 binding 中出现，属性互补）
  const items = new Map();
  for (const b of bindings) {
    const qid = qidOf(bval(b, "qid"));
    if (!qid) continue;
    const it = items.get(qid) || { qid, names: new Set(), label: "", desc: "", coord: null, admin: "", type: "", img: "" };
    const zn = bval(b, "zn");
    if (zn) it.names.add(zn);
    if (!it.label && bval(b, "qidLabel")) it.label = bval(b, "qidLabel");
    if (!it.desc && bval(b, "qidDescription")) it.desc = bval(b, "qidDescription");
    if (!it.admin && bval(b, "adminLabel")) it.admin = bval(b, "adminLabel");
    if (!it.type && bval(b, "typeLabel")) it.type = bval(b, "typeLabel");
    if (!it.img && bval(b, "img")) it.img = bval(b, "img");
    if (!it.coord && bval(b, "coord")) it.coord = coordOf(bval(b, "coord"));
    items.set(qid, it);
  }

  // ④ 已有去重集合
  const existMapRows = await queryRows(
    `select legacy_id, target_id::text tid, mapping_status ms from legacy_mappings where legacy_source = 'unattended-external-identity'`);
  const existQids = new Set(existMapRows.map((r) => String(r.legacy_id).replace("wd:", "")));
  const existExtIds = new Set((await queryRows(
    `select legacy_id from entities where legacy_id like 'unattended-ext:%'`)).map((r) => r.legacy_id));

  const srcRows = [], entIns = [], mapRows = [], triageRows = [], handoff = [];
  let scopeRejected = 0, typeRejected = 0, homonym = 0, aligned = 0, newEntities = 0, dupSkipped = 0;
  const createdNames = new Set(); // 本批已建过的名字：同一批内不再建第二条同名候选
  const typeCount = {}, adminCount = {};

  for (const it of items.values()) {
    if (existQids.has(it.qid) || existExtIds.has("unattended-ext:wd:" + it.qid)) { dupSkipped++; continue; }
    const v = extScopeVerdict(it);
    if (!v.ok) {
      // 拒收只计数，不进 review_queue：这类对象根本不在我们的世界范围里，
      // 给它们排队只会制造没有 object 可看的人工债务（主协议 §3.3）。
      if (v.code === "EXTERNAL_TYPE_NOISE") typeRejected++; else scopeRejected++;
      continue;
    }
    adminCount[it.admin || "(仅坐标判定)"] = (adminCount[it.admin || "(仅坐标判定)"] || 0) + 1;

    // 名字 → 本地实体：多义不自选边
    const localIds = new Set();
    for (const nm of it.names) for (const id of seedMap.get(nm) || []) localIds.add(id);
    if (it.label && seedMap.has(it.label)) for (const id of seedMap.get(it.label)) localIds.add(id);
    // 全名精确命中（优先级最高）：外部标签 == 库内 canonical_name
    if (!localIds.size && it.label && exactName.has(it.label)) for (const id of exactName.get(it.label)) localIds.add(id);
    if (localIds.size !== 1) for (const nm of it.names) if (exactName.has(nm)) for (const id of exactName.get(nm)) localIds.add(id);
    if (localIds.size > 1) {
      homonym++;
      triageRows.push(triHold("wikidata_item", "wd:" + it.qid, "HOMONYM_CONFLICT",
        `C5 外部身份候选「${it.label || [...it.names][0]}」（${it.qid}）同时命中 ${localIds.size} 个库内对象 → 不自选边，待人审`));
      continue;
    }

    let targetId = localIds.size === 1 ? [...localIds][0] : null;
    let linkKind = "aligned";
    if (!targetId) {
      const lid = "unattended-ext:wd:" + it.qid;
      if (existExtIds.has(lid)) { dupSkipped++; continue; }
      const newName = (it.label || [...it.names][0] || ("Q" + it.qid)).slice(0, 80);
      if (createdNames.has(newName)) { dupSkipped++; continue; }
      createdNames.add(newName);
      existExtIds.add(lid);
      const eid = uuid();
      const et = extEntityType(it);
      typeCount[et] = (typeCount[et] || 0) + 1;
      entIns.push({
        sql: `insert into entities (entity_id, entity_type, canonical_name, aliases, description, confidence, status, legacy_id)
              values (:'eid'::uuid, :'et', :'cn', string_to_array(:'al','|'), :'ds', 0, 'candidate', :'lid')`,
        params: { eid, et, cn: newName,
          al: [...it.names].slice(0, 8).join("|"), ds: String(it.desc || "").slice(0, 300), lid },
      });
      triageRows.push(triHold("entity", eid, "EXTERNAL_OBJECT_CANDIDATE",
        `C5 外部对象候选：${it.label || [...it.names][0]}（${it.qid}｜${it.admin || "bbox"}｜${it.type || "类型未知"}）—— 库内原本没有，待人审是否纳入`));
      targetId = eid;
      linkKind = "external_object";
      newEntities++;
    } else {
      aligned++;
    }

    mapRows.push({
      sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id)
            values (:'mid'::uuid, 'unattended-external-identity', 'wikidata_qid', :'lid', 'entity', :'tid'::uuid, 'candidate',
                    'external_label_exact+scope_verdict', :'cf', :'rid'::uuid)
            on conflict do nothing`,
      params: { mid: uuid(), lid: "wd:" + it.qid, tid: targetId, cf: linkKind === "aligned" ? 0.4 : 0.2, rid: ingestRunId },
    });
    triageRows.push(triHold("legacy_mapping", "wd:" + it.qid, linkKind === "aligned" ? "EXTERNAL_ID_ALIGNED" : "EXTERNAL_ID_ONLY",
      `C5 身份线索：${it.label || [...it.names][0]} → ${it.qid}（${linkKind === "aligned" ? "与库内对象精确同名，仍须回到原始出处复核" : "库内尚无此对象，仅为外部线索"}）`));

    const file = fileFromP18(it.img);
    if (file) handoff.push({ qid: it.qid, file, targetId, linkKind, name: it.label || [...it.names][0] || "", admin: it.admin || "", desc: it.desc || "" });
  }

  // ⑤ L0 来源登记（每批一次查询 = 一条 source_record）
  for (const b of rawBatches) {
    const snap = await snapshotExternal({ provider: "wikidata", title: b.title, endpoint: WD_ENDPOINT, query: b.query, payload: b.payload, relDir: "wikidata" });
    srcRows.push({
      sql: `insert into source_records (source_id, provider, title, creator, source_date, content_type, license_code, checksum, raw_path, source_uri, metadata_json)
            values (:'sid'::uuid, 'wikidata', :'t', 'Wikidata（Wikimedia Foundation）', null, 'application/json', 'CC0', :'cs', :'rp', :'su', :'mj'::jsonb)
            on conflict (provider, checksum) do nothing`,
      params: { sid: snap.sid, t: b.title + `（${b.n} 条返回）`, cs: snap.cs, rp: snap.rawPath,
        su: `${WD_ENDPOINT}?format=json&query=<见 raw>`,
        mj: JSON.stringify({ kind: "external_query", engine: "wikidata-sparql", label_count: b.n, ...acq }) },
    });
  }

  if (WRITE) {
    if (entIns.length) await runManyBatched(entIns);
    if (mapRows.length) await runManyBatched(mapRows);
    if (srcRows.length) await runManyBatched(srcRows);
    await recordTriage(triageRows);
  }

  // ⑥ 给视觉线的 handoff（同进程用内存；跨批次/重跑走 Raw 文件回补）
  EXT_HANDOFF.length = 0;
  EXT_HANDOFF.push(...handoff);
  if (WRITE && handoff.length) {
    const dir = path.join(RAW_EXTERNAL, "wikidata");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `handoff-${String(ingestRunId || "dry").slice(0, 8)}.json`), JSON.stringify(handoff, null, 2), "utf8");
  }

  return {
    ok: true, dry_run: !WRITE, ms: Date.now() - t0,
    seeds_total: seedMap.size, seeds_used: seeds.length, backlog_added: backlogAdded,
    queries, http_failures: httpFail,
    items_returned: items.size,
    scope_rejected: scopeRejected, type_rejected: typeRejected, dup_skipped: dupSkipped,
    aligned, new_entities: newEntities, homonym_held: homonym,
    new_entity_types: typeCount, admin_top: adminCount, files_handed_off: handoff.length,
    entities_written: WRITE ? entIns.length : 0, entities_would: WRITE ? 0 : entIns.length,
    mappings_written: WRITE ? mapRows.length : 0, mappings_would: WRITE ? 0 : mapRows.length,
    sources_written: WRITE ? srcRows.length : 0, sources_would: WRITE ? 0 : srcRows.length,
    triaged: WRITE ? triageRows.length : 0,
    evidence_written: 0, // S3 裁决：本线不产生任何 Evidence（显式记录，便于核查）
  };
}

// ---- C5 · 视觉线 ----
async function jobExternalVisual(j) {
  assertAcquisitionDeclared(ACQ_EXT_VIS, "jobExternalVisual");
  const acq = buildAcquisitionMeta(ACQ_EXT_VIS);
  const t0 = Date.now();

  const items = EXT_HANDOFF.length ? EXT_HANDOFF.slice() : await readExtHandoff();
  const wanted = items.filter((x) => x && x.file);
  if (!wanted.length) return { ok: true, note: "无可取回的外部图像（身份线未产出带 P18 的对象）", files: 0 };

  const existRows = await queryRows(`select legacy_id, file_path from visual_assets`);
  const existLid = new Set(existRows.map((r) => r.legacy_id).filter(Boolean));
  const existPath = new Set(existRows.map((r) => normUrlForMatch(r.file_path)).filter(Boolean));

  const TITLE_BATCH = 25;
  const pages = [];
  let httpFail = 0, batches = 0;
  const rawBatches = [];
  for (let i = 0; i < wanted.length; i += TITLE_BATCH) {
    const part = wanted.slice(i, i + TITLE_BATCH);
    const titles = part.map((x) => x.file);
    const url = `${CM_API}?action=query&format=json&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiextmetadatafilter=LicenseShortName|DateTimeOriginal|ImageDescription|Artist&titles=${encodeURIComponent(titles.join("|"))}`;
    try {
      const json = await httpJson(url);
      const pp = (json && json.query && json.query.pages) || {};
      for (const key of Object.keys(pp)) {
        const p = pp[key];
        if (!p || String(p.pageid ?? "0") === "-1" || p.missing !== undefined) continue;
        const ii = Array.isArray(p.imageinfo) && p.imageinfo[0] ? p.imageinfo[0] : null;
        if (!ii || !ii.url) continue;
        pages.push({ title: p.title, jsonPage: p, ii });
      }
      rawBatches.push({ title: `Commons imageinfo · 批次 ${batches + 1}`, batchIdx: batches, payload: json, n: Object.keys(pp).length });
      batches++;
      await sleep(400);
    } catch (e) { httpFail++; log(`external-visual 取回失败（批次 ${batches + 1}）：${e.message}`); }
  }

  const byTitle = new Map(pages.map((r) => [r.title, r]));
  const srcIns = [], evIns = [], assetIns = [], linkIns = [], auditRows = [], triageRows = [], mapIns = [];
  let retrieved = 0, insertedAssets = 0, links = 0, skippedDup = 0, noLicense = 0, nonImage = 0, missing = 0;
  const licenseCount = {}, periodCount = {};

  // 每个 Commons 批次一条 source_record（先建 uuid 供本批 evidence/asset 引用）。
  // 用 batchIdx 对齐而不是顺序对齐：某一批请求失败时 rawBatches 会少一条，按下标取会把
  // 后一批的文件挂到前一批的来源上 —— 那正是 2026-10-02「727 张图挂错 provenance」的重演。
  const sidsByBatch = [];
  for (const b of rawBatches) {
    const snap = await snapshotExternal({ provider: "wikimedia_commons", title: b.title, endpoint: CM_API, payload: b.payload, relDir: "commons" });
    sidsByBatch[b.batchIdx] = snap.sid;
    srcIns.push({
      sql: `insert into source_records (source_id, provider, title, creator, source_date, content_type, license_code, checksum, raw_path, source_uri, metadata_json)
            values (:'sid'::uuid, 'wikimedia_commons', :'t', 'Wikimedia Commons 贡献者', null, 'application/json', '逐文件不同（见 extmetadata）', :'cs', :'rp', :'su', :'mj'::jsonb)
            on conflict (provider, checksum) do nothing`,
      params: { sid: snap.sid, t: b.title + `（${b.n} 页）`, cs: snap.cs, rp: snap.rawPath,
        su: `${CM_API}?action=query&prop=imageinfo&titles=<见 raw>`,
        mj: JSON.stringify({ kind: "external_query", engine: "commons-imageinfo", page_count: b.n, ...acq }) },
    });
  }
  for (let idx = 0; idx < wanted.length; idx++) {
    const w = wanted[idx];
    retrieved++;
    const hit = byTitle.get(w.file);
    if (!hit) {
      missing++;
      triageRows.push(triReject("visual_asset", w.file, "EXTERNAL_ASSET_MISSING",
        `C5 外部图像 ${w.file}（来自 ${w.qid} 的 P18 声明）在 Commons 取回缺失/无 imageinfo → 不入库`));
      continue;
    }
    const meta = (hit.ii.extmetadata || {});
    const lic = String((meta.LicenseShortName && meta.LicenseShortName.value) || "").trim();
    const dateRaw = String((meta.DateTimeOriginal && meta.DateTimeOriginal.value) || "").trim();
    const descHtml = String((meta.ImageDescription && meta.ImageDescription.value) || "");
    const desc = descHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
    const fileUrl = String(hit.ii.url).split("?")[0];
    const lid = "commons:" + w.file;
    if (existLid.has(lid) || existPath.has(normUrlForMatch(fileUrl))) { skippedDup++; continue; }

    const ext = (fileUrl.match(/\.([a-z0-9]+)$/i) || [, ""])[1].toLowerCase();
    if (!["jpg", "jpeg", "png", "gif", "tif", "tiff", "webp"].includes(ext)) {
      nonImage++;
      triageRows.push(triReject("visual_asset", w.file, "NON_IMAGE_MIME", `C5 外部图像扩展名 .${ext}｜mime=${hit.ii.mime} → 不冒充 image`));
      continue;
    }
    if (!lic) noLicense++;
    licenseCount[lic || "(未知)"] = (licenseCount[lic || "(未知)"] || 0) + 1;
    const coh = periodKind(dateRaw || "");
    periodCount[coh] = (periodCount[coh] || 0) + 1;
    existLid.add(lid);
    existPath.add(normUrlForMatch(fileUrl));

    const sid = sidsByBatch[Math.floor(idx / TITLE_BATCH)] || null;
    if (!sid) continue; // 该批取回失败 → 无从给出 provenance，不写任何下游行

    const evId = uuid();
    const aid = uuid();
    const locator = `commons-imageinfo:${w.file}#entity=${w.qid}`;
    const quote = [desc, lic ? `许可：${lic}` : "许可：未知（未标注）", dateRaw ? `时间：${dateRaw}` : ""].filter(Boolean).join(" ｜ ").slice(0, 900);
    evIns.push({
      sql: `insert into evidence (evidence_id, source_id, evidence_type, locator, quote_text, region_json,
             place_hint, subject_hint, extraction_method, confidence, verification_status)
            values (:'eid'::uuid, :'sid'::uuid, 'image', :'loc', :'qt', :'rj'::jsonb, :'ph', :'sh', 'unattended-external-visual', 0.5, 'candidate')`,
      params: { eid: evId, sid, loc: locator, qt: quote || w.file,
        rj: JSON.stringify({ file: w.file, qid: w.qid, admin: w.admin || "", mime: hit.ii.mime || "", size: hit.ii.size || null }),
        ph: w.admin || null, sh: w.name || null },
    });
    assetIns.push({
      sql: `insert into visual_assets (asset_id, source_id, asset_type, file_path, created_date, depicted_period, rights, checksum, legacy_id, eligibility_tags)
            values (:'aid'::uuid, :'sid'::uuid, 'image', :'fp', :'cd', :'coh', :'rt', :'cs', :'lid', array['pending_heritage_review'])`,
      params: { aid, sid, fp: fileUrl, cd: dateRaw || null, coh, rt: lic || "unknown（未在 extmetadata 标注）", cs: sha(fileUrl), lid },
    });
    const linkId = uuid();
    linkIns.push({
      sql: `insert into visual_entity_links
            (link_id, asset_id, entity_id, depicted_entity_label, link_status, decision_rule,
             decision_note, link_evidence_id, current_or_historical, name_variant_note, eligibility_tags, generated_by)
            values (:'lid'::uuid, :'aid'::uuid, :'eid'::uuid, :'lab', 'suspected', 'R5_external_p18_statement',
             :'dn', :'ev'::uuid, :'coh', :'nvn', array['pending_heritage_review'], 'unattended-external-visual')
            on conflict (asset_id, depicted_entity_label) do nothing`,
      params: { lid: linkId, aid, eid: w.targetId, lab: (w.name || w.file).slice(0, 80),
        dn: `Wikidata ${w.qid} 的 P18 声明指认本文件描绘该对象（外部权威身份声明，非文本检索）`,
        ev: evId, coh, nvn: "" },
    });
    links++;
    mapIns.push({
      sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id)
            values (:'mid'::uuid, 'unattended-external-visual', 'commons_file', :'lid', 'visual_asset', :'tid'::uuid, 'candidate', 'commons-imageinfo', 0.5, :'rid'::uuid)
            on conflict (legacy_source, legacy_type, legacy_id, target_type) do nothing`,
      params: { mid: uuid(), lid, tid: aid, rid: ingestRunId },
    });

    // 资格判定留痕（只写 audit，不改资产行）：G0 归属 / G1 身份 / G3 空间 / G4 证据
    auditRows.push({ ot: "visual_asset", oid: aid, gc: "G0", r: "pass",
      rs: "C5-external-visual G0 pass：文件来自已声明批次 external-commons-visual-scan，source_record 可解析" });
    if (w.linkKind === "aligned") {
      auditRows.push({ ot: "visual_asset", oid: aid, gc: "G1", r: "pass",
        rs: `C5-external-visual G1 pass：由 Wikidata ${w.qid} 的 P18 声明指认，且该 Q-id 与库内对象精确同名对齐` });
    } else {
      auditRows.push({ ot: "visual_asset", oid: aid, gc: "G1", r: "pending",
        rs: `C5-external-visual G1 HOLD：P18 指认的对象 ${w.qid} 在库内尚无对应实体（IMAGE_IDENTITY_UNRESOLVED）` });
    }
    auditRows.push({ ot: "visual_asset", oid: aid, gc: "G3", r: w.admin ? "pass" : "pending",
      rs: w.admin ? `C5-external-visual G3 pass：外部项给出行政归属 ${w.admin}` : "C5-external-visual G3 HOLD：外部项未给出行政归属（TOWN_SCOPE_UNRESOLVED）" });
    auditRows.push({ ot: "visual_asset", oid: aid, gc: "G4", r: "pass", rs: "C5-external-visual G4 pass：链接绑定本批 evidence（imageinfo：URL/许可/时间/描述）" });
    auditRows.push({ ot: "evidence", oid: evId, gc: "G0", r: "pass", rs: "C5-external-visual G0 pass：source=wikimedia_commons 已在来源表登记（S2，可生成 Evidence）" });
    auditRows.push({ ot: "evidence", oid: evId, gc: "G4", r: "pass", rs: `C5-external-visual G4 pass：locator 可定位回 Commons 文件 ${w.file}` });
    if (!lic) auditRows.push({ ot: "evidence", oid: evId, gc: "G1", r: "pending",
      rs: "C5-external-visual G1 HOLD：LICENSE_UNKNOWN —— extmetadata 未标注许可，不得据以再利用" });

    triageRows.push(triHold("visual_asset", aid, "PENDING_HERITAGE_REVIEW",
      `C5 外部候选图：${w.file}（${w.name || w.qid}｜${lic || "许可未知"}）→ 未过人审，不可用于 heritage-primary`));
    triageRows.push(triHold("visual_entity_link", linkId, "IMAGE_LINK_SUSPECTED",
      `C5 外部图-实体链接（P18 指认）：${w.file} ← ${w.qid}，待人审确认`));
    triageRows.push(triHold("evidence", evId, "EXTERNAL_SOURCE_UNREVIEWED",
      `C5 外部题录证据：${w.file}（Commons imageinfo），待人审核许可与原始出处`));
    if (!lic) triageRows.push(triHold("visual_asset", aid, "LICENSE_UNKNOWN", `C5 外部图 ${w.file}：extmetadata 未标注许可 → HOLD`));
    insertedAssets++;
  }

  if (WRITE) {
    if (srcIns.length) await runManyBatched(srcIns);
    if (evIns.length) await runManyBatched(evIns);
    if (assetIns.length) await runManyBatched(assetIns);
    if (linkIns.length) await runManyBatched(linkIns);
    if (mapIns.length) await runManyBatched(mapIns);
    if (auditRows.length) await runManyBatched(auditRows.map((x) => ({
      sql: `insert into evidence_gate_audit (object_type, object_id, gate_code, result, reason, actor_type)
            values (:'ot', :'oid', :'gc', :'r', :'rs', 'rule')`, params: x })));
    await recordTriage(triageRows);
  }

  return {
    ok: true, dry_run: !WRITE, ms: Date.now() - t0,
    files_requested: retrieved, pages_retrieved: pages.length, batches, http_failures: httpFail,
    assets_new: WRITE ? insertedAssets : 0, assets_would: WRITE ? 0 : insertedAssets,
    links_new: WRITE ? links : 0, links_would: WRITE ? 0 : links,
    evidence_new: WRITE ? evIns.length : 0, evidence_would: WRITE ? 0 : evIns.length,
    sources_new: WRITE ? srcIns.length : 0, sources_would: WRITE ? 0 : srcIns.length,
    audit_rows: WRITE ? auditRows.length : 0, triaged: WRITE ? triageRows.length : 0,
    skipped_dup: skippedDup, missing_on_commons: missing, non_image: nonImage, license_unknown: noLicense,
    licenses: licenseCount, periods: periodCount,
    confirmed_links: 0, // 红线：本厂商零 confirmed
  };
}

const RUNNERS = {
  source: (j) => (j.file ? jobSource(j) : jobSourceRefresh(j)),
  images: jobImages,
  imagelink: jobImageLink,
  coords: jobCoords,
  evidence: jobEvidenceFragment,
  extraction: jobExtraction,
  resolution: jobResolution,
  weave: jobWeave,
  gate: jobGate,
  // [C5 · 2026-10-05] 外部扩源两线：身份线决定「是什么」，视觉线按身份取回「图」。
  extid: jobExternalIdentity,
  extvis: jobExternalVisual,
  // [C6 · 2026-10-05] E 组：canonical_name 重名 resolution（只登记结论，不合并/删除任何实体行）。
  nameres: jobNameResolution,
};

// ═══════════════════════════════════════════════════════════════════════════════
// [C6 · 2026-10-05 · E 组] unattended.name-resolution：entities.canonical_name 重名 resolution
//
// 规则（刻意保守）：**只登记结论，不合并、不删除、不改任何实体行**。
//   ① 同组各行的归一化 legacy_id 完全一致 → 判定为「同一对象的移植重复行」→ 机器可定：
//      取 entity_id 最小者为 canonical，写一条 resolution 映射；
//   ② 其余（同名不同对象 / 类型不同 / legacy_id 缺失）→ 不自选边，标记 homonym_open 送人审。
// 为什么不合并：合并＝删除实体行，会连带改动 C2/C5 已落的候选与链接，属数据处置；
// 本作业只把"谁是谁"的结论落到 legacy_mappings，随时可撤销。
// ═══════════════════════════════════════════════════════════════════════════════
const NAME_RES_SOURCE = "c6-name-resolution";
// 遗产相关类型：只有这类重名才值得占人工队列（家谱同名人属数据常态，见下方注释）。
const HERITAGE_TYPES = new Set(["place", "building", "town", "gazetteer", "artifact"]);

/** 由字符串生成稳定的 uuid 形文本（供 legacy_mappings.target_id 的 uuid 列使用）。 */
function deterministicUuid(key) {
  const h = sha(String(key));
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** 归一化 legacy_id：剥掉移植前缀后比较，避免「同一对象两种写法」被当成两个对象。 */
const normLegacyId = (lid) => String(lid || "")
  .replace(/^hushang-jingwei:entity:/, "")
  .replace(/^hushang-jingwei:/, "")
  .replace(/^unattended-ext:wd:/, "wd:")
  .trim();

async function jobNameResolution(j) {
  const t0 = Date.now();
  const rows = await queryRows(
    `select entity_id::text eid, canonical_name cn, entity_type et, legacy_id lid from entities
      where canonical_name is not null and btrim(canonical_name) <> '' order by canonical_name, entity_id`);
  const groups = new Map();
  for (const r of rows) {
    // ★ 只剥 ASCII 空格，不剥 \t / \u00A0 —— 与守卫的 `btrim(canonical_name)` 口径必须逐字一致。
    // 用 JS 的 trim() 会把「顾眏\t」并进「顾眏」，而 PG 的 btrim 只剥空格、仍算两组，
    // 于是守卫会报出一个它自己算出来的"未覆盖组"（实测踩到）。
    const n = String(r.cn).replace(/^ +| +$/g, "");
    if (!n) continue;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(r);
  }
  const dups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  const exist = await queryRows(
    `select legacy_id, mapping_status from legacy_mappings where legacy_source = :'s'`, { s: NAME_RES_SOURCE });
  const done = new Set(exist.map((r) => String(r.legacy_id)));

  const ins = [], triage = [];
  let resolved = 0, open = 0, skipped = 0, openReviewed = 0, openMachineOnly = 0;
  const openTop = [];
  for (const [name, arr] of dups) {
    if (done.has(name)) { skipped++; continue; }
    const keys = new Set(arr.map((r) => normLegacyId(r.lid)));
    const types = new Set(arr.map((r) => String(r.et || "")));
    const sameObject = keys.size === 1 && [...keys][0] !== "";
    if (sameObject) {
      const canonical = [...arr].sort((a, b) => (a.eid < b.eid ? -1 : 1))[0];
      ins.push({
        sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id)
              values (:'mid'::uuid, :'src', 'entity_name_group', :'lid', 'entity', :'tid'::uuid, 'resolved',
                      'normalized_legacy_id_identical', 0.9, :'rid'::uuid)
              on conflict do nothing`,
        params: { mid: uuid(), src: NAME_RES_SOURCE, lid: name, tid: canonical.eid, rid: ingestRunId },
      });
      resolved++;
    } else {
      ins.push({
        sql: `insert into legacy_mappings (mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id)
              values (:'mid'::uuid, :'src', 'entity_name_group', :'lid', 'entity_name_group', :'tid'::uuid, 'homonym_open',
                      'machine_not_decidable_no_auto_merge', 0, :'rid'::uuid)
              on conflict do nothing`,
        params: { mid: uuid(), src: NAME_RES_SOURCE, lid: name, tid: deterministicUuid("name-group:" + name), rid: ingestRunId },
      });
      open++;
      // 只有**遗产相关类型**（place/building/town/gazetteer/artifact）的重名才进人审队列：
      // 家谱里同名人极多（实测 369 组中绝大多数是 family_person），那是数据常态而非待决问题，
      // 全部排队等于用新机制重新制造人工债务（协议 §3.3 / C3 §4.1.1）。
      const heritage = arr.some((r) => HERITAGE_TYPES.has(String(r.et || "")));
      if (heritage) {
        openReviewed++;
        triage.push(triHold("entity_name_group", name, "HOMONYM_OPEN",
          `C6 重名未决（遗产相关）：「${name}」在库中有 ${arr.length} 条（类型 ${[...types].join("/") || "未知"}，归一化 legacy_id ${keys.size} 种）→ 不自选边，待人审`));
      } else {
        openMachineOnly++;
      }
      if (openTop.length < 25 && heritage) openTop.push({ name, c: arr.length, types: [...types].join("/") });
    }
  }
  if (WRITE) {
    if (ins.length) await runManyBatched(ins);
    await recordTriage(triage);
  }
  return {
    ok: true, dry_run: !WRITE, ms: Date.now() - t0,
    name_groups_total: groups.size, duplicate_groups: dups.length,
    resolved, homonym_open: open, homonym_open_reviewed: openReviewed, homonym_open_machine_only: openMachineOnly,
    already_resolved: skipped,
    mappings_written: WRITE ? ins.length : 0, mappings_would: WRITE ? 0 : ins.length,
    triaged: WRITE ? triage.length : 0,
    entities_modified: 0, // 红线：本作业不合并 / 不删除 / 不修改任何实体行
    open_top: openTop,
  };
}

// [2026-10-02 · M3 / M1.4] 执行报告的全部事实由查询得出，禁止模板断言；
// 三种形态（report.json / report.html / result.md）由 ./unattended-report.mjs **同源渲染**——
// 各写一套必然互相漂移，本项目已付过"文档里写着、代码里没有"的代价。
// 归因口径：本批时间窗 [progress.started_at, now]。目前尚无 run 级关联（断点 B-03），
// 故"本批"＝时间窗口径；M2（Gate 数据库层强制）落地后改为 run 级归因。
// [M2 第四条 · 202610020009 落地] 事实行按时间窗查询；写入库的分诊行均带 ingest_run_id
//（run 级归因已接线，历史行除外）——两口径并存期间，分诊事实以 run_id 为准。
const FACTS_ATTRIBUTION = "本批＝时间窗 [started_at, now]；自迁移 202610020009 起，本 runner 写入的分诊行均带 ingest_run_id（B-03 run 级归因成立；历史行仍为时间窗口径）。";

async function summaryFacts() {
  const sql = {
    gate_rows_in_window: "select count(*) from evidence_gate_audit where created_at >= :started_at",
    queue_rows_in_window: "select count(*) from review_queue where created_at >= :started_at",
    queue_triage_auto: "select count(*) from review_queue where triage_outcome='auto' and created_at >= :started_at",
    queue_triage_hold: "select count(*) from review_queue where triage_outcome='hold' and created_at >= :started_at",
    queue_triage_reject: "select count(*) from review_queue where triage_outcome='reject' and created_at >= :started_at",
    va_total: "select count(*) from visual_assets",
    va_pending_review: "select count(*) from visual_assets where eligibility_tags && array['pending_heritage_review']",
    va_excluded: "select count(*) from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']",
    va_no_gate_audit: "select count(*) from visual_assets a where not exists (select 1 from evidence_gate_audit g where g.object_type='visual_asset' and g.object_id=a.asset_id::text)",
    va_audit_last_at: "select max(created_at)::text from evidence_gate_audit where object_type='visual_asset'",
    va_effective: "select count(*) from effective_visual_assets",
    published_entities: "select count(*) from entities where status='published'",
    verified_evidence: "select count(*) from evidence where verification_status='verified'",
    coords_claimed_as_history: "select count(*) from historical_feature_anchors where historical_position_proof",
    coords_without_crs: "select count(*) from historical_feature_anchors where lat is not null and coord_system is null",
  };
  const rows = await queryRows(
    `select
       (select count(*) from evidence_gate_audit where created_at >= :'w'::timestamptz) as gate_rows_in_window,
       (select count(*) from review_queue          where created_at >= :'w'::timestamptz) as queue_rows_in_window,
       (select count(*) from review_queue where triage_outcome='auto'  and created_at >= :'w'::timestamptz) as queue_triage_auto,
       (select count(*) from review_queue where triage_outcome='hold'  and created_at >= :'w'::timestamptz) as queue_triage_hold,
       (select count(*) from review_queue where triage_outcome='reject' and created_at >= :'w'::timestamptz) as queue_triage_reject,
       (select count(*) from visual_assets) as va_total,
       (select count(*) from visual_assets where eligibility_tags && array['pending_heritage_review']) as va_pending_review,
       (select count(*) from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']) as va_excluded,
       (select count(*) from visual_assets a where not exists (
            select 1 from evidence_gate_audit g
             where g.object_type = 'visual_asset' and g.object_id = a.asset_id::text)) as va_no_gate_audit,
       (select max(created_at)::text from evidence_gate_audit where object_type = 'visual_asset') as va_audit_last_at,
       (select count(*) from effective_visual_assets) as va_effective,
       (select count(*) from entities where status = 'published') as published_entities,
       (select count(*) from evidence where verification_status = 'verified') as verified_evidence,
       (select count(*) from historical_feature_anchors where historical_position_proof) as coords_claimed_as_history,
       (select count(*) from historical_feature_anchors where lat is not null and coord_system is null) as coords_without_crs`,
    { w: progress.started_at }
  );
  return { values: rows[0] || {}, sql };
}

/** 事实表：每个数字都带上它自己的 SQL 出处（§0.7 要求"可复核"）。 */
function factsRows(f) {
  const v = (k) => {
    const x = f.values ? f.values[k] : undefined;
    return x === undefined || x === null ? "（未查）" : x;
  };
  const s = (k) => (f.sql && f.sql[k]) || "";
  const row = (k, label) => ({ key: k, label, value: v(k), sql: s(k) });
  return [
    row("gate_rows_in_window", "本批时间窗内门禁审计条数"),
    row("queue_rows_in_window", "本批时间窗内 review_queue 新增"),
    row("queue_triage_auto", "其中 AUTO 分诊（确定性晋级）"),
    row("queue_triage_hold", "其中 HOLD 分诊（隔离区新增）"),
    row("queue_triage_reject", "其中 REJECT 分诊（自动拒绝）"),
    row("va_total", "图片 总数"),
    row("va_pending_review", "图片 待审"),
    row("va_excluded", "图片 已排除（heritage-primary）"),
    row("va_no_gate_audit", "图片缺门禁审计（反连接计数）"),
    // [2026-10-02] 这一行是为了防止上面那行被误读：实测本仓的**测试套件会批量写 evidence_gate_audit**
    // （2026-10-02 17:03:58–17:04:05 的 7 秒内写入 9016 行，覆盖全部 1288 张图）。
    // 因此"缺审计 = 0"既可能来自真实门禁流程，也可能只是刚跑过测试 —— 必须看时间才能判断。
    row("va_audit_last_at", "最近一次图片门禁审计时间（据此判断覆盖是否来自真实门禁流程）"),
    row("va_effective", "真正“有效可用”的图片"),
    row("published_entities", "published 实体（必须为 0）"),
    row("verified_evidence", "verified 证据（必须为 0）"),
    row("coords_claimed_as_history", "claim 为历史位置的坐标（必须为 0）"),
    row("coords_without_crs", "有坐标无 CRS（必须为 0）"),
  ];
}

const GUARANTEES = [
  "**本批是否运行过 Evidence Gate：由报告中“时间窗内门禁审计条数”回答，不由本报告断言。**",
  "**候选层写入三分（M2 第四条 / 迁移 202610020009）**：每个候选对象出生即在 review_queue 带分诊行（auto/hold/reject）；分诊必带 reason_code，auto 禁 Tier C，分诊结论不可改写，且带 ingest_run_id（run 级归因）。",
  "**图片默认不可用**：新增图片以 `eligibility_tags = {pending_heritage_review}` 写入，须经复核方可用于 heritage-primary。",
  "图片源必须唯一可确定；否则作业在开跑前被 preflight 剔除、不写入（不再取任意 source_record）。",
  "HTTP 校验 fail-closed：状态未知的链接一律不收。",
  "坐标诚实由库层 CHECK 强制：`anchor_coord_requires_crs`、`anchor_current_never_proof`。",
  "Raw append-only：源材料快照保留在 RAW_STORE/legacy/hushang/。",
  "幂等：按 legacy_id + 规范化 file_path 跳过，可重跑。",
];

const LIMITS = [
  "**归因口径**：本批事实按时间窗 [started_at, now] 查询；本 runner 写入的分诊行自 202610020009 起带 `ingest_run_id`（B-03 已接线），历史行仍为时间窗口径。",
  "**有效性未自动成立**：本报告只能列出“声明瞄准的叙事缺口”；是否真的推进/关闭需有人值守核对（协议 §0.6，覆盖矩阵回写未实现）。",
  "**未声明即不调度**：队列中任何未在生产注册表里唯一声明的作业会让整轮不启动（协议 §12）。",
];

async function finalize(reason) {
  progress.stop_reason = reason;
  progress.finished_at = new Date().toISOString();
  save();

  // [2026-10-02 修正] 作业 id 是 progress.jobs 的**键**，不是对象字段；原用 Object.values 取不到 id，
  // 导致 Escalation 显示成"作业失败 3 个：?, ?, ?"。改为按 entries 取键。
  const jobEntries = Object.entries(progress.jobs);
  const done = jobEntries.filter(([, j]) => j.ok !== false);
  const failed = jobEntries.filter(([, j]) => j.ok === false);
  const inserted = jobEntries.reduce((a, [, j]) => a + (Number(j.inserted) || 0), 0);
  const unexecuted = jobs.length - done.length - failed.length;

  // [M1.4] 事实表**总是查询**（全部是只读 SELECT）：DRY_RUN 也需要让拥有者看到当前库状态。
  // 窗口类事实（本批时间窗内的门禁审计 / review_queue 新增）在 DRY_RUN 下预期为 0 —— 这本身是有用信息；
  // 绝对类事实（visual_assets 总数等）仍反映真实库状态。
  let f = { values: {}, sql: {} };
  let factsError = null;
  try { f = await summaryFacts(); }
  catch (e) { factsError = String((e && e.message) || e); }
  const fv = f.values || {};
  const factsAttribution = FACTS_ATTRIBUTION +
    (MODE === "DRY_RUN" ? " **本轮为 DRY_RUN：窗口类事实（门禁审计条数 / review_queue 新增）预期为 0。**" : "");

  // 三值结论（项目拥有者 2026-10-02 批准；协议 §8）
  const hardStop = failed.length > 0 || reason === "STOPPED_CONSECUTIVE_FAILURES" || reason === "STOPPED_FATAL";
  const newHolds = Number(fv.queue_rows_in_window || 0);
  const verdict = hardStop ? "STOPPED" : (newHolds > 0 || unexecuted > 0 ? "PASS WITH HOLD" : "PASS");
  progress.verdict = verdict;
  save();

  // [M2 第四条 · B-03] 收口 run：本轮状态与计数落 ingest_runs（run 级归因的锚点；DRY_RUN 无 run 行）
  if (WRITE && ingestRunId) {
    await run(
      `update ingest_runs set finished_at = now(), status = :'st', input_count = :'ic', candidate_count = :'cc', error_count = :'ec', metadata_json = :'mj'::jsonb where ingest_run_id = :'rid'::uuid`,
      {
        st: failed.length ? "partial" : "completed", ic: jobs.length, cc: inserted, ec: failed.length,
        mj: JSON.stringify({ mode: MODE, env: ENV, tag: TAG, forbidden: forbidden.length, preflight_excluded: preflightExcluded.length }),
        rid: ingestRunId,
      }
    );
  }

  // Escalation：只列会阻塞当前体验的，最多 3 条（协议 §8：普通 HOLD 不打扰拥有者）
  const esc = [];
  if (failed.length) esc.push(`作业失败 ${failed.length} 个：${failed.map(([id]) => id).join(", ")}`);
  if (Number(fv.published_entities || 0) > 0 || Number(fv.verified_evidence || 0) > 0)
    esc.push(`**红线**：库中出现 published/verified（实体 ${fv.published_entities}、证据 ${fv.verified_evidence}）——无人值守期间不得产生`);
  if (Number(fv.gate_rows_in_window || 0) === 0 && inserted > 0)
    esc.push(`本批写入 ${inserted} 条，但本批时间窗内 evidence_gate_audit **0 条** → 本批未运行 Evidence Gate`);
  if (Number(fv.coords_claimed_as_history || 0) > 0 || Number(fv.coords_without_crs || 0) > 0)
    esc.push(`坐标诚实：historical_position_proof=true ${fv.coords_claimed_as_history} 条、有坐标无 CRS ${fv.coords_without_crs} 条`);
  if (unexecuted > 0) esc.push(`未执行 ${unexecuted} 个作业（截止时间到 / 作业耗尽）`);

  // 注册表条目随报告一并留档，供 buildReport 推导"本批声明瞄准了哪些叙事缺口"
  const registryForReport = { ...(progress.registry || {}), __entries: REG_ENTRIES };

  const report = buildReport({
    tag: TAG, mode: MODE, env: ENV, interval_min: INTERVAL_MIN,
    cutoff: CUTOFF.toISOString(), started_at: progress.started_at, finished_at: progress.finished_at,
    verdict, stop_reason: reason,
    escalation: esc,
    registry: registryForReport,
    jobs: progress.jobs,
    counts: {
      queued: ALL_JOBS.length, declared: declared.length, runnable: jobs.length,
      done: done.length, failed: failed.length, unexecuted, inserted,
    },
    factsAttribution,
    factsRows: factsRows(f),
    factsError,
    guarantees: GUARANTEES,
    limits: LIMITS,
  });

  // 一次生成、同源产出三形态（§0.7）
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "result.md"), renderMarkdown(report), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "report.html"), renderHtml(report), "utf8");
  log(`FINAL verdict=${verdict} reason=${reason} done=${done.length} failed=${failed.length} inserted=${inserted} report=json+md+html`);
}

async function main() {
  log(`START mode=${MODE} cutoff=${CUTOFF.toISOString()} interval=${INTERVAL_MIN}min jobs=${jobs.length}`);
  let consecFail = 0;
  for (const j of jobs) {
    if (new Date() >= CUTOFF) { await finalize("CUTOFF_REACHED"); return; }
    if (fs.existsSync(STOP_FILE)) { await finalize("STOPPED_BY_STOP_FILE"); return; }
    try {
      const res = await RUNNERS[j.kind](j);
      progress.jobs[j.id] = { ...res, at: new Date().toISOString() };
      progress.counters.jobs_done++;
      progress.counters.inserted += Number(res.inserted) || 0;
      if (res.ok === false) { progress.counters.jobs_failed++; consecFail++; } else consecFail = 0;
      log(`job=${j.id} ok=${res.ok !== false} inserted=${res.inserted || 0} ${res.note || ""}`);
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      progress.jobs[j.id] = { ok: false, note: msg, at: new Date().toISOString() };
      progress.counters.jobs_failed++; progress.failures.push({ id: j.id, msg }); consecFail++;
      log(`job=${j.id} FAIL ${msg}`);
    }
    save();
    if (consecFail >= 3) { await finalize("STOPPED_CONSECUTIVE_FAILURES"); return; }
    const until = Date.now() + INTERVAL_MIN * 60 * 1000;
    while (Date.now() < until) {
      if (fs.existsSync(STOP_FILE)) { await finalize("STOPPED_BY_STOP_FILE"); return; }
      await new Promise((r) => setTimeout(r, 5000));
      if (new Date() >= CUTOFF) break;
    }
    if (new Date() >= CUTOFF) { await finalize("CUTOFF_REACHED"); return; }
  }
  // 作业耗尽 → 空转到截止时间（保持常驻，到点收尾）
  log("jobs exhausted, idling until cutoff");
  while (new Date() < CUTOFF) {
    if (fs.existsSync(STOP_FILE)) { await finalize("STOPPED_BY_STOP_FILE"); return; }
    await new Promise((r) => setTimeout(r, 30000));
  }
  await finalize("CUTOFF_REACHED");
}

main().catch(async (e) => { log("FATAL " + (e && e.message ? e.message : e)); try { await finalize("STOPPED_FATAL"); } catch {} process.exit(1); });
