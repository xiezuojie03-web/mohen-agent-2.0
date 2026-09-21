// pipelines/normalize/run.mjs — Legacy → Candidate（保留 legacy_id，不补猜缺失值）。
//
// 读取 ingest 阶段落盘的 Raw Snapshot（不回读 Legacy），将最小样本转为候选知识：
//   entities / relations(仅两端均在样本内) / visual_assets(photo) / evidence(narrative+实体来源+地图) / claims。
// 每个对象写 legacy_mappings（唯一约束 legacy_source+legacy_type+legacy_id+target_type，on conflict do nothing），
// 保证「同 Legacy ID 重跑不重复 mapping」（test #2）。所有对象默认 candidate，严禁写 verified。
//
// 衔接：读取 raw store 内 .last-run.json（run_id / source_id / ingest_run_id）。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run as dbRun, queryRows } from "../../packages/data-access/src/index.mjs";

const LEGACY_SOURCE = "hushang-jingwei";

// 约定值：置信度未经证据门禁评定时填 0，语义为「未评定」，而非「评估为低」。
// 原因：relations.confidence / evidence.confidence / claims.certainty 三列为 NOT NULL 且无默认值，
// 而 001 migration 本任务禁止修改。填任意 0<v<1 的数都等于伪造一次并不存在的评估，故一律用 0。
// Legacy 原有的等级标注（如 A）是字符串，不可折算为数值，原文保存在 claims.review_note / object_value 中。
const UNASSESSED = 0;

function sha256(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

async function existingTarget(legacyType, legacyId, targetType) {
  const rows = await queryRows(
    `select target_id from legacy_mappings
     where legacy_source=:'ls' and legacy_type=:'lt' and legacy_id=:'lid' and target_type=:'tt'`,
    { ls: LEGACY_SOURCE, lt: legacyType, lid: legacyId, tt: targetType }
  );
  return rows.length ? rows[0].target_id : null;
}

async function main() {
  const rawStorePath = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
  const statePath = path.join(rawStorePath, "legacy", "jinze", ".last-run.json");
  if (!fs.existsSync(statePath)) throw new Error("未找到 .last-run.json，请先运行 ingest");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const runId = process.argv[2] || state.run_id;
  const sourceId = state.source_id;
  const ingestRunId = state.ingest_run_id;
  const snapPath = path.join(rawStorePath, "legacy", "jinze", runId, "jinze-snapshot.json");
  const subset = JSON.parse(fs.readFileSync(snapPath, "utf8"));

  const counts = {
    entities: 0,
    relations_inserted: 0,
    relations_skipped: 0, // 端点实体不在本次最小样本内（待扩样补齐）
    relations_existing: 0, // 幂等命中，已存在未重复插入
    visual_assets: 0,
    evidence_narrative: 0,
    evidence_entity_source: 0,
    evidence_map: 0,
    claims: 0,
  };
  const entMap = {}; // legacy entity id -> entity_id(uuid)

  // 1) entities（默认 candidate；保留 legacy_id；不补猜缺失）
  for (const e of subset.entities) {
    const lid = `${LEGACY_SOURCE}:entity:${e.id}`;
    // 查重键必须与写入 mapping 的 legacy_id 完全一致，否则重跑会重复插入（违反幂等）。
    let eid = await existingTarget("entity", lid, "entity");
    if (!eid) {
      const r = await queryRows(
        `insert into entities(entity_type,canonical_name,aliases,description,valid_from,valid_to,confidence,status,legacy_id)
         values (:'et',:'cn',:'al'::text[],:'desc',:'vf',:'vt',:'conf'::numeric,'candidate',:'lid') returning entity_id`,
        {
          et: e.kind,
          cn: e.name,
          al: "{}",
          desc: e.description || e.summary || "",
          vf: e.start_year ?? null,
          vt: e.end_year ?? null,
          conf: null, // Legacy confidence 是等级(A/B/C)而非数值，不得强转numeric（=猜值），保持 NULL
          lid,
        }
      );
      eid = r[0].entity_id;
      await dbRun(
        `insert into legacy_mappings(legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,confidence,ingest_run_id)
         values (:'ls','entity',:'lid','entity',:'tid'::uuid,'candidate','deterministic_json_field',:'conf'::numeric,:'ir'::uuid)
         on conflict do nothing`,
        { ls: LEGACY_SOURCE, lid, tid: eid, conf: null, ir: ingestRunId }
      );
      counts.entities++;
    }
    entMap[e.id] = eid;
  }

  // 2) relations：仅当两端均在已迁实体集合内才入库（跨镇/外部端点如实跳过）
  for (const r of subset.relations) {
    const sub = entMap[r.source_id];
    const obj = entMap[r.target_id];
    if (sub && obj) {
      const lid = `${LEGACY_SOURCE}:relation:${r.source_id}__${r.target_id}__${r.relation_type}`;
      const existing = await existingTarget("relation", lid, "relation");
      if (!existing) {
        const rr = await queryRows(
          `insert into relations(subject_id,predicate,object_id,valid_from,valid_to,confidence,status,legacy_id)
           values (:'sub'::uuid,:'pred',:'obj'::uuid,:'vf',:'vt',:'conf'::numeric,'candidate',:'lid') returning relation_id`,
          {
            sub,
            pred: r.relation_type,
            obj,
            vf: r.begin_year ?? null,
            vt: r.end_year ?? null,
            conf: UNASSESSED,
            lid,
          }
        );
        await dbRun(
          `insert into legacy_mappings(legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,ingest_run_id)
           values (:'ls','relation',:'lid','relation',:'tid'::uuid,'candidate','deterministic_json_field',:'ir'::uuid)
           on conflict do nothing`,
          { ls: LEGACY_SOURCE, lid, tid: rr[0].relation_id, ir: ingestRunId }
        );
        counts.relations_inserted++; // 仅统计真实插入，重复运行不计数
      } else {
        counts.relations_existing++; // 幂等命中，已存在未重复插入
      }
    } else {
      counts.relations_skipped++; // 端点实体不在本次最小样本内
    }
  }

  // 3) visual_assets（photo）：候选/待核验；保留 legacy_id
  for (const p of subset.photos) {
    const photoKey = p.id || sha256(p.url || p.name || "");
    const lid = `${LEGACY_SOURCE}:photo:${photoKey}`;
    let vid = await existingTarget("photo", lid, "visual_asset");
    if (!vid) {
      const r = await queryRows(
        `insert into visual_assets(source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id)
         values (:'sid','photo',:'fp',:'cd',:'dp',:'rt',:'chk',:'lid') returning asset_id`,
        {
          sid: sourceId,
          fp: p.url || "",
          cd: p.year || p.date || "",
          dp: p.era || "",
          rt: p.license || "",
          chk: sha256(p.url || p.name || ""),
          lid,
          // 注：photo 的 legacy_id 用 id/url 摘要，保证同一张图重跑命中同一条 mapping
        }
      );
      vid = r[0].asset_id;
      await dbRun(
        `insert into legacy_mappings(legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,ingest_run_id)
         values (:'ls','photo',:'lid','visual_asset',:'tid'::uuid,'candidate','legacy_json_field',:'ir'::uuid)
         on conflict do nothing`,
        { ls: LEGACY_SOURCE, lid, tid: vid, ir: ingestRunId }
      );
      counts.visual_assets++;
    }
  }

  // 4) evidence：narrative_assets（文本证据，候选）
  for (const n of subset.narrative_assets) {
    const lid = `${LEGACY_SOURCE}:narrative:${n.id}`;
    let evId = await existingTarget("narrative_asset", lid, "evidence");
    if (!evId) {
      const r = await queryRows(
        `insert into evidence(source_id,evidence_type,locator,quote_text,subject_hint,time_hint,extraction_method,confidence,verification_status)
         values (:'sid','text',:'loc',:'qt',:'sh',:'th','legacy_json_extract',:'conf'::numeric,'candidate') returning evidence_id`,
        {
          sid: sourceId,
          loc: n.source_uri || "",
          qt: (n.content && n.content.trim()) ? n.content.slice(0, 4000) : n.title || "",
          sh: Array.isArray(n.matched_names) && n.matched_names[0] ? n.matched_names[0] : n.title || "",
          th: n.date_label || n.era || "",
          conf: UNASSESSED,
        }
      );
      evId = r[0].evidence_id;
      await dbRun(
        `insert into legacy_mappings(legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,ingest_run_id)
         values (:'ls','narrative_asset',:'lid','evidence',:'tid'::uuid,'candidate','legacy_json_extract',:'ir'::uuid)
         on conflict do nothing`,
        { ls: LEGACY_SOURCE, lid, tid: evId, ir: ingestRunId }
      );
      counts.evidence_narrative++;
    }
  }

  // 5) evidence：external_maps（地图证据，候选；空间诚实留待 evidence 阶段标 Tier C）
  for (const m of subset.external_maps) {
    const lid = `${LEGACY_SOURCE}:map:${m.id}`;
    let evId = await existingTarget("external_map", lid, "evidence");
    if (!evId) {
      const srow = await queryRows(
        `insert into source_records(provider,title,source_uri,content_type,checksum,raw_path,metadata_json)
         values (:'prov',:'title',:'uri',:'ct',:'chk',:'rp',:'m'::jsonb) returning source_id`,
        {
          prov: m.source || "shanghai-library",
          title: m.title || m.file_title || m.id,
          uri: m.source_uri || "",
          ct: "image/map",
          chk: sha256(m.image_url || m.id),
          rp: m.image_url || "",
          m: JSON.stringify({ legacy_map_id: m.id, year: m.year, era: m.era, scope: m.scope, coverage_note: m.coverage_note || "" }),
        }
      );
      const mapSourceId = srow[0].source_id;
      const r = await queryRows(
        `insert into evidence(source_id,evidence_type,locator,quote_text,subject_hint,place_hint,extraction_method,confidence,verification_status)
         values (:'sid','map',:'loc',:'qt',:'sh',:'ph','legacy_map_metadata',:'conf'::numeric,'candidate') returning evidence_id`,
        {
          sid: mapSourceId,
          loc: m.image_url || "",
          qt: `${m.title || m.id} — ${m.coverage_note || ""}`,
          sh: "金泽(区域图)",
          ph: m.scope || "",
          conf: UNASSESSED,
        }
      );
      evId = r[0].evidence_id;
      await dbRun(
        `insert into legacy_mappings(legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,ingest_run_id)
         values (:'ls','external_map',:'lid','evidence',:'tid'::uuid,'candidate','legacy_map_metadata',:'ir'::uuid)
         on conflict do nothing`,
        { ls: LEGACY_SOURCE, lid, tid: evId, ir: ingestRunId }
      );
      counts.evidence_map++;
    }
  }

  // 6) 每实体：实体来源证据 + 候选 claim（review_tier C），并 link claim_evidence（保证 G4 有证据）
  for (const e of subset.entities) {
    const eid = entMap[e.id];
    const claimLid = `${LEGACY_SOURCE}:claim:${e.id}`;
    let claimId = await existingTarget("entity_claim", claimLid, "claim");
    if (!claimId) {
      const er = await queryRows(
        `insert into evidence(source_id,evidence_type,locator,quote_text,subject_hint,extraction_method,confidence,verification_status)
         values (:'sid','text',:'loc',:'qt',:'sh','legacy_entity_source',:'conf'::numeric,'candidate') returning evidence_id`,
        {
          sid: sourceId,
          loc: e.source_uri || "",
          qt: e.summary || e.description || e.name,
          sh: e.name,
          conf: UNASSESSED, // 同上：等级不转数值，记 0（未评定）
        }
      );
      const evId = er[0].evidence_id;
      // Legacy 原等级与理由原文保留进 jsonb + review_note（不折算为数值置信度）。
      const legacyNote = `legacy_confidence_grade=${e.confidence ?? "-"}; legacy_reason=${e.confidence_reason ?? "-"}`;
      const cr = await queryRows(
        `insert into claims(subject_id,predicate,object_id,object_value,certainty,status,review_tier,generated_by,review_note)
         values (:'sub'::uuid,'is_historic_entity_of_jinze',null,:'ov'::jsonb,:'cert'::numeric,'candidate','C','mohen-data-factory',:'rn') returning claim_id`,
        {
          sub: eid,
          ov: JSON.stringify({
            town: "金泽",
            legacy_confidence_grade: e.confidence ?? null,
            legacy_confidence_reason: e.confidence_reason ?? null,
          }),
          cert: UNASSESSED,
          rn: legacyNote,
        }
      );
      claimId = cr[0].claim_id;
      await dbRun(
        `insert into claim_evidence(claim_id,evidence_id,support_type) values (:'cid'::uuid,:'eid'::uuid,'supports')`,
        { cid: claimId, eid: evId }
      );
      await dbRun(
        `insert into legacy_mappings(legacy_source,legacy_type,legacy_id,target_type,target_id,mapping_status,mapping_method,ingest_run_id)
         values (:'ls','entity_claim',:'lid','claim',:'tid'::uuid,'candidate','deterministic_json_field',:'ir'::uuid)
         on conflict do nothing`,
        { ls: LEGACY_SOURCE, lid: claimLid, tid: claimId, ir: ingestRunId }
      );
      counts.evidence_entity_source++;
      counts.claims++;
    }
  }

  const candidateCount =
    counts.entities + counts.relations_inserted + counts.visual_assets +
    counts.evidence_narrative + counts.evidence_entity_source + counts.evidence_map + counts.claims;
  await dbRun(
    `update ingest_runs set candidate_count=:'cc'::int, metadata_json = metadata_json || :'m'::jsonb where ingest_run_id=:'ir'::uuid`,
    {
      cc: candidateCount,
      ir: ingestRunId,
      m: JSON.stringify({ normalized_counts: counts }),
    }
  );

  console.log(JSON.stringify({ run_id: runId, source_id: sourceId, ...counts, candidate_count: candidateCount }));
}

main().catch((e) => {
  console.error("NORMALIZE FAILED:", e.message);
  process.exit(1);
});
