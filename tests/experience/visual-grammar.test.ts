// tests/experience/visual-grammar.test.ts — TASK-0015 验收测试。
//
// 覆盖任务书 §14（测试要求）+ §13（通用性红线静态扫描）。
// 约定：不 spawn 业务子进程、不连 DB；纯函数断言为主，源码结构断言为辅。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  EPISTEMIC,
  SPATIAL,
  TEMPORAL,
  DEPTH,
  VG_PALETTE,
  distinctVariables,
  epistemicFromClass,
  relationRoleForEpistemic,
  nodeRoleForFeatureType,
  temporalStateFromWording,
  withDepth,
  emphasisFor,
  svgStyle,
  SEMANTIC_STATE_COUNT,
  EPISTEMIC_ORDER,
  SPATIAL_NODE_ORDER,
  SPATIAL_RELATION_ORDER,
  TEMPORAL_ORDER,
} from "../../apps/web/lib/mohen-visual/visual-grammar";
import { placeLabels, type LabelRequest } from "../../apps/web/lib/mohen-visual/label-layout";
import {
  LAYER_ORDER,
  SPATIAL_CANVAS_LAYER_COUNT,
  SPATIAL_CANVAS_PRIMITIVE_KINDS,
} from "../../apps/web/lib/mohen-visual/spatial-canvas";
import {
  evaluateSurfaceEligibility,
  resolveComposition,
} from "../../packages/experience-engine/src/index";
import { buildWorldEvidenceState, BEATS } from "../../apps/web/app/experience/jinze-water-net/beats";

const ROOT = path.resolve(__dirname, "..", "..");
const EXP_DIR = path.join(ROOT, "apps", "web", "app", "experience", "jinze-water-net");
const SURF_DIR = path.join(EXP_DIR, "surfaces");
const LIB_DIR = path.join(ROOT, "apps", "web", "lib", "mohen-visual");
const FROZEN = path.join(ROOT, "apps", "web", "data", "experience");

const read = (p: string) => fs.readFileSync(p, "utf8");
/** 抽取某个导出函数的源码片段（避免同文件内其它组件干扰断言） */
function fnBody(src: string, name: string): string {
  const start = src.indexOf(`export function ${name}`);
  expect(start, `missing ${name}`).toBeGreaterThan(-1);
  const next = src.indexOf("export function", start + 10);
  return src.slice(start, next === -1 ? undefined : next);
}

const slice = JSON.parse(read(path.join(FROZEN, "jinze-historical-spatial-slice.json")));
const script = JSON.parse(read(path.join(FROZEN, "jinze-3min-experience-script.json")));
const world = buildWorldEvidenceState(script, slice, {
  historicalVisualAssets: 0,
  historicalMapImageAvailable: false,
});

// 通用性红线：禁止出现在任何「通用」模块 / Surface 中的镇级 / 对象级事实
const FORBIDDEN_TOWN = ["金泽", "万安桥", "普济桥", "颐浩寺", "金泽塘"];
// 当前地理坐标系内的真实经纬度（约 120.9 / 31.0）—— 不得硬编码进通用模块
const GEO_RE = /120\.\d{2}|31\.\d{2}/;

// ---------------------------------------------------------------------------
// §5 — Humanistic Visual Grammar V1（纯函数）
// ---------------------------------------------------------------------------
describe("TASK-0015 — Visual Grammar V1 (§5)", () => {
  it("语义状态总数 = 5 认知 + 5 节点 + 4 关系 + 7 时间 + 6 层级 = 27", () => {
    expect(EPISTEMIC_ORDER.length).toBe(5);
    expect(SPATIAL_NODE_ORDER.length).toBe(5);
    expect(SPATIAL_RELATION_ORDER.length).toBe(4);
    expect(TEMPORAL_ORDER.length).toBe(7);
    expect(SEMANTIC_STATE_COUNT).toBe(27);
  });

  it("每个语义状态都携带文字 label + hint（遮色仍可辨，可访问性）", () => {
    for (const s of [...Object.values(EPISTEMIC), ...Object.values(SPATIAL), ...Object.values(TEMPORAL)]) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.hint.trim().length).toBeGreaterThan(0);
    }
  });

  it("同语法群内任意两个不同状态差异 ≥2 个视觉变量（不得只靠颜色 / badge）", () => {
    const groups = [Object.values(EPISTEMIC), Object.values(SPATIAL), Object.values(TEMPORAL)];
    for (const g of groups) {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          expect(
            distinctVariables(g[i], g[j]).length,
            `同群内仅靠单一变量区分 ${g[i].label}/${g[j].label}`
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("epistemicFromClass：E1→有据，E2→候选（永不升有据），E3→冲突，其它→未知", () => {
    expect(epistemicFromClass("E1")).toBe("EVIDENCE_BACKED");
    expect(epistemicFromClass("E2")).toBe("INTERPRETATION_CANDIDATE");
    expect(epistemicFromClass("E2")).not.toBe("EVIDENCE_BACKED");
    expect(epistemicFromClass("E3")).toBe("CONFLICT");
    expect(epistemicFromClass("E0")).toBe("UNKNOWN");
  });

  it("relationRoleForEpistemic：E1 已证 / E2 候选 / E3 弱线索 / 缺→无线（missing 不生成伪 relation）", () => {
    expect(relationRoleForEpistemic("E1")).toBe("relation_confirmed");
    expect(relationRoleForEpistemic("E2")).toBe("relation_candidate");
    expect(relationRoleForEpistemic("E3")).toBe("relation_weak");
    expect(relationRoleForEpistemic("")).toBe("relation_missing");
    // E2 永不变 confirmed
    expect(relationRoleForEpistemic("E2")).not.toBe("relation_confirmed");
    // missing 状态：虚点线，无实线（strokeDash 非空）
    expect(SPATIAL.relation_missing.strokeDash.length).toBeGreaterThan(0);
  });

  it("nodeRoleForFeatureType：water→spine / bridge→crossing / temple·site→cultural_node / area→approximate_area / 其它→node", () => {
    expect(nodeRoleForFeatureType("waterway")).toBe("spine");
    expect(nodeRoleForFeatureType("river")).toBe("spine");
    expect(nodeRoleForFeatureType("bridge")).toBe("crossing");
    expect(nodeRoleForFeatureType("temple")).toBe("cultural_node");
    expect(nodeRoleForFeatureType("cultural_site")).toBe("cultural_node");
    expect(nodeRoleForFeatureType("approximate_area")).toBe("approximate_area");
    expect(nodeRoleForFeatureType("person")).toBe("node");
  });

  it("temporalStateFromWording 确定性分类：毁>重建>变化>出现；中性文本不伪造状态", () => {
    expect(temporalStateFromWording("1938 大部分被毁")).toBe("destruction");
    expect(temporalStateFromWording("1992 原址重建")).toBe("reconstruction");
    expect(temporalStateFromWording("清代加建")).toBe("change");
    expect(temporalStateFromWording("南宋创建")).toBe("appearance");
    // 命中顺序：含「毁」优先于「重建」
    expect(temporalStateFromWording("毁后重建")).toBe("destruction");
    // 中性措辞（有事件但无可分类动作）→ 不生成 temporal 状态（时间景观以 unknown 占位）
    expect(temporalStateFromWording("见诸志书")).toBeNull();
  });

  it("destruction 与 reconstruction 视觉状态明显不同（毁损最粗、原址重建双划节奏）", () => {
    const d = distinctVariables(TEMPORAL.destruction, TEMPORAL.reconstruction);
    expect(d.length).toBeGreaterThanOrEqual(2);
    // 毁损在视觉上比延续更醒目（更粗），强调「生命线中断」
    expect(TEMPORAL.destruction.strokeWidth).toBeGreaterThanOrEqual(TEMPORAL.continuity.strokeWidth);
  });

  it("withDepth 确定性缩放：primary 不变，context 降低 opacity/prominence，不含随机", () => {
    const t = EPISTEMIC.EVIDENCE_BACKED;
    const base = withDepth(t, "primary");
    expect(base.opacity).toBeCloseTo(t.opacity, 3);
    const ctx = withDepth(t, "context");
    expect(ctx.opacity).toBeLessThan(t.opacity);
    expect(ctx.prominence).toBeLessThan(t.prominence);
    // 幂等
    expect(withDepth(t, "primary")).toEqual(base);
  });

  it("emphasisFor：无 focus→null；focus 命中→primary，其余→context（focus 转移不改语义）", () => {
    expect(emphasisFor(null, "a")).toBeNull();
    expect(emphasisFor("a", "a")).toBe("primary");
    expect(emphasisFor("a", "b")).toBe("context");
  });

  it("svgStyle 派生确定：strokeDash 为空时省略，否则透传（视觉与 css 单一真源）", () => {
    const solid = svgStyle(EPISTEMIC.EVIDENCE_BACKED);
    expect(solid.strokeDasharray).toBeUndefined();
    const dashed = svgStyle(SPATIAL.relation_candidate);
    expect(dashed.strokeDasharray).toBe("6 5");
  });
});

// ---------------------------------------------------------------------------
// §6 — SpatialCanvas（结构 / 确定性）
// ---------------------------------------------------------------------------
describe("TASK-0015 — SpatialCanvas (§6)", () => {
  it("层序固定且覆盖 6 个语义层", () => {
    expect(SPATIAL_CANVAS_LAYER_COUNT).toBe(6);
    expect(LAYER_ORDER).toEqual(["frame", "water", "relations", "nodes", "annotations", "labels"]);
  });

  it("支持 ≥10 种空间原语（含 spine / node / relation / approximate / marker / extent / hatch / graticule / scalebar / northarrow）", () => {
    expect(SPATIAL_CANVAS_PRIMITIVE_KINDS.length).toBeGreaterThanOrEqual(10);
    for (const k of ["spine", "node", "relation", "approximate", "marker", "extent", "hatch", "graticule", "scalebar", "northarrow"]) {
      expect(SPATIAL_CANVAS_PRIMITIVE_KINDS).toContain(k as (typeof SPATIAL_CANVAS_PRIMITIVE_KINDS)[number]);
    }
  });

  it("确定性标签避让：同输入恒得同输出，且不丢弃任何标签", () => {
    const reqs: LabelRequest[] = [
      { key: "a", text: "万安桥", x: 100, y: 100 },
      { key: "b", text: "普济桥", x: 100, y: 100 },
      { key: "c", text: "颐浩寺遗址", x: 260, y: 300 },
    ];
    const r1 = placeLabels(reqs);
    const r2 = placeLabels(reqs);
    expect(r1).toEqual(r2);
    expect(r1.length).toBe(3);
  });

  it("标签避让：重叠锚点产生 relocated（不再靠遮挡读者）", () => {
    const reqs: LabelRequest[] = [
      { key: "a", text: "桥一", x: 200, y: 200 },
      { key: "b", text: "桥二", x: 200, y: 201 },
    ];
    const out = placeLabels(reqs);
    expect(out.some((l) => l.relocated)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §14 — CurrentMap 只消费 current geometry / Relational 无 lat-lng
// ---------------------------------------------------------------------------
describe("TASK-0015 — 数据边界 (§14)", () => {
  it("当前切片没有任何水道/道路/POI 几何 → CurrentMap 只能画锚点，不可编造河", () => {
    const kinds = (slice.current_sources ?? []).map((a: { kind: string }) => a.kind);
    // 允许的当前几何锚点类型（点 / 近似区 / 镇级参考锚）
    const allowed = /provider_current_object_(point|area)|town_level_reference/;
    expect(kinds.every((k: string) => allowed.test(k)), `出现非锚点几何类型：${kinds}`).toBe(true);
    // 明确禁止任何水道 / 河流 / 道路 / 运河几何（这些是「编造河」的来源）
    expect(kinds.some((k: string) => /waterway|river|road|canal/i.test(k))).toBe(false);
  });

  it("RelationalSpaceSurface 函数体内无 lat/lng、无经纬度投影（只语义，不继承 current 坐标）", () => {
    const body = fnBody(read(path.join(SURF_DIR, "SpatialSurfaces.tsx")), "RelationalSpaceSurface");
    expect(/\blat\b|\blng\b/.test(body)).toBe(false);
    expect(GEO_RE.test(body)).toBe(false);
    // 不应出现任何投影函数（无 current→历史坐标泄漏）
    expect(body).not.toMatch(/project\s*\(/);
  });

  it("TimelineSurface 函数体内无硬编码经纬度（时间景观不绑定地理坐标）", () => {
    const body = fnBody(read(path.join(SURF_DIR, "EvidenceNarrativeSurfaces.tsx")), "TimelineSurface");
    expect(GEO_RE.test(body)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §14 — Evidence-aware 选择 / Registry / eligibility 不回归
// ---------------------------------------------------------------------------
describe("TASK-0015 — Evidence-aware selection & Registry (§14)", () => {
  it("Surface Registry 覆盖不少于 15 个 surfaceType（复用冻结 19 型清单）", () => {
    const src = read(path.join(EXP_DIR, "surfaceRegistry.tsx"));
    const ALL_SURFACE_TYPES = [
      "current_map", "approximate_area", "relational_space", "historical_map_native",
      "historical_map_georeferenced", "historical_geometry", "timeline", "evidence_reveal",
      "conflict_compare", "resolved_single_answer", "source_inspect", "current_photo",
      "historical_photo", "before_after", "question", "discovery", "agent_prompt",
      "action_dock", "unknown_gap",
    ];
    let found = 0;
    for (const t of ALL_SURFACE_TYPES) {
      if (src.includes(`${t}:`)) found++;
    }
    expect(found, "registry 缺失部分冻结 surfaceType").toBe(ALL_SURFACE_TYPES.length);
    expect(found).toBeGreaterThanOrEqual(15);
  });

  it("TASK-0014 冻结 eligibility 不回归：6 个核心 Surface 仍 eligible + 配方可解", () => {
    const elig = evaluateSurfaceEligibility(world);
    for (const t of ["current_map", "approximate_area", "relational_space", "historical_map_native", "timeline", "evidence_reveal"]) {
      const e = elig.find((x) => x.surfaceType === t);
      expect(e, `${t} missing`).toBeDefined();
      expect(e!.eligible, `${t} 不应变为 ineligible`).toBe(true);
    }
    // 历史几何仍为 0 → 该类型保持 ineligible（冻结语义）
    const hg = elig.find((x) => x.surfaceType === "historical_geometry");
    expect(hg?.eligible).toBe(false);
    // 配方可解：每个 Beat 的 recipe 都能解出构图（不回归 TASK-0014 运行时）
    for (const b of BEATS) {
      const { composition } = resolveComposition(b.recipe, world);
      expect(composition, `recipe ${b.recipe} 无法解析`).toBeDefined();
      // 解析出主角 Surface，或落到 fallback（均表示配方可解、不抛错）
      expect(composition.primarySurface ?? composition.fallback, `recipe ${b.recipe} 无主角且无 fallback`).toBeDefined();
    }
  });

  it("Relational Space 入选依赖「历史关系存在、历史几何为 0」这一冻结口径", () => {
    const rel = evaluateSurfaceEligibility(world).find((x) => x.surfaceType === "relational_space")!;
    expect(rel.eligible).toBe(true);
    // 证据来源：关系条数 > 0，且历史几何 0
    expect((slice.relations ?? []).length).toBeGreaterThan(0);
    expect((slice.historical_geometry ?? []).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §13 — 通用性红线（静态扫描）：三 Surface + Visual Grammar + SpatialCanvas 不得含镇级事实
// ---------------------------------------------------------------------------
describe("TASK-0015 — 通用性红线静态扫描 (§13)", () => {
  const genericFiles = [
    path.join(LIB_DIR, "visual-grammar.ts"),
    path.join(LIB_DIR, "spatial-canvas.tsx"),
    path.join(LIB_DIR, "label-layout.ts"),
    path.join(SURF_DIR, "SpatialSurfaces.tsx"),
    path.join(SURF_DIR, "EvidenceNarrativeSurfaces.tsx"),
  ];

  for (const f of genericFiles) {
    const src = read(f);
    it(`[${path.basename(f)}] 不含镇级/对象级事实（金泽/万安桥/普济桥/颐浩寺/金泽塘）`, () => {
      for (const bad of FORBIDDEN_TOWN) {
        expect(src, `${path.basename(f)} 含禁词 ${bad}`).not.toContain(bad);
      }
    });
    it(`[${path.basename(f)}] 不出现 JinzeVisualGrammar / JinzeSpatialCanvas`, () => {
      expect(src).not.toMatch(/JinzeVisualGrammar|JinzeSpatialCanvas/);
    });
    it(`[${path.basename(f)}] 不硬编码当前经纬度（120.x / 31.x）`, () => {
      expect(GEO_RE.test(src), `${path.basename(f)} 疑似硬编码真实经纬度`).toBe(false);
    });
  }

  it("SpatialCanvas 不接受 sceneId（不通过场景决定视觉真相）", () => {
    const src = read(path.join(LIB_DIR, "spatial-canvas.tsx"));
    expect(src).not.toMatch(/sceneId/);
  });

  it("mohen-visual 目录零 DB / 零 Legacy / 零 migration 依赖", () => {
    for (const f of genericFiles) {
      const src = read(f);
      expect(src, `${path.basename(f)} 不应引用 DB/migration`).not.toMatch(/migrate|schema|\bprisma\b|\bsql\b/i);
      expect(src, `${path.basename(f)} 不应引用 Legacy 数据文件`).not.toMatch(/seed\.master\.json/);
    }
  });
});
