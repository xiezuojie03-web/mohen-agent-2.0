// pipelines/legacy/port-coords.mjs
// NIGHT-BATCH-006 · 旧库实体现代坐标 → historical_features + historical_feature_anchors
// 宪法 C3 §4/§12：坐标只作「现代对象点」(provider_current_object_point, WGS84)，
//   库层约束强制：有坐标必带 CRS；当前 provider 锚点永不得声明为历史位置证明（historical_position_proof=false）。
//   不画任何历史几何（historical_geometry_status='absent_no_source'）。
// 三道闸：MOHEN_WRITE_ENABLED!=true → DRY_RUN；MOHEN_ENV∈{dev,staging}

import fs from "node:fs";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const LEGACY_SOURCE = "hushang_legacy";
const SEED_PATH = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/seed.master.json";
const SLICE_ID = "SHL-LEGACY-COORDS";
const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";
if (WRITE && !(ENV === "dev" || ENV === "staging")) { console.error("STOP env"); process.exit(2); }
const MODE = WRITE ? "WRITE" : "DRY_RUN";
const uuid = () => crypto.randomUUID();

const summary = { mode: MODE, started_at: new Date().toISOString(), counts: {}, verdict: "", errors: [] };

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  const entities = Array.isArray(seed.entities) ? seed.entities : [];
  const coordById = new Map();
  for (const e of entities) {
    if (e.id && e.lat != null && e.lng != null) {
      coordById.set(e.id, { lat: Number(e.lat), lng: Number(e.lng), vf: e.start_year, vt: e.end_year, name: e.name, type: e.kind, src: e.source_uri });
    }
  }
  // 已导入 entities: legacy_id → entity_id
  const entRows = await queryRows(`select entity_id, legacy_id from entities where legacy_id is not null`);
  const entMap = new Map(entRows.map((r) => [r.legacy_id, r.entity_id]));
  // 已有 feature_key / anchor_key
  const existFeat = await queryRows(`select feature_key from historical_features`);
  const existFeatSet = new Set(existFeat.map((r) => r.feature_key));
  const existAnchor = await queryRows(`select anchor_key from historical_feature_anchors`);
  const existAnchorSet = new Set(existAnchor.map((r) => r.anchor_key));

  const featItems = [], anchorItems = [];
  let matched = 0, skipped = 0, noEntity = 0;
  for (const [lid, c] of coordById) {
    const eid = entMap.get(lid);
    if (!eid) { noEntity++; continue; }
    matched++;
    const fkey = "legacy:" + lid;
    const akey = "legacy:" + lid + ":cur";
    if (existFeatSet.has(fkey) || existAnchorSet.has(akey)) { skipped++; continue; }
    const fid = uuid();
    featItems.push({
      sql: `insert into historical_features
        (feature_id,feature_key,slice_id,feature_type,canonical_label,historical_labels,modern_labels,label_variants_note,
         geometry_type,geometry_note,attested_time_start,attested_time_end,attested_time_label,attested_time_evidence_backed,
         legacy_only_assertions,attested_historical_existence,current_survival_or_site,historical_position_status,
         current_position_status,name_continuity_status,change_status,historical_source_refs,current_source_refs,
         evidence_ids,confidence,confidence_note,review_status,uncertainty_note,entity_id)
        values (:'fid'::uuid,:'fkey',:'slice',:'ftype',:'cname','{}','{}','',
         'point','',:'ats',:'ate',null,false,
         '{}','unknown','present (provider coords, assumed)',
         'unresolved','official_or_provider_object_point','unknown','unknown',
         '{}','{}','{}',0,'', 'candidate','',:'eid'::uuid)`,
      params: { fid, fkey, slice: SLICE_ID, ftype: c.type || "entity", cname: c.name || lid, ats: c.vf != null ? String(c.vf) : null, ate: c.vt != null ? String(c.vt) : null, eid },
    });
    anchorItems.push({
      sql: `insert into historical_feature_anchors
        (anchor_id,anchor_key,feature_id,anchor_kind,spatial_status,geometry_type,coord_system,location_raw,lat,lng,
         crs_note,precision_scope,source_label,source_locator,evidence_id,exact_object_point,historical_position_proof,note)
        values (:'aid'::uuid,:'akey',:'fid'::uuid,'provider_current_object_point','official_or_provider_object_point','point',
         'WGS84',null,${c.lat},${c.lng},'',null,'沪上经纬旧库/上图开放数据',:'sloc',null,false,false,
         '现代坐标落位（非历史几何）；当前 provider 点不得作历史位置证明')`,
      params: { aid: uuid(), akey, fid: fid, sloc: "legacy:" + LEGACY_SOURCE + ":" + lid },
    });
  }

  summary.counts = { entities_with_coord: coordById.size, matched_to_entity: matched, no_entity: noEntity,
    features_to_insert: featItems.length, anchors_to_insert: anchorItems.length, skipped_existing: skipped };

  if (!WRITE) {
    console.log(`[${MODE}] matched=${matched} features_insert=${featItems.length} anchors_insert=${anchorItems.length} skipped=${skipped} noEntity=${noEntity}`);
    summary.verdict = "DRY_RUN_OK";
    console.log("[DRY_RUN] 未写入。");
    return;
  }

  let runId = null;
  try {
    runId = await queryValue(`insert into ingest_runs (pipeline_name,source_scope,input_count,status) values ('hushang-port-coords','hushang_legacy',${matched},'running') returning ingest_run_id`);
    // 切片（幂等）
    await run(`insert into historical_spatial_slices
      (slice_id,slice_title,focus_question,time_context,spatial_extent_current,historical_geometry_status,uncertainties,experience_hooks,evidence_summary,readiness_gate,readiness_detail)
      values (:'sid',:'t',:'q',:'tc','{}'::jsonb,'absent_no_source','[]'::jsonb,'[]'::jsonb,'{}'::jsonb,'PARTIAL','{}'::jsonb)
      on conflict (slice_id) do nothing`,
      { sid: SLICE_ID, t: "沪上经纬旧库现代坐标批量落位", q: "旧库实体的现代坐标落位（非历史几何）", tc: "现代" });
    if (featItems.length) { await runMany(featItems); await runMany(anchorItems); }
    await run(`update ingest_runs set status='completed', finished_at=now(), candidate_count=${featItems.length}, pending_count=0 where ingest_run_id=:'rid'::uuid`, { rid: runId });
    summary.ingest_run_id = runId;
    summary.verdict = "PASS";
  } catch (err) {
    summary.errors.push(String(err && err.message ? err.message : err));
    summary.verdict = "STOPPED";
    if (runId) try { await run(`update ingest_runs set status='failed', finished_at=now(), error_count=1 where ingest_run_id=:'rid'::uuid`, { rid: runId }); } catch {}
  }
  console.log("verdict=" + summary.verdict + " features=" + featItems.length + " anchors=" + anchorItems.length);
  if (summary.errors.length) console.log("errors=" + summary.errors.join(" | "));
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
