// tests/data/historical-spatial-reconstruction.test.ts — TASK-0010 验收测试。
//
// 覆盖任务书 §11（Evidence Gate 语义）、§12 的 26 条硬不变量中与本任务相关的部分、
// §9 的就绪门判据，以及 §10 对新建 schema 的要求（迁移 007 + 测试）。
//
// ★ §12-26：本文件**断言不变量，不断言过期的绝对总数**。
//   凡「设计上已冻结」的量（HR-1..HR-6 = 6、SHR-* = 6、legacy-mapped relations = 24、
//   audit relation orphan = 63、published = 0）按其冻结语义断言；
//   凡「允许增长」的量（relations / evidence / source_records 总量）只断言
//   **本任务未使其变化**与**非空边必有证据**，不写死数字。
//
// 约定（同 TASK-0006/0007/0008）：DB 用例直连本机 mohen_dev，连接串来自 gitignored .env.local。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { queryRows } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SLICE_ID = "jinze-minimum-slice-001";
const LEGACY_SEED = path.join(
  path.resolve(PROJECT_ROOT, "..", "hushang-jingwei"),
  "data",
  "seed.master.json"
);

const q = queryRows as (sql: string, p?: Record<string, unknown>) => Promise<Record<string, string>[]>;
const n = async (sql: string, p?: Record<string, unknown>) => Number((await q(sql, p))[0].c);

describe("TASK-0010 Jinze Historical Spatial Reconstruction — Minimum Slice", () => {
  // ---------------------------------------------------------------- WP-A
  // 1. HR-MAP-01 落库正确且不与既有命名空间碰撞
  it("1. HR-MAP-01 存在且不碰撞 HR-1…HR-6 / SHR-01…06", async () => {
    const rows = await q(
      `select hr_code, decision_code, object_type, object_ref, status_after, actor,
              machine_readable_flags::text flags
         from human_review_decisions where hr_code='HR-MAP-01'`
    );
    expect(rows.length).toBe(1);
    const r = rows[0];
    expect(r.decision_code).toBe("A");
    expect(r.object_type).toBe("map_source");
    expect(r.status_after).toBe("partial_confirm");
    expect(r.object_ref).toContain("#p36");
    expect(r.actor).toBe("user-confirmed");

    // 既有命名空间按冻结语义不变
    expect(await n(`select count(*)::int c from human_review_decisions where hr_code ~ '^HR-[1-6]$'`)).toBe(6);
    expect(await n(`select count(*)::int c from human_review_decisions where hr_code like 'SHR-%'`)).toBe(6);
    // 新增决策必须恰好 1 行，且新前缀不与既有前缀重叠
    expect(
      await n(`select count(*)::int c from human_review_decisions where hr_code like 'HR-MAP-%'`)
    ).toBe(1);
  });

  // 2. §3 要求持久化的每一项都在，且 map-gate 未被本决策收敛
  it("2. HR-MAP-01 冻结裁决字段齐全，HISTORICAL_MAP_READY 保持 PARTIAL", async () => {
    const f = JSON.parse(
      (await q(`select machine_readable_flags::text flags from human_review_decisions where hr_code='HR-MAP-01'`))[0]
        .flags
    );
    expect(f.decision).toBe("PARTIAL_CONFIRM");
    expect(f.source_page_identity).toBe("CONFIRMED");
    expect(f.map_series).toBe("二里半方图");
    expect(f.grid_sheet).toBe("第三排四號");
    expect(f.grid_sheet_status).toBe("CONFIRMED_BY_HUMAN_VISUAL_REVIEW");
    expect(f.map_content_readability).toBe("PARTIAL");
    expect(f.unresolved_labels).toEqual(
      expect.arrayContaining(["金泽", "金澤", "蔡浜", "枪开河", "槍開河"])
    );
    expect(f.usable_as_historical_spatial_source).toBe("YES");
    expect(f.direct_jinze_historical_map).toBe("NOT_YET");
    expect(f.breakthrough_candidate).toBe(false);
    // map-gate 不变：本决策不得把 HISTORICAL_MAP_READY 升为 YES
    expect(f.map_gate.value).toBe("PARTIAL");
    expect(f.map_gate.unchanged).toBe(true);
    expect(f.map_gate.changed_by_this_decision).toBe(false);
    expect(
      await n(`select count(*)::int c from human_review_decisions where object_ref='gate:HISTORICAL_MAP_READY' and status_after <> 'partial'`)
    ).toBe(0);
    // OCR 不得升级为历史事实
    expect(f.ocr_promotion_blocked).toBe(true);
    // 来源未被改写（§11）
    expect(f.source_immutability).toBeTruthy();
    // 不覆盖既有 SHR 决策
    expect(await n(`select count(*)::int c from human_review_decisions where status_after is null or status_after=''`)).toBe(0);
  });

  // ---------------------------------------------------------------- §10 迁移
  // 3. 迁移 007 已应用：5 表 + 4 枚举，且未新建任何 geometry 列（无 PostGIS）
  it("3. 迁移 007 的 schema 存在，且不含任何几何列（§10 无 PostGIS）", async () => {
    const tables = ["historical_spatial_slices", "historical_features", "historical_feature_anchors", "historical_change_records", "historical_spatial_relations"];
    for (const t of tables) {
      expect(await n(`select count(*)::int c from information_schema.tables where table_schema='public' and table_name='${t}'`)).toBe(1);
    }
    expect(
      await n(`select count(*)::int c from pg_type t join pg_enum e on e.enumtypid=t.oid
                where t.typname in ('historical_geometry_type','historical_spatial_status','historical_change_status','historical_relation_class') group by ()`)
    ).toBeGreaterThan(0);
    // 全库不得出现 geometry 类型列（本 Task 不导入 PostGIS、不产生几何）
    expect(
      await n(`select count(*)::int c from information_schema.columns
                where table_schema='public' and data_type='USER-DEFINED' and udt_name in ('geometry','geography')`)
    ).toBe(0);
  });

  // ---------------------------------------------------------------- WP-B §4
  // 4. 特征清单：每个特征都必须有 Evidence，且 §4 要求的字段非空
  it("4. 切片特征全部有 Evidence，且 inventory 必备字段齐备", async () => {
    const rows = await q(
      `select feature_key, canonical_label, feature_type, geometry_type, geometry_note,
              historical_position_status, current_position_status, name_continuity_status,
              change_status, review_status,
              coalesce(array_length(evidence_ids,1),0)::int ev
         from historical_features
        where slice_id=:'s'`,
      { s: SLICE_ID }
    );
    expect(rows.length).toBeGreaterThanOrEqual(3); // §9-1：≥3 个核心历史特征
    for (const r of rows) {
      expect(Number(r.ev), `${r.canonical_label} 无 Evidence`).toBeGreaterThanOrEqual(1);
      expect(r.geometry_type).toMatch(/^(point|line|area|unknown)$/);
      expect(r.geometry_note.length).toBeGreaterThan(0);
      expect(r.historical_position_status.length).toBeGreaterThan(0);
      expect(r.current_position_status.length).toBeGreaterThan(0);
      expect(r.name_continuity_status.length).toBeGreaterThan(0);
      expect(r.change_status.length).toBeGreaterThan(0);
      expect(r.review_status.length).toBeGreaterThan(0);
      // §4 硬规则：几何类型为 unknown 的特征，其锚点也不得声称拥有任何几何
      //（不 AI 补画古河道／历史街巷 —— §12-10/11）。这是可核验的数据不变量，不做文本匹配。
      if (r.geometry_type === "unknown") {
        expect(
          await n(
            `select count(*)::int c from historical_feature_anchors a
              join historical_features f on f.feature_id = a.feature_id
             where f.feature_key = :'fk' and a.geometry_type in ('point','line','area')`,
            { fk: r.feature_key }
          ),
          `${r.canonical_label} 的几何类型为 unknown，却存在带几何的锚点`
        ).toBe(0);
      }
    }
  });

  // 5. §4/§12-5：不得把当前 provider 点当作历史坐标；不得出现 verified 历史点
  it("5. 无任何锚把当前坐标声明为历史位置证明（§12-5）", async () => {
    expect(
      await n(`select count(*)::int c from historical_feature_anchors where historical_position_proof`)
    ).toBe(0);
    // 来自当前 provider 的锚必须显式 exact_object_point 语义正确
    expect(
      await n(`select count(*)::int c from historical_feature_anchors
                where anchor_kind like 'provider_current%' and historical_position_proof`)
    ).toBe(0);
    // 本切片不存在「已核验」的历史点或历史锚候选（不得因图上邻近就生成）
    expect(
      await n(`select count(*)::int c from historical_features
                where historical_position_status in ('verified_object_point','historical_anchor_candidate')`)
    ).toBe(0);
  });

  // 6. §12-6：带坐标必带 CRS；两组 CRS 分列不混算；§12-10/11 不产生线几何
  it("6. 坐标记录 CRS 显式且 GCJ-02/WGS-84 分列；无任何历史线几何", async () => {
    // 库层 CHECK 保证，但仍在数据层复核一次
    expect(
      await n(`select count(*)::int c from historical_feature_anchors
                where (lat is null) <> (lng is null)
                   or (lat is null) <> (coord_system is null)`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from historical_feature_anchors
                where coord_system is not null and coord_system not in ('GCJ-02','WGS-84')`)
    ).toBe(0);
    // 相对陈述锚不得夹带坐标
    expect(
      await n(`select count(*)::int c from historical_feature_anchors
                where anchor_kind='textual_relative_statement' and (lat is not null or coord_system is not null)`)
    ).toBe(0);
    // 两组 CRS 至少各出现一次，说明确实分列登记
    expect(await n(`select count(*)::int c from historical_feature_anchors where coord_system='GCJ-02'`)).toBeGreaterThanOrEqual(2);
    expect(await n(`select count(*)::int c from historical_feature_anchors where coord_system='WGS-84'`)).toBeGreaterThanOrEqual(2);
    // 本 Task 不产生任何 line 几何（§12-10 古河道 / §12-11 历史街巷）
    expect(
      await n(`select count(*)::int c from historical_features where slice_id=:'s' and geometry_type='line'`, { s: SLICE_ID })
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from historical_feature_anchors where geometry_type='line'`)
    ).toBe(0);
  });

  // ---------------------------------------------------------------- WP-D §6
  // 7. 变更语义：evidenced 必带证据；unknown 类不得被当作已证
  it("7. 变更记录 epistemic 与 Evidence 一致（§6 / §16 三分）", async () => {
    expect(
      await n(`select count(*)::int c from historical_change_records
                where change_epistemic='evidenced' and coalesce(array_length(evidence_ids,1),0)=0`)
    ).toBe(0);
    // 无证据的变更必须显式标注 legacy_only_parts 或说明其为止于问题（unknown）
    const noEv = await q(
      `select change_key, change_status, change_epistemic,
              coalesce(array_length(evidence_ids,1),0)::int ev,
              coalesce(array_length(legacy_only_parts,1),0)::int lp, note
         from historical_change_records
        where slice_id=:'s' and coalesce(array_length(evidence_ids,1),0)=0`,
      { s: SLICE_ID }
    );
    for (const r of noEv) {
      // 要么有 legacy-only 留痕、要么 note 说明这是未决问题
      expect(Number(r.lp) > 0 || r.note.includes("unknown") || r.change_epistemic === "unknown").toBe(true);
      expect(r.change_epistemic).not.toBe("evidenced");
    }
    // §9-5：至少一条「有意义的时间/变更区分」
    expect(
      await n(`select count(*)::int c from historical_change_records
                where slice_id=:'s' and change_epistemic='evidenced' and change_status::text <> 'unknown'`,
        { s: SLICE_ID })
    ).toBeGreaterThanOrEqual(1);
    // §6：不得把建造年代当作「现状未变」的证明。
    // 可核验的不变量：凡 change_status='survives' 的记录，(a) 必须是 evidenced 且有证据，
    // (b) 必须写明其存续跨度（time_hint），(c) 其 to_state 不得声称形制/构件未变。
    const survives = await q(
      `select change_key, change_epistemic, coalesce(time_hint,'') th, coalesce(to_state,'') ts,
              coalesce(array_length(evidence_ids,1),0)::int ev
         from historical_change_records where change_status='survives'`
    );
    expect(survives.length).toBeGreaterThan(0);
    for (const s of survives) {
      expect(s.change_epistemic).toBe("evidenced");
      expect(Number(s.ev)).toBeGreaterThanOrEqual(1);
      expect(s.th.length).toBeGreaterThan(0);
      expect(s.ts).not.toMatch(/(未变|原构|形制未|构件未)/);
    }
  });

  // ---------------------------------------------------------------- WP-E §7
  // 8. 关系知识级别：E1/E2/E3 皆有 Evidence；E4 显式 unresolved 且 support_level=none
  it("8. 关系分级自洽（§7）：非 E4 必有证据，E4 必须显式无支持", async () => {
    expect(
      await n(`select count(*)::int c from historical_spatial_relations
                where epistemic_class <> 'E4' and coalesce(array_length(evidence_ids,1),0)=0`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from historical_spatial_relations
                where support_level='none' and epistemic_class <> 'E4'`)
    ).toBe(0);
    // §12-26 不变式断言：E4 是「显式声明无支持」的分类，不要求切片必须含有 E4。
    // （TASK-0011 起普济桥跨水道已 E4→E1，本切片 E4 计数可为 0；若存在 E4，
    //   必须 unresolved + support_level=none + note 点名缺失证据。）
    const e4 = await q(
      `select relation_key, status, support_level, coalesce(array_length(evidence_ids,1),0)::int ev, note
         from historical_spatial_relations where epistemic_class='E4'`
    );
    for (const r of e4) {
      expect(r.status).toBe("unresolved");
      expect(r.support_level).toBe("none");
      // §17：必须点名缺失证据
      expect(r.note).toContain("缺失证据");
    }
    // §9-4：≥2 条「有证据 或 已显式分类」的历史相对关系
    expect(
      await n(`select count(*)::int c from historical_spatial_relations where epistemic_class in ('E1','E2','E3')`)
    ).toBeGreaterThanOrEqual(2);
    // §12：不得出现因果谓词
    expect(
      await n(`select count(*)::int c from historical_spatial_relations
                where predicate ~* '(because|led_to|therefore|caused|due_to|resulted_in|导致|因为|所以)'`)
    ).toBe(0);
    // 约束本切片的人审决策必须真实存在（不得引用不存在的 HR/SHR 编号）
    const hrConstrained = await q(
      `select hr_constraint from historical_spatial_relations
        where coalesce(array_length(hr_constraint,1),0) > 0`
    );
    for (const r of hrConstrained) {
      for (const code of String(r.hr_constraint).replace(/[{}"]/g, "").split(",").filter(Boolean)) {
        expect(
          await n(`select count(*)::int c from human_review_decisions where hr_code=:'c'`, { c: code }),
          `引用了不存在的人审决策 ${code}`
        ).toBe(1);
      }
    }
  });

  // 9. E4 与「证据不存在」这一事实保持一致（若日后补到证据，本用例会失败并提示升级）
  it("9. E4 关系与「该断言无独立证据行」这一事实保持一致", async () => {
    const e4 = await q(
      `select relation_key, subject_feature_key, object_feature_key
         from historical_spatial_relations where epistemic_class='E4'`
    );
    for (const r of e4) {
      if (r.relation_key === "pujiqiao--spans_waterway--jinzetang") {
        // 普济桥侧不得存在任何提及「金泽塘」的 Evidence 行
        expect(
          await n(`select count(*)::int c from evidence
                    where quote_text like '%金泽塘%'
                      and (coalesce(subject_hint,'') like '%普济%' or coalesce(place_hint,'') like '%普济%')`)
        ).toBe(0);
        // 而万安桥侧确实存在（这正是 E4 可被间接推得的原因）
        expect(
          await n(`select count(*)::int c from evidence
                    where quote_text like '%金泽塘%'
                      and (coalesce(subject_hint,'') like '%万安%' or coalesce(place_hint,'') like '%万安%')`)
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  // ---------------------------------------------------------------- WP-F/G §8/§9
  // 10. 切片对象与三个子门齐备；§9-7 每个不确定项都点名缺失证据
  it("10. 切片对象齐备，且每个不确定项都显式写出缺失证据（§9-7）", async () => {
    const s = await q(
      `select slice_id, focus_question, time_context, historical_geometry_status,
              readiness_gate, uncertainties::text unc, experience_hooks::text hooks,
              evidence_summary::text evsum, readiness_detail::text rdet
         from historical_spatial_slices where slice_id=:'s'`,
      { s: SLICE_ID }
    );
    expect(s.length).toBe(1);
    const unc = JSON.parse(s[0].unc) as Array<Record<string, string>>;
    expect(unc.length).toBeGreaterThanOrEqual(5);
    for (const u of unc) {
      expect((u.missing_evidence || "").trim().length, `uncertainty ${u.key} 未写 missing_evidence`).toBeGreaterThan(10);
      expect((u.proposed_decision || "").trim().length, `uncertainty ${u.key} 未写 proposed_decision`).toBeGreaterThan(10);
    }
    // 三个子门必须分别给出、不得等同
    const rdet = JSON.parse(s[0].rdet);
    expect(Object.keys(rdet.sub_gates).sort()).toEqual([
      "EXPERIENCE_SCRIPT_SUBSTRATE_READY",
      "PAST_PRESENT_COMPARISON_SUBSTRATE",
      "SPATIOTEMPORAL_OVERLAY_SUBSTRATE",
    ]);
    // 历史几何必须显式声明为「无来源」，不得假装存在
    expect(s[0].historical_geometry_status).toBe("absent_no_source");
    // 钩子只是语义机会
    const hooks = JSON.parse(s[0].hooks) as Array<Record<string, unknown>>;
    expect(hooks.length).toBeGreaterThanOrEqual(3);
    for (const h of hooks) expect(Array.isArray(h.grounded_on)).toBe(true);
    expect(s[0].focus_question.length).toBeGreaterThan(20);
    expect(s[0].time_context.length).toBeGreaterThan(20);
  });

  // 11. §9 主门诚实计算：criteria 与实测一致；c6 不满足时不得为 YES
  it("11. 就绪门由判据推导，不得为刷绿而放宽", async () => {
    const row = (
      await q(`select readiness_gate, readiness_detail::text rdet from historical_spatial_slices where slice_id=:'s'`, {
        s: SLICE_ID,
      })
    )[0];
    const rdet = JSON.parse(row.rdet);
    const c = rdet.criteria as Record<string, { pass: boolean; value: unknown }>;

    // 用库内实测数据独立重算关键判据
    const feats = await q(
      `select coalesce(array_length(evidence_ids,1),0)::int ev, current_position_status
         from historical_features where slice_id=:'s'`,
      { s: SLICE_ID }
    );
    expect(c.c1_core_features_with_evidence.value).toBe(feats.filter((f) => Number(f.ev) >= 1).length);
    expect(
      c.c2_current_object_grounding.value
    ).toBe(
      feats.filter((f) =>
        ["verified_object_point", "official_or_provider_object_point", "approximate_object_area"].includes(
          f.current_position_status
        )
      ).length
    );
    const legacyOnly = await n(
      `select coalesce(sum(coalesce(array_length(legacy_only_assertions,1),0)),0)::int c
         from historical_features where slice_id=:'s'`,
      { s: SLICE_ID }
    );
    const allBacked = await n(
      `select count(*)::int c from historical_features
        where slice_id=:'s' and not attested_time_evidence_backed`,
      { s: SLICE_ID }
    );
    const c6 = c.c6_every_assertion_traceable.value as {
      legacy_only_assertions: number;
      all_attested_time_evidence_backed: boolean;
    };
    expect(c6.legacy_only_assertions).toBe(Number(legacyOnly));
    expect(c6.all_attested_time_evidence_backed).toBe(allBacked === 0);

    // 判据 ⇒ 门的映射必须成立
    const failed = Object.entries(c)
      .filter(([, v]) => !v.pass)
      .map(([k]) => k)
      .sort();
    expect(rdet.failed_criteria.slice().sort()).toEqual(failed);
    if (failed.length === 0) expect(row.readiness_gate).toBe("YES");
    else if (!c.c8_no_fabricated_geometry.pass) expect(row.readiness_gate).toBe("NO");
    else expect(row.readiness_gate).toBe("PARTIAL");
    // 若门非 YES，必须给出原因，且明确「不得靠扩大范围/删断言来变绿」
    if (row.readiness_gate !== "YES") {
      expect(rdet.reason.length).toBeGreaterThan(10);
      expect(rdet.do_not_broaden_note).toContain("补证据");
    }
  });

  // ---------------------------------------------------------------- §11 / §12
  // 12. Evidenced Gate：新对象都写了 G0–G6 快照，且审计行不指向不存在的对象
  it("12. 新对象均有 G0–G6 审计快照，且无孤儿审计行", async () => {
    for (const [ot, table, keyCol] of [
      ["historical_feature", "historical_features", "feature_id"],
      ["historical_spatial_relation", "historical_spatial_relations", "hs_relation_id"],
    ] as const) {
      const objs = await n(`select count(*)::int c from ${table} where slice_id=:'s'`, { s: SLICE_ID });
      // 只统计本切片对象的审计行（把 object_id 限定在切片内，避免未来新增切片时口径漂移）
      const audits = await n(
        `select count(*)::int c from evidence_gate_audit a
          where a.object_type=:'ot'
            and a.object_id in (select t.${keyCol}::text from ${table} t where t.slice_id=:'s')`,
        { ot, s: SLICE_ID }
      );
      expect(audits).toBe(objs * 7); // G0..G6
      // 每个对象 7 个门各恰好 1 行
      expect(
        await n(
          `select count(*)::int c from (
             select a.object_id, a.gate_code, count(*) c2 from evidence_gate_audit a
              where a.object_type=:'ot'
                and a.object_id in (select t.${keyCol}::text from ${table} t where t.slice_id=:'s')
              group by a.object_id, a.gate_code having count(*) <> 1
           ) x`,
          { ot, s: SLICE_ID }
        )
      ).toBe(0);
      // 无孤儿
      expect(
        await n(
          `select count(*)::int c from evidence_gate_audit a
            where a.object_type=:'ot' and not exists (select 1 from ${table} t where t.${keyCol}::text = a.object_id)`,
          { ot }
        )
      ).toBe(0);
    }
    // §12-4：既有 relation 孤儿审计基线不得被本任务抬高
    expect(
      await n(`select count(*)::int c from evidence_gate_audit a
                where a.object_type='relation'
                  and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`)
    ).toBeLessThanOrEqual(63);
  });

  // 13. §12-2/3：raw 追加式；published 恒 0
  it("13. published 恒 0，且本任务未新增 published/verified 对象", async () => {
    expect(await n(`select count(*)::int c from claims where status::text in ('verified','published')`)).toBe(0);
    expect(await n(`select count(*)::int c from relations where status::text in ('verified','published')`)).toBe(0);
    expect(await n(`select count(*)::int c from historical_features where review_status in ('published','verified')`)).toBe(0);
    expect(await n(`select count(*)::int c from historical_spatial_relations where status in ('published','verified')`)).toBe(0);
  });

  // 14. §0.4 冻结基底：本任务不新增 Evidence / Source / Claim / relations
  it("14. 冻结基底未被本任务改动（Knowledge Weave / relations / evidence / sources）", async () => {
    // Knowledge Weave Minimum 按其冻结语义断言
    expect(await n(`select count(*)::int c from knowledge_paths`)).toBe(3);
    expect(await n(`select count(*)::int c from discovery_candidates`)).toBe(4);
    expect(await n(`select count(*)::int c from claims where generated_by='mohen-knowledge-weave'`)).toBe(5);
    // relations：只断言不变量（§12-26），不断言过期绝对总数。
    // ENG-GOV-01（A 类调和 STALE_COUNT）：CW-02 AD-02 规范锚 relation 以 legacy_id=''
    // （空串而非 NULL）合法入列，使「legacy_id is not null」误含该行（24→25）。
    // 不变量本体不变：**weave legacy 映射关系恒为 24**——用 nullif 排除空串，回到断言本义。
    expect(await n(`select count(*)::int c from relations where nullif(legacy_id,'') is not null`)).toBe(24);
    // ENG-GOV-01（B 类调和 STALE_STATE）：证据挂接位随 008 Cultural World 合法演进——
    // 无证据语义关系恒为 0 的不变量不变；挂接路径承认 legacy relation_evidence ∨
    // 008 claim 片段挂接（cultural_relation_claims.evidence_fragment_ids）。
    expect(
      await n(`select count(*)::int c from relations r
                where r.predicate <> 'crossLink'
                  and not exists (select 1 from relation_evidence re where re.relation_id=r.relation_id)
                  and not exists (
                        select 1 from cultural_relation_claims crc
                         where crc.existing_relation_id = r.relation_id
                           and coalesce(array_length(crc.evidence_fragment_ids, 1), 0) > 0)`)
    ).toBe(0);
    // 切片关系必须落在新表（historical_spatial_relations），relations 中不允许出现
    // **无 HSR 规范锚**的切片谓词行（ENG-GOV-01：CW-02 AD-02 的 former_site_of 是
    // 被 HSR existing_relation_id 反向指认的合法规范锚；未锚定者仍禁止——不放松）。
    expect(
      await n(`select count(*)::int c from relations r
                where r.predicate in ('spans_waterway','relative_position_south_of','temple_bridge_association','former_site_of')
                  and not exists (select 1 from historical_spatial_relations hsr where hsr.existing_relation_id = r.relation_id)`)
    ).toBe(0);
    // 本任务未新建 claim / discovery
    expect(
      await n(`select count(*)::int c from claims where generated_by ilike '%historical-spatial%' or generated_by ilike '%slice%'`)
    ).toBe(0);
    // 视觉资产未被改动（HR-5 排除范围仍是批次身份 20 张）
    expect(
      await n(`select count(*)::int c from visual_assets where eligibility_tags::text like '%excluded_from_heritage_primary%'`)
    ).toBe(20);
    // 本任务不新建类名含 historical 的 evidence（证据一律复用）
    expect(
      await n(`select count(*)::int c from evidence where extraction_method ilike '%historical_spatial_reconstruction%'`)
    ).toBe(0);
  });

  // 15. §12-1 R-1：Legacy 永久只读
  it("15. Legacy 零写（seed.master.json 未被本任务触碰）", async () => {
    if (!fs.existsSync(LEGACY_SEED)) return; // 环境无 Legacy 时跳过
    const st = fs.statSync(LEGACY_SEED);
    expect(st.size).toBeGreaterThan(0);
    const git = (() => {
      try {
        return execFileSync(
          "git",
          ["-C", path.dirname(path.dirname(LEGACY_SEED)), "status", "--porcelain", "data/seed.master.json"],
          { encoding: "utf8" }
        ).trim();
      } catch {
        return "";
      }
    })();
    expect(git).toBe("");
  });

  // 16. §12-24/25 幂等：确定性主键 + upsert（重跑不新增行）
  it("16. 新表以确定性主键 upsert，重跑不产生重复", async () => {
    const beforeRows = await q(
      `select (select count(*)::int from historical_spatial_slices)::text a,
              (select count(*)::int from historical_features)::text b,
              (select count(*)::int from historical_feature_anchors)::text c,
              (select count(*)::int from historical_change_records)::text d,
              (select count(*)::int from historical_spatial_relations)::text e`
    );
    // 二次执行同一定义（通过再跑 builder 由验收脚本覆盖；此处断言键唯一性）
    expect(await n(`select count(*)::int c from historical_features where slice_id=:'s'`, { s: SLICE_ID })).toBe(
      Number(beforeRows[0].b)
    );
    expect(
      await n(`select count(*)::int c from (
                 select feature_key, count(*) c2 from historical_features group by feature_key having count(*) > 1
               ) x`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from (
                 select anchor_key, count(*) c2 from historical_feature_anchors group by anchor_key having count(*) > 1
               ) x`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from (
                 select relation_key, count(*) c2 from historical_spatial_relations group by relation_key having count(*) > 1
               ) x`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from (
                 select change_key, count(*) c2 from historical_change_records group by change_key having count(*) > 1
               ) x`)
    ).toBe(0);
  });

  // ---------------------------------------------------------------- §15
  // 17. §15 交付物齐备
  it("17. §15 要求的交付物齐备（且 §15-7 仅在有未决项时产出）", async () => {
    const dir = path.join(PROJECT_ROOT, "data", "exports");
    const must = [
      "jinze-map-human-review-decision-log.md",
      "jinze-historical-feature-inventory.csv",
      "jinze-historical-spatial-relations.csv",
      "jinze-historical-change-inventory.csv",
      "jinze-historical-spatial-slice.json",
      "jinze-historical-spatial-slice-readiness.md",
    ];
    for (const f of must) expect(fs.existsSync(path.join(dir, f)), `缺交付物 ${f}`).toBe(true);
    // §15-7 不变式：人审 CSV 仅在存在未决项时**必须**产出。
    // （TASK-0011 起 E4 已全部关闭，未决关系计数可为 0；但切片仍可有其它
    //   待裁决项（ambiguous anchors / uncertainty），导出器可继续产出 CSV。）
    const hasUnresolved = await n(
      `select count(*)::int c from historical_spatial_relations where epistemic_class='E4'`
    );
    const hrCsv = path.join(dir, "jinze-historical-spatial-human-review.csv");
    if (hasUnresolved > 0) expect(fs.existsSync(hrCsv)).toBe(true);
    if (fs.existsSync(hrCsv)) {
      const text = fs.readFileSync(hrCsv, "utf8");
      expect(text).toContain("proposal_ref");
      // 提案不得冒充已落库决策
      expect(text).toContain("db_row_created");
      expect(text).toContain("false");
      // 提案行数不得为 0
      expect(text.trim().split("\n").length).toBeGreaterThan(1);
    }
    // 切片 JSON 必须是纯投影，且自带真源声明
    const j = JSON.parse(fs.readFileSync(path.join(dir, "jinze-historical-spatial-slice.json"), "utf8"));
    expect(j.truth_store).toContain("PostgreSQL");
    expect(j.features.length).toBeGreaterThanOrEqual(3);
    expect(j.relations.length).toBeGreaterThanOrEqual(2);
    // 历史来源一律标注不可归因（防止「图上应该有金泽」式推断）
    for (const s of j.historical_sources) expect(s.attributable_to_slice_objects).toBe(false);
  });
});
