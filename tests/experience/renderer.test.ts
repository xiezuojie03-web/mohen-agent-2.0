// tests/experience/renderer.test.ts — TASK-0013 验收测试。
//
// 覆盖任务书 §17（Required automated validation）全部条目。
// 约定：不 spawn、不连 DB；消费 apps/web/data/experience/ 的冻结产物副本 +
// packages/experience-engine 纯运行时；前端只做静态结构断言（语义而非脆弱 UI 细节，§21-29）。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  createRuntimeState,
  reduceExperience,
  deriveView,
  checkFrozenInvariants,
  isPresentScene,
  type ExperienceScript,
  type FollowupPatch,
} from "../../packages/experience-engine/src/experience-runtime";

const ROOT = path.resolve(__dirname, "..", "..");
const FROZEN = path.join(ROOT, "apps", "web", "data", "experience");
const EXPORTS = path.join(ROOT, "data", "exports");
const EXP_DIR = path.join(ROOT, "apps", "web", "app", "experience", "jinze-water-net");
const LEGACY_SEED = path.join(path.resolve(ROOT, "..", "hushang-jingwei"), "data", "seed.master.json");

const script = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-script.json"), "utf8")
) as ExperienceScript;
const patch = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-followup-patch.json"), "utf8")
) as FollowupPatch;
const slice = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-historical-spatial-slice.json"), "utf8"));

const s05 = script.scenes.find((s) => s.scene_id.endsWith("s05-evidence-reveal"))!;
const s08 = script.scenes.find((s) => s.scene_id.endsWith("s08-next-question"))!;

// 到达第 n 场（0 基）的运行时状态
function goto(sceneIndex: number) {
  let st = createRuntimeState(script);
  for (let i = 0; i < sceneIndex; i++) st = reduceExperience(st, { type: "NEXT" }, script, patch);
  return st;
}

describe("TASK-0013 Jinze Experience Renderer — frozen artifacts integrity", () => {
  it("1. apps/web 冻结副本与 data/exports 原件逐字一致（若原件存在）", () => {
    for (const name of [
      "jinze-3min-experience-script.json",
      "jinze-3min-experience-state-sequence.json",
      "jinze-3min-experience-followup-patch.json",
      "jinze-historical-spatial-slice.json",
    ]) {
      const copy = fs.readFileSync(path.join(FROZEN, name));
      const orig = path.join(EXPORTS, name);
      if (fs.existsSync(orig)) {
        expect(copy.equals(fs.readFileSync(orig)), `${name} differs from exports`).toBe(true);
      }
    }
  });

  it("2. 冻结不变量校验通过（场景数/时长/禁用模式/组合解释分类/patch 契约/历史视觉 0）", () => {
    const report = checkFrozenInvariants(script, patch);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

describe("TASK-0013 — 8-scene runtime navigation (§17-1/2)", () => {
  it("3. 全部 8 场可导航；NEXT 走完置 finished；PREV 可回退", () => {
    expect(script.scenes.length).toBe(8);
    let st = createRuntimeState(script);
    for (let i = 0; i < 7; i++) {
      st = reduceExperience(st, { type: "NEXT" }, script, patch);
      expect(st.sceneIndex).toBe(i + 1);
    }
    expect(st.finished).toBe(false);
    // 终场再 NEXT 不越界
    st = reduceExperience(st, { type: "NEXT" }, script, patch);
    expect(st.finished).toBe(true);
    expect(st.sceneIndex).toBe(7);
    // PREV 回退且记录 trail
    st = reduceExperience(st, { type: "PREV" }, script, patch);
    expect(st.sceneIndex).toBe(6);
    expect(st.trail.at(-1)).toBe(script.scenes[6].scene_id);
  });

  it("4. 场景内容来自冻结产物（运行时不重写剧情）", () => {
    const view = deriveView(goto(4), script);
    expect(view.scene.experience_goal).toBe(s05.experience_goal);
    // 逐字抽查：叙事文本必须与冻结 JSON 完全一致（运行时无第二剧情源）
    expect(view.scene.narrative[0].text).toBe(s05.narrative[0].text);
    // experience-engine 与 web 源码中不出现剧情长句
    const sources = [
      fs.readFileSync(path.join(ROOT, "packages/experience-engine/src/experience-runtime.ts"), "utf8"),
      ...fs.readdirSync(EXP_DIR).flatMap((f) => {
        const p = path.join(EXP_DIR, f);
        return fs.statSync(p).isFile() ? [fs.readFileSync(p, "utf8")] : [];
      }),
      ...fs.readdirSync(path.join(EXP_DIR, "surfaces")).map((f) => fs.readFileSync(path.join(EXP_DIR, "surfaces", f), "utf8")),
    ];
    for (const src of sources) {
      for (const sc of script.scenes) {
        for (const u of sc.narrative) {
          // 取叙事文本前 20 字作为指纹（避免把整个文本贴进源码的重复真相）
          const fingerprint = u.text.slice(0, 20);
          expect(src.includes(fingerprint), `scene truth duplicated in source: ${u.unit_id}`).toBe(false);
        }
      }
    }
  });
});

describe("TASK-0013 — spatial honesty (§17-4/5/6, 核心验收点一)", () => {
  it("5. GEOGRAPHIC_EXACT 只出现在当下场景；历史场景全部 RELATIONAL_HISTORICAL", () => {
    for (const s of script.scenes) {
      if (s.spatial_mode === "GEOGRAPHIC_EXACT") expect(isPresentScene(s)).toBe(true);
      if (!isPresentScene(s)) {
        expect(["RELATIONAL_HISTORICAL", "HISTORICAL_MAP_SOURCE", "SPATIAL_UNKNOWN"]).toContain(s.spatial_mode);
      }
    }
    // s01→s02 正是 精确→关系 的核心转场
    expect(script.scenes[0].spatial_mode).toBe("GEOGRAPHIC_EXACT");
    expect(script.scenes[1].spatial_mode).toBe("RELATIONAL_HISTORICAL");
  });

  it("6. RELATIONAL_HISTORICAL 消费的数据面无任何现代坐标（无隐藏坐标复用）", () => {
    // 关系表面只消费 features + relations；二者的**字段名**不得携带位置数据
    const forbiddenKey = /location|lat$|lng$|latitude|longitude|coord/i;
    for (const f of slice.features)
      for (const k of Object.keys(f)) expect(forbiddenKey.test(k), `${f.feature_key}.${k}`).toBe(false);
    for (const r of slice.relations)
      for (const k of Object.keys(r)) expect(forbiddenKey.test(k), `${r.relation_key}.${k}`).toBe(false);
    // 坐标只存在于 current_sources（modern_map 专用）；GCJ-02（对象点）与 WGS-84（镇级参考）分列不混算
    for (const a of slice.current_sources) {
      if (!a.location_raw) continue;
      if (a.kind.startsWith("provider_current_object")) expect(a.coord_system).toBe("GCJ-02");
      if (a.kind === "town_level_reference") expect(a.coord_system).toBe("WGS-84");
    }
    // RelationalSpaceSurface（TASK-0014 后位于 SpatialSurfaces.tsx 内）不得消费 current_sources
    const spatialSrc = fs.readFileSync(path.join(EXP_DIR, "surfaces", "SpatialSurfaces.tsx"), "utf8");
    const relStart = spatialSrc.indexOf("export function RelationalSpaceSurface");
    expect(relStart).toBeGreaterThan(-1);
    const relEnd = spatialSrc.indexOf("export function", relStart + 10);
    const relSrc = spatialSrc.slice(relStart, relEnd === -1 ? undefined : relEnd);
    expect(relSrc).not.toContain("current_sources");
    expect(relSrc).not.toContain("location_raw");
  });

  it("7. 无伪造历史几何（切片状态 + web 目录无几何文件）", () => {
    // 冻结切片明示：历史几何缺席且无来源（absent_no_source）
    expect(String(slice.historical_geometry_status)).toBe("absent_no_source");
    const hasGeo = (dir: string): boolean =>
      fs.readdirSync(dir, { withFileTypes: true }).some((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return hasGeo(p);
        return /\.(geojson|shp|kml)$/i.test(e.name);
      });
    expect(hasGeo(path.join(ROOT, "apps", "web"))).toBe(false);
  });
});

describe("TASK-0013 — Evidence Reveal (§17-7, 核心验收点二)", () => {
  it("8. s05 同时浮出 T11-C1/C2 两组冲突，均未裁决、前端不代选答案", () => {
    const conflicts = script.conflicts.filter(
      (c) => (c as { surfaced_in_scene?: string }).surfaced_in_scene === s05.scene_id
    );
    expect(conflicts.map((c) => c.ruling).sort()).toEqual(["T11-C1", "T11-C2"]);
    for (const c of conflicts) {
      expect(c.decision).toContain("ACCEPT_CONFLICT");
      expect(c.decision).not.toMatch(/RESOLVED|SELECTED/i);
    }
    // 冲突卡渲染源码（TASK-0014 后位于 EvidenceNarrativeSurfaces.tsx）：两卡并列 + 「不替你选边」，无单选逻辑
    const evSrc = fs.readFileSync(path.join(EXP_DIR, "surfaces", "EvidenceNarrativeSurfaces.tsx"), "utf8");
    expect(evSrc).toContain("不替你选边");
    expect(evSrc).not.toMatch(/default.*answer|selectedAnswer|pickCorrect/i);
    // s05 叙事中有 CONFLICT 级单元（冲突作为体验内容，不是附录）
    expect(s05.narrative.some((u) => u.level === "CONFLICT")).toBe(true);
  });
});

describe("TASK-0013 — s08 epistemic rendering (§17-8, 核心验收点三)", () => {
  it("9. s08 保持 FACT_EVIDENCED → INTERPRETATION_CANDIDATE → UNKNOWN 序列，解释与事实视觉分级不同", () => {
    const levels = s08.narrative.slice(0, 3).map((u) => u.level);
    expect(levels).toEqual(["FACT_EVIDENCED", "INTERPRETATION_CANDIDATE", "UNKNOWN"]);
    const interp = s08.narrative.find((u) => u.unit_id === "s08-u1b")!;
    expect(interp.evidence_refs).toEqual([]);
    expect(interp.text).toContain("不是已证历史事实");
    // 视觉分级：CSS 中 INTERPRETATION 与 FACT 的边框样式/背景必须不同（锚定规则块而非注释）
    const css = fs.readFileSync(path.join(EXP_DIR, "experience.css"), "utf8");
    const factBlock = css.slice(css.indexOf(".unit--FACT_EVIDENCED {"), css.indexOf(".unit--FACT_LIMITED {"));
    const interpBlock = css.slice(
      css.indexOf(".unit--INTERPRETATION_CANDIDATE {"),
      css.indexOf(".unit--UNKNOWN {")
    );
    expect(factBlock).toMatch(/solid/);
    expect(interpBlock).toMatch(/dashed/i);
    expect(factBlock).not.toMatch(/font-style:\s*italic/);
    expect(interpBlock).toMatch(/font-style:\s*italic/);
    // 主发现以解释框架身份渲染（badge 而非事实徽章；TASK-0014 后收敛到 DiscoverySurface）
    const surfacesSrc = fs.readFileSync(path.join(EXP_DIR, "surfaces", "EvidenceNarrativeSurfaces.tsx"), "utf8");
    expect(surfacesSrc).toMatch(/墨痕的解释\s*\/\s*尚未证实/);
  });
});

describe("TASK-0013 — canonical follow-up Patch-not-Replace (§17-9/10/11, 核心验收点四)", () => {
  it("10. follow-up 消费冻结 patch JSON；应用后不重置：sceneIndex 不变、trail 完整保留且追加", () => {
    expect(patch.trigger_question).toBe("那颐浩寺和普济桥以前真的有关系吗？");
    expect(patch.trigger_question).toBe(script.followup.trigger_question);
    let st = goto(7);
    const trailBefore = [...st.trail];
    expect(trailBefore.length).toBe(8);
    st = reduceExperience(st, { type: "TRIGGER_FOLLOWUP" }, script, patch);
    expect(st.patchActive).toBe(true);
    expect(st.patchId).toBe(patch.patch_id);
    expect(st.sceneIndex).toBe(7); // 不重启、不回场
    expect(st.trail.slice(0, 8)).toEqual(trailBefore); // 历史完整保留
    expect(st.trail.length).toBe(9); // 仅追加补丁事件
    // 补丁契约来自冻结 JSON
    expect(patch.behavior_contract.restart_experience).toBe(false);
    expect(patch.behavior_contract.patch_not_replace).toBe(true);
    expect(patch.behavior_contract.may_invent_answer).toBe(false);
    expect(patch.base_scene_count).toBe(8);
    // preserved 展示已知，changed 前景化未知，next_actions 不编造答案
    expect(Object.keys(patch.preserved).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(patch.changed).length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(patch.next_actions)).toContain("research_lead");
  });

  it("11. Shell 源码层面：follow-up 走 dispatch PATCH，无 route reload / 无 replay / 无 reset", () => {
    const shellSrc = fs.readFileSync(path.join(EXP_DIR, "ExperienceShell.tsx"), "utf8");
    expect(shellSrc).toContain("FOLLOWUP_REPLAN");
    expect(shellSrc).not.toMatch(/router\.(push|replace|refresh)|location\.(href|reload)|window\.location/);
    // RESTART 只能被显式动作触发（followup 路径不调用）
    expect(shellSrc).not.toContain('type: "RESTART"');
  });
});

describe("TASK-0013 — visual policy (§17-12/13/14)", () => {
  it("12. current_photo 只用冻结白名单（Commons confirmed current）；不暗示为历史照片", () => {
    // 白名单去重后恰 3 张（同一照片可跨场景复用）
    const photos = [
      ...new Map(
        script.scenes
          .flatMap((s) => s.visual_assets)
          .filter((a) => a.type === "photo")
          .map((a) => [a.id, a])
      ).values(),
    ];
    expect(photos.length).toBe(3);
    for (const a of photos) {
      expect(a.uri).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(a.rights).toContain("CC");
    }
    const surfacesAll = fs.readFileSync(path.join(EXP_DIR, "surfaces", "EvidenceNarrativeSurfaces.tsx"), "utf8");
    const photoStart = surfacesAll.indexOf("export function CurrentPhotoSurface");
    expect(photoStart).toBeGreaterThan(-1);
    const photoEnd = surfacesAll.indexOf("export function", photoStart + 10);
    const photoSrc = surfacesAll.slice(photoStart, photoEnd === -1 ? undefined : photoEnd);
    expect(photoSrc).toContain("scene.visual_assets");
    expect(photoSrc).toContain("今日实景");
    expect(photoSrc).not.toMatch(/sepia|grayscale|做旧/); // 不做旧
    // CSS 明确 filter: none
    const css = fs.readFileSync(path.join(EXP_DIR, "experience.css"), "utf8");
    expect(css).toMatch(/filter:\s*none/);
  });

  it("13. 历史视觉资产 = 0；无 AI 历史视觉路径", () => {
    expect(script.visual_policy.historical_visual_assets_used).toBe(0);
    // experience 目录源码无图像生成/AI 历史视觉引用
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : [fs.readFileSync(p, "utf8")];
      });
    for (const src of walk(EXP_DIR)) {
      expect(src).not.toMatch(/imagegen|image-generation|dall-?e|stable-?diffusion|midjourney/i);
    }
  });
});

describe("TASK-0013 — boundaries & hard invariants (§17-16/17/18, §21)", () => {
  it("14. Legacy 零写（seed.master.json 未被触碰）", () => {
    if (!fs.existsSync(LEGACY_SEED)) return;
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

  it("15. DB 零写：运行时与体验源码不引入任何 DB 客户端", () => {
    const sources = [
      fs.readFileSync(path.join(ROOT, "packages/experience-engine/src/experience-runtime.ts"), "utf8"),
      ...fs
        .readdirSync(EXP_DIR, { withFileTypes: true })
        .flatMap((e) => {
          const p = path.join(EXP_DIR, e.name);
          return e.isDirectory() ? [] : [fs.readFileSync(p, "utf8")];
        }),
    ];
    for (const src of sources) {
      expect(src).not.toMatch(/data-access|queryRows|postgres|\.\/index\.mjs|mohen_dev/i);
    }
  });

  it("16. 冻结 T11-C1…C5 语义原样保留；主发现保持 INTERPRETATION_CANDIDATE", () => {
    expect(script.t11_rulings_applied.map((r) => r.ruling)).toEqual(["T11-C1", "T11-C2", "T11-C3", "T11-C4", "T11-C5"]);
    const c5 = script.waterway_temporal_semantics as Record<string, string>;
    expect(c5.temporal_assertion).toBe("none");
    expect(c5.temporal_evidence_status).toBe("not_applicable");
    expect(script.discoveries.primary.epistemic_classification).toBe("INTERPRETATION_CANDIDATE");
    // E2 不得升级 E1：切片关系类保持不变
    const e2 = slice.relations.find((r: { relation_key: string }) => r.relation_key.includes("temple_bridge_association"));
    expect(e2.epistemic_class).toBe("E2");
  });

  it("17. 路由文件存在且直接进入体验（无门户/聊天落地页），SurfaceRenderer 按表面分发（无场景组件）", () => {
    fs.accessSync(path.join(EXP_DIR, "page.tsx"));
    // TASK-0014：SurfaceRenderer 升级为 Surface Registry（surfaceType → component）
    const registrySrc = fs.readFileSync(path.join(EXP_DIR, "surfaceRegistry.tsx"), "utf8");
    for (const surface of ["current_map", "approximate_area", "relational_space", "timeline", "conflict_compare", "current_photo", "discovery", "question"]) {
      expect(registrySrc).toContain(`${surface}:`);
    }
    // 硬架构测试：不存在 JinzeSceneNN / BeatNN 式场景组件
    const all = fs.readdirSync(EXP_DIR, { withFileTypes: true, recursive: true }).map((e) => e.name);
    expect(all.some((n) => /JinzeScene\d+|Scene0\d\.tsx/i.test(n))).toBe(false);
  });
});
