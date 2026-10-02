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
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG = path.join(OUT_DIR, "runner.log");
const PROGRESS = path.join(OUT_DIR, "progress.json");
const log = (s) => { const line = `[${new Date().toISOString()}] ${s}\n`; fs.appendFileSync(LOG, line); process.stdout.write(line); };

const progress = { tag: TAG, mode: MODE, env: ENV, cutoff: CUTOFF.toISOString(), interval_min: INTERVAL_MIN,
  started_at: new Date().toISOString(), jobs: {}, counters: { jobs_done: 0, jobs_failed: 0, inserted: 0 }, failures: [], verdict: "" };
const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2), "utf8");

// ---- 作业队列 + 生产注册表（2026-10-02 M1.2）----
// 队列定义已抽到 ./unattended-jobs.mjs，使守卫（scripts/check-production-registry.mjs）能 import
// **同一份定义**做精确核对，而不是靠正则去猜 runner 里有哪些作业。
// import 与本块一起放在此处（ESM 顶层声明会被提升），以保持「队列」与「它的闸门」相邻可读。
import { buildJobs, matchEntries } from "./unattended-jobs.mjs";

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

// ① 未声明 / 声明不唯一 → 一律不调度（整轮不启动，不做半截）
const unresolved = RESOLVED.filter((r) => r.hits.length !== 1);
if (unresolved.length) {
  console.error(`STOP ${unresolved.length} 个作业未在生产注册表中唯一声明 —— 一律不调度：`);
  for (const r of unresolved) console.error(`     ${r.job.id}  (kind=${r.job.kind})  命中 ${r.hits.length} 条`);
  console.error(`     处置：在 ${REGISTRY_PATH} 里声明该作业（required_fields 全填），或从队列中移除。`);
  process.exit(3);
}

// ② 声明为 unattended:"forbidden" 的作业 → 确定性剔除（不是失败，不计入连续失败）
const excluded = [];
const jobs = RESOLVED.filter((r) => {
  const e = r.hits[0];
  if (e.unattended === "forbidden") {
    excluded.push({ id: r.job.id, reason: e.unattended_reason || "(未写理由)" });
    return false;
  }
  return true;
}).map((r) => r.job);

progress.registry = { path: REGISTRY_PATH, entries: REG_ENTRIES.length, queued: ALL_JOBS.length, runnable: jobs.length, excluded };
for (const x of excluded) log(`SKIP unattended=forbidden  ${x.id} — ${x.reason}`);
log(`registry=${REGISTRY_PATH} entries=${REG_ENTRIES.length} queued=${ALL_JOBS.length} runnable=${jobs.length} excluded=${excluded.length}`);
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

// [2026-10-02 · M3] 执行报告的全部事实由查询得出，禁止模板断言。
// 归因口径：本批时间窗 [progress.started_at, now]。目前尚无 run 级关联（断点 B-03），
// 故"本批"＝时间窗口径；M2（Gate 数据库层强制）落地后改为 run 级归因。
// 见 tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md §4 M3。
async function summaryFacts() {
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
       (select count(*) from effective_visual_assets) as va_effective,
       (select count(*) from entities where status = 'published') as published_entities,
       (select count(*) from evidence where verification_status = 'verified') as verified_evidence,
       (select count(*) from historical_feature_anchors where historical_position_proof) as coords_claimed_as_history,
       (select count(*) from historical_feature_anchors where lat is not null and coord_system is null) as coords_without_crs`,
    { w: progress.started_at }
  );
  return rows[0] || {};
}

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

  let f = {};
  if (WRITE) {
    try { f = await summaryFacts(); }
    catch (e) { f = { error: String((e && e.message) || e) }; }
  }
  const F = (v) => (v === undefined || v === null ? "（未查）" : v);

  // 三值结论（项目拥有者 2026-10-02 批准；协议 #8）
  const hardStop = failed.length > 0 || reason === "STOPPED_CONSECUTIVE_FAILURES" || reason === "STOPPED_FATAL";
  const newHolds = Number(f.queue_rows_in_window || 0);
  const verdict = hardStop ? "STOPPED" : (newHolds > 0 || unexecuted > 0 ? "PASS WITH HOLD" : "PASS");
  progress.verdict = verdict;
  save();

  // Escalation：只列会阻塞当前金泽体验的，最多 3 条（协议 #8：普通 HOLD 不打扰拥有者）
  const esc = [];
  if (failed.length) esc.push(`作业失败 ${failed.length} 个：${failed.map(([id]) => id).join(", ")}`);
  if (Number(f.published_entities || 0) > 0 || Number(f.verified_evidence || 0) > 0)
    esc.push(`**红线**：库中出现 published/verified（实体 ${f.published_entities}、证据 ${f.verified_evidence}）——无人值守期间不得产生`);
  if (Number(f.gate_rows_in_window || 0) === 0 && inserted > 0)
    esc.push(`本批写入 ${inserted} 条，但本批时间窗内 evidence_gate_audit **0 条** → 本批未运行 Evidence Gate`);
  if (Number(f.coords_claimed_as_history || 0) > 0 || Number(f.coords_without_crs || 0) > 0)
    esc.push(`坐标诚实：historical_position_proof=true ${f.coords_claimed_as_history} 条、有坐标无 CRS ${f.coords_without_crs} 条`);
  if (unexecuted > 0) esc.push(`未执行 ${unexecuted} 个作业（截止时间到 / 作业耗尽）`);
  const escBlock = esc.length ? esc.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join("\n") : "无 —— 本批无需你介入。";

  const md = `# ${TAG} · 无人值守执行报告

- 模式：${MODE}（MOHEN_ENV=${ENV}）· 截止时间：${CUTOFF.toISOString()} · 周期：${INTERVAL_MIN} 分钟/作业
- 开始：${progress.started_at} · 结束：${progress.finished_at}
- **结论：${verdict}**（停止原因：${reason}）

## Escalation —— 你只需要看这里（最多 3 条）

${escBlock}

## 计数
- 作业总数：${jobs.length} · 完成：${done.length} · 失败：${failed.length} · 未执行：${unexecuted}
- 本批落库新增：${inserted}

## 作业明细
| 作业 | 结果 | 新增 | 备注 |
|---|---|---|---|
${Object.entries(progress.jobs).map(([k, v]) => `| ${k} | ${v.ok === false ? "FAIL" : "OK"} | ${v.inserted || 0} | ${v.note || (v.skipped ? "skipped/missing" : "")} |`).join("\n")}

## 本批事实（**全部由查询得出，不是模板断言**）

| 事实 | 值 | 来源 |
|---|---|---|
| 本批时间窗内门禁审计条数 | ${F(f.gate_rows_in_window)} | \`select count(*) from evidence_gate_audit where created_at >= started_at\` |
| 本批时间窗内 review_queue 新增 | ${F(f.queue_rows_in_window)} | \`select count(*) from review_queue where created_at >= started_at\` |
| 图片 总数 / 待审 / 已排除 | ${F(f.va_total)} / ${F(f.va_pending_review)} / ${F(f.va_excluded)} | \`visual_assets.eligibility_tags\` |
| 从未有门禁审计的图片 | ${F(f.va_no_gate_audit)} | \`evidence_gate_audit\` 反连接 |
| 真正"有效可用"的图片 | ${F(f.va_effective)} | 视图 \`effective_visual_assets\` |
| published 实体 / verified 证据 | ${F(f.published_entities)} / ${F(f.verified_evidence)} | **必须为 0** |
| 坐标：claim 为历史位置 / 有坐标无 CRS | ${F(f.coords_claimed_as_history)} / ${F(f.coords_without_crs)} | **必须为 0**（库层 CHECK 强制） |
${f.error ? `\n> ⚠️ 查询失败，本批事实不可得：${f.error}\n` : ""}
## 未运行 / 未完成的保证（明确列出，不用断言掩盖）

- **本批是否运行过 Evidence Gate：由上面"时间窗内门禁审计条数"回答，不由本文件断言。**
- **图片默认不可用**：本批新增图片以 \`eligibility_tags = {pending_heritage_review}\` 写入，须经复核方可用于 heritage-primary。
- 图片源必须唯一可确定，否则本作业 fail loud、不写入（不再取任意 source_record）。
- HTTP 校验 fail-closed：状态未知的链接一律不收。
- 坐标诚实由库层 CHECK 强制：\`anchor_coord_requires_crs\`、\`anchor_current_never_proof\`。
- Raw append-only：源材料快照存 ${RAW_STORE}/legacy/hushang/
- 幂等：按 legacy_id + 规范化 file_path 跳过，可重跑。

> 明细见 progress.json 与 runner.log。凭证不在本文件。
> **归因限制**：本批尚无 \`ingest_run_id\` 关联（断点 B-03），故"本批"＝时间窗口径；M2 落地后改为 run 级归因。
`;
  fs.writeFileSync(path.join(OUT_DIR, "result.md"), md, "utf8");
  log(`FINAL verdict=${verdict} reason=${reason} done=${done.length} failed=${failed.length} inserted=${inserted}`);
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
