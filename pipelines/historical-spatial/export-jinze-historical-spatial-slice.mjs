// pipelines/historical-spatial/export-jinze-historical-spatial-slice.mjs
//
// TASK-0010 §15 交付物投影器：**只读 PG**，生成 data/exports/ 下的 CSV/JSON/MD。
//
// §10 纪律：PG 是唯一真源；本脚本产出的文件是「构建/审计产物」，不得被反向回写。
// 因此本脚本对同一份库状态必须产出逐字节稳定的文件（确定性排序、无时间戳）。
//
// 产出：
//   1. jinze-map-human-review-decision-log.md          （WP-A 人审决策日志，追加式）
//   2. jinze-historical-feature-inventory.csv          （WP-B）
//   3. jinze-historical-spatial-relations.csv          （WP-E）
//   4. jinze-historical-change-inventory.csv           （WP-D）
//   5. jinze-historical-spatial-slice.json             （WP-F）
//   6. jinze-historical-spatial-slice-readiness.md     （WP-G）
//   7. jinze-historical-spatial-human-review.csv       （仅当确有需人审的未决项）

import fs from "node:fs";
import path from "node:path";
import { queryRows, PROJECT_ROOT } from "../../packages/data-access/src/index.mjs";

const EXPORTS = path.join(PROJECT_ROOT, "data", "exports");
const SLICE_ID = "jinze-minimum-slice-001";

// ---- RFC4180 CSV ----
const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCsv = (headers, rows) =>
  [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";
const writeOut = (name, text) => {
  fs.writeFileSync(path.join(EXPORTS, name), text, "utf8");
  return { name, bytes: Buffer.byteLength(text, "utf8") };
};

// ---- PG 读取 ----
const sliceRows = await queryRows(
  `select slice_id, slice_title, focus_question, time_context,
          spatial_extent_current::text extent, historical_geometry_status,
          uncertainties::text unc, experience_hooks::text hooks,
          evidence_summary::text evsum, readiness_gate, readiness_detail::text rdet
     from historical_spatial_slices where slice_id=:'s'`,
  { s: SLICE_ID }
);
if (sliceRows.length !== 1) throw new Error("切片不存在，请先运行 builder");
const S = sliceRows[0];
const extent = JSON.parse(S.extent);
const uncertainties = JSON.parse(S.unc);
const hooks = JSON.parse(S.hooks);
const evsum = JSON.parse(S.evsum);
const rdet = JSON.parse(S.rdet);

const features = await queryRows(
  `select feature_key, feature_type, canonical_label,
          array_to_string(historical_labels,' | ') historical_labels,
          array_to_string(modern_labels,' | ') modern_labels,
          label_variants_note, coalesce(entity_id::text,'') entity_id, geometry_type, geometry_note,
          coalesce(attested_time_start,'') attested_time_start, coalesce(attested_time_end,'') attested_time_end,
          coalesce(attested_time_label,'') attested_time_label,
          attested_time_evidence_backed::text attested_time_evidence_backed,
          array_to_string(legacy_only_assertions,' | ') legacy_only_assertions,
          attested_historical_existence, current_survival_or_site,
          historical_position_status, current_position_status, name_continuity_status, change_status,
          array_to_string(historical_source_refs,' | ') historical_source_refs,
          array_to_string(current_source_refs,' | ') current_source_refs,
          coalesce(array_length(evidence_ids,1),0)::text evidence_count,
          confidence::text confidence, review_status, uncertainty_note
     from historical_features where slice_id=:'s' order by feature_key`,
  { s: SLICE_ID }
);

const anchors = await queryRows(
  `select a.anchor_key, f.feature_key, f.canonical_label, a.anchor_kind, a.spatial_status,
          a.geometry_type, coalesce(a.coord_system,'') coord_system, coalesce(a.location_raw,'') location_raw,
          a.lat::text lat, a.lng::text lng, a.crs_note, coalesce(a.precision_scope,'') precision_scope,
          a.source_label, coalesce(a.source_locator,'') source_locator, coalesce(a.evidence_id::text,'') evidence_id,
          a.exact_object_point::text exact_object_point, a.historical_position_proof::text historical_position_proof,
          coalesce(a.human_review_code,'') human_review_code, a.note
     from historical_feature_anchors a
     join historical_features f on f.feature_id=a.feature_id
    where f.slice_id=:'s' order by a.anchor_key`,
  { s: SLICE_ID }
);

const changes = await queryRows(
  `select c.change_key, f.feature_key, f.canonical_label, c.change_status, c.change_epistemic,
          coalesce(c.from_state,'') from_state, coalesce(c.to_state,'') to_state,
          coalesce(c.time_hint,'') time_hint,
          coalesce(array_length(c.evidence_ids,1),0)::text evidence_count,
          array_to_string(c.evidence_ids,',') evidence_ids,
          array_to_string(c.legacy_only_parts,' | ') legacy_only_parts,
          c.note, c.review_status
     from historical_change_records c
     join historical_features f on f.feature_id=c.feature_id
    where c.slice_id=:'s' order by c.change_key`,
  { s: SLICE_ID }
);

const relations = await queryRows(
  `select r.relation_key, r.subject_feature_key, r.predicate, r.object_feature_key,
          r.epistemic_class, r.support_level, coalesce(r.existing_relation_id::text,'') existing_relation_id,
          coalesce(array_length(r.evidence_ids,1),0)::text evidence_count,
          array_to_string(r.evidence_ids,',') evidence_ids,
          array_to_string(r.hr_constraint,' | ') hr_constraint,
          r.status, r.note
     from historical_spatial_relations r
    where r.slice_id=:'s' order by r.epistemic_class, r.relation_key`,
  { s: SLICE_ID }
);

const hrs = await queryRows(
  `select hr_code, decision_code, decision_label, object_type, object_ref, review_note,
          reviewed_at::text reviewed_at, actor, status_after,
          machine_readable_flags::text flags, array_to_string(source_refs,' | ') source_refs
     from human_review_decisions
    where hr_code in ('HR-MAP-01','SHR-01','SHR-02','SHR-06','HR-1','HR-2','HR-4')
    order by hr_code`,
  {}
);
const hrMap01 = hrs.find((h) => h.hr_code === "HR-MAP-01");
const flags = hrMap01 ? JSON.parse(hrMap01.flags) : null;

const produced = [];

// ---------------------------------------------------------------------------
// 1. WP-A 人审决策日志
// ---------------------------------------------------------------------------
{
  const line = (k, v) => `| ${k} | ${v} |`;
  const md = `# 金泽历史图版人工复核决策日志（追加式）

> 本文件由 \`pipelines/historical-spatial/export-jinze-historical-spatial-slice.mjs\` 从 PG 投影生成。
> **不覆盖、不修改** TASK-0009 的任何历史报告或 CSV（§0.2 明文要求以新的 Human Review Decision
> 方式追加审计记录，而不是回改旧判断）。

## 1. 本次新增决策

| 项 | 值 |
|---|---|
${line("hr_code", "`" + hrMap01.hr_code + "`")}
${line("decision_code", "`" + hrMap01.decision_code + "`（沿用既有 A/B/C 格式码，真语义在 machine_readable_flags；未碰撞 HR-1…HR-6 / SHR-01…SHR-06）")}
${line("status_after", "`" + hrMap01.status_after + "`")}
${line("object_type", "`" + hrMap01.object_type + "`")}
${line("object_ref", "`" + hrMap01.object_ref + "`")}
${line("actor", "`" + hrMap01.actor + "`")}
${line("reviewed_at", "`" + hrMap01.reviewed_at + "`（" + flags.reviewed_at_semantics + "）")}
${line("decision_label", hrMap01.decision_label)}
${line("source_refs", hrMap01.source_refs.split(" | ").map((s) => "`" + s + "`").join("<br>"))}

## 2. 冻结裁决逐条（机器可读镜像）

| 判据 | 取值 |
|---|---|
${line("source/page identity", "`" + flags.source_page_identity + "`")}
${line("图组", "`" + flags.map_series + "` = `" + flags.map_series_status + "`")}
${line("网格号", "`" + flags.grid_sheet + "` = `" + flags.grid_sheet_status + "`")}
${line("图内容可读性", "`" + flags.map_content_readability + "`")}
${line("未决标签", flags.unresolved_labels.map((l) => "`" + l + "`").join(" / ") + " = `" + flags.unresolved_label_status + "`")}
${line("图上历史空间结构", "`" + flags.historical_spatial_structure_present + "`")}
${line("可用作 Historical Spatial Source", "`" + flags.usable_as_historical_spatial_source + "`")}
${line("直接的金泽历史地图", "`" + flags.direct_jinze_historical_map + "`")}
${line("BREAKTHROUGH_CANDIDATE", "`" + String(flags.breakthrough_candidate).toUpperCase() + "`")}
${line("HISTORICAL_MAP_READY", "`" + flags.map_gate.value + "`（unchanged=" + flags.map_gate.unchanged + "，changed_by_this_decision=" + flags.map_gate.changed_by_this_decision + "）")}
${line("OCR 升级", "blocked=" + flags.ocr_promotion_blocked + "，role=`" + flags.ocr_role + "`")}
${line("来源不可变性", flags.source_immutability)}

判据原文：\`${flags.map_gate.criterion}\`

## 3. 决策全文

${hrMap01.review_note}

## 4. 与既有决策的关系（不得覆盖）

| hr_code | 类型 | 结论 | 本 Task 是否改动 |
|---|---|---|---|
${hrs
  .map(
    (h) =>
      `| \`${h.hr_code}\` | \`${h.object_type}\` | \`${h.status_after}\` | ${
        h.hr_code === "HR-MAP-01" ? "本次新增" : "**未改动**"
      } |`
  )
  .join("\n")}

- \`SHR-06\`（gate \`HISTORICAL_MAP_READY\`）保持 \`partial\` —— 本决策**不收敛**该门槛。
- 本决策不触碰 \`source_records\` / \`evidence\`：来源本身未被「改成已确认」（§11）。
- TASK-0009 的 \`jinze-historical-map-acquisition-report.md\`、\`jinze-map-breakthrough-candidates.md\`、
  \`jinze-historical-map-index-1597-1934.csv\` 均**原样保留**。
`;
  produced.push(writeOut("jinze-map-human-review-decision-log.md", md));
}

// ---------------------------------------------------------------------------
// 2. WP-B 特征清单
// ---------------------------------------------------------------------------
{
  const headers = [
    "feature_key",
    "canonical_label",
    "feature_type",
    "historical_labels",
    "modern_labels",
    "label_variants_note",
    "entity_id",
    "geometry_type",
    "geometry_note",
    "attested_time_label",
    "attested_time_start",
    "attested_time_end",
    "attested_time_evidence_backed",
    "legacy_only_assertions",
    "attested_historical_existence",
    "current_survival_or_site",
    "historical_position_status",
    "current_position_status",
    "name_continuity_status",
    "change_status",
    "evidence_count",
    "historical_source_refs",
    "current_source_refs",
    "review_status",
    "uncertainty_note",
  ];
  produced.push(writeOut("jinze-historical-feature-inventory.csv", toCsv(headers, features)));

  const anchorHeaders = [
    "anchor_key",
    "canonical_label",
    "anchor_kind",
    "spatial_status",
    "geometry_type",
    "coord_system",
    "location_raw",
    "lat",
    "lng",
    "crs_note",
    "precision_scope",
    "exact_object_point",
    "historical_position_proof",
    "human_review_code",
    "source_label",
    "source_locator",
    "evidence_id",
    "note",
  ];
  produced.push(writeOut("jinze-historical-feature-anchors.csv", toCsv(anchorHeaders, anchors)));
}

// ---------------------------------------------------------------------------
// 3. WP-E 关系分类
// ---------------------------------------------------------------------------
{
  const headers = [
    "relation_key",
    "subject_feature_key",
    "predicate",
    "object_feature_key",
    "epistemic_class",
    "support_level",
    "evidence_count",
    "evidence_ids",
    "existing_relation_id",
    "hr_constraint",
    "status",
    "note",
  ];
  produced.push(writeOut("jinze-historical-spatial-relations.csv", toCsv(headers, relations)));
}

// ---------------------------------------------------------------------------
// 4. WP-D 变更清单
// ---------------------------------------------------------------------------
{
  const headers = [
    "change_key",
    "canonical_label",
    "feature_key",
    "change_status",
    "change_epistemic",
    "from_state",
    "to_state",
    "time_hint",
    "evidence_count",
    "evidence_ids",
    "legacy_only_parts",
    "review_status",
    "note",
  ];
  produced.push(writeOut("jinze-historical-change-inventory.csv", toCsv(headers, changes)));
}

// ---------------------------------------------------------------------------
// 5. WP-F 切片 JSON（纯投影）
// ---------------------------------------------------------------------------
{
  const slice = {
    slice_id: S.slice_id,
    slice_title: S.slice_title,
    focus_question: S.focus_question,
    time_context: S.time_context,
    projection_of: "postgres:historical_spatial_slices + historical_features + anchors + changes + relations",
    truth_store: "PostgreSQL (mohen_dev) —— 本 JSON 是构建/审计产物，不是真源",
    features: features.map((f) => ({
      ...f,
      anchors: anchors
        .filter((a) => a.feature_key === f.feature_key)
        .map(({ feature_key, canonical_label, ...rest }) => rest),
    })),
    relations,
    changes,
    historical_sources: evsum.historical_sources,
    current_sources: anchors
      .filter((a) => a.coord_system)
      .map((a) => ({
        anchor_key: a.anchor_key,
        kind: a.anchor_kind,
        coord_system: a.coord_system,
        location_raw: a.location_raw,
        source_label: a.source_label,
        source_locator: a.source_locator,
        evidence_id: a.evidence_id,
      })),
    uncertainties: uncertainties.map((u) => ({
      key: u.key,
      subject: u.subject,
      description: u.description,
      missing_evidence: u.missing_evidence,
      proposed_decision: u.proposed_decision,
      severity: u.severity,
    })),
    evidence_summary: {
      ...evsum,
      feature_evidence_total: features.reduce((a, f) => a + Number(f.evidence_count), 0),
      relation_evidence_total: relations.reduce((a, r) => a + Number(r.evidence_count), 0),
      change_evidence_total: changes.reduce((a, c) => a + Number(c.evidence_count), 0),
    },
    spatial_extent_current: extent,
    historical_geometry_status: S.historical_geometry_status,
    experience_hooks: hooks,
    readiness: { gate: S.readiness_gate, detail: rdet },
    human_review_refs: hrs.map((h) => ({
      hr_code: h.hr_code,
      status_after: h.status_after,
      decision_label: h.decision_label,
    })),
  };
  produced.push(writeOut("jinze-historical-spatial-slice.json", JSON.stringify(slice, null, 2) + "\n"));
}

// ---------------------------------------------------------------------------
// 6. WP-G 就绪门
// ---------------------------------------------------------------------------
{
  const c = rdet.criteria;
  const row = (k, v) => `| ${k} | ${v.pass ? "**PASS**" : "**NOT MET**"} | \`${JSON.stringify(v.value)}\` | \`${JSON.stringify(v.need)}\` |`;
  const sub = rdet.sub_gates;
  const md = `# 金泽历史空间最小切片 —— 重建就绪门（WP-G）

> 由 \`export-jinze-historical-spatial-slice.mjs\` 从 PG 投影生成。判据定义见任务书 §9。

## 1. 主门

**主门判定：\`HISTORICAL_SPATIAL_SLICE_READY = ${S.readiness_gate}\`**

${rdet.reason}

未满足项：${rdet.failed_criteria.map((x) => "`" + x + "`").join("、")}

## 2. §9 的 8 条判据逐条对账

| 判据 | 结果 | 实测值 | 要求 |
|---|---|---|---|
${Object.keys(c)
  .sort()
  .map((k) => row(k, c[k]))
  .join("\n")}

### 为什么 c6 未满足（本切片停在 PARTIAL 的原因）

c6「every historical assertion traceable to Evidence」要求切片中的**每一条**历史断言都能追到 Evidence 行。
当前实测：

- 只存在于 Legacy 描述、**无 Evidence 行**的历史断言 **${c.c6_every_assertion_traceable.value.legacy_only_assertions}** 条；
- 全部特征的「定年链是否完全有 Evidence」= \`${c.c6_every_assertion_traceable.value.all_attested_time_evidence_backed}\`。

具体条目：

${features
  .filter((f) => f.legacy_only_assertions)
  .map(
    (f) =>
      `- **${f.canonical_label}**\n` +
      f.legacy_only_assertions
        .split(" | ")
        .map((x) => `  - ${x}`)
        .join("\n")
  )
  .join("\n")}

${rdet.do_not_broaden_note}

## 3. 三个子门（§9：不得等同）

| 子门 | 取值 | 阻塞项 |
|---|---|---|
${Object.entries(sub)
  .map(([k, v]) => `| \`${k}\` | **${v.value}** | ${v.blocking.map((b) => "`" + b + "`").join("、")} |`)
  .join("\n")}

### 3.1 \`EXPERIENCE_SCRIPT_SUBSTRATE_READY = ${sub.EXPERIENCE_SCRIPT_SUBSTRATE_READY.value}\`

${sub.EXPERIENCE_SCRIPT_SUBSTRATE_READY.reason}

### 3.2 \`PAST_PRESENT_COMPARISON_SUBSTRATE = ${sub.PAST_PRESENT_COMPARISON_SUBSTRATE.value}\`

${sub.PAST_PRESENT_COMPARISON_SUBSTRATE.reason}

### 3.3 \`SPATIOTEMPORAL_OVERLAY_SUBSTRATE = ${sub.SPATIOTEMPORAL_OVERLAY_SUBSTRATE.value}\`

${sub.SPATIOTEMPORAL_OVERLAY_SUBSTRATE.reason}

## 4. 空间语义对账（当前 ≠ 历史）

| 特征 | 几何类型 | 历史位置状态 | 当前位置状态 |
|---|---|---|---|
${features
  .map(
    (f) =>
      `| ${f.canonical_label} | \`${f.geometry_type}\` | \`${f.historical_position_status}\` | \`${f.current_position_status}\` |`
  )
  .join("\n")}

坐标登记（**每一个带坐标的记录都显式声明 CRS；两组 CRS 分列、零换算**）：

| 锚 | 类型 | 空间状态 | CRS | 原值 | 历史位置证明 | 人审 |
|---|---|---|---|---|---|---|
${anchors
  .map(
    (a) =>
      `| \`${a.anchor_key}\` | \`${a.anchor_kind}\` | \`${a.spatial_status}\` | \`${
        a.coord_system || "—"
      }\` | \`${a.location_raw || "—"}\` | ${a.historical_position_proof} | ${a.human_review_code || "—"} |`
  )
  .join("\n")}

- \`historical_geometry_status = ${S.historical_geometry_status}\`：本 Task **不产生任何历史几何**（§12-10/11）。
- 当前 GCJ-02 锚点包围盒：${extent.gcj02_bbox.min_lat}–${extent.gcj02_bbox.max_lat}N，
  ${extent.gcj02_bbox.min_lng}–${extent.gcj02_bbox.max_lng}E；东西约 ${extent.gcj02_span_m.ew_m} m、南北约
  ${extent.gcj02_span_m.ns_m} m（按原值直线估读，仅供规模感）。
- CRS 分布：${Object.entries(extent.crs_split).map(([k, v]) => `\`${k}\`=${v}`).join("，")}。

## 5. 未决项与缺失证据（§9-7 / §17）

| 编号 | 主题 | 严重度 | 缺失证据 |
|---|---|---|---|
${uncertainties
  .map((u) => `| \`${u.key}\` | ${u.subject} | \`${u.severity}\` | ${u.missing_evidence} |`)
  .join("\n")}

## 6. 关系知识级别

| 级别 | 条数 | 含义 | 本切片实例 |
|---|---|---|---|
${["E1", "E2", "E3", "E4"]
  .map((k) => {
    const rs = relations.filter((r) => r.epistemic_class === k);
    const meaning = {
      E1: "直接文献/来源支持存在",
      E2: "当前空间几何 + 来源相容身份支持，但尚非历史事实",
      E3: "历史来源给出相对/拓扑关系，但无可靠坐标",
      E4: "看似合理而证据不足",
    }[k];
    return `| \`${k}\` | ${rs.length} | ${meaning} | ${rs
      .map((r) => "`" + r.relation_key + "`")
      .join("<br>") || "—"} |`;
  })
  .join("\n")}

## 7. 变更语义

| 变更 | 特征 | change_status | 级别 | 有 Evidence |
|---|---|---|---|---|
${changes
  .map(
    (c) =>
      `| \`${c.change_key}\` | ${c.canonical_label} | \`${c.change_status}\` | \`${c.change_epistemic}\` | ${
        Number(c.evidence_count) > 0 ? "是（" + c.evidence_count + "）" : "**否**"
      } |`
  )
  .join("\n")}
`;
  produced.push(writeOut("jinze-historical-spatial-slice-readiness.md", md));
}

// ---------------------------------------------------------------------------
// 7. 待人审项（仅当确有需架构师裁决的未决项）
// ---------------------------------------------------------------------------
{
  const proposals = uncertainties
    .filter((u) => ["high", "medium"].includes(u.severity))
    .map((u, i) => ({
      proposal_ref: `P-${String(i + 1).padStart(2, "0")}`,
      related_uncertainty: u.key,
      subject: u.subject,
      severity: u.severity,
      missing_evidence: u.missing_evidence,
      proposed_decision: u.proposed_decision,
      requires_architect_adjudication: "true",
      db_row_created: "false",
      note:
        "**提案，不是决策**：本行未写入 human_review_decisions；编号由总架构决定，不得沿用 HR-/SHR- 前缀以免碰撞既有命名空间。",
    }));
  if (proposals.length > 0) {
    produced.push(
      writeOut(
        "jinze-historical-spatial-human-review.csv",
        toCsv(
          [
            "proposal_ref",
            "related_uncertainty",
            "subject",
            "severity",
            "missing_evidence",
            "proposed_decision",
            "requires_architect_adjudication",
            "db_row_created",
            "note",
          ],
          proposals
        )
      )
    );
  }
}

process.stdout.write(
  JSON.stringify({ produced, hr_map01_gate: flags.map_gate.value, readiness: S.readiness_gate }, null, 2) + "\n"
);
