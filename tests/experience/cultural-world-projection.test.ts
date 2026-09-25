// tests/experience/cultural-world-projection.test.ts
//
// EXP-CULTURAL-03 · M4.1（Cultural World → Experience Projection Runtime Slice）
// 覆盖 Task Book §7 T-01～T-10（T-10 的全量回归以实际 vitest 运行为准，此处断言向后兼容不变量）。
//
// 约定：不连 DB、不 spawn 业务子进程——008 第一簇以冻结只读投影副本（jinze-cultural-world-008.json）
// 作为体验端读源（真源仍是 008，与 jinze-historical-spatial-slice.json 同性质）。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import type { ExperienceScript, WorldEvidenceState } from "../../packages/experience-engine/src/index";
import {
  resolveComposition,
  validateBeatCoverage,
} from "../../packages/experience-engine/src/index";
import { BEATS, buildWorldEvidenceState } from "../../apps/web/app/experience/jinze-water-net/beats";
import {
  projectCulturalWorldState,
  fragmentGateDisplayItems,
  presentOpenQuestions,
  type CulturalWorldProjectionSource,
} from "../../apps/web/app/experience/jinze-water-net/culturalWorldProjection";

const ROOT = path.resolve(__dirname, "..", "..");
const FROZEN = path.join(ROOT, "apps", "web", "data", "experience");
const ENGINE_SRC = path.join(ROOT, "packages", "experience-engine", "src");

const script = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-script.json"), "utf8")
) as ExperienceScript;
const slice = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-historical-spatial-slice.json"), "utf8"));
const source = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-cultural-world-008.json"), "utf8")
) as CulturalWorldProjectionSource;

const projection = projectCulturalWorldState(source.slice_id, source);
const world: WorldEvidenceState = buildWorldEvidenceState(
  script,
  slice,
  { historicalVisualAssets: 0, historicalMapImageAvailable: false },
  projection
);

const SIX_VALUES = [
  "SUPPORTED",
  "SUPPORTED_CANDIDATE",
  "CONFLICTED",
  "RESEARCH_LEAD",
  "UNSUPPORTED",
  "OPEN_QUESTION",
] as const;

describe("EXP-CULTURAL-03 · M4.1 Projection Reader", () => {
  // —— T-01：jinze-min-001 可稳定生成 Projection；重复运行结果语义一致 ——
  it("T-01 Projection Reader：幂等、确定、计数与 CW-02 snapshot 一致", () => {
    const a = projectCulturalWorldState(source.slice_id, source);
    const b = projectCulturalWorldState(source.slice_id, source);
    expect(a).toEqual(b); // 纯函数：同入参恒同出参

    expect(a.sliceId).toBe("jinze-minimum-slice-001");
    expect(a.culturalEvents).toHaveLength(9);
    expect(a.claimEpistemicByKey.size).toBe(8);
    expect(a.meaningCandidates).toHaveLength(2);
    expect(a.presentConnections).toHaveLength(2);
    expect(a.evidenceFragmentGates).toHaveLength(16);
    expect(a.conflicts).toHaveLength(1);

    // AT-01：008 已通过单一 Projection Reader 进入体验输入（不再是 seed/verify 孤岛）
    expect(world.culturalEvents).toHaveLength(9);
    expect(world.evidenceFragmentGates).toHaveLength(16);
    expect(world.meaningCandidates).toHaveLength(2);
    expect(world.presentConnections).toHaveLength(2);
  });

  // —— T-02：六值轴 A 不被 E1–E4 覆盖/降级（双轴正交）——
  it("T-02 Six-Value Preservation：relationEvidence 同时携带六值轴 A 与 E1–E4 轴 B，互不压缩", () => {
    const rels = world.relationEvidence ?? [];
    expect(rels).toHaveLength(slice.relations.length);

    // 轴 A：全部落在六值词汇内（来自 008 cultural_relation_claims.epistemic_status）
    for (const r of rels) {
      expect(r.epistemicStatus).toBeDefined();
      expect(SIX_VALUES).toContain(r.epistemicStatus);
    }
    // 全簇 8 条 claim 均为 SUPPORTED_CANDIDATE
    expect(rels.every((r) => r.epistemicStatus === "SUPPORTED_CANDIDATE")).toBe(true);

    // 轴 B：epistemicClass 保留 E1–E4 形态学（未被轴 A 覆盖）
    const e2 = rels.find((r) => r.predicate === "temple_bridge_association");
    expect(e2?.epistemicClass).toBe("E2");
    expect(e2?.epistemicStatus).toBe("SUPPORTED_CANDIDATE"); // E2 与六值并存 → 正交实证
    const e3 = rels.find((r) => r.predicate === "relative_position_south_of");
    expect(e3?.epistemicClass).toBe("E3");
    const e1 = rels.find((r) => r.predicate === "spans_waterway" && r.subject.includes("puji"));
    expect(e1?.epistemicClass).toBe("E1");
    // E1–E4 不承担 claim 真值：轴 A 值不得被改写成 E 词汇，反之亦然
    for (const r of rels) {
      expect(String(r.epistemicStatus)).not.toMatch(/^E[1-4]$/);
    }
  });

  // —— T-03：1265/1267 双值 + preserved_open 同时存在（不静默择一）——
  it("T-03 Conflict：008 双值 preserved_open 冲突进入世界冲突集，两值并列", () => {
    const dual = world.conflicts.find((c) => c.dualValue === true);
    expect(dual).toBeDefined();
    expect(dual?.ruling).toBe("pujiqiao-build-year-1265-1267");
    expect(dual?.primaryValue).toBe("1267");
    expect(dual?.conflictedValue).toBe("1265");
    expect(dual?.resolutionStatus).toBe("preserved_open");
    expect(dual?.source).toBe("008/cultural_conflicts");
    // 两个年份都可见且不同 → 未静默择一
    expect(dual?.primaryValue).not.toBe(dual?.conflictedValue);
    // T11-C1/C2（脚本冲突）仍在，未被 008 冲突挤掉
    for (const sc of script.conflicts) {
      expect(world.conflicts.some((c) => c.ruling === sc.ruling)).toBe(true);
    }
  });

  // —— T-04：hr4_usable 可用；u10_forbidden 无正向事实出口 ——
  it("T-04 Fragment Gate：hr4_usable 可显，u10_forbidden 只作禁用边界（fact 恒 null）", () => {
    const items = fragmentGateDisplayItems(world.evidenceFragmentGates ?? []);
    expect(items).toHaveLength(16);

    const usable = items.filter((g) => g.span_type === "hr4_usable");
    expect(usable).toHaveLength(2);
    for (const g of usable) {
      expect(g.kind).toBe("usable");
      expect(g.fact).toBeTruthy(); // hr4_usable 携带可用说明（受 claim 约束）
    }

    const forbidden = items.filter((g) => g.span_type === "u10_forbidden");
    expect(forbidden).toHaveLength(1);
    for (const g of forbidden) {
      expect(g.kind).toBe("forbidden");
      expect(g.fact).toBeNull(); // ★ 无任何正向事实出口
      expect(g.forbiddenNote).toBeTruthy(); // 只有「为何禁用」的边界说明
    }

    const generic = items.filter((g) => g.span_type === "generic");
    expect(generic).toHaveLength(13);
    for (const g of generic) {
      expect(g.kind).toBe("generic");
      expect(g.usage_note).toBeTruthy(); // 仍受 claim/usage 约束
    }
  });

  // —— T-05：MeaningCandidate tone=INTERPRETIVE，且不能生成 Fact status ——
  it("T-05 Meaning Firewall：INTERPRETIVE tone 与六值 status 分离，无 Fact 出口", () => {
    const ms = world.meaningCandidates ?? [];
    expect(ms).toHaveLength(2);
    for (const m of ms) {
      expect(m.tone).toBe("INTERPRETIVE"); // 解释层 tone（与 status 正交）
      expect(SIX_VALUES).toContain(m.epistemic_status); // status 仍是六值
      expect(m.epistemic_status).toBe("SUPPORTED_CANDIDATE");
      expect(m.derived_from_claim_ids.length).toBeGreaterThan(0); // 仅基于已支持 Claims
      // Meaning→Fact 禁止：投影对象上不存在任何 fact 状态/字段
      expect(Object.keys(m)).not.toContain("fact");
      expect(JSON.stringify(m)).not.toContain('"FACT"');
    }
  });

  // —— T-06：U10 保持 OPEN_QUESTION；1992 重建与「开放为宗教活动场所」不混为同一事实 ——
  it("T-06 Present Firewall：U10 只在 open_questions；1992 重建是唯一 1992 事实事件", () => {
    const presents = world.presentConnections ?? [];
    const siteRebuilt = presents.find((p) => p.type === "site_vs_rebuilt");
    expect(siteRebuilt).toBeDefined();
    // U10 以开放问题形式存在（OPEN_QUESTION 表达层）
    const u10 = (siteRebuilt?.open_questions ?? []).find((q) => q.includes("U10"));
    expect(u10).toBeTruthy();
    expect(u10).toContain("开放为宗教活动场所");
    expect(u10).toContain("不进事实层");

    // 1992 的事实事件只有「原址重建」——没有任何事件/claim 把「开放为宗教活动场所」当事实
    const ev1992 = (world.culturalEvents ?? []).filter((e) => e.time_scope.includes("1992"));
    expect(ev1992).toHaveLength(1);
    expect(ev1992[0].label).toContain("重建");
    expect(ev1992[0].epistemic_status).toBe("SUPPORTED_CANDIDATE");

    // 「开放为宗教活动场所」不出现在任何事实层字段（events 标签 / claim 键）
    const eventsJson = JSON.stringify(world.culturalEvents);
    expect(eventsJson).not.toContain("开放为宗教活动场所");
    for (const key of projection.claimEpistemicByKey.keys()) {
      expect(key).not.toContain("开放为宗教活动场所");
    }
    // 它唯一的出现位置：open_questions（开放问题）与 u10_forbidden 片段（禁用边界）
    const openJson = JSON.stringify(world.presentConnections);
    expect(openJson).toContain("开放为宗教活动场所");
    const u10Frag = (world.evidenceFragmentGates ?? []).length; // gate 只带 span_type，不带 quote
    expect(u10Frag).toBe(16);
    const rawForbidden = source.fragments.find((f) => f.span_type === "u10_forbidden");
    expect(rawForbidden?.quote_fragment).toContain("1992年修复开放");
    expect(rawForbidden?.usable_for_claim).toBeNull();
  });

  // —— T-07：现代坐标不获得历史 geometry 权威 ——
  it("T-07 Current/Historical Authority：有现代精确锚但历史几何恒 false，投影零坐标", () => {
    expect(world.currentExactEntities.length).toBeGreaterThan(0); // 现代精确锚存在
    expect(world.hasHistoricalGeometry).toBe(false); // 但不继承为历史几何
    expect(world.historicalMapSource?.georeferenced).toBe(false);
    expect(world.historicalMapSource?.attributable).toBe(false);

    // 投影本体不携带任何坐标（无 GCJ 数值 / lat / lng 数值模式）
    const pj = JSON.stringify(projection);
    expect(pj).not.toMatch(/12[01]\.\d{3,}/); // 金泽经度量级
    expect(pj).not.toMatch(/3[01]\.\d{3,}/); // 纬度量级
    expect(pj.toLowerCase()).not.toContain("gcj");
    // 相对位置 claim 仍是 SUPPORTED_CANDIDATE（非坐标权威）
    expect(projection.claimEpistemicByKey.get(
      "jinze-min-001/feature/pujiqiao|relative_position_south_of|jinze-min-001/feature/wananqiao"
    )).toBe("SUPPORTED_CANDIDATE");
  });

  // —— T-08：Five-Beat 不需要新增 ExperienceAction；Beat 5 不引入 RETURN_TO_PRESENT Action ——
  it("T-08 Action Reuse：V0.1 十项 Action 未扩充；Beat 5 recipe 是 CompositionRecipe 而非 Action", () => {
    const idxSrc = fs.readFileSync(path.join(ENGINE_SRC, "index.ts"), "utf8");
    const actionStart = idxSrc.indexOf("export type ExperienceAction");
    const actionBlock = idxSrc.slice(actionStart, idxSrc.indexOf("// TASK-0013"));
    expect(actionBlock).not.toContain("RETURN_TO_PRESENT");
    // V0.1 十项逐一在场（未删除；判别联合形式 { type: "..." }）
    for (const a of [
      "FOCUS_PLACE", "SET_TIME", "SHOW_HISTORICAL_LAYER", "SELECT_DISCOVERY", "OPEN_EVIDENCE",
      "SET_VISUAL_MODE", "SET_COMPOSITION", "PATCH_NARRATIVE", "PROPOSE_ROUTE", "REPLAN",
    ]) {
      expect(actionBlock).toContain(`type: "${a}"`);
    }

    // Beat 5：recipe="RETURN_TO_PRESENT" 属 CompositionRecipe（表达层配方），不是 ExperienceAction
    expect(BEATS).toHaveLength(5);
    expect(BEATS[4].beatId).toBe("beat-05-return-next");
    expect(BEATS[4].recipe).toBe("RETURN_TO_PRESENT");
    const recipeSrc = fs.readFileSync(path.join(ENGINE_SRC, "composition-recipes.ts"), "utf8");
    expect(recipeSrc).toContain('RETURN_TO_PRESENT: {'); // CompositionRecipe 定义在场
  });

  // —— T-09：U10 体验表达来自 presentConnections.open_questions，而非独立硬编码事实 ——
  it("T-09 Script Single Source：U10 详细口径只在投影；脚本只保留免责陈述并让位", () => {
    // 单一真源提取函数 = flatMap(open_questions)，且包含完整 U10 口径
    const oq = presentOpenQuestions(world);
    expect(oq.some((q) => q.includes("U10") && q.includes("仅非权威转载"))).toBe(true);

    // 脚本侧：s06-u4 仍是 FACT_LIMITED 免责单元（回归守护），但已让位——
    // U10 的详细边界字符串（「仅非权威转载」「U10：」「不进事实层」）只存在于投影，不在脚本
    const scriptJson = JSON.stringify(script);
    expect(scriptJson).not.toContain("仅非权威转载");
    expect(scriptJson).not.toContain("U10：");
    expect(scriptJson).not.toContain("不进事实层");

    const s06 = script.scenes.find((s) => s.scene_id === "jinze-3min/s06-change-through-time");
    const u4 = s06?.narrative.find((u) => u.unit_id === "s06-u4");
    expect(u4?.level).toBe("FACT_LIMITED");
    expect(u4?.text).toContain("开放为宗教活动场所");
    expect(u4?.text).toContain("不将其作为事实呈现");
    expect(u4?.text).toContain("今日开放问题"); // 让位声明：权威口径指向投影驱动的证据面板
  });

  // —— T-10（回归不变量部分）：3 参旧调用零回归；全量回归以 vitest 运行为准 ——
  it("T-10 Regression guard：缺省 projection 时行为与 M4.1 之前一致", () => {
    const legacyWorld = buildWorldEvidenceState(script, slice, {
      historicalVisualAssets: 0,
      historicalMapImageAvailable: false,
    });
    // 旧字段不变
    expect(legacyWorld.currentExactEntities).toEqual(world.currentExactEntities);
    expect(legacyWorld.approximateEntities).toEqual(world.approximateEntities);
    expect(legacyWorld.hasHistoricalGeometry).toBe(false);
    // 冲突集只含脚本冲突（无 008 冲突混入）
    expect(legacyWorld.conflicts).toHaveLength(script.conflicts.length);
    expect(legacyWorld.conflicts.some((c) => c.dualValue)).toBe(false);
    // 新字段缺省为 undefined（不产生半真源）
    expect(legacyWorld.culturalEvents).toBeUndefined();
    expect(legacyWorld.evidenceFragmentGates).toBeUndefined();
    expect(legacyWorld.meaningCandidates).toBeUndefined();
    expect(legacyWorld.presentConnections).toBeUndefined();
    // relationEvidence 无轴 A（不伪造六值）
    for (const r of legacyWorld.relationEvidence ?? []) expect(r.epistemicStatus).toBeUndefined();
  });

  // —— AT-09 支撑：Five-Beat 每一拍都能用真实投影世界解析出 Composition（含冲突面 eligible）——
  it("AT-09 support：Five-Beat 全部可由携带 008 投影的 world 解析 Composition；conflict_compare eligible", () => {
    const coverage = validateBeatCoverage(BEATS, script.scenes.map((s) => s.scene_id));
    expect(coverage.ok).toBe(true);

    for (const beat of BEATS) {
      const { selection, composition } = resolveComposition(beat.recipe, world);
      expect(composition.recipe).toBe(beat.recipe);
      // EVIDENCE_FOCUS 拍：冲突面必须 eligible（008 双值冲突在场）
      if (beat.recipe === "EVIDENCE_FOCUS") {
        const cc = selection.eligibleSurfaces.find((e) => e.surfaceType === "conflict_compare");
        expect(cc?.eligible).toBe(true);
      }
      // 任何一拍都不得落到「证据缺口」fallback（真实世界数据在场）
      expect(composition.fallback).toBeUndefined();
    }
  });
});
