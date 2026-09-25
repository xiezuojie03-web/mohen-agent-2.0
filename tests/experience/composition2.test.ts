// tests/experience/composition2.test.ts — TASK-0014 验收测试。
//
// 覆盖任务书 §15 全部 25 条 + §5A.5 七个 canonical cases。
// 约定（沿用 TASK-0013）：不 spawn 业务子进程、不连 DB；
// 前端组件以源码结构断言为主（§19-29：验语义，不绑死像素）。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  evaluateSurfaceEligibility,
  selectSurfaces,
  resolveComposition,
  validateBeatCoverage,
  beatForScene,
  SELECTION_REASON,
  type SurfaceType,
  type WorldEvidenceState,
  type ExperienceScript,
} from "../../packages/experience-engine/src/index";
import { BEATS, buildWorldEvidenceState, TEMPLE_BRIDGE_NON_ANSWER } from "../../apps/web/app/experience/jinze-water-net/beats";

const ROOT = path.resolve(__dirname, "..", "..");
const FROZEN = path.join(ROOT, "apps", "web", "data", "experience");
const EXP_DIR = path.join(ROOT, "apps", "web", "app", "experience", "jinze-water-net");
const SURF_DIR = path.join(EXP_DIR, "surfaces");
const LEGACY_SEED = path.join(path.resolve(ROOT, "..", "hushang-jingwei"), "data", "seed.master.json");
/** TASK-0014 开工快照（git 不可用时的降级举证基线）：size + mtimeMs */
const LEGACY_SEED_BASELINE = { size: 10721985, mtimeMs: 1789635108668 };

const script = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-script.json"), "utf8")
) as ExperienceScript;
const slice = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-historical-spatial-slice.json"), "utf8"));

const world: WorldEvidenceState = buildWorldEvidenceState(script, slice, {
  historicalVisualAssets: 0,
  historicalMapImageAvailable: false,
});

const read = (p: string) => fs.readFileSync(p, "utf8");
/** 抽取某个导出函数的源码片段（避免同文件内其它组件干扰断言） */
function fnBody(src: string, name: string): string {
  const start = src.indexOf(`export function ${name}`);
  expect(start, `missing ${name}`).toBeGreaterThan(-1);
  const next = src.indexOf("export function", start + 10);
  return src.slice(start, next === -1 ? undefined : next);
}
const ALL_SURFACE_TYPES: SurfaceType[] = [
  "current_map",
  "approximate_area",
  "relational_space",
  "historical_map_native",
  "historical_map_georeferenced",
  "historical_geometry",
  "timeline",
  "evidence_reveal",
  "conflict_compare",
  "resolved_single_answer",
  "source_inspect",
  "current_photo",
  "historical_photo",
  "before_after",
  "question",
  "discovery",
  "agent_prompt",
  "action_dock",
  "unknown_gap",
];

// ---------------------------------------------------------------------------
// §15-1..3  Surface Component System / Registry / 无金泽硬编码
// ---------------------------------------------------------------------------
describe("TASK-0014 — Surface Component System (§15-1/2/3)", () => {
  it("1. Surface Registry 覆盖全部 surfaceType（含 ineligible 类型的合法落点）", () => {
    const src = read(path.join(EXP_DIR, "surfaceRegistry.tsx"));
    for (const t of ALL_SURFACE_TYPES) {
      expect(src, `registry missing ${t}`).toContain(`${t}:`);
    }
    // 「不画」必须有实现：UnknownGapSurface 存在且被 unknown_gap 与 ineligible 类型复用
    expect(src).toContain("function UnknownGapSurface");
    expect(src).toContain("unknown_gap: UnknownGapSurface");
    expect(src).toMatch(/historical_geometry:\s*UnknownGapSurface/);
    expect(src).toMatch(/resolved_single_answer:\s*UnknownGapSurface/);
    // resolveSurface 对 ineligible surface 返回 null（不得渲染）
    expect(src).toMatch(/if\s*\(e\s*&&\s*!e\.eligible\)\s*return null/);
  });

  it("2. Surface 组件消费 semantic input；reusable 组件内无金泽/镇级历史真相硬编码", () => {
    const townTruth = /金泽|颐浩寺|万安桥|普济桥|金泽塘|朱家角|蔡浜|枪开河|青浦/;
    for (const f of fs.readdirSync(SURF_DIR)) {
      const src = read(path.join(SURF_DIR, f));
      expect(src.match(townTruth), `${f} hardcodes town-specific truth`).toBeNull();
    }
    // 组件必须从 ctx 取数据（semantic input），而不是自带常量事实表
    const spatial = read(path.join(SURF_DIR, "SpatialSurfaces.tsx"));
    expect(spatial).toMatch(/ctx\.slice\./);
    expect(spatial).toMatch(/ctx\.world\./);
    expect(spatial).toMatch(/canonical_label/); // 名称来自切片数据
    expect(spatial).not.toMatch(/const\s+LAYOUT[^=]*=\s*\{[^}]*pujiqiao/); // 无按对象名的固定布局表
  });

  it("3. 不存在 BeatNN / JinzeSceneNN 式场景组件", () => {
    const names = fs.readdirSync(EXP_DIR, { withFileTypes: true, recursive: true }).map((e) => e.name);
    expect(names.some((n) => /JinzeScene\d+|Scene0\d\.tsx|Beat0\d[A-Za-z]*\.tsx/i.test(n))).toBe(false);
    // 剧情真相只存在于冻结数据 + beats.ts 表演层
    expect(fs.existsSync(path.join(EXP_DIR, "beats.ts"))).toBe(true);
    expect(fs.existsSync(path.join(FROZEN, "jinze-3min-experience-script.json"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §15-4/5  Beats
// ---------------------------------------------------------------------------
describe("TASK-0014 — Experience Beats (§15-4/5)", () => {
  it("4. 五 Beats 由冻结的 8 个 semantic states 组合而成（全覆盖且互斥）", () => {
    const sceneIds = script.scenes.map((s) => s.scene_id);
    expect(sceneIds.length).toBe(8);
    expect(BEATS.length).toBe(5);
    const cov = validateBeatCoverage(BEATS, sceneIds);
    expect(cov.errors).toEqual([]);
    expect(cov.ok).toBe(true);
    const covered = BEATS.flatMap((b) => b.sceneIds);
    expect(new Set(covered).size).toBe(sceneIds.length);
    for (const id of sceneIds) expect(beatForScene(BEATS, id)).toBeDefined();
  });

  it("5. 每一时刻只有一个 Primary Surface（单值，不是列表）", () => {
    for (const b of BEATS) {
      const { composition } = resolveComposition(b.recipe, world);
      expect(typeof composition.primarySurface === "string" || composition.primarySurface === undefined).toBe(true);
      expect(Array.isArray(composition.primarySurface)).toBe(false);
      // secondary 不得包含 primary（不重复占主位）
      if (composition.primarySurface) {
        expect(composition.secondarySurfaces).not.toContain(composition.primarySurface);
      }
    }
  });

  it("5b. 每个 scene 的 Primary Surface 由 eligibility 裁决后的偏好链决定（§18）", () => {
    const resolved: Record<string, string | undefined> = {};
    for (const b of BEATS) {
      for (const sid of b.sceneIds) {
        const { composition, selection } = resolveComposition(b.recipe, world);
        const chain = [
          ...((b.preferPrimaryByScene?.[sid] ?? []) as SurfaceType[]),
          ...((b.primaryPreference ?? []) as SurfaceType[]),
          composition.primarySurface,
        ];
        const primary = chain.find((t) => selection.eligibleSurfaces.some((e) => e.surfaceType === t && e.eligible));
        expect(primary, `${sid} 无 eligible 主角`).toBeDefined();
        resolved[sid] = primary;
      }
    }
    // 关键节点：进入现场=当前精确；时间变化=时间轴；下一问=解释框架
    expect(resolved["jinze-3min/s01-today-hook"]).toBe("current_map");
    expect(resolved["jinze-3min/s06-change-through-time"]).toBe("timeline");
    expect(resolved["jinze-3min/s08-next-question"]).toBe("discovery");
    expect(resolved["jinze-3min/s07-return-today"]).toBe("current_map");
    expect(resolved["jinze-3min/s05-evidence-reveal"]).toBe("conflict_compare");
  });
});

// ---------------------------------------------------------------------------
// §5A.5 canonical cases 1..7 + §15-6..10
// ---------------------------------------------------------------------------
describe("TASK-0014 — canonical cases (§5A.5)", () => {
  it("6 & canonical-1. current exact grounding → CurrentMapSurface eligible", () => {
    expect(world.currentExactEntities.length).toBeGreaterThan(0);
    const e = evaluateSurfaceEligibility(world).find((x) => x.surfaceType === "current_map")!;
    expect(e.eligible).toBe(true);
    expect(e.reasonCode).toBe(SELECTION_REASON.CURRENT_EXACT);
    expect(e.evidenceRefs?.length).toBeGreaterThan(0);
    const beat01 = resolveComposition("IMMERSIVE_SPATIAL", world);
    expect(beat01.composition.primarySurface).toBe("current_map");
    // 当前坐标只用于「今天」，坐标系原值保留
    for (const a of slice.current_sources) {
      if (a.kind === "provider_current_object_point") expect(a.coord_system).toBe("GCJ-02");
    }
  });

  it("canonical-2. approximate grounding → ApproximateAreaSurface eligible，且不得退化为精确点", () => {
    const e = evaluateSurfaceEligibility(world).find((x) => x.surfaceType === "approximate_area")!;
    expect(e.eligible).toBe(true);
    expect(e.reasonCode).toBe(SELECTION_REASON.APPROXIMATE_ONLY);
    expect(e.blockedBy).toContain("exact_point_presentation");
    const src = fnBody(read(path.join(SURF_DIR, "SpatialSurfaces.tsx")), "ApproximateAreaSurface");
    expect(src).toContain("没有精确点");
    expect(src).toContain("约在这一带");
    expect(src).toContain("没有中心精确 marker");
    expect(src).not.toContain("map-point__dot"); // 不得复用精确点 marker
    expect(src).not.toContain("location_raw"); // 不得按坐标定位
  });

  it("canonical-3 & 7. 历史关系存在、历史几何为 0 → RelationalSpaceSurface 入选，历史几何 ineligible", () => {
    expect(world.hasHistoricalRelations).toBe(true);
    expect(world.hasHistoricalGeometry).toBe(false);
    const { composition } = resolveComposition("RELATION_DISCOVERY", world);
    expect(composition.primarySurface).toBe("relational_space");
    const rel = evaluateSurfaceEligibility(world).find((x) => x.surfaceType === "relational_space")!;
    expect(rel.eligible).toBe(true);
    expect(rel.blockedBy).toContain("exact_or_reconstructed_historical_geometry");
    // 关系空间消费的数据面无坐标字段
    const forbidden = /location|lat$|lng$|latitude|longitude|coord/i;
    for (const f of slice.features) for (const k of Object.keys(f)) expect(forbidden.test(k)).toBe(false);
    for (const r of slice.relations) for (const k of Object.keys(r)) expect(forbidden.test(k)).toBe(false);
    const relSrc = fnBody(read(path.join(SURF_DIR, "SpatialSurfaces.tsx")), "RelationalSpaceSurface");
    expect(relSrc).not.toContain("current_sources");
    expect(relSrc).not.toContain("location_raw");
  });

  it("canonical-4 & 17 & 18. 历史地图：只可 native，不得现代配准；HR-MAP-01 保持 PARTIAL_CONFIRM", () => {
    const elig = evaluateSurfaceEligibility(world);
    const native = elig.find((x) => x.surfaceType === "historical_map_native")!;
    const geo = elig.find((x) => x.surfaceType === "historical_map_georeferenced")!;
    expect(native.eligible).toBe(true);
    expect(native.reasonCode).toBe(SELECTION_REASON.NATIVE_MAP_OK);
    expect(geo.eligible).toBe(false);
    expect(geo.reasonCode).toBe(SELECTION_REASON.GEOREFERENCE_BLOCKED);
    expect(geo.blockedBy?.join(" ")).toMatch(/PARTIAL_CONFIRM|georeferencing/i);
    // 冻结状态不得升级
    expect(world.historicalMapSource?.status).toBe("HR-MAP-01=PARTIAL_CONFIRM");
    expect(world.historicalMapSource?.attributable).toBe(false);
    expect(world.historicalMapSource?.georeferenced).toBe(false);
    const p36 = slice.historical_sources.find((s: { key: string }) => s.key === "hs/1879/p36");
    expect(p36.attributable_to_slice_objects).toBe(false);
    // 组件不得暗示配准
    const src = fnBody(read(path.join(SURF_DIR, "SpatialSurfaces.tsx")), "HistoricalMapNativeSurface");
    expect(src).toContain("不做现代配准");
    expect(src).toContain("不叠加现代底图");
    expect(src).toContain("confirmed");
    expect(src).toContain("unresolved");
    expect(src).not.toMatch(/georeferenc\w*ed\s*=\s*true/i);
  });

  it("canonical-5 & 11. T11-C1/C2 → ConflictCompareSurface eligible，静默裁决 ineligible", () => {
    expect(world.conflicts.map((c) => c.ruling).sort()).toEqual(["T11-C1", "T11-C2"]);
    const elig = evaluateSurfaceEligibility(world);
    expect(elig.find((x) => x.surfaceType === "conflict_compare")!.eligible).toBe(true);
    const resolved = elig.find((x) => x.surfaceType === "resolved_single_answer")!;
    expect(resolved.eligible).toBe(false);
    expect(resolved.reasonCode).toBe(SELECTION_REASON.RESOLUTION_BLOCKED);
    const { composition } = resolveComposition("EVIDENCE_FOCUS", world);
    expect(composition.primarySurface).toBe("conflict_compare");
    for (const c of script.conflicts) {
      expect(c.decision).toContain("ACCEPT_CONFLICT");
      expect(c.decision).not.toMatch(/RESOLVED|SELECTED/i);
    }
    const conflictSrc = fnBody(read(path.join(SURF_DIR, "EvidenceNarrativeSurfaces.tsx")), "ConflictCompareSurface");
    expect(conflictSrc).toContain("不替你选边");
    expect(conflictSrc).not.toMatch(/default.*answer|selectedAnswer|pickCorrect/i);
  });

  it("canonical-6 & 15 & 16. confirmed current photos → CurrentPhotoSurface eligible；历史照片/今昔对照 ineligible", () => {
    expect(world.currentPhotosConfirmed).toBeGreaterThan(0);
    expect(world.historicalVisualAssets).toBe(0);
    const elig = evaluateSurfaceEligibility(world);
    expect(elig.find((x) => x.surfaceType === "current_photo")!.eligible).toBe(true);
    expect(elig.find((x) => x.surfaceType === "historical_photo")!.eligible).toBe(false);
    expect(elig.find((x) => x.surfaceType === "before_after")!.eligible).toBe(false);
    expect(script.visual_policy.historical_visual_assets_used).toBe(0);
    const photoSrc = fnBody(read(path.join(SURF_DIR, "EvidenceNarrativeSurfaces.tsx")), "CurrentPhotoSurface");
    expect(photoSrc).toContain("今日实景");
    expect(photoSrc).not.toMatch(/sepia|grayscale|做旧/);
  });

  it("canonical-7 & 24. 证据不足时允许 Unknown / Question / Evidence-Gap fallback（不画是合法选择）", () => {
    const empty: WorldEvidenceState = {
      currentExactEntities: [],
      approximateEntities: [],
      hasHistoricalRelations: false,
      hasHistoricalGeometry: false,
      conflicts: [],
      currentPhotosConfirmed: 0,
      historicalVisualAssets: 0,
      hasEvidencedChanges: false,
    };
    const sel = selectSurfaces(empty, { primary: ["current_map", "relational_space", "conflict_compare"] });
    expect(sel.selectedPrimary).toBeUndefined();
    expect(sel.fallback).toBe("unknown");
    // 有冲突但无其它 → evidence_gap；有历史关系但无更强证据 → question
    expect(
      selectSurfaces({ ...empty, conflicts: [{ ruling: "T11-C1", topic: "x" }] }, { primary: ["current_map"] }).fallback
    ).toBe("evidence_gap");
    expect(selectSurfaces({ ...empty, hasHistoricalRelations: true }, { primary: ["current_map"] }).fallback).toBe("question");
    // 「不画」有实现且 reasonCode 明确
    const gap = evaluateSurfaceEligibility(empty).find((x) => x.surfaceType === "unknown_gap")!;
    expect(gap.eligible).toBe(true);
    expect(gap.reasonCode).toBe(SELECTION_REASON.NOT_DRAWING_OK);
    const registry = read(path.join(EXP_DIR, "surfaceRegistry.tsx"));
    expect(registry).toContain("这一刻，墨痕选择不画");
  });

  it("9 & 10. RelationalSpace 区分 evidenced / candidate / unknown；寺↔桥 evidenced line 不得出现", () => {
    const src = fnBody(read(path.join(SURF_DIR, "SpatialSurfaces.tsx")), "RelationalSpaceSurface");
    expect(src).toMatch(/cls\s*!==\s*"E1"/); // 非 E1 → 虚线
    expect(src).toContain("rel__line--dashed");
    expect(src).toContain("rel--absent"); // 「没有一条线」有独立视觉
    expect(src).toMatch(/还没有一条线/);
    // 对称镜像关系（同一主张两向各存一条）在展示层去重，避免两条重合线
    expect(src).toMatch(/x\.key !== e\.key/);
    const templeBridge = slice.relations.find((r: { relation_key: string }) =>
      r.relation_key.includes("temple_bridge_association")
    );
    expect(templeBridge.epistemic_class).toBe("E2"); // 不得升 E1
    // 8 条关系 = 6×E1（有据）+ 1×E2（寺桥关联候选）+ 1×E3（相对位置弱线索）
    expect(slice.relations.length).toBe(8);
    expect(slice.relations.filter((r: { epistemic_class: string }) => r.epistemic_class === "E1").length).toBe(6);
    expect(slice.relations.filter((r: { epistemic_class: string }) => r.epistemic_class === "E2").length).toBe(1);
    // 询问后的固定回应：不编造
    expect(TEMPLE_BRIDGE_NON_ANSWER).toMatch(/还没有找到|没有.*证据/);
  });
});

// ---------------------------------------------------------------------------
// §15-12..14  文字减量 / Discovery / Patch
// ---------------------------------------------------------------------------
describe("TASK-0014 — text budget & narrative policy (§15-12/13/14)", () => {
  it("12. Evidence 默认 progressive disclosure（默认可见单元少于全量，其余需行动揭示）", () => {
    let totalDefault = 0;
    let totalAll = 0;
    for (const b of BEATS) {
      for (const sceneId of b.sceneIds) {
        const scene = script.scenes.find((s) => s.scene_id === sceneId)!;
        const all = scene.narrative.length;
        const def = scene.narrative.filter((u) => b.defaultUnitIds.includes(u.unit_id)).length;
        expect(def, `${b.beatId}/${sceneId} default exceeds total`).toBeLessThanOrEqual(all);
        expect(b.revealUnitIds.length, `${b.beatId} has no progressive reveal`).toBeGreaterThan(0);
        totalDefault += def;
        totalAll += all;
      }
    }
    expect(totalDefault).toBeLessThan(totalAll);
    const evSrc = fnBody(read(path.join(SURF_DIR, "EvidenceNarrativeSurfaces.tsx")), "EvidenceRevealSurface");
    expect(evSrc).toContain("未显示");
    expect(evSrc).toMatch(/ctx\.revealed/);
  });

  it("12b. 每 Beat 默认可见 narrative 字符数显著低于 TASK-0013 全量可见基准", () => {
    const rows: Array<{ beat: string; chars: number; baseline: number; blocks: number }> = [];
    for (const b of BEATS) {
      let chars = 0;
      let baseline = 0;
      let blocks = 0;
      for (const sceneId of b.sceneIds) {
        const scene = script.scenes.find((s) => s.scene_id === sceneId)!;
        for (const u of scene.narrative) {
          baseline += u.text.length;
          if (b.defaultUnitIds.includes(u.unit_id)) {
            chars += u.text.length;
            blocks += 1;
          }
        }
      }
      rows.push({ beat: b.beatId, chars, baseline, blocks });
      expect(chars, `${b.beatId} default chars not reduced`).toBeLessThan(baseline);
      expect(blocks, `${b.beatId} default blocks too many`).toBeLessThanOrEqual(3);
    }
    // 全局：默认可见字符总量相对全量基准下降
    const sum = rows.reduce((a, r) => a + r.chars, 0);
    const base = rows.reduce((a, r) => a + r.baseline, 0);
    expect(sum).toBeLessThan(base);
    expect(sum / base).toBeLessThan(0.6);
  });

  it("13. Primary Discovery 保持 INTERPRETATION_CANDIDATE，且以解释框架身份渲染", () => {
    expect(script.discoveries.primary.epistemic_classification).toBe("INTERPRETATION_CANDIDATE");
    const d = fnBody(read(path.join(SURF_DIR, "EvidenceNarrativeSurfaces.tsx")), "DiscoverySurface");
    expect(d).toMatch(/墨痕的解释\s*\/\s*尚未证实/);
    // EXP-UI-RECON-01 R3：伪公式从默认 UI 移除（→ 人话），但「合成解释不得自动升为事实」
    // 的规则本体保留在 humanLabels.ts（DISCOVERY_FORMULA），仅 ?inspector=1（devMode）渲染。
    expect(d).not.toMatch(/Evidence\(A\)\+Evidence\(B\)\+Evidence\(C\)/);
    expect(d).toMatch(/dm\(ctx\)\s*\?/);
    expect(d).toMatch(/DISCOVERY_FORMULA/);
    const labels = read(path.join(EXP_DIR, "humanLabels.ts"));
    expect(labels).toMatch(/Evidence\(A\)\+Evidence\(B\)\+Evidence\(C\)/); // 合成解释不得自动升为事实（Inspector 保留）
    expect(labels).toMatch(/三条证据各自成立/); // 默认 Human UI 的人话表达
  });

  it("14. Follow-up 保持 Patch-not-Replace（无 reload / 无 replay / 无 reset）", () => {
    const shell = read(path.join(EXP_DIR, "ExperienceShell.tsx"));
    expect(shell).toMatch(/FOLLOWUP_REPLAN/);
    expect(shell).toMatch(/patchActive/);
    expect(shell).not.toMatch(/window\.location|router\.(push|refresh)|location\.reload/);
    expect(shell).not.toMatch(/createRuntimeState\(\s*script\s*\)[^;]*setState/);
  });
});

// ---------------------------------------------------------------------------
// §15-19/20  边界
// ---------------------------------------------------------------------------
describe("TASK-0014 — boundaries (§15-19/20/21)", () => {
  it("19. DB 零写：新增引擎与体验源码不引入任何 DB 客户端", () => {
    const files = [
      path.join(ROOT, "packages", "experience-engine", "src", "surface-eligibility.ts"),
      path.join(ROOT, "packages", "experience-engine", "src", "composition-recipes.ts"),
      path.join(ROOT, "packages", "experience-engine", "src", "experience-beats.ts"),
      ...fs.readdirSync(EXP_DIR, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(EXP_DIR, e.name);
        return e.isDirectory() ? [] : [p];
      }),
      ...fs.readdirSync(SURF_DIR).map((f) => path.join(SURF_DIR, f)),
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/data-access|queryRows|postgres|mohen_dev|pg\.Client/i);
    }
  });

  it("20. Legacy 零写（hushang-jingwei/data/seed.master.json 未被触碰）", () => {
    if (!fs.existsSync(LEGACY_SEED)) return;
    const st = fs.statSync(LEGACY_SEED);
    expect(st.size).toBeGreaterThan(0);
    // 判据（TASK-0015 Phase 0 加固）：Legacy 仓库工作区**本来就脏**，
    // 用「git status 干净」证明零写入会把既有改动误判成本任务造成（见 mohen 记忆 §6.3）。
    // 正确判据＝运行期间 size + mtime 未变（对照开工快照）。
    expect(st.size).toBe(LEGACY_SEED_BASELINE.size);
    expect(Math.floor(st.mtimeMs)).toBe(LEGACY_SEED_BASELINE.mtimeMs);
    // 辅以：本仓库任何源码都不得指向该数据文件（写路径不存在）
    const srcs = [
      read(path.join(ROOT, "packages", "experience-engine", "src", "index.ts")),
      read(path.join(EXP_DIR, "beats.ts")),
      read(path.join(EXP_DIR, "ExperienceShell.tsx")),
    ];
    for (const s of srcs) expect(s).not.toContain("seed.master.json");
  });

  it("21. build / typecheck / guards 入口齐备（实际执行结果见 result 报告）", () => {
    const pkg = JSON.parse(read(path.join(ROOT, "package.json")));
    expect(pkg.scripts.typecheck).toBeTruthy();
    expect(pkg.scripts.build).toBeTruthy();
    expect(pkg.scripts.guard).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, "scripts", "check-doc-budget.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "scripts", "check-structure.mjs"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §15-22..25  Evidence-aware Surface Selection
// ---------------------------------------------------------------------------
describe("TASK-0014 — Evidence-aware Surface Selection (§15-22/23/24/25)", () => {
  it("22. eligibility 可解释：每条都有 reasonCode；ineligible 必须给出 blockedBy", () => {
    const elig = evaluateSurfaceEligibility(world);
    expect(elig.length).toBe(ALL_SURFACE_TYPES.length);
    for (const e of elig) {
      expect(e.reasonCode.length, `${e.surfaceType} lacks reasonCode`).toBeGreaterThan(0);
      if (!e.eligible) expect(e.blockedBy?.length ?? 0, `${e.surfaceType} lacks blockedBy`).toBeGreaterThan(0);
    }
    expect(elig.filter((e) => e.eligible).length).toBeGreaterThan(0);
    expect(elig.filter((e) => !e.eligible).length).toBeGreaterThan(0);
  });

  it("23. Composition 不得选择 evidence-ineligible Surface（preferences 只是排序，不是许可证）", () => {
    const noExact: WorldEvidenceState = { ...world, currentExactEntities: [] };
    // 偏好 current_map 但无精确坐标 → 不得选中
    const sel = selectSurfaces(noExact, { primary: ["current_map", "approximate_area"] });
    expect(sel.selectedPrimary).not.toBe("current_map");
    const { composition } = resolveComposition("IMMERSIVE_SPATIAL", noExact);
    expect(composition.primarySurface).not.toBe("current_map");
    expect(composition.primarySurface).toBe("approximate_area");
    // 任何 recipe 的 primary/secondary 都必须来自 eligible 集合
    for (const recipe of ["IMMERSIVE_SPATIAL", "TIME_SHIFT", "RELATION_DISCOVERY", "EVIDENCE_FOCUS", "RETURN_TO_PRESENT", "DISCOVERY_QUESTION"] as const) {
      for (const w of [world, noExact, { ...world, conflicts: [], hasHistoricalRelations: false }]) {
        const r = resolveComposition(recipe, w);
        const eligibleSet = new Set(r.selection.eligibleSurfaces.filter((e) => e.eligible).map((e) => e.surfaceType));
        if (r.composition.primarySurface) expect(eligibleSet.has(r.composition.primarySurface)).toBe(true);
        for (const s of r.composition.secondarySurfaces) expect(eligibleSet.has(s)).toBe(true);
      }
    }
  });

  it("23b. Beat 的 primaryPreference / preferPrimaryByScene 只是偏好：ineligible 一律丢弃", () => {
    const bare: WorldEvidenceState = {
      currentExactEntities: [],
      approximateEntities: [],
      hasHistoricalRelations: false,
      hasHistoricalGeometry: false,
      conflicts: [],
      currentPhotosConfirmed: 0,
      historicalVisualAssets: 0,
      hasEvidencedChanges: false,
    };
    const sel = selectSurfaces(bare, {});
    for (const b of BEATS) {
      for (const sid of b.sceneIds) {
        const prefs = [...(b.preferPrimaryByScene?.[sid] ?? []), ...(b.primaryPreference ?? [])] as SurfaceType[];
        const chosen = prefs.find((t) => sel.eligibleSurfaces.some((e) => e.surfaceType === t && e.eligible));
        for (const t of ["current_map", "approximate_area", "relational_space", "current_photo", "timeline", "conflict_compare"] as SurfaceType[]) {
          if (prefs.includes(t)) expect(chosen, `${sid} 在空证据世界上仍选了 ${t}`).not.toBe(t);
        }
      }
    }
  });

  it("25. 历史几何资格不得从 current geometry 继承（Geometry itself is a Claim）", () => {
    for (const w of [world, { ...world, hasHistoricalGeometry: true }]) {
      const e = evaluateSurfaceEligibility(w).find((x) => x.surfaceType === "historical_geometry")!;
      expect(e.eligible).toBe(false);
      expect(e.reasonCode).toBe(SELECTION_REASON.HISTORICAL_GEOMETRY_BLOCKED);
      expect(e.blockedBy?.join(" ")).toContain("GEOMETRY_IS_A_CLAIM");
    }
    // 切片冻结：无历史几何、无来源几何；feature 的 geometry_type 只允许
    // unknown / point / area（当代 provider 锚点），绝不允许线/面历史形状
    expect(String(slice.historical_geometry_status)).toBe("absent_no_source");
    for (const f of slice.features) {
      expect(["unknown", "point", "area"], `${f.feature_key} geometry_type=${f.geometry_type}`).toContain(f.geometry_type);
      expect(f.geometry_type).not.toMatch(/line|linestring|polygon|river|street|route/i);
      for (const a of (f.anchors ?? []) as Array<{ historical_position_proof: string }>) {
        expect(a.historical_position_proof).toBe("false");
      }
    }
    // 无伪造历史几何文件
    const hasGeo = (dir: string): boolean =>
      fs.readdirSync(dir, { withFileTypes: true }).some((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? hasGeo(p) : /\.(geojson|shp|kml)$/i.test(e.name);
      });
    expect(hasGeo(path.join(ROOT, "apps", "web"))).toBe(false);
  });
});
