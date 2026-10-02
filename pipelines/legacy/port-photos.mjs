// pipelines/legacy/port-photos.mjs
// NIGHT-BATCH-004 · 照片 → visual_assets(candidate)；诗词 → Source/Raw（非事实层，留 N02/N03 抽取）
// 宪法 C3 §9：Media→visual_asset（带 creation_date/depicted_period/rights/provenance）；
//            Story/Poem→非真相层，仅作 Source 留存，不写 world 事实。
// 三道闸：MOHEN_WRITE_ENABLED!=true → DRY_RUN；MOHEN_ENV∈{dev,staging}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const LEGACY_SOURCE = "hushang_legacy";
const COMMONS = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched/commons_images.json";
const POEM_FILES = [
  "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched/souyun_poems_by_person.json",
  "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched/souyun_poems_by_place.json",
];
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";
if (WRITE && !(ENV === "dev" || ENV === "staging")) { console.error("STOP env"); process.exit(2); }
const MODE = WRITE ? "WRITE" : "DRY_RUN";
const uuid = () => crypto.randomUUID();
const sha = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

const summary = { mode: MODE, started_at: new Date().toISOString(), counts: {}, verdict: "", errors: [] };

async function main() {
  const srcId = await queryValue(`select source_id from source_records where provider=:'p'`, { p: LEGACY_SOURCE });
  if (!srcId) { console.error("STOP: 未找到 hushang_legacy source_record（先跑 batch-003）"); process.exit(2); }

  // ---- 照片 ----
  const commons = JSON.parse(fs.readFileSync(COMMONS, "utf8"));
  const images = Array.isArray(commons.images) ? commons.images : [];
  const existVA = await queryRows(`select legacy_id from visual_assets where legacy_id is not null`);
  const existVASet = new Set(existVA.map((r) => r.legacy_id));
  const vaItems = [];
  let skipped = 0;
  for (const im of images) {
    const lid = im.title || sha(im.url || "");
    if (!im.url || existVASet.has(lid)) { skipped++; continue; }
    vaItems.push({
      sql: `insert into visual_assets (asset_id,source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id)
            values (:'aid'::uuid,:'sid'::uuid,'image',:'fp',:'cd',:'dp',:'rt',:'cs',:'lid')`,
      params: {
        aid: uuid(), sid: srcId, fp: im.url,
        cd: im.date ? String(im.date).slice(0, 10) : null,
        dp: "现代影像（非历史）",
        rt: im.license || (im.artist ? `Author: ${im.artist}` : "Wikimedia Commons 自由授权"),
        cs: sha(im.url),
        lid,
      },
    });
  }

  // ---- 诗词 → Source/Raw（非事实）----
  const poemSrcItems = [];
  const poemMeta = [];
  for (const pf of POEM_FILES) {
    const txt = fs.readFileSync(pf, "utf8");
    const cs = sha(txt);
    const fname = path.basename(pf);
    poemMeta.push({ file: fname, bytes: txt.length });
    poemSrcItems.push({
      sql: `insert into source_records (source_id,provider,title,creator,source_date,content_type,license_code,checksum,raw_path,metadata_json)
            values (:'sid'::uuid,:'p',:'t','搜韵知识图谱 open.cnkgraph.com',:'d','application/json','搜韵开放数据(免token)',:'cs',:'rp',:'mj'::jsonb)
            on conflict (provider,checksum) do nothing`,
      params: {
        sid: uuid(), p: LEGACY_SOURCE, t: "沪上经纬诗词-" + fname,
        d: "2026-08-31", cs,
        rp: `<RAW_STORE>/legacy/hushang/${fname}`,
        mj: JSON.stringify({ kind: "poem_source", held_for: "N02/N03 story_seed extraction" }),
      },
    });
  }

  summary.counts = {
    photos_total: images.length, photos_to_insert: vaItems.length, photos_skipped_existing: skipped,
    poem_files: POEM_FILES.length, poem_source_to_insert: poemSrcItems.length,
  };

  if (!WRITE) {
    console.log(`[${MODE}] photos_insert=${vaItems.length} poem_src_insert=${poemSrcItems.length}`);
    summary.verdict = "DRY_RUN_OK";
    console.log("[DRY_RUN] 未写入。");
    return;
  }

  let runId = null;
  try {
    runId = await queryValue(`insert into ingest_runs (pipeline_name,source_scope,input_count,status) values ('hushang-port-photos','hushang_legacy',${images.length},'running') returning ingest_run_id`);
    if (vaItems.length) await runMany(vaItems);
    if (poemSrcItems.length) await runMany(poemSrcItems);
    // raw 快照（append-only）
    const rawDir = path.join(RAW_STORE, "legacy", "hushang");
    fs.mkdirSync(rawDir, { recursive: true });
    for (const pf of POEM_FILES) {
      const dest = path.join(rawDir, path.basename(pf));
      if (!fs.existsSync(dest)) fs.copyFileSync(pf, dest);
    }
    await run(`update ingest_runs set status='completed', finished_at=now(), candidate_count=${vaItems.length}, pending_count=0 where ingest_run_id=:'rid'::uuid`, { rid: runId });
    summary.ingest_run_id = runId;
    summary.verdict = "PASS";
  } catch (err) {
    summary.errors.push(String(err && err.message ? err.message : err));
    summary.verdict = "STOPPED";
    if (runId) try { await run(`update ingest_runs set status='failed', finished_at=now(), error_count=1 where ingest_run_id=:'rid'::uuid`, { rid: runId }); } catch {}
  }
  console.log("verdict=" + summary.verdict + " photos=" + vaItems.length + " poem_src=" + poemSrcItems.length);
  if (summary.errors.length) console.log("errors=" + summary.errors.join(" | "));
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
