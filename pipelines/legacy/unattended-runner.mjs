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

const LEGACY_SOURCE = "hushang_legacy";
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";

// ---- args ----
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const UNTIL = arg("until", "06:00");
const INTERVAL_MIN = Number(arg("interval-min", "6"));
const TAG = arg("tag", "UNATTENDED-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""));
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
import { buildJobs, matchEntries } from "./unattended-jobs.mjs";
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

/** 图片源必须唯一可确定（否则会像 727 张照片那样整批挂错 provenance）。 */
async function resolveImageSource() {
  const rows = await queryRows(
    `select source_id, title, content_type, metadata_json from source_records where provider=:'p'`,
    { p: LEGACY_SOURCE }
  );
  const candidates = rows.filter((r) => {
    const kind = r.metadata_json && r.metadata_json.kind;
    return kind !== "poem_source" && !/诗词|poem/i.test(r.title || "");
  });
  return { total: rows.length, candidates };
}

let _imgSrc = null;
async function imageSourceCached() { if (!_imgSrc) _imgSrc = await resolveImageSource(); return _imgSrc; }

/** 只回答"这个作业现在能不能开跑"；不回答结果对不对。
 *  **铁律：检查项必须与作业实际会做的事一致——过严会静默丢掉合法工作。** */
async function preflight(j) {
  const p = path.join(FETCHED, j.file);
  if (!fs.existsSync(p)) return { ok: false, reason: `源文件不存在：${j.file}` };

  // source：本作业只做「登记来源 + Raw 快照」，按字节读取并 hash，**不解析 JSON**。
  // （早先版本误加了数组结构检查，把 61 个合法作业全部误判为未就绪：实测 runnable 61 → 5。）
  if (j.kind === "source") return { ok: true, bytes: fs.statSync(p).size };

  if (j.kind === "images") {
    const r = await imageSourceCached();
    if (r.candidates.length !== 1) {
      return { ok: false, reason: `图片源无法唯一确定（hushang_legacy 源 ${r.total} 条，其中非诗词 ${r.candidates.length} 条）—— 须先为图片批次建立专属 source_record` };
    }
  }

  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { ok: false, reason: "JSON 解析失败" }; }
  const arr = j.kind === "coords"
    ? readArr(doc, ["filled", "items", "coords", "results", "data"])
    : readArr(doc, ["items", "images", "results", "data"]);
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

const jobs = RUNNABLE;
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
save();

// ---- 作业实现 ----
async function jobSource(j) {
  const p = path.join(FETCHED, j.file);
  if (!fs.existsSync(p)) return { ok: false, skipped: true, note: "file-missing" };
  const txt = fs.readFileSync(p, "utf8");
  const cs = sha(txt);
  if (!WRITE) return { ok: true, would_insert: 1, note: "source_record:" + j.file };
  await run(`insert into source_records (source_id,provider,title,creator,source_date,content_type,license_code,checksum,raw_path,metadata_json)
    values (:'sid'::uuid,:'p',:'t','沪上经纬旧库',null,'application/json','legacy-transfer',:'cs',:'rp',:'mj'::jsonb)
    on conflict (provider,checksum) do nothing`,
    { sid: uuid(), p: LEGACY_SOURCE, t: "沪上经纬-" + j.file, cs, rp: `<RAW_STORE>/legacy/hushang/${j.file}`, mj: JSON.stringify({ kind: "legacy_source_file", file: j.file }) });
  const rawDir = path.join(RAW_STORE, "legacy", "hushang");
  fs.mkdirSync(rawDir, { recursive: true });
  const dest = path.join(rawDir, j.file);
  if (!fs.existsSync(dest)) fs.copyFileSync(p, dest);
  return { ok: true, inserted: 1 };
}

async function jobImages(j) {
  const p = path.join(FETCHED, j.file);
  if (!fs.existsSync(p)) return { ok: false, skipped: true, note: "file-missing" };
  let doc; try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { ok: false, note: "bad-json" }; }
  const arr = ["items", "images", "results", "data"].map((k) => doc[k]).find((a) => Array.isArray(a)) || [];
  // [2026-10-02 修复 · 根因 1] 原为无 ORDER BY / 无过滤的 `select source_id ... where provider=:'p'`，取"任意一行"。
  // 实际后果：727 张照片被挂到名为「沪上经纬诗词-souyun_poems_by_person.json」的源记录上，provenance 完全错位。
  // 现要求"图片源"唯一可确定；否则 fail loud，绝不猜。
  const srcCandidates = await queryRows(
    `select source_id, title, content_type, metadata_json from source_records where provider=:'p'`,
    { p: LEGACY_SOURCE }
  );
  const imageSources = srcCandidates.filter((r) => {
    const kind = r.metadata_json && r.metadata_json.kind;
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
  let skipped = 0, badStatus = 0, unverified = 0, notImage = 0;
  for (const im of arr) {
    const url = im.url || im.thumb || im.file_path || im.image || null;
    if (!url) { skipped++; continue; }

    // [2026-10-02 修复 · 根因 3] 原为 fail-open：`im._http` 缺失或 status 为 0/null 时整条判断短路，
    // 坏链接直接入库（实际后果：23 张 HTTP 非 200 死链入库）。现改为 fail-closed：状态未知一律不收。
    const httpStatus = im._http && im._http.status != null ? Number(im._http.status) : null;
    if (httpStatus == null) { unverified++; continue; }
    if (httpStatus !== 200) { badStatus++; continue; }

    // [2026-10-02 修复 · 根因 4] 非图片类型不再冒充 asset_type='image'（实测 29 个 .djvu 古籍扫描 + 1 个 .webm 视频）。
    const ext = (String(url).split("?")[0].match(/\.([a-z0-9]+)$/i) || [, ""])[1].toLowerCase();
    if (!["jpg", "jpeg", "png", "gif", "webp", "tif", "tiff", "bmp", "svg"].includes(ext)) { notImage++; continue; }

    const lid = String(url);
    if (existSet.has(lid) || existPaths.has(normUrl(url))) { skipped++; continue; }
    existSet.add(lid);
    existPaths.add(normUrl(url));
    if (!WRITE) continue;
    items.push({
      // [2026-10-02 修复 · 根因 5] 显式写入资格标记，不再依赖列默认 '{}'（"未排除即可用"）。
      // 未过门禁的新增图片一律标 pending_heritage_review，不再被静默视为可用。
      sql: `insert into visual_assets (asset_id,source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id,eligibility_tags)
            values (:'aid'::uuid,:'sid'::uuid,'image',:'fp',null,'unknown',:'rt',:'cs',:'lid',array['pending_heritage_review'])`,
      params: { aid: uuid(), sid: srcId, fp: url, rt: im.license || "上海图书馆/Wikimedia 开放数据（授权待确认）", cs: sha(url), lid },
    });
  }
  if (WRITE && items.length) await runMany(items);
  return { ok: true, total: arr.length, inserted: items.length, skipped, bad_status: badStatus, unverified_status: unverified, not_image: notImage };
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
  let matched = 0, inserted = 0;
  for (const f of filled) {
    if (!(f.lat != null && f.lng != null)) continue;
    const eid = entMap.get(f.id);
    if (!eid) continue;
    matched++;
    const akey = "wd:" + f.id;
    if (existASet.has(akey)) continue;
    existASet.add(akey);
    if (!WRITE) continue;
    const fid = uuid();
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
      { aid: uuid(), akey, fid, sloc: "wikidata:" + (f.qid || f.id) });
    inserted++;
  }
  return { ok: true, filled: filled.length, matched, inserted };
}

const RUNNERS = { source: jobSource, images: jobImages, coords: jobCoords };

// [2026-10-02 · M3 / M1.4] 执行报告的全部事实由查询得出，禁止模板断言；
// 三种形态（report.json / report.html / result.md）由 ./unattended-report.mjs **同源渲染**——
// 各写一套必然互相漂移，本项目已付过"文档里写着、代码里没有"的代价。
// 归因口径：本批时间窗 [progress.started_at, now]。目前尚无 run 级关联（断点 B-03），
// 故"本批"＝时间窗口径；M2（Gate 数据库层强制）落地后改为 run 级归因。
const FACTS_ATTRIBUTION = "本批＝时间窗 [started_at, now]（尚无 ingest_run_id 级关联，断点 B-03；M2 落地后改为 run 级归因）。";

async function summaryFacts() {
  const sql = {
    gate_rows_in_window: "select count(*) from evidence_gate_audit where created_at >= :started_at",
    queue_rows_in_window: "select count(*) from review_queue where created_at >= :started_at",
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
  "**图片默认不可用**：新增图片以 `eligibility_tags = {pending_heritage_review}` 写入，须经复核方可用于 heritage-primary。",
  "图片源必须唯一可确定；否则作业在开跑前被 preflight 剔除、不写入（不再取任意 source_record）。",
  "HTTP 校验 fail-closed：状态未知的链接一律不收。",
  "坐标诚实由库层 CHECK 强制：`anchor_coord_requires_crs`、`anchor_current_never_proof`。",
  "Raw append-only：源材料快照保留在 RAW_STORE/legacy/hushang/。",
  "幂等：按 legacy_id + 规范化 file_path 跳过，可重跑。",
];

const LIMITS = [
  "**归因口径**：本批＝时间窗口径（尚无 `ingest_run_id` 级关联，断点 B-03）；M2 落地后改为 run 级归因。",
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
