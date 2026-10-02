// pipelines/legacy/night-runner.mjs
// 常驻夜间生产 runner（非定时调度）：
//   · 用户现在发指令 → 本进程 detached 常驻 → 按 --until 截止时间自动收尾
//   · 每个周期只处理 1 个作业，job 间 sleep --interval-min 分钟（刻意减速，非秒级冲刺）
//   · 三道闸：MOHEN_WRITE_ENABLED!=true → DRY_RUN；MOHEN_ENV∈{dev,staging}
//   · 停止条件：截止时间 / STOP 文件 / 连续 3 次作业失败 / 写权限异常
//   · 幂等：按 legacy_id / checksum 跳过；可安全重复运行
//   · 到点输出：progress.json + runner.log + Morning Summary result.md
// 用法: node night-runner.mjs --until 06:00 [--interval-min 6] [--tag NIGHT-RUN-20261001]

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
const TAG = arg("tag", "NIGHT-RUN-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""));
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

// ---- 作业队列（按价值排序：照片 → 坐标 → 其它源材料）----
const jobs = [
  { id: "images-shanghai-verified", kind: "images", file: "shanghai_images_verified_20260905.json" },
  { id: "images-shanghai-census", kind: "images", file: "shanghai_images_census_20260905.json" },
  { id: "images-commons-baoshan", kind: "images", file: "commons_baoshan_chuansha_20260831.json" },
  { id: "images-commons-maps", kind: "images", file: "commons_external_maps_20260831.json" },
  { id: "coords-wikidata", kind: "coords", file: "coords_wikidata.json" },
].concat([
  "gazetteer_details.json","events_linked.json","hsly_events.json","narrative_assets.json",
  "cbdb_people.json","clans.json","clan_pdf_index.json","jp_works_all.json","jp_shanghai_works.json",
  "jp_persons_zhu.json","jp_shanghai_family_persons.json","jp_zhu_deepdive.json","jp_family_town_analysis.json",
  "geo_placenames_shanghai.json","protection_index.json","sh_protection_index.json",
  "suzhou_narrative_candidates.json","suzhou_narrative_review.json","suzhou_people_shanghai.json",
  "yutu_catalog_final_20260831.json","yutu_catalog_checked.json","yutu_plaquettes_checked.json",
  "yutu_verify_coverage.json","yutu_level3.json","verify_cbdb_20260831.json","verify_souyun_20260831.json",
  "verify_song_press_20260831.json","resource_probe_20260831.json","resource_probe2_20260831.json",
  "dmz_zhujiajiao.json","gj_fangzhi.json","gj_works_青浦.json","gj_works_青浦县志.json",
  "gj_works_朱家角.json","gj_works_朱家角镇志.json","gj_works_珠里小志.json",
  "mgts_104971_entries.json","mgts_31278_entries.json","mgts_4581_entries.json","mgts_4584_entries.json",
  "mgts_4590_entries.json","mgts_87274_entries.json","mgts_90096_entries.json","mgts_92309_entries.json",
  "mgts_31278_town_hits.json","mgts_4581_town_hits.json","mgts_4590_town_hits.json","mgts_104971_town_hits.json",
  "jinze_evolution_raw_20260830.json","_work_titles.json","mcp_screenshot_ocr.json",
  "external_mapsource_probe_20260831.json","commons_oldmaps_raw_20260831.json","rumsey_maps_raw_20260831.json",
  "commons_cats_drill_20260831.json","jp_family_town_sparql_analysis.json","jp_works_sparql.json",
  "jp_shanghai_persons_count.json","jp_familyname_zhu.json","jp_zhu_persons.json","gj_14373_toc.json",
].map((f) => ({ id: "src-" + f.replace(/[^\w.-]/g, "_"), kind: "source", file: f })));

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
  const srcId = await queryValue(`select source_id from source_records where provider=:'p'`, { p: LEGACY_SOURCE });
  const exist = await queryRows(`select legacy_id from visual_assets where legacy_id is not null`);
  const existSet = new Set(exist.map((r) => r.legacy_id));
  const items = [];
  let skipped = 0, badStatus = 0;
  for (const im of arr) {
    const url = im.url || im.thumb || im.file_path || im.image || null;
    if (!url) { skipped++; continue; }
    // 只收 HTTP 校验通过的（shanghai_images_* 带 _http.status）
    if (im._http && im._http.status && im._http.status !== 200) { badStatus++; continue; }
    const lid = String(url);
    if (existSet.has(lid)) { skipped++; continue; }
    existSet.add(lid);
    if (!WRITE) continue;
    items.push({
      sql: `insert into visual_assets (asset_id,source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id)
            values (:'aid'::uuid,:'sid'::uuid,'image',:'fp',null,'unknown',:'rt',:'cs',:'lid')`,
      params: { aid: uuid(), sid: srcId, fp: url, rt: im.license || "上海图书馆/Wikimedia 开放数据（授权待确认）", cs: sha(url), lid },
    });
  }
  if (WRITE && items.length) await runMany(items);
  return { ok: true, total: arr.length, inserted: items.length, skipped, bad_status: badStatus };
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

async function finalize(verdict) {
  progress.verdict = verdict;
  progress.finished_at = new Date().toISOString();
  save();
  const done = Object.values(progress.jobs).filter((j) => j.ok !== false);
  const failed = Object.values(progress.jobs).filter((j) => j.ok === false);
  const inserted = Object.values(progress.jobs).reduce((a, j) => a + (Number(j.inserted) || 0), 0);
  const md = `# ${TAG} · Morning Summary

- 模式：${MODE}（MOHEN_ENV=${ENV}）· 截止时间：${CUTOFF.toISOString()} · 周期：${INTERVAL_MIN} 分钟/作业
- 开始：${progress.started_at} · 结束：${progress.finished_at}
- **结论：${verdict}**

## 计数
- 作业总数：${jobs.length} · 完成：${done.length} · 失败：${failed.length}
- 落库新增：${inserted}
- 未执行（截止时间到/作业耗尽）：${jobs.length - done.length - failed.length}

## 作业明细
| 作业 | 结果 | 新增 | 备注 |
|---|---|---|---|
${Object.entries(progress.jobs).map(([k, v]) => `| ${k} | ${v.ok === false ? "FAIL" : "OK"} | ${v.inserted || 0} | ${v.note || (v.skipped ? "skipped/missing" : "")} |`).join("\n")}

## 安全
- 零自动晋级：照片/坐标均为 candidate；未写 published/verified，未绕过 Evidence Gate
- 坐标诚实：provider_current_object_point + WGS84 + historical_position_proof=false（库层强制）
- Raw append-only：源材料快照存 ${RAW_STORE}/legacy/hushang/
- 幂等：按 legacy_id/checksum 跳过，可重跑
- 停止原因：${verdict === "STOPPED" ? "见 runner.log" : "截止时间到 / 作业完成"}

> 明细见 progress.json 与 runner.log。凭证不在本文件。
`;
  fs.writeFileSync(path.join(OUT_DIR, "result.md"), md, "utf8");
  log(`FINAL verdict=${verdict} done=${done.length} failed=${failed.length} inserted=${inserted}`);
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
