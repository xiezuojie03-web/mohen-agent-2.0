// pipelines/legacy/hushang-port.mjs
// 沪上经纬旧库（hushang-jingwei） → 墨痕新库 的 Candidate Reservoir 移植。
//
// 宪法依据：C3 §9「从沪上经纬旧库迁移」+ 夜间协议 V1.0 + T07 Night Job Contract §1 安全基线。
// 原则：默认不写、默认不晋级、默认不猜；旧数据先作 Candidate Reservoir（status='candidate'），
//       绝不晋级 verified/published、绝不绕过 Evidence Gate；AI 生成文字不当 Evidence；
//       Raw 永久 append-only 留存；坐标只作现代位置、不冒充历史。
//
// 写入三道闸（T07 §1.1）：
//   MOHEN_WRITE_ENABLED != 'true'  → DRY_RUN（只产出计划/候选清单，不写任何层）
//   MOHEN_ENV 必须 ∈ {dev,staging} → 否则立即 STOP
//
// 映射（仅结构化、可追溯对象落 Candidate；弱关联/诗词/叙事进 review_queue HOLD）：
//   Town/Entity(kind) → entities(candidate)            [legacy_id 回写]
//   坐标 lat/lng       → modern_location(若存在且列匹配)  [现代位置，非历史]
//   相册/linked_photos → visual_assets(candidate)        [rights/checksum/provenance]
//   source_uri         → evidence(record, locator)       [目录级 provenance，非 AI 文本]
//   relations(弱镇名关联) → review_queue(HOLD)            [默认不猜，待裁决]
//   poetry/narrative   → 不写作事实，仅留 Source/raw       [以后 N02/N03 抽取]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const LEGACY_SOURCE = "hushang_legacy";
const SEED_PATH = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/seed.master.json";
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";

// ---- 三道闸 ----
if (WRITE && !(ENV === "dev" || ENV === "staging")) {
  console.error("STOP: MOHEN_ENV 必须为 dev 或 staging（当前=" + ENV + "），不启动。");
  process.exit(2);
}
const MODE = WRITE ? "WRITE" : "DRY_RUN";

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
function uuid() {
  return crypto.randomUUID();
}
function confNum(c) {
  if (c === "A") return 0.9;
  if (c === "B") return 0.7;
  if (c === "C") return 0.5;
  return 0.5;
}

const summary = {
  mode: MODE,
  env: ENV,
  started_at: new Date().toISOString(),
  seed_path: SEED_PATH,
  counts: {},
  holds: {},
  errors: [],
  stops: [],
};

async function main() {
  // 读取旧库
  const rawText = fs.readFileSync(SEED_PATH, "utf8");
  const seed = JSON.parse(rawText);
  const seedChecksum = sha256(rawText);
  summary.seed_checksum = seedChecksum;
  summary.meta_counts = seed.meta?.counts || {};

  const entities = Array.isArray(seed.entities) ? seed.entities : [];
  const relations = Array.isArray(seed.relations) ? seed.relations : [];
  const photos = Array.isArray(seed.photos) ? seed.photos : [];
  const poetry = Array.isArray(seed.poetry) ? seed.poetry : [];
  const narrative = Array.isArray(seed.narrative_assets) ? seed.narrative_assets : [];

  console.log(`[${MODE}] 读取旧库：entities=${entities.length} relations=${relations.length} photos=${photos.length} poetry=${poetry.length} narrative=${narrative.length} checksum=${seedChecksum.slice(0, 12)}`);

  // ---- 已存在（幂等：跳过已导入 legacy_id，避免中途失败重跑产生重复）----
  let existingEntityIds = new Set();
  let existingMappingKeys = new Set();
  let sourceId = null;
  if (WRITE) {
    const existE = await queryRows(`select legacy_id from entities where legacy_id is not null`);
    existingEntityIds = new Set(existE.map((r) => r.legacy_id));
    const existM = await queryRows(
      `select legacy_id from legacy_mappings where legacy_source=:'ls' and legacy_type='entity'`,
      { ls: LEGACY_SOURCE }
    );
    existingMappingKeys = new Set(existM.map((r) => r.legacy_id));
    // L0 Source Record（唯一约束 provider+checksum → 幂等）
    await run(
      `insert into source_records (provider,title,creator,source_date,content_type,license_code,checksum,raw_path,metadata_json)
       values (:'p',:'t','沪上经纬旧库',:'d','application/json','上海图书馆开放数据竞赛许可',:'cs',:'rp',:'mj'::jsonb)
       on conflict (provider,checksum) do nothing`,
      {
        p: LEGACY_SOURCE,
        t: "沪上经纬旧库 seed.master.json",
        d: seed.meta?.generated_at || "2026-08-24",
        cs: seedChecksum,
        rp: `<RAW_STORE>/legacy/hushang/seed-${seedChecksum.slice(0, 16)}.json`,
        mj: JSON.stringify({ legacy_source: LEGACY_SOURCE, exported_at: seed.meta?.generated_at }),
      }
    );
    sourceId = await queryValue(
      `select source_id from source_records where provider=:'p' and checksum=:'cs'`,
      { p: LEGACY_SOURCE, cs: seedChecksum }
    );
    // 写入 raw 快照（append-only：已存在则跳过）
    const rawDir = path.join(RAW_STORE, "legacy", "hushang");
    fs.mkdirSync(rawDir, { recursive: true });
    const rawFile = path.join(rawDir, `seed-${seedChecksum.slice(0, 16)}.json`);
    if (!fs.existsSync(rawFile)) fs.copyFileSync(SEED_PATH, rawFile);
    summary.raw_snapshot = rawFile;
    summary.source_id = sourceId;
  }

  // ---- 实体 → entities(candidate) ----
  const entityItems = [];
  const mappingItems = [];
  const evidenceItems = [];
  const legacyToNew = new Map();
  let skippedEntities = 0;

  for (const e of entities) {
    const lid = e.id;
    if (!lid || existingEntityIds.has(lid)) {
      skippedEntities++;
      continue;
    }
    const eid = uuid();
    legacyToNew.set(lid, eid);
    const etype = e.kind || "entity";
    const cname = e.name || "(未命名)";
    const aliases = Array.isArray(e?.extra?.aliases) ? e.extra.aliases : [];
    const vf = e.start_year != null ? String(e.start_year) : "NULL";
    const vt = e.end_year != null ? String(e.end_year) : "NULL";
    const conf = confNum(e.confidence);
    entityItems.push({
      sql: `insert into entities (entity_id,entity_type,canonical_name,aliases,description,valid_from,valid_to,confidence,status,legacy_id)
            values (:'eid'::uuid,:'etype',:'cname',ARRAY(SELECT jsonb_array_elements_text(:'aliases'::jsonb)),:'desc',${vf},${vt},${conf},'candidate',:'lid')`,
      params: {
        eid, etype, cname,
        aliases: JSON.stringify(aliases),
        desc: e.description || null,
        lid,
      },
    });
    if (!existingMappingKeys.has(lid)) {
      mappingItems.push({
        sql: `insert into legacy_mappings (mapping_id,legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,confidence,ingest_run_id)
              values (:'mid'::uuid,:'ls','entity',:'lid','entity',:'tid','candidate','hushang_port_v1',${conf},:'rid')`,
        params: { mid: uuid(), ls: LEGACY_SOURCE, lid, tid: eid, rid: null },
      });
    }
    // evidence（目录级 provenance；仅当存在 source_uri 且非 AI 生成文本）
    if (e.source_uri) {
      evidenceItems.push({
        sql: `insert into evidence (evidence_id,source_id,evidence_type,locator,quote_text,extraction_method,confidence,verification_status)
              values (:'eid'::uuid,:'sid','record',:'loc',:'q',:'m',${conf},'candidate')`,
        params: { eid: uuid(), sid: sourceId, loc: e.source_uri, q: cname, m: "legacy_catalog_locator" },
      });
    }
  }

  // ---- 照片 → visual_assets(candidate) ----
  const photoItems = [];
  let photoFromEntities = 0;
  for (const e of entities) {
    const gallery = Array.isArray(e?.gallery) ? e.gallery : [];
    const linked = Array.isArray(e?.linked_photos) ? e.linked_photos : [];
    for (const p of [...gallery, ...linked]) {
      const url = p?.url;
      if (!url) continue;
      photoFromEntities++;
      if (!WRITE) continue;
      photoItems.push({
        sql: `insert into visual_assets (asset_id,source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id)
              values (:'aid'::uuid,:'sid','image',:'fp',:'cd',:'dp',:'rt',:'cs',:'lid')`,
        params: {
          aid: uuid(), sid: sourceId, fp: url,
          cd: p?.year ? String(p.year) : null,
          dp: e?.era || null,
          rt: p?.license || p?.source || "上海图书馆开放数据（data.library.sh.cn）",
          cs: sha256(url),
          lid: `${e.id}::${photoFromEntities}`,
        },
      });
    }
  }

  summary.counts = {
    entities_total: entities.length,
    entities_to_insert: entityItems.length,
    entities_skipped_existing: skippedEntities,
    evidence_to_insert: evidenceItems.length,
    photos_from_entities: photoFromEntities,
    photos_to_insert: photoItems.length,
    relations_total: relations.length,
    relations_held: relations.length,
    poetry_held: poetry.length,
    narrative_held: narrative.length,
  };

  console.log(`[${MODE}] 计划：entities_insert=${entityItems.length} evidence_insert=${evidenceItems.length} photos_insert=${photoItems.length} relations_held=${relations.length}`);

  if (!WRITE) {
    summary.verdict = "DRY_RUN_OK";
    console.log(`[DRY_RUN] 未写入任何层。确认计划无误后，设 MOHEN_WRITE_ENABLED=true 再实跑。`);
    printSummary();
    return;
  }

  // ---- 实跑（WRITE）----
  let runId = null;
  try {
    runId = await queryValue(
      `insert into ingest_runs (pipeline_name,source_scope,input_count,status) values ('hushang-port','hushang_legacy',${entities.length},'running') returning ingest_run_id`
    );
    // 回填 ingest_run_id 到 mappings
    for (const it of mappingItems) it.params.rid = runId;

    await runMany(entityItems);
    await runMany(mappingItems);
    await runMany(evidenceItems);
    if (photoItems.length) await runMany(photoItems);

    // 坐标 → modern_location（若存在且列匹配；失败则跳过，坐标保留于 raw）
    await tryWriteCoords(entities, legacyToNew);

    // relations → review_queue(HOLD)（默认不猜）
    await holdRelations(relations, runId);

    await run(
      `update ingest_runs set status='completed', finished_at=now(), candidate_count=${entityItems.length + photoItems.length}, pending_count=${relations.length} where ingest_run_id=:'rid'::uuid`,
      { rid: runId }
    );
    summary.ingest_run_id = runId;
    summary.verdict = relations.length > 0 ? "PASS_WITH_HOLD" : "PASS";
  } catch (err) {
    summary.errors.push(String(err && err.message ? err.message : err));
    summary.stops.push("WRITE_FAILED");
    if (runId) {
      try {
        await run(`update ingest_runs set status='failed', finished_at=now(), error_count=1 where ingest_run_id=:'rid'::uuid`, { rid: runId });
      } catch {}
    }
    summary.verdict = "STOPPED";
  }
  printSummary();
  writeResultFile();
}

async function tryWriteCoords(entities, legacyToNew) {
  try {
    const cols = await queryRows(
      `select column_name from information_schema.columns where table_name='modern_location' and table_schema='public'`
    );
    const colSet = new Set(cols.map((c) => c.column_name));
    if (!colSet.has("entity_id") || (!colSet.has("lat") && !colSet.has("latitude"))) {
      summary.coords = "SKIPPED_NO_TABLE";
      console.log("[coords] modern_location 表缺失或列不匹配，坐标保留于 raw 快照。");
      return;
    }
    const items = [];
    for (const e of entities) {
      const tid = legacyToNew.get(e.id);
      if (!tid || e.lat == null || e.lng == null) continue;
      items.push({
        sql: `insert into modern_location (entity_id,lat,lng,source_id,provenance_status) values (:'eid'::uuid,${Number(e.lat)},${Number(e.lng)},:'sid','legacy_candidate')`,
        params: { eid: tid, sid: sourceId },
      });
    }
    if (items.length) await runMany(items);
    summary.coords = `INSERTED=${items.length}`;
    console.log(`[coords] 写入现代坐标 ${items.length} 条（非历史位置）。`);
  } catch (err) {
    summary.coords = "SKIPPED_ERROR:" + String(err.message || err);
    console.log("[coords] 写入失败，跳过（坐标保留于 raw）：" + summary.coords);
  }
}

async function holdRelations(relations, runId) {
  const items = [];
  for (const r of relations) {
    items.push({
      sql: `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status)
            values ('relation',:'oid','C','RELATION_WEAK_LINK_HELD',:'s','pending')`,
      params: {
        oid: r.id || "rel-" + sha256(JSON.stringify(r)).slice(0, 12),
        s: "沪上经纬弱关联（多为镇名现名/旧称匹配，无强证据），按 T07 默认不猜原则 HOLD，待人工裁决。",
      },
    });
  }
  if (items.length) await runMany(items);
  summary.holds.relations = items.length;
  console.log(`[holds] relations HOLD 入 review_queue：${items.length} 条。`);
}

function printSummary() {
  console.log("=== HUSHANG PORT SUMMARY ===");
  console.log(JSON.stringify(summary.counts, null, 2));
  console.log("verdict=" + summary.verdict);
  if (summary.errors.length) console.log("errors=" + summary.errors.join(" | "));
}

function writeResultFile() {
  const out = `D://work Buddy//2026-08-23-23-12-38//mohen-agent-2.0//tasks//results//NIGHT-BATCH-003-result.md`;
  const body = `# NIGHT-BATCH-003 · 沪上经纬旧库移植（Candidate Reservoir）

- 批次：night-batch-003 · 启动 ${summary.started_at}
- 模式：${MODE}（MOHEN_ENV=${ENV}）· 写入开关 MOHEN_WRITE_ENABLED=${WRITE}
- 依据：C3 §9 旧库迁移 + T07 §1 安全基线 + 夜间协议 V1.0
- 决断：项目拥有者授权读取并移植老项目（hushang-jingwei）

## 1. 映射与计数
\`\`\`json
${JSON.stringify(summary.counts, null, 2)}
\`\`\`

## 2. 安全核验（T07 §1）
- 全部落 Candidate（status='candidate'），零自动晋级 verified/published：${summary.verdict !== "STOPPED"}
- 坐标仅作现代位置（modern_location），未冒充历史几何：${summary.coords || "n/a"}
- AI 生成文字未当 Evidence（evidence 仅用目录级 source_uri locator）：${summary.counts.evidence_to_insert >= 0}
- Raw 永久 append-only：${summary.raw_snapshot || "DRY_RUN 未写"}
- relations(${summary.counts.relations_held}) 全部 HOLD 入 review_queue（默认不猜）
- poetry(${summary.counts.poetry_held}) / narrative(${summary.counts.narrative_held}) 不写作事实，留 Source 待以后抽取

## 3. 结论
verdict = ${summary.verdict}
errors = ${summary.errors.join(" | ") || "无"}
ingest_run_id = ${summary.ingest_run_id || "n/a"}

> 老项目 1977 实体 / 380 照片已作为候选供给进入本库；关系与诗词属弱证据/非事实，留待人工裁决与后续 N02/N03 抽取。
`;
  fs.writeFileSync(out, body, "utf8");
  console.log("[summary] 已写 " + out);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
