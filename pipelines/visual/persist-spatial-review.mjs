// pipelines/visual/persist-spatial-review.mjs — TASK-0008 WP-A
//
// 把总架构已冻结的 SHR-01…SHR-06 以可审计方式落库，并按决策【重算受影响对象的空间结果状态】。
//
// 设计要点（TASK-0008 §0 / WP-A / §9）：
//   - 复用既有 human_review_decisions 机制（hr_code 为键）。SHR-* 与 TASK-0005 的 HR-1…HR-6
//     是不同字符串，天然不冲突，故【无需】新建平行评审子系统；也不写 review_queue.review_tier。
//   - 落库位置：pipelines/visual/**（§9 allowed changes）。§9 未列出 pipelines/review/**，
//     故不改动 TASK-0005 的 persist-human-review.mjs（避免重放 HR-5 的视觉标记逻辑）。
//   - 「重算受影响状态」采用【叠加层】而非改写：region_json.precision_status 保留
//     TASK-0007 管线当时的自动判定原值，人工裁决写入 region_json.human_review。
//     理由：改写原值会销毁「机器当初怎么判、人后来怎么改」的审计链。
//   - 幂等：hr_code 唯一 + region_json || overlay（同内容重复叠加结果相同）。

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { run, runMany, queryRows } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0";
const ADJUDICATED_AT = "2026-09-22T06:45:00+08:00"; // 总架构冻结时刻（本 Task 输入）
const ACTOR = "user-confirmed";
const GEN = "mohen-spatial-review";

// ── 对象级重算表：把 SHR 决策映射到具体 spatial Evidence 行 ──────────────────
// placeHint 用于定位 Evidence（不硬编码 UUID，避免证据重生成后失联）。
const RECOMPUTE = [
  {
    placeHint: "颐浩寺遗址",
    shr_code: "SHR-01",
    decision_code: "A",
    effective_precision_status: "approximate_object_area",
    effective_precision_scope: "object_area_approx",
    accepted_label: "普济桥-颐浩禅寺",
    accepted_point: { lat: 31.035345, lng: 120.921872, location_raw: "120.921872,31.035345", coord_system: "GCJ-02" },
    accepted_provider_hit: { id: null, name: "普济桥-颐浩禅寺", address: "金泽镇迎祥街12号" },
    note:
      "SHR-01=A：仅接受『普济桥-颐浩禅寺』复合 POI 作为【近似对象范围】(approximate_object_area)。" +
      "它不是精确对象点，也不是历史位置证明；AMap 无独立『颐浩寺遗址』POI，故不得伪造精确点。",
    flags: {
      approximate_object_area: true,
      exact_object_point: false,
      historical_position_proof: false,
      composite_provider_name: "普济桥-颐浩禅寺",
    },
  },
  {
    placeHint: "如意桥",
    shr_code: "SHR-03",
    decision_code: "A",
    effective_precision_status: "official_or_provider_object_point",
    effective_precision_scope: "object_point_provider",
    accepted_label: "如意桥",
    accepted_point: { lat: 31.032329, lng: 120.920871, location_raw: "120.920871,31.032329", coord_system: "GCJ-02" },
    accepted_provider_hit: { id: null, name: "如意桥", address: "青浦区" },
    note:
      "SHR-03=A：接受 AMap 桥梁 POI『如意桥』为 provider 对象点；其 address 仅到『青浦区』、未含『金泽』，" +
      "故保留原自动判定 ambiguous 与审计注记。旁证：同址 20m 内的『冬冬的厨房(如意桥店)』地址为『上海市青浦区金泽村59号』，" +
      "支持该 POI 位于金泽。**不升级为 verified。**",
    flags: {
      preserved_auto_status: "ambiguous",
      accepted_by: "human_review",
      jinze_scoping_basis: "nearby_address_evidence",
      nearby_jinze_address_evidence: "冬冬的厨房(如意桥店) @ 上海市青浦区金泽村59号 (~20m)",
      upstreamed_to_verified: false,
    },
  },
  {
    placeHint: "天皇阁桥",
    shr_code: "SHR-04",
    decision_code: "A",
    effective_precision_status: "official_or_provider_object_point",
    effective_precision_scope: "object_point_provider",
    accepted_label: "天皇阁桥",
    accepted_point: { lat: 31.037887, lng: 120.919028, location_raw: "120.919028,31.037887", coord_system: "GCJ-02" },
    accepted_provider_hit: { id: null, name: "天皇阁桥", address: "青浦区" },
    note:
      "SHR-04=A：接受 AMap『天皇阁桥』为当前 provider 对象点；**历史/来源规范名仍为『天王阁桥』**" +
      "（S1 地名志原文作天王阁桥）。两种写法均不得覆盖对方。",
    flags: {
      // 机器可读的「名称异写关系」（不变量 11）；不写入 Knowledge Weave relations，
      // 因两形式指向【同一实体】，自反关系会污染关系层。
      name_variant_relation: {
        provider_name: "天皇阁桥",
        source_canonical_name: "天王阁桥",
        same_object: true,
        source_of_canonical: "S1 地名志原文（TASK-0006 已确认）",
        overwrite_either: false,
      },
      preserved_auto_status: "ambiguous",
      accepted_by: "human_review",
    },
  },
  {
    placeHint: "金泽放生桥",
    shr_code: "SHR-05",
    decision_code: "A",
    effective_precision_status: "official_or_provider_object_point",
    effective_precision_scope: "object_point_provider",
    accepted_label: "金泽放生桥",
    accepted_point: { lat: 31.033258, lng: 120.921131, location_raw: "120.921131,31.033258", coord_system: "GCJ-02" },
    accepted_provider_hit: { id: null, name: "金泽放生桥", address: "迎祥街33号金泽古镇内(南侧)" },
    note:
      "SHR-05=A：接受『金泽放生桥』当前 POI；并**显式排除**朱家角同名『放生桥』(121.056217,31.111395)，" +
      "该同名对象约 11km 外、属另一古镇，禁止映射到金泽。跨镇同名歧义作为**回归证据**保留。",
    flags: {
      preserved_auto_status: "ambiguous",
      accepted_by: "human_review",
      excluded_homonym: {
        name: "放生桥",
        town: "朱家角",
        location_raw: "121.056217,31.111395",
        reason: "同名异地，约 11km 外，禁止映射到金泽",
      },
      cross_town_ambiguity_kept_as_regression_evidence: true,
    },
  },
  {
    placeHint: "白苎里 → 金溪 → 金泽 · 地名叠影",
    shr_code: "SHR-02",
    decision_code: "C",
    effective_precision_status: "town_level_only",
    effective_precision_scope: "town_anchor_dual",
    accepted_label: "金泽镇（双锚点语义）",
    accepted_point: null,
    accepted_provider_hit: null,
    note:
      "SHR-02=C：保持**双镇锚点语义**，二者不得互相静默替换。" +
      "heritage_experience_anchor=金泽古镇(迎祥街33号, 120.921377,31.036942)；" +
      "administrative_anchor=金泽镇人民政府(金中路2号金泽大厦, 120.922179,31.036030)。" +
      "两者皆为镇级锚，**绝不冒充对象点**。",
    flags: {
      dual_town_anchor: true,
      heritage_experience_anchor: { label: "金泽古镇", location_raw: "120.921377,31.036942", address: "迎祥街33号" },
      administrative_anchor: { label: "金泽镇人民政府", location_raw: "120.922179,31.036030", address: "金中路2号金泽大厦" },
      silently_substitutable: false,
      town_level_only: true,
      preserved_auto_status: "ambiguous",
    },
  },
];

// ── SHR-06：不改对象状态，只冻结门槛口径 ────────────────────────────────────
const SHR06 = {
  hr_code: "SHR-06",
  decision_code: "A",
  decision_label: "保持 HISTORICAL_MAP_READY = PARTIAL：『金泽相关历史地图』要求图上绘有金泽或可提供可辩护的金泽空间锚，宏观区域语境不足",
  object_type: "gate",
  object_ref: "gate:HISTORICAL_MAP_READY",
  review_note:
    "SHR-06=A：冻结『金泽相关历史地图』的判据 —— 该图必须描绘金泽本身，或能提供可辩护的金泽空间锚；" +
    "仅有宏观区域语境不足以使该门槛转 YES。因此 1754 松江府境图的可用范围仍仅限 original_map_narrative。" +
    "本 Task 不修复该门槛，也不搜索新的历史地图语料库。",
  status_after: "partial",
  machine_readable_flags: {
    gate: "HISTORICAL_MAP_READY",
    value: "PARTIAL",
    criterion: "map must depict Jinze itself or yield defensible Jinze spatial anchors",
    macro_regional_context_sufficient: false,
    fix_in_this_task: false,
  },
  source_refs: ["TASK-0007 WP-E", "TASK-0007 jinze-spatial-human-review.csv HR-06", "TASK-0008 §0 SHR-06"],
};

const LABEL = {  "SHR-01": "接受 普济桥-颐浩禅寺 仅作 颐浩寺遗址 的 approximate_object_area（非精确点、非历史位置证明）",
  "SHR-02": "保持双镇锚点语义：heritage_experience_anchor=金泽古镇 / administrative_anchor=金泽镇人民政府，不得静默替换",
  "SHR-03": "接受 如意桥 AMap 桥梁 POI 为 official_or_provider_object_point，保留原歧义注记与邻近金泽地址旁证，不升级为 verified",
  "SHR-04": "接受 AMap 天皇阁桥 为当前 provider 对象点；历史/来源规范名仍为 天王阁桥，保留机器可读名称异写关系，不覆盖任一形式",
  "SHR-05": "接受 金泽放生桥 当前 POI，并显式排除朱家角同名放生桥；跨镇歧义作为回归证据保留",
  "SHR-06": "保持 HISTORICAL_MAP_READY = PARTIAL；『金泽相关』要求图上绘有金泽或可提供可辩护的金泽空间锚",
};

const SHR_ROWS = [  ...RECOMPUTE.map((r) => ({
    hr_code: r.shr_code,
    decision_code: r.decision_code,
    decision_label: LABEL[r.shr_code],
    object_type: "evidence_spatial",
    object_ref: `place_hint:${r.placeHint}`,
    review_note: r.note,
    status_after: r.effective_precision_status,
    machine_readable_flags: {
      place_hint: r.placeHint,
      automated_precision_status: "ambiguous",
      effective_precision_status: r.effective_precision_status,
      ...r.flags,
    },
    source_refs: ["TASK-0007 jinze-spatial-human-review.csv", "TASK-0008 §0"],
  })),
  SHR06,
];

/**
 * psql --csv 把 `text[]` 列回读成 Postgres 数组字面量字符串（如 `{}` / `{天王阁桥}`），
 * 不是 JS 数组。这里做最小解析：剥外层花括号 + 处理带引号元素。
 * 不引入额外依赖；本脚本用到的数组元素均为简单标识（无逗号、无转义）。
 */
function pgTextArray(v) {
  if (Array.isArray(v)) return v;
  const s = String(v ?? "").trim();
  if (s === "" || s === "{}") return [];
  if (!s.startsWith("{") || !s.endsWith("}")) return [s];
  return s
    .slice(1, -1)
    .split(",")
    .map((x) => x.trim().replace(/^"(.*)"$/, "$1"))
    .filter((x) => x !== "");
}

async function main() {
  // ── 1) 落库 6 条 SHR 决策（幂等：hr_code 唯一，on conflict do update）──
  const stmts = SHR_ROWS.map((h) => ({
    sql: `insert into human_review_decisions
            (hr_code, decision_code, decision_label, object_type, object_ref,
             review_note, reviewed_at, actor, status_after, machine_readable_flags, source_refs)
          values (:'hr_code',:'decision_code',:'decision_label',:'object_type',:'object_ref',
                  :'review_note',:'reviewed_at',:'actor',:'status_after',:'flags'::jsonb,:'src'::text[])
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
    params: {
      hr_code: h.hr_code,
      decision_code: h.decision_code,
      decision_label: h.decision_label,
      object_type: h.object_type,
      object_ref: h.object_ref,
      review_note: h.review_note,
      reviewed_at: ADJUDICATED_AT,
      actor: ACTOR,
      status_after: h.status_after,
      flags: JSON.stringify(h.machine_readable_flags),
      src: `{${h.source_refs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")}}`,
    },
  }));
  await runMany(stmts);

  // ── 2) 重算受影响对象状态（叠加层，保留原自动判定）──
  const recomputed = [];
  for (const r of RECOMPUTE) {
    const rows = await queryRows(
      `select evidence_id::text id, region_json::text rj
         from evidence where extraction_method like 'spatial_anchor%' and place_hint=:'ph'`,
      { ph: r.placeHint }
    );
    if (rows.length !== 1) {
      throw new Error(`重算定位失败：place_hint='${r.placeHint}' 命中 ${rows.length} 行（期望恰 1 行）`);
    }
    const evId = rows[0].id;
    const before = JSON.parse(rows[0].rj);
    const overlay = {
      human_review: {
        shr_code: r.shr_code,
        decision_code: r.decision_code,
        automated_precision_status: before.precision_status,
        automated_precision_scope: before.precision_scope,
        effective_precision_status: r.effective_precision_status,
        effective_precision_scope: r.effective_precision_scope,
        accepted_label: r.accepted_label,
        accepted_point: r.accepted_point,
        accepted_provider_hit: r.accepted_provider_hit,
        basis: "human_review",
        adjudicated_at: ADJUDICATED_AT,
        actor: ACTOR,
        note: r.note,
        flags: r.flags,
      },
    };
    await run(
      `update evidence set region_json = coalesce(region_json,'{}'::jsonb) || :'ov'::jsonb
        where evidence_id = :'id'::uuid`,
      { ov: JSON.stringify(overlay), id: evId }
    );
    recomputed.push({
      shr_code: r.shr_code,
      place_hint: r.placeHint,
      evidence_id: evId,
      automated: before.precision_status,
      effective: r.effective_precision_status,
      object_ref: `place_hint:${r.placeHint}`,
    });
  }

  // ── 2.5) SHR-04：把「天王阁桥 / 天皇阁桥」名称异写落成机器可读记录 ──
  //  §0 SHR-04 原文：「Preserve a machine-readable name-variant relation; do not overwrite either form.」
  //  现状（本 Task 开工体检）：异写仅存在于
  //    (a) claims.object_value.legacy_name_variant（TASK-0006 编织层，形如 {"天王阁桥":"天皇阁桥"}）
  //    (b) entity.description 的散文注记
  //  二者皆非「可直接按实体查询的名称异写关系」。补法取**最小、非破坏**：
  //    ① 不改 canonical_name（两个写法都不覆盖）——实体名保持 Legacy 的「天皇阁桥」；
  //    ② 把 S1/历史来源写法「天王阁桥」写进 entities.aliases（既有 text[] 列，原本全库为空）；
  //    ③ 回读确认 legacy_name_variant 仍在 —— 不改写 TASK-0006 产物，只做存在性校验。
  //  幂等：aliases 用「并集去重」写法，重跑不产生重复项。
  const NAMEVARIANT_SHR = "SHR-04";
  const NAMEVARIANT_ENTITY_LEGACY = "hushang-jingwei:entity:JZ-BLD-007";
  const NAMEVARIANT_ALIAS = "天王阁桥"; // S1 地名志原字
  const nvBefore = await queryRows(
    `select canonical_name, aliases from entities where legacy_id = :'lid'`,
    { lid: NAMEVARIANT_ENTITY_LEGACY }
  );
  if (nvBefore.length !== 1) {
    throw new Error(`SHR-04 名称异写定位失败：legacy_id='${NAMEVARIANT_ENTITY_LEGACY}' 命中 ${nvBefore.length} 行`);
  }
  const canonicalBefore = nvBefore[0].canonical_name;
  await run(
    `update entities
        set aliases = (select array(select distinct unnest(coalesce(aliases,'{}'::text[]) || :'alias'::text[])))
      where legacy_id = :'lid'`,
    { alias: `{${NAMEVARIANT_ALIAS}}`, lid: NAMEVARIANT_ENTITY_LEGACY }
  );
  const nvAfter = await queryRows(
    `select canonical_name, aliases from entities where legacy_id = :'lid'`,
    { lid: NAMEVARIANT_ENTITY_LEGACY }
  );
  if (nvAfter[0].canonical_name !== canonicalBefore) {
    throw new Error("SHR-04 违约：canonical_name 被改写（两个写法都不许覆盖）");
  }
  if (!pgTextArray(nvAfter[0].aliases).includes(NAMEVARIANT_ALIAS)) {
    throw new Error("SHR-04 违约：名称异写未落库");
  }
  // 存在性校验：TASK-0006 的 legacy_name_variant 机器可读映射仍在（本 Task 不改写它）
  const lnv = await queryRows(
    `select count(*)::int n from claims where object_value->'legacy_name_variant' ? :'alias'`,
    { alias: NAMEVARIANT_ALIAS }
  );
  if (Number(lnv[0].n) < 1) {
    throw new Error("SHR-04 违约：claims 层的 legacy_name_variant 映射缺失（TASK-0006 产物应仍在）");
  }
  const nameVariant = {
    shr_code: NAMEVARIANT_SHR,
    entity_legacy_id: NAMEVARIANT_ENTITY_LEGACY,
    // 语义方向必须写死，避免下游把「异写」误当「主名」
    canonical_name_kept: canonicalBefore, // Legacy/上图名录写法
    source_name_variant_added: NAMEVARIANT_ALIAS, // S1 地名志写法
    aliases_before: pgTextArray(nvBefore[0].aliases),
    aliases_after: pgTextArray(nvAfter[0].aliases),
    legacy_name_variant_claim_rows: Number(lnv[0].n),
    overwritten: false,
  };

  // ── 3) 回读校验 ──
  const rows = await queryRows(
    `select hr_code, decision_code, object_type, object_ref, status_after, actor, reviewed_at::text ra,
            machine_readable_flags::text flags
       from human_review_decisions where hr_code like 'SHR-%' order by hr_code`
  );
  if (rows.length !== 6) throw new Error(`SHR 行数 ${rows.length} != 6`);

  const shr6 = await queryRows(
    `select count(*)::int n from human_review_decisions where hr_code like 'HR-%'`
  );

  // ── 4) 生成交付物 ──
  const md = buildLog(rows, recomputed, Number(shr6[0].n), nameVariant);
  const outPath = path.join(PROJECT_ROOT, "data", "exports", "jinze-spatial-review-decision-log.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf8");

  console.log(
    JSON.stringify({
      shr_rows: rows.length,
      shr_codes: rows.map((r) => r.hr_code).join(","),
      task0005_hr_rows_untouched: Number(shr6[0].n),
      recomputed,
      name_variant: nameVariant,
      decision_log_written: outPath,
    })
  );
}

function buildLog(rows, recomputed, task0005Rows, nameVariant) {
  const L = [];
  L.push("# 金泽样板 · 空间人审决策落库日志（TASK-0008 / WP-A）");
  L.push("");
  L.push("> 状态：**已落库**（`human_review_decisions`，SHR-01…SHR-06 共 6 条，`hr_code` 唯一、幂等可重跑）");
  L.push("> 冻结依据：TASK-0008 §0 总架构已冻结 SHR-01=A / SHR-02=C / SHR-03=A / SHR-04=A / SHR-05=A / SHR-06=A。");
  L.push("> 裁决时刻：" + ADJUDICATED_AT + " · actor=" + ACTOR + "。");
  L.push("> 落库位置：`pipelines/visual/persist-spatial-review.mjs`（§9 allowed changes；§9 未列 `pipelines/review/**`）。");
  L.push("");
  L.push("## 0. 与 TASK-0005 的 HR-1…HR-6 的关系（防混淆）");
  L.push("");
  L.push("- `SHR-*` 是**总架构的空间编辑决策**，与 TASK-0005 的 `HR-1…HR-6`（数据/叙事人审）**不同义**。");
  L.push("- 二者共存于同一机制（`human_review_decisions`），但 `hr_code` 前缀不同 → **无冲突，无需新建平行评审子系统**。");
  L.push("- 本脚本**不改动** TASK-0005 的 `pipelines/review/persist-human-review.mjs`，" +
    "也不重放其 HR-5 视觉标记逻辑；TASK-0005 的 HR 行数保持 **" + task0005Rows + "** 条未变。");
  L.push("");
  L.push("## 1. 六项决策明细");
  L.push("");
  for (const r of rows) {
    L.push(`### ${r.hr_code} = ${r.decision_code} —— ${r.object_type}:${r.object_ref}`);
    L.push("");
    L.push("- **决策含义**：" + LABEL[r.hr_code]);
    L.push("- **落库状态(status_after)**：`" + r.status_after + "`");
    L.push("- **reviewed_at**：" + r.ra + " · **actor**：" + r.actor);
    L.push("- **machine_readable_flags**：`" + r.flags + "`");
    L.push("");
  }
  L.push("## 2. 受影响空间对象的重算（叠加层，不销毁原判定）");
  L.push("");
  L.push("TASK-0007 管线当年的**自动判定原值保留在 `region_json.precision_status`**；");
  L.push("人工裁决写入 `region_json.human_review.effective_precision_status`。");
  L.push("**理由**：改写原值会销毁「机器当初怎么判 / 人后来怎么改」的审计链。");
  L.push("");
  L.push("| SHR | 对象 | evidence_id | 自动判定 | 人工生效状态 |");
  L.push("|---|---|---|---|---|");
  for (const r of recomputed) {
    L.push(`| ${r.shr_code} | ${r.place_hint} | ${r.evidence_id} | \`${r.automated}\` | **\`${r.effective}\`** |`);
  }
  L.push("");
  L.push("### 2.1 状态语义（本 Task 冻结）");
  L.push("");
  L.push("- `official_or_provider_object_point`：provider/official 提供的**当前**对象点（非历史位置）。");
  L.push("- `approximate_object_area`：**近似范围**，不是精确对象点，也不是历史位置证明。");
  L.push("- `town_level_only`：**镇级锚点**，绝不冒充对象点。");
  L.push("- 任何一格都**不得**被升级为 `verified_object_point` —— 本 Task 未引入任何权威实测对象坐标。");
  L.push("");
  L.push("## 3. 审计校验（DB 回读）");
  L.push("");
  L.push("| hr_code | decision_code | object_type | object_ref | status_after | actor |");
  L.push("|---|---|---|---|---|---|");
  for (const r of rows) {
    L.push(`| ${r.hr_code} | ${r.decision_code} | ${r.object_type} | \`${r.object_ref}\` | ${r.status_after} | ${r.actor} |`);
  }
  L.push("");
  L.push("## 4. 名称异写落库（SHR-04 专项）");
  L.push("");
  L.push("§0 SHR-04 原文：*Preserve a machine-readable name-variant relation; do not overwrite either form.*");
  L.push("");
  L.push("本 Task 开工体检发现：异写此前**只**存在于两处，均非「可按实体查询的名称异写关系」——");
  L.push("① `claims.object_value.legacy_name_variant`（TASK-0006 编织层，`{\"天王阁桥\":\"天皇阁桥\"}`）；");
  L.push("② `entities.description` 的散文注记（「另有…异写流行于部分资料」）。");
  L.push("");
  L.push("补法取**最小、非破坏**（`entities.aliases` 为既有 `text[]` 列，本 Task 前全库为空）：");
  L.push("");
  L.push("| 项 | 值 |");
  L.push("|---|---|");
  L.push(`| 实体 | \`${nameVariant.entity_legacy_id}\` |`);
  L.push(`| \`canonical_name\`（未改动，回读校验一致） | **${nameVariant.canonical_name_kept}** ← Legacy / 上图名录写法 |`);
  L.push(`| \`aliases\` 新增（S1 地名志原字） | **${nameVariant.source_name_variant_added}** |`);
  L.push(`| \`aliases\` 回读（本次落库后） | \`[${nameVariant.aliases_after.join(", ")}]\` |`);
  L.push(`| \`legacy_name_variant\` 仍在（存在性校验） | ${nameVariant.legacy_name_variant_claim_rows} 行 |`);
  L.push(`| 任一写法被覆盖？ | **${nameVariant.overwritten ? "是" : "否"}** |`);
  L.push("");
  L.push("> 两个写法都保留：实体主名仍是 Legacy 的「天皇阁桥」（不覆盖），S1 原字「天王阁桥」以别名形式机器可读。");
  L.push("> `entities.aliases` 在本 Task 之前**全库为空**（`text[]` 默认 `{}`，含本实体）；本次写入后回读如上。");
  L.push("> 命名方向写死在记录里，防止下游把「异写」误当「主名」；本 Task **未改写** TASK-0006 的 `legacy_name_variant`。");
  L.push("> 幂等：aliases 采用「并集去重」写法，重跑不产生重复项。");
  L.push("");
  L.push("### 4.1 跨镇同名排除（SHR-05 回归证据）");
  L.push("");
  L.push("SHR-05 要求显式排除**朱家角**同名放生桥，并把跨镇歧义留作回归证据。该证据在 Task 之前即已存在，本 Task **只读校验、不新建**：");
  L.push("");
  L.push("| 证据 | 内容 |");
  L.push("|---|---|");
  L.push("| `evidence.extraction_method='legacy_entity_source'`，subject=`金泽放生桥` | 「单孔石拱桥 · **与朱家角放生桥同名异地**」 |");
  L.push("| `evidence.extraction_method='spatial_anchor:amap_place_text_v3'`，place_hint=`金泽放生桥` | AMap `[放生桥]` 候选 9、完全同名 1、**金泽内 0** → 判 `ambiguous`，不冒充对象点 |");
  L.push("");
  L.push("即：**金泽放生桥**当前身份由 SHR-05 接受为 provider 对象点，而**朱家角放生桥从未**被映射进金泽；歧义本身按 §7 不变量 10 保留为回归证据。");
  L.push("");
  L.push("## 6. 已知顺序依赖（本 Task 发现，勿静默踩坑）");
  L.push("");
  L.push("本节的叠加层**不是**自持的：它住在 `evidence.region_json.human_review` 里，");
  L.push("而该行 `region_json` 的**权威写入方**是 TASK-0007 的 `pipelines/ingest/retrieve-amap-jinze.mjs`。");
  L.push("那条管线在建证据时写的是：");
  L.push("");
  L.push("```sql");
  L.push("insert into evidence(... region_json ...) values (...)");
  L.push("on conflict (evidence_id) do update set ... region_json = excluded.region_json ...");
  L.push("```");
  L.push("");
  L.push("即 **整体覆盖**，不是合并。因此：");
  L.push("");
  L.push("| 事件 | 后果 |");
  L.push("|---|---|");
  L.push("| 重跑 `retrieve-amap-jinze.mjs`（含 `--from-raw` 离线重放） | `human_review` 叠加层被**整块抹掉**，4 个对象退回自动判定（`ambiguous`），`effective=0` 一类的连锁后果随之出现 |");
  L.push("| `tests/data/spatial-grounding.test.ts` | 会在用例内重跑该管线 → **跑一次测试就会抹一次** |");
  L.push("");
  L.push("**故固定执行顺序为**：`retrieve-amap-jinze` →（任何重跑之后）→ `pipelines/visual/persist-spatial-review.mjs`。");
  L.push("");
  L.push("> 本 Task **未**修改 `pipelines/ingest/retrieve-amap-jinze.mjs`（§9 未授权该路径）。");
  L.push("> 若要让叠加层自持，正确做法是让该管线的 `on conflict` 改为**键级合并**");
  L.push("> （`region_json = evidence.region_json || excluded.region_json`）而非整体覆盖——**需另立任务**。");
  L.push("");
  L.push("自检：`node pipelines/visual/check-shr-overlay.mjs`（叠加层缺失即报错退出）。");
  L.push("");
  L.push("## 7. 未做（本 Task 明确不做）");
  L.push("");
  L.push("- 不修复 `HISTORICAL_MAP_READY`（SHR-06 冻结其口径，仍为 PARTIAL）。");
  L.push("- 不搜索新的历史地图语料库。");
  L.push("- 不改写 TASK-0007 的历史报告文件。");
  L.push("- 不写任何 `verified` 历史事实；不修改 Legacy。");
  return L.join("\n");
}

main().catch((e) => {
  console.error("PERSIST SPATIAL REVIEW FAILED:", e.message);
  process.exit(1);
});
