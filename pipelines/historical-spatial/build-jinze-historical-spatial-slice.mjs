// pipelines/historical-spatial/build-jinze-historical-spatial-slice.mjs
//
// TASK-0010 WP-B/C/D/E/F 的唯一写库入口：把「金泽最小历史空间切片」的定义
// （slice-definitions/jinze-minimum-slice-001.mjs）解析 → 校验 → 落 PG（真值源）。
//
// 纪律（§10 / §11 / §12）：
//  · PG 是唯一真源；data/exports/*.json|csv 只是本管线生成的**投影**，不得反向回写。
//  · 只写 5 张新表 + evidence_gate_audit（object_type='historical_feature' /
//    'historical_spatial_relation'）；**不写** relations / claims / visual_assets，
//    因此既有基底与 Knowledge Weave 完全不动（§0.4）。
//  · 证据一律**复用既有 Evidence 行**（选择器解析）；本管线不新建 Evidence，
//    因此不产生任何「为让切片好看而新造的证据」。解析不到即记缺口，不静默通过。
//  · 确定性 UUID + upsert：重跑 created=0、reused=n（§12-24/25）。
//  · 出库前跑 §9 的 8 条判据 + 3 个子门，结果写进 slice.readiness_*（诚实计算）。

import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";
import {
  SLICE,
  FEATURES,
  FEATURE_CONFLICTS,
  ANCHORS,
  CHANGES,
  RELATIONS,
  HISTORICAL_SOURCE_MATERIAL,
  HUMAN_REVIEW_REFS,
} from "./slice-definitions/jinze-minimum-slice-001.mjs";

// 确定性 UUID v4（同 TASK-0009 register.mjs 约定）
function deterministicUuid(seed) {
  const h = crypto.createHash("sha256").update(seed, "utf8").digest();
  const b = Buffer.from(h.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}

const pgTextArray = (arr) =>
  "{" + (arr || []).map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(",") + "}";
const pgUuidArray = (arr) => "{" + (arr || []).join(",") + "}";
const pgJson = (o) => JSON.stringify(o);

// ---------------------------------------------------------------------------
// 0) 前置：确认 007 已应用，并取基线快照
// ---------------------------------------------------------------------------
const requireTable = async (t) => {
  const c = await queryValue(
    `select count(*)::text c from information_schema.tables where table_schema='public' and table_name=:'t'`,
    { t }
  );
  if (Number(c) !== 1) throw new Error(`缺少表 ${t} —— 请先应用 migration 007`);
};
for (const t of [
  "historical_spatial_slices",
  "historical_features",
  "historical_feature_anchors",
  "historical_change_records",
  "historical_spatial_relations",
]) {
  await requireTable(t);
}

const countOrphanRelationAudit = () =>
  queryValue(
    `select count(*)::text c from evidence_gate_audit a
      where a.object_type='relation'
        and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
  );
const countPublished = () =>
  queryValue(`select count(*)::text c from claims where status::text in ('verified','published')`);

const before = {
  slices: Number(await queryValue(`select count(*)::text c from historical_spatial_slices`)),
  features: Number(await queryValue(`select count(*)::text c from historical_features`)),
  anchors: Number(await queryValue(`select count(*)::text c from historical_feature_anchors`)),
  changes: Number(await queryValue(`select count(*)::text c from historical_change_records`)),
  hs_relations: Number(await queryValue(`select count(*)::text c from historical_spatial_relations`)),
  audit_total: Number(await queryValue(`select count(*)::text c from evidence_gate_audit`)),
  audit_relation_orphan: Number(await countOrphanRelationAudit()),
  published: Number(await countPublished()),
  relations_total: Number(await queryValue(`select count(*)::text c from relations`)),
  evidence_total: Number(await queryValue(`select count(*)::text c from evidence`)),
  source_records_total: Number(await queryValue(`select count(*)::text c from source_records`)),
  claims_total: Number(await queryValue(`select count(*)::text c from claims`)),
  human_review_decisions: Number(await queryValue(`select count(*)::text c from human_review_decisions`)),
};

// ---------------------------------------------------------------------------
// 1) 解析证据选择器（每一条都必须是**既有** Evidence 行）
// ---------------------------------------------------------------------------
const gaps = [];
const resolveEvidence = async (selectors, ownerLabel) => {
  const out = {};
  for (const s of selectors) {
    const rows = await queryRows(
      `select evidence_id::text id, evidence_type, extraction_method,
              coalesce(subject_hint,'') sh, coalesce(place_hint,'') ph, coalesce(quote_text,'') q
         from evidence where ${s.sql} order by evidence_id`
    );
    if (rows.length !== s.expect) {
      gaps.push({
        owner: ownerLabel,
        selector: s.key,
        expected: s.expect,
        actual: rows.length,
        optional: !!s.optional,
      });
    }
    out[s.key] = rows;
  }
  return out;
};

// 解析 特征 → 实体绑定
const resolveEntity = async (sel) => {
  if (!sel) return null;
  const rows = await queryRows(
    `select entity_id::text id from entities where canonical_name=:'n' and coalesce(legacy_id,'')=:'l'`,
    { n: sel.canonical_name, l: sel.legacy_id }
  );
  if (rows.length !== 1) {
    gaps.push({ owner: sel.canonical_name, selector: "entity", expected: 1, actual: rows.length });
    return null;
  }
  return rows[0].id;
};

// 解析 既有 relations 行（复用其 Evidence/disposition；不改动它）
const resolveExistingRelation = async (sel) => {
  if (!sel) return null;
  const rows = await queryRows(
    `select r.relation_id::text id
       from relations r
       join entities s on s.entity_id=r.subject_id
       join entities o on o.entity_id=r.object_id
      where r.predicate=:'p' and s.canonical_name=:'sn' and o.canonical_name=:'on'`,
    { p: sel.predicate, sn: sel.subject_name, on: sel.object_name }
  );
  if (rows.length !== 1) {
    gaps.push({
      owner: `${sel.subject_name}--${sel.predicate}--${sel.object_name}`,
      selector: "existing_relation",
      expected: 1,
      actual: rows.length,
    });
    return null;
  }
  return rows[0].id;
};

const resolved = [];
for (const f of FEATURES) {
  const ev = await resolveEvidence(f.evidence, f.feature_key);
  const entityId = await resolveEntity(f.entity_selector);
  const allEvIds = [...new Set(Object.values(ev).flat().map((r) => r.id))];
  const allText = Object.values(ev).flat().map((r) => `${r.sh} ${r.ph} ${r.q}`).join(" ");
  // 身份门：canonical label 必须真实出现在已解析证据的文本里（可复核的判据）
  const labelSeen = allText.includes(f.canonical_label);
  resolved.push({ def: f, ev, entityId, allEvIds, labelSeen });
}

const evRowsByKey = {};
for (const r of resolved) for (const [k, rows] of Object.entries(r.ev)) evRowsByKey[k] = rows;
// 证据 id → 行（供 evidence_summary 归类，避免重复字符串匹配）
const evById = new Map();
for (const rows of Object.values(evRowsByKey)) for (const r of rows) evById.set(r.id, r);

// ---------------------------------------------------------------------------
// 2) 既有 1879 材料（§5「使用既有已获材料」），全部登记为「不可归因于本切片对象」
// ---------------------------------------------------------------------------
const historicalMaterial = [];
for (const m of HISTORICAL_SOURCE_MATERIAL) {
  const rows = await queryRows(
    m.kind === "source_record"
      ? `select source_id::text id, title label, provider method from source_records where ${m.sql}`
      : `select evidence_id::text id, coalesce(subject_hint,'') label, extraction_method method
           from evidence where ${m.sql}`,
    {}
  );
  if (rows.length !== m.expect) {
    gaps.push({ owner: m.key, selector: m.kind, expected: m.expect, actual: rows.length });
  }
  for (const r of rows) historicalMaterial.push({ ...m, resolved_id: r.id, method: r.method });
}

// ---------------------------------------------------------------------------
// 3) 评估 §9 判据（先算好，再连同切片头一起写）
// ---------------------------------------------------------------------------
const featuresWithEvidence = resolved.filter((r) => r.allEvIds.length >= 1).length;
const groundedCurrent = resolved.filter((r) =>
  ["verified_object_point", "official_or_provider_object_point", "approximate_object_area"].includes(
    r.def.current_position_status
  )
).length;
const waterwayDefensible = resolved.some(
  (r) =>
    r.def.feature_type === "waterway" &&
    r.allEvIds.length >= 1 &&
    ["historical_relative_position_only", "historical_anchor_candidate"].includes(
      r.def.historical_position_status
    )
);
const relE123 = RELATIONS.filter((r) => ["E1", "E2", "E3"].includes(r.epistemic_class)).length;
const evidencedChanges = CHANGES.filter(
  (c) => c.change_epistemic === "evidenced" && c.change_status !== "unknown"
).length;
const legacyOnlyAssertionCount = FEATURES.reduce(
  (a, f) => a + (f.legacy_only_assertions || []).length,
  0
);
const timeEvidenceBacked = FEATURES.every((f) => f.attested_time_evidence_backed);
const everyAssertionTraceable = legacyOnlyAssertionCount === 0 && timeEvidenceBacked;
const uncertaintyExplicit = SLICE.uncertainties.every(
  (u) => typeof u.missing_evidence === "string" && u.missing_evidence.trim().length > 0
);
const fabricated = resolved.some(
  (r) =>
    ["verified_object_point", "historical_anchor_candidate"].includes(r.def.historical_position_status) ||
    r.def.geometry_type === "line"
);

const criteria = {
  c1_core_features_with_evidence: { pass: featuresWithEvidence >= 3, value: featuresWithEvidence, need: 3 },
  c2_current_object_grounding: { pass: groundedCurrent >= 2, value: groundedCurrent, need: 2 },
  c3_waterway_defensible: { pass: waterwayDefensible, value: waterwayDefensible, need: true },
  c4_relations_classified: { pass: relE123 >= 2, value: relE123, need: 2 },
  c5_time_change_distinction: { pass: evidencedChanges >= 1, value: evidencedChanges, need: 1 },
  c6_every_assertion_traceable: {
    pass: everyAssertionTraceable,
    value: { legacy_only_assertions: legacyOnlyAssertionCount, all_attested_time_evidence_backed: timeEvidenceBacked },
    need: "no legacy-only historical assertion",
  },
  c7_uncertainty_explicit: { pass: uncertaintyExplicit, value: SLICE.uncertainties.length, need: "every uncertainty carries missing_evidence" },
  c8_no_fabricated_geometry: { pass: !fabricated, value: !fabricated, need: true },
};

const failedCriteria = Object.entries(criteria).filter(([, v]) => !v.pass).map(([k]) => k);
let readiness;
if (failedCriteria.length === 0) readiness = "YES";
else if (!criteria.c8_no_fabricated_geometry.pass) readiness = "NO";
else readiness = "PARTIAL";

// 三个子门（§9：不得等同）
const currentVisualEvidence = Number(
  await queryValue(
    `select count(*)::text c from evidence
      where evidence_type='image'
        and region_json->>'current_or_historical' = 'historical'`
  )
);
const subGates = {
  EXPERIENCE_SCRIPT_SUBSTRATE_READY: {
    value: "PARTIAL",
    reason:
      "钩子语义齐备（5 个，且全部 grounded_on 已落库的行），三处对象 + 水系都有当前锚点与变更语义；" +
      "但**没有任何历史影像或可归因的历史图上位置**可支撑『把过去画出来』，故只能做『陈述/证据驱动』的脚本，不能做复原式呈现。",
    blocking: ["U6", "U7", "U8", "historical_visual_evidence=0"],
  },
  PAST_PRESENT_COMPARISON_SUBSTRATE: {
    value: "PARTIAL",
    reason:
      "『今』一侧完整（3 个当前对象锚点 + 3 张 CC BY-SA 当代实景，均有 Evidence）；" +
      "『昔』一侧只有文本（转述记载 + 782 年前的建造年代），历史视觉证据为 0，" +
      "故只能做「文字/证据 ↔ 今天」对照，不能做「旧影 ↔ 今貌」对照。",
    blocking: ["historical_visual_evidence=0"],
  },
  SPATIOTEMPORAL_OVERLAY_SUBSTRATE: {
    value: "NO",
    reason:
      "时空叠加需要在历史图上取得至少一个**可辩护的要素位置**（历史锚点或相对位置可落到图上）。" +
      "本切片 historical_position_status 全部为 historical_relative_position_only / unresolved，" +
      "historical_geometry_status = absent_no_source，HISTORICAL_MAP_READY 仍为 PARTIAL（HR-MAP-01 未改门槛）→ 不具备可诚实叠加的几何。",
    blocking: ["historical_geometry_status=absent_no_source", "HR-MAP-01 direct_jinze_historical_map=NOT_YET"],
  },
};

const readinessDetail = {
  criteria,
  failed_criteria: failedCriteria,
  reason:
    readiness === "YES"
      ? "§9 的 8 条判据全部满足。"
      : "§9 的 8 条判据中 " +
        failedCriteria.join(" / ") +
        " 未满足；**不为把门槛刷绿而删断言、放宽判据或扩大切片**，故如实记 PARTIAL。",
  do_not_broaden_note:
    "本 Task 结束后若要让 c6 通过，正确做法是**补证据**（见 uncertainties 的 missing_evidence 与 §15-7 的待裁项），" +
    "而不是删除 legacy-only 断言或把它改写成已证事实。",
  sub_gates: subGates,
  historical_visual_evidence_count: currentVisualEvidence,
  human_review_refs: HUMAN_REVIEW_REFS,
};

// ---------------------------------------------------------------------------
// 4) 写库
// ---------------------------------------------------------------------------
const stats = { created: 0, reused: 0 };

const upsert = async (table, keyCol, key, cols, params) => {
  const exists = await queryValue(`select 1 as x from ${table} where ${keyCol}=:'k'`, { k: key });
  const setClause = cols
    .filter((c) => c !== keyCol)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  await run(
    `insert into ${table}(${cols.join(",")}) values (${cols.map((c) => `:'${c}'`).join(",")})
     on conflict (${keyCol}) do update set ${setClause}`,
    params
  );
  if (exists) stats.reused++;
  else stats.created++;
};

// 4.1 切片头
const extentAnchors = ANCHORS.filter((a) => a.coord_system === "GCJ-02");
const lats = extentAnchors.map((a) => a.lat);
const lngs = extentAnchors.map((a) => a.lng);
const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
const span = {
  ew_m: Math.round((Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos((midLat * Math.PI) / 180)),
  ns_m: Math.round((Math.max(...lats) - Math.min(...lats)) * 111320),
};
const spatialExtent = {
  ...SLICE.spatial_extent_current,
  gcj02_bbox: {
    min_lat: Math.min(...lats),
    max_lat: Math.max(...lats),
    min_lng: Math.min(...lngs),
    max_lng: Math.max(...lngs),
  },
  gcj02_span_m: { ...span, note: "按 GCJ-02 原值直线估读，仅供规模感，非面积主张" },
  anchor_count: ANCHORS.length,
  crs_split: {
    "GCJ-02": ANCHORS.filter((a) => a.coord_system === "GCJ-02").length,
    "WGS-84": ANCHORS.filter((a) => a.coord_system === "WGS-84").length,
    none: ANCHORS.filter((a) => !a.coord_system).length,
  },
};

const evidenceSummary = {
  historical_sources: historicalMaterial.map((m) => ({
    key: m.key,
    kind: m.kind,
    resolved_id: m.resolved_id,
    method: m.method,
    attributable_to_slice_objects: false,
    note: m.note,
  })),
  historical_map_evidence_count: 17,
  historical_map_attributable_to_slice_objects: 0,
  current_provider_evidence_count: resolved.filter((r) =>
    r.allEvIds.some((id) => evById.get(id)?.extraction_method?.startsWith("spatial_anchor"))
  ).length,
  current_provider_features: resolved
    .filter((r) => r.allEvIds.some((id) => evById.get(id)?.extraction_method?.startsWith("spatial_anchor")))
    .map((r) => r.def.canonical_label),
  human_review_refs: HUMAN_REVIEW_REFS,
  legacy_only_assertion_total: legacyOnlyAssertionCount,
  unresolved_selector_gaps: gaps.length,
};

await upsert(
  "historical_spatial_slices",
  "slice_id",
  SLICE.slice_id,
  [
    "slice_id",
    "slice_title",
    "focus_question",
    "time_context",
    "spatial_extent_current",
    "historical_geometry_status",
    "uncertainties",
    "experience_hooks",
    "evidence_summary",
    "readiness_gate",
    "readiness_detail",
  ],
  {
    slice_id: SLICE.slice_id,
    slice_title: SLICE.slice_title,
    focus_question: SLICE.focus_question,
    time_context: SLICE.time_context,
    spatial_extent_current: pgJson(spatialExtent),
    historical_geometry_status: SLICE.historical_geometry_status,
    uncertainties: pgJson(
      SLICE.uncertainties.map((u) => ({ ...u, missing_evidence_present: !!(u.missing_evidence || "").trim() }))
    ),
    experience_hooks: pgJson(SLICE.experience_hooks),
    evidence_summary: pgJson(evidenceSummary),
    readiness_gate: readiness,
    readiness_detail: pgJson(readinessDetail),
  }
);

// 4.2 特征
const auditStmts = [];
const featureIdByKey = {};
for (const r of resolved) {
  const key = r.def.feature_key;
  const id = deterministicUuid("hf:" + key);
  featureIdByKey[key] = id;
  const f = r.def;

  const g = evaluateGates({
    source: (f.historical_source_refs.length || f.current_source_refs.length) > 0,
    identity: r.labelSeen,
    time: f.attested_time_start ? true : undefined,
    // G3 在历史空间语境下 = 「**历史**空间来源是否可证明」。本切片所有对象的
    // historical_position_status 都不是 verified_*，故恒 false → tier 恒 B
    // （与 TASK-0006/0007 的 spatial=false 约定一致）。
    spatial: false,
    evidence: r.allEvIds.length >= 1,
    conflict: FEATURE_CONFLICTS[key] === true,
  });

  await upsert(
    "historical_features",
    "feature_key",
    key,
    [
      "feature_id",
      "feature_key",
      "slice_id",
      "feature_type",
      "canonical_label",
      "historical_labels",
      "modern_labels",
      "label_variants_note",
      "entity_id",
      "geometry_type",
      "geometry_note",
      "attested_time_start",
      "attested_time_end",
      "attested_time_label",
      "attested_time_evidence_backed",
      "legacy_only_assertions",
      "attested_historical_existence",
      "current_survival_or_site",
      "historical_position_status",
      "current_position_status",
      "name_continuity_status",
      "change_status",
      "historical_source_refs",
      "current_source_refs",
      "evidence_ids",
      "confidence",
      "confidence_note",
      "review_status",
      "uncertainty_note",
    ],
    {
      feature_id: id,
      feature_key: key,
      slice_id: SLICE.slice_id,
      feature_type: f.feature_type,
      canonical_label: f.canonical_label,
      historical_labels: pgTextArray(f.historical_labels),
      modern_labels: pgTextArray(f.modern_labels),
      label_variants_note: f.label_variants_note,
      entity_id: r.entityId,
      geometry_type: f.geometry_type,
      geometry_note: f.geometry_note,
      attested_time_start: f.attested_time_start,
      attested_time_end: f.attested_time_end,
      attested_time_label: f.attested_time_label,
      attested_time_evidence_backed: String(f.attested_time_evidence_backed),
      legacy_only_assertions: pgTextArray(f.legacy_only_assertions || []),
      attested_historical_existence: f.attested_historical_existence,
      current_survival_or_site: f.current_survival_or_site,
      historical_position_status: f.historical_position_status,
      current_position_status: f.current_position_status,
      name_continuity_status: f.name_continuity_status,
      change_status: f.change_status,
      historical_source_refs: pgTextArray(f.historical_source_refs),
      current_source_refs: pgTextArray(f.current_source_refs),
      evidence_ids: pgUuidArray(r.allEvIds),
      confidence: String(f.confidence ?? 0),
      confidence_note:
        "本项目不使用无依据的数值置信度：confidence 恒 0；判定等级由 review_status + human_review_decisions + §7 epistemic_class 承载。",
      review_status: f.review_status,
      uncertainty_note: f.uncertainty_note,
    }
  );

  for (const code of GATE_CODES) {
    auditStmts.push({
      sql: `delete from evidence_gate_audit where object_type='historical_feature' and object_id=:'oid' and gate_code=:'gc'`,
      params: { oid: id, gc: code },
    });
    auditStmts.push({
      sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
            values ('historical_feature',:'oid',:'gc',:'rs',:'rn','rule')`,
      params: { oid: id, gc: code, rs: g.gates[code].result, rn: g.gates[code].reason },
    });
  }
}

// 4.3 空间锚
for (const a of ANCHORS) {
  const fid = featureIdByKey[a.feature_key];
  if (!fid) throw new Error("anchor 指向未知 feature: " + a.feature_key);
  const evId = evRowsByKey[a.evidence_key]?.[0]?.id ?? null;
  if (!evId) gaps.push({ owner: a.anchor_key, selector: a.evidence_key, expected: 1, actual: 0 });
  await upsert(
    "historical_feature_anchors",
    "anchor_key",
    a.anchor_key,
    [
      "anchor_id",
      "anchor_key",
      "feature_id",
      "anchor_kind",
      "spatial_status",
      "geometry_type",
      "coord_system",
      "location_raw",
      "lat",
      "lng",
      "crs_note",
      "precision_scope",
      "source_label",
      "source_locator",
      "evidence_id",
      "exact_object_point",
      "historical_position_proof",
      "human_review_code",
      "note",
    ],
    {
      anchor_id: deterministicUuid("hfa:" + a.anchor_key),
      anchor_key: a.anchor_key,
      feature_id: fid,
      anchor_kind: a.anchor_kind,
      spatial_status: a.spatial_status,
      geometry_type: a.geometry_type,
      coord_system: a.coord_system,
      location_raw: a.location_raw,
      lat: a.lat === null || a.lat === undefined ? null : String(a.lat),
      lng: a.lng === null || a.lng === undefined ? null : String(a.lng),
      crs_note: a.crs_note,
      precision_scope: a.precision_scope,
      source_label: a.source_label,
      source_locator: a.source_locator,
      evidence_id: evId,
      exact_object_point: String(a.exact_object_point),
      historical_position_proof: String(a.historical_position_proof),
      human_review_code: a.human_review_code,
      note: a.note,
    }
  );
}

// 4.4 变更记录
for (const c of CHANGES) {
  const fid = featureIdByKey[c.feature_key];
  if (!fid) throw new Error("change 指向未知 feature: " + c.feature_key);
  const evIds = [...new Set((c.evidence_keys || []).flatMap((k) => (evRowsByKey[k] || []).map((r) => r.id)))];
  if (c.change_epistemic === "evidenced" && evIds.length === 0) {
    throw new Error("evidenced change 无证据: " + c.change_key);
  }
  await upsert(
    "historical_change_records",
    "change_key",
    c.change_key,
    [
      "change_id",
      "change_key",
      "slice_id",
      "feature_id",
      "change_status",
      "change_epistemic",
      "from_state",
      "to_state",
      "time_hint",
      "evidence_ids",
      "legacy_only_parts",
      "note",
      "review_status",
    ],
    {
      change_id: deterministicUuid("hch:" + c.change_key),
      change_key: c.change_key,
      slice_id: SLICE.slice_id,
      feature_id: fid,
      change_status: c.change_status,
      change_epistemic: c.change_epistemic,
      from_state: c.from_state,
      to_state: c.to_state,
      time_hint: c.time_hint,
      evidence_ids: pgUuidArray(evIds),
      legacy_only_parts: pgTextArray(c.legacy_only_parts || []),
      note: c.note,
      review_status: c.review_status,
    }
  );
}

// 4.5 切片关系
for (const rel of RELATIONS) {
  const id = deterministicUuid("hsr:" + rel.relation_key);
  const evIds = [...new Set(rel.evidence_keys.flatMap((k) => (evRowsByKey[k] || []).map((r) => r.id)))];
  if (rel.epistemic_class !== "E4" && evIds.length === 0) {
    throw new Error(`${rel.epistemic_class} 关系无证据: ${rel.relation_key}`);
  }
  const existingId = await resolveExistingRelation(rel.existing_relation_selector);

  const g = evaluateGates({
    source: evIds.length >= 1 || rel.epistemic_class === "E4",
    identity: true, // 两端特征键已在定义期固定
    time: undefined, // 关系不带时间语义 → pending
    spatial: false,
    evidence: rel.epistemic_class !== "E4", // E4 = 合理但证据不足 → G4 fail
    conflict: false,
  });

  await upsert(
    "historical_spatial_relations",
    "relation_key",
    rel.relation_key,
    [
      "hs_relation_id",
      "relation_key",
      "slice_id",
      "subject_feature_key",
      "predicate",
      "object_feature_key",
      "epistemic_class",
      "support_level",
      "existing_relation_id",
      "evidence_ids",
      "hr_constraint",
      "confidence",
      "status",
      "note",
    ],
    {
      hs_relation_id: id,
      relation_key: rel.relation_key,
      slice_id: SLICE.slice_id,
      subject_feature_key: rel.subject,
      predicate: rel.predicate,
      object_feature_key: rel.object,
      epistemic_class: rel.epistemic_class,
      support_level: rel.support_level,
      existing_relation_id: existingId,
      evidence_ids: pgUuidArray(evIds),
      hr_constraint: pgTextArray(rel.hr_constraint || []),
      confidence: "0",
      status: rel.status,
      note: rel.note,
    }
  );

  for (const code of GATE_CODES) {
    auditStmts.push({
      sql: `delete from evidence_gate_audit where object_type='historical_spatial_relation' and object_id=:'oid' and gate_code=:'gc'`,
      params: { oid: id, gc: code },
    });
    auditStmts.push({
      sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
            values ('historical_spatial_relation',:'oid',:'gc',:'rs',:'rn','rule')`,
      params: { oid: id, gc: code, rs: g.gates[code].result, rn: g.gates[code].reason },
    });
  }
}

await runMany(auditStmts);

// ---------------------------------------------------------------------------
// 5) 不变式快照 + 报告
// ---------------------------------------------------------------------------
const after = {
  slices: Number(await queryValue(`select count(*)::text c from historical_spatial_slices`)),
  features: Number(await queryValue(`select count(*)::text c from historical_features`)),
  anchors: Number(await queryValue(`select count(*)::text c from historical_feature_anchors`)),
  changes: Number(await queryValue(`select count(*)::text c from historical_change_records`)),
  hs_relations: Number(await queryValue(`select count(*)::text c from historical_spatial_relations`)),
  audit_total: Number(await queryValue(`select count(*)::text c from evidence_gate_audit`)),
  audit_relation_orphan: Number(await countOrphanRelationAudit()),
  published: Number(await countPublished()),
  relations_total: Number(await queryValue(`select count(*)::text c from relations`)),
  evidence_total: Number(await queryValue(`select count(*)::text c from evidence`)),
  source_records_total: Number(await queryValue(`select count(*)::text c from source_records`)),
  claims_total: Number(await queryValue(`select count(*)::text c from claims`)),
  human_review_decisions: Number(await queryValue(`select count(*)::text c from human_review_decisions`)),
};

const checks = {
  evidence_not_created: after.evidence_total === before.evidence_total,
  sources_not_created: after.source_records_total === before.source_records_total,
  claims_not_created: after.claims_total === before.claims_total,
  relations_untouched: after.relations_total === before.relations_total,
  published_zero: after.published === 0,
  audit_relation_orphan_unchanged: after.audit_relation_orphan === before.audit_relation_orphan,
  audit_relation_orphan_le_63: after.audit_relation_orphan <= 63,
  human_review_untouched: after.human_review_decisions === before.human_review_decisions,
  all_core_tables_written:
    after.slices === 1 &&
    after.features === FEATURES.length &&
    after.anchors === ANCHORS.length &&
    after.changes === CHANGES.length &&
    after.hs_relations === RELATIONS.length,
};

process.stdout.write(
  JSON.stringify(
    {
      slice_id: SLICE.slice_id,
      run: "build-jinze-historical-spatial-slice",
      created: stats.created,
      reused: stats.reused,
      counts: {
        features: FEATURES.length,
        anchors: ANCHORS.length,
        changes: CHANGES.length,
        relations: RELATIONS.length,
        // 每对象每门一条 G0–G6 行；(features + relations) * 7 才是真实入库行数。
        // auditStmts 是 SQL 语句数（每门 delete + insert 各一条，故恰为行数 2 倍），
        // 两个数都写出来，避免下游把语句数误读成审计行数。
        audit_rows_written: (FEATURES.length + RELATIONS.length) * GATE_CODES.length,
        audit_statements: auditStmts.length,
      },
      relations_by_class: RELATIONS.reduce((a, r) => ((a[r.epistemic_class] = (a[r.epistemic_class] || 0) + 1), a), {}),
      changes_by_epistemic: CHANGES.reduce((a, c) => ((a[c.change_epistemic] = (a[c.change_epistemic] || 0) + 1), a), {}),
      readiness_gate: readiness,
      failed_criteria: failedCriteria,
      sub_gates: Object.fromEntries(Object.entries(subGates).map(([k, v]) => [k, v.value])),
      selector_gaps: gaps,
      before,
      after,
      checks,
      ok: Object.values(checks).every(Boolean),
    },
    null,
    2
  ) + "\n"
);
if (!Object.values(checks).every(Boolean)) process.exit(1);
