// pipelines/historical-spatial/persist-hr-map-01.mjs
//
// TASK-0010 Work Package A —— 持久化 HR-MAP-01（1879 光绪《青浦县志》二里半方图 p36 人工视觉复核）。
//
// 设计纪律（§3 / §11 / §12）：
//  · **追加**新的 Human Review Decision 记录，不修改、不覆盖 TASK-0009 的任何历史报告/CSV；
//  · 不碰撞 HR-1…HR-6 / SHR-01…SHR-06（hr_code 用 HR-MAP-01 新命名空间）；
//  · decision_code 复用既有 A/B/C 格式码（真语义放 machine_readable_flags），
//    因此**无需**为新决策改 CHECK 约束，也不建平行评审子系统；
//  · 人审结论与原始 source 严格分离：本脚本**只写 human_review_decisions**，
//    绝不 touch source_records / evidence —— 不把来源「改成已确认」；
//  · map-gate（HISTORICAL_MAP_READY）保持 PARTIAL：flags 里显式记录 unchanged，
//    并复核 SHR-06 现状值仍为 partial；
//  · 幂等：on conflict (hr_code) do update，重跑不新增行。

import { run, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const HR_CODE = "HR-MAP-01";
// §0.2 冻结裁决的下达时刻（TASK-0010 交接轮次，GMT+8）。
const REVIEWED_AT = "2026-09-22T16:09:26+08:00";

// PG 文本数组字面量：data-access 的 renderSql 会把 JS 数组渲染成逗号串（非法数组），
// 故数组列一律显式构造 `{"a","b"}` 并配 ::text[] 转换（与 pipelines/review 同约定）。
const pgTextArray = (arr) =>
  "{" + arr.map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(",") + "}";

// ---- 选择器：按「来源事实」定位证据行，而不是硬编码 UUID（可重跑、可自查）----
const sel = async (label, sql) => {
  const rows = await queryRows(sql);
  if (rows.length !== 1) {
    throw new Error(`selector「${label}」期望恰好 1 行，实得 ${rows.length} 行`);
  }
  return rows[0];
};

const p36Ev = await sel(
  "1879 二里半方图 p36 图版证据",
  `select evidence_id::text id, quote_text q, confidence::text conf
     from evidence
    where extraction_method='historical_map_source_acquisition'
      and evidence_type='map' and place_hint='青浦县西南（吴江界/澱山湖一带）'`
);
const gridEv = await sel(
  "1879 二里半方图 网格全组证据",
  `select evidence_id::text id
     from evidence
    where extraction_method='historical_map_source_acquisition'
      and place_hint='青浦县' and locator='p22-42'`
);
const src1879 = await sel(
  "1879《青浦县志》图说 source_record",
  `select source_id::text id, title, coalesce(source_uri,'') uri
     from source_records
    where provider='historical-gazetteer' and title like '%1879%青浦县志%'`
);

// ---- 人审前快照 ----
const before = {
  hr_total: Number(await queryValue(`select count(*)::text c from human_review_decisions`)),
  hr_classic: Number(
    await queryValue(`select count(*)::text c from human_review_decisions where hr_code ~ '^HR-[1-6]$'`)
  ),
  shr_total: Number(
    await queryValue(`select count(*)::text c from human_review_decisions where hr_code like 'SHR-%'`)
  ),
  hr_map01: Number(
    await queryValue(`select count(*)::text c from human_review_decisions where hr_code='${HR_CODE}'`)
  ),
  map_gate: String(
    (await queryValue(
      `select status_after from human_review_decisions where hr_code='SHR-06'`
    )) || ""
  ),
  published: Number(
    await queryValue(`select count(*)::text c from claims where status::text in ('verified','published')`)
  ),
  audit_relation_orphan: Number(
    await queryValue(
      `select count(*)::text c from evidence_gate_audit a
        where a.object_type='relation'
          and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
    )
  ),
};

if (before.map_gate !== "partial") {
  throw new Error(`SHR-06 的 HISTORICAL_MAP_READY 现状不是 partial（实为 ${before.map_gate}）—— 本 Task 不得改动该门槛，终止。`);
}

const flags = {
  // —— §0.2 冻结裁决，逐条机器可读 ——
  task: "TASK-0010",
  work_package: "WP-A",
  review_type: "human_visual_review",
  reviewer_role: "human/architect",
  decision: "PARTIAL_CONFIRM",

  source_page_identity: "CONFIRMED",
  map_series: "二里半方图",
  map_series_status: "CONFIRMED",
  grid_sheet: "第三排四號",
  grid_sheet_status: "CONFIRMED_BY_HUMAN_VISUAL_REVIEW",
  map_content_readability: "PARTIAL",

  unresolved_labels: ["金泽", "金澤", "蔡浜", "枪开河", "槍開河"],
  unresolved_label_status: "UNRESOLVED",

  historical_spatial_structure_present: "CONFIRMED",
  usable_as_historical_spatial_source: "YES",
  direct_jinze_historical_map: "NOT_YET",
  breakthrough_candidate: false,

  map_gate: {
    gate: "HISTORICAL_MAP_READY",
    value: "PARTIAL",
    unchanged: true,
    changed_by_this_decision: false,
    criterion: "map must depict Jinze itself or yield defensible Jinze spatial anchors",
  },

  // —— 边界与禁止项（§0.3 / §11）——
  ocr_promotion_blocked: true,
  ocr_role: "navigation_only",
  source_immutability: "source_records/evidence 未被本决策改写",
  supersedes: null,
  superseded_by_this: false,

  // —— 证据锚点（运行期解析，非硬编码）——
  evidence_refs: {
    page_p36_evidence_id: p36Ev.id,
    grid_group_evidence_id: gridEv.id,
    source_record_id: src1879.id,
    source_record_title: src1879.title,
  },
  reviewed_at_semantics: "TASK-0010 交接轮次（架构师冻结裁决下达时刻，GMT+8）",
};

const reviewNote = [
  "HR-MAP-01 = PARTIAL_CONFIRM。",
  "确认：来源与页面身份（1879 光绪《青浦县志》图说，p36）、图组（二里半方图）、",
  "网格号（第三排四號，人工视觉复核）、图上确有历史空间结构、可用作 Historical Spatial Source。",
  "未决：印刷标签「金泽／金澤」「蔡浜」「枪开河／槍開河」均 UNRESOLVED —— 不得由普通 OCR 结果升级为历史事实（§0.3）。",
  "因此『直接的金泽历史地图』仍为 NOT_YET，BREAKTHROUGH_CANDIDATE = NO，",
  "HISTORICAL_MAP_READY 保持 PARTIAL（判据：图须描绘金泽本身或提供可辩护的金泽空间锚）。",
  "本决策仅追加人审记录；不修改 TASK-0009 的任何历史报告或 CSV，也不改写 source/evidence 本身。",
].join("");

await run(
  `insert into human_review_decisions(
     hr_code, decision_code, decision_label, object_type, object_ref,
     review_note, reviewed_at, actor, status_after, machine_readable_flags, source_refs)
   values (:'hr', :'dc', :'dl', :'ot', :'oref', :'note', :'rat', :'actor', :'sa',
           :'flags'::jsonb, :'refs'::text[])
   on conflict (hr_code) do update set
     decision_code = excluded.decision_code,
     decision_label = excluded.decision_label,
     object_type = excluded.object_type,
     object_ref = excluded.object_ref,
     review_note = excluded.review_note,
     reviewed_at = excluded.reviewed_at,
     actor = excluded.actor,
     status_after = excluded.status_after,
     machine_readable_flags = excluded.machine_readable_flags,
     source_refs = excluded.source_refs`,
  {
    hr: HR_CODE,
    dc: "A",
    dl: "1879 光绪《青浦县志》二里半方图 p36 = PARTIAL_CONFIRM（页面/图组/网格号确认，三标签未决，map-gate 不变）",
    ot: "map_source",
    oref: `source:${src1879.id}#p36`,
    note: reviewNote,
    rat: REVIEWED_AT,
    actor: "user-confirmed",
    sa: "partial_confirm",
    flags: JSON.stringify(flags),
    refs: pgTextArray([
      "tasks/TASK-0010-jinze-historical-spatial-grounding-reconstruction-minimum-slice.md §0.2",
      `evidence:${p36Ev.id}（TASK-0009 p36 图版登记）`,
      `evidence:${gridEv.id}（二里半方图网格全组 p22-42）`,
      `source_record:${src1879.id}（1879 光绪《青浦县志》图说，上海图书馆藏）`,
      "TASK-0009 data/exports/jinze-map-breakthrough-candidates.md（无突破候选）",
      "TASK-0009 data/exports/jinze-historical-map-index-1597-1934.csv",
    ]),
  }
);

// ---- 人审后快照 + 断言 ----
const after = {
  hr_total: Number(await queryValue(`select count(*)::text c from human_review_decisions`)),
  hr_classic: Number(
    await queryValue(`select count(*)::text c from human_review_decisions where hr_code ~ '^HR-[1-6]$'`)
  ),
  shr_total: Number(
    await queryValue(`select count(*)::text c from human_review_decisions where hr_code like 'SHR-%'`)
  ),
  hr_map01: Number(
    await queryValue(`select count(*)::text c from human_review_decisions where hr_code='${HR_CODE}'`)
  ),
  map_gate: String(
    (await queryValue(`select status_after from human_review_decisions where hr_code='SHR-06'`)) || ""
  ),
  published: Number(
    await queryValue(`select count(*)::text c from claims where status::text in ('verified','published')`)
  ),
  audit_relation_orphan: Number(
    await queryValue(
      `select count(*)::text c from evidence_gate_audit a
        where a.object_type='relation'
          and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
    )
  ),
};

const checks = {
  hr_map01_exactly_one: after.hr_map01 === 1,
  no_collision_classic: after.hr_classic === before.hr_classic && after.hr_classic === 6,
  no_collision_shr: after.shr_total === before.shr_total && after.shr_total === 6,
  map_gate_unchanged: after.map_gate === "partial",
  published_still_zero: after.published === 0,
  audit_orphan_unchanged: after.audit_relation_orphan === before.audit_relation_orphan,
  no_other_row_added: after.hr_total === (before.hr_map01 ? before.hr_total : before.hr_total + 1),
};

const allOk = Object.values(checks).every(Boolean);
process.stdout.write(
  JSON.stringify(
    {
      hr_code: HR_CODE,
      object_ref: `source:${src1879.id}#p36`,
      created_or_updated: before.hr_map01 === 0 ? "created" : "updated",
      before,
      after,
      checks,
      ok: allOk,
    },
    null,
    2
  ) + "\n"
);
if (!allOk) process.exit(1);
