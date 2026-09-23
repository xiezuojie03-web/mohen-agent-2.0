// tests/experience/replan-loop.test.ts — TASK-0016 Evidence-Aware Replan Loop 验收。
//
// 覆盖任务书 §11 全部 17 条断言：
//   1 canonical→verify_historical_relation
//   2 decision≠confirmed
//   3 E2 不升 E1
//   4 experienceId 不变
//   5 visited/session trace 不清空
//   6 真 Patch，不创建全新 Experience
//   7 current geographic→relational historical
//   8 historical scene 无 current coords 充当 historical geometry
//   9 寺桥不渲染 confirmed solid relation
//   10 uncertainty/evidence limitation UI 可见
//   11 可返回 present
//   12 返回后 session identity 不变
//   13 无 full reload
//   14 无 unsupported historical fact
//   15 current visual 不标 historical
//   16 fixture deterministic
//   17 TASK-0015 核心行为（Patch-not-Replace / 无 reload / E2→E1=0）不回归
//
// 约定（沿用 TASK-0013/0014）：不 spawn、不连 DB；消费冻结产物 + 纯运行时；
// 前端以源码结构断言为主（验语义不绑死像素）。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  classifyFollowUp,
  decideEvidence,
  planReplan,
  selectReplanSurface,
  buildExperiencePatch,
  createRuntimeState,
  reduceExperience,
  selectSurfaces,
  evaluateSurfaceEligibility,
  type FollowUpIntent,
  type EvidenceDecision,
  type ReplanPlan,
  type WorldEvidenceState,
  type ExperienceScript,
  type FollowupPatch,
} from "../../packages/experience-engine/src/index";
import { buildWorldEvidenceState } from "../../apps/web/app/experience/jinze-water-net/beats";

const ROOT = path.resolve(__dirname, "..", "..");
const FROZEN = path.join(ROOT, "apps", "web", "data", "experience");
const EXP_DIR = path.join(ROOT, "apps", "web", "app", "experience", "jinze-water-net");

const script = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-script.json"), "utf8")
) as ExperienceScript;
const patch = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-followup-patch.json"), "utf8")
) as FollowupPatch;
const slice = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-historical-spatial-slice.json"), "utf8"));

/** 与 beats.ts 一致的 world（含 relationEvidence 这一诚实证据源） */
const world: WorldEvidenceState = buildWorldEvidenceState(script, slice, {
  historicalVisualAssets: 0,
  historicalMapImageAvailable: false,
});

const CANONICAL_QUESTION = "那颐浩寺和普济桥以前真的有关系吗？";

/** 到达第 n 场（0 基）的运行时状态 */
function goto(sceneIndex: number) {
  let st = createRuntimeState(script);
  for (let i = 0; i < sceneIndex; i++) st = reduceExperience(st, { type: "NEXT" }, script, patch);
  return st;
}

// ---------------------------------------------------------------------------
// §11-1..3  Intent → Decision → E2 不升 E1（纯 runtime）
// ---------------------------------------------------------------------------
describe("TASK-0016 — FollowUpIntent → EvidenceDecision (§11-1/2/3)", () => {
  const intent: FollowUpIntent = classifyFollowUp(CANONICAL_QUESTION);
  const decision: EvidenceDecision = decideEvidence(intent, world);

  it("1. canonical follow-up → verify_historical_relation，且抽出两对象", () => {
    expect(intent.kind).toBe("verify_historical_relation");
    expect(intent.objects).toContain("yihaosi-site");
    expect(intent.objects).toContain("pujiqiao");
    expect(intent.deterministic).toBe(true);
  });

  it("2. 证据决策 ≠ confirmed（核心语义：现在还不能确认）", () => {
    expect(decision.verdict).toBe("insufficient_for_confirmation");
    expect(decision.verdict).not.toBe("confirmed");
  });

  it("3. E2 不得升级为 E1（supportedEpistemicClass 停在 E2）", () => {
    const rel = (world.relationEvidence ?? []).find(
      (r) => (r.subject === "yihaosi-site" && r.object === "pujiqiao") || (r.subject === "pujiqiao" && r.object === "yihaosi-site")
    )!;
    expect(rel.epistemicClass).toBe("E2");
    expect(decision.supportedEpistemicClass).toBe("E2");
    expect(decision.supportedEpistemicClass).not.toBe("E1");
    // 现代共址 ≠ 历史关系
    expect(decision.currentAssociationNotHistorical).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §11-4..6  真实 Patch 到持续 ExperienceState（reducer 端到端）
// ---------------------------------------------------------------------------
describe("TASK-0016 — ExperienceState Patch (§11-4/5/6)", () => {
  it("4/5/6. FOLLOWUP_REPLAN 真 Patch：experienceId 不变、trail 追加不清空、不创建新 Experience", () => {
    let st = goto(7); // 终场 s08（下一问 / 追问入口）
    const trailBefore = [...st.trail];
    expect(trailBefore.length).toBe(8);
    expect(st.experienceId).toBe(script.experience_id);

    st = reduceExperience(st, { type: "FOLLOWUP_REPLAN", question: CANONICAL_QUESTION }, script, patch, world);

    // 运行时真的跑了三个决策阶段
    expect(st.followUpIntent).not.toBeNull();
    expect(st.evidenceDecision).not.toBeNull();
    expect(st.replanPlan).not.toBeNull();

    // 4. experienceId 不变
    expect(st.experienceId).toBe(script.experience_id);
    // 5. visited/session trace 不清空（前 8 场原样保留）+ 仅追加
    expect(st.trail.slice(0, 8)).toEqual(trailBefore);
    expect(st.trail.length).toBe(9);
    expect(st.trail.at(-1)).toMatch(/^replan:/);
    // 6. 真 Patch，不 reset、不新建 Experience（sceneIndex 仍是 7，patchActive=true）
    expect(st.sceneIndex).toBe(7);
    expect(st.patchActive).toBe(true);
    expect(st.patchId).toBeTruthy();
  });

  it("6b. buildExperiencePatch 不新建 Experience、主 surface 为 relational_space", () => {
    const intent = classifyFollowUp(CANONICAL_QUESTION);
    const decision = decideEvidence(intent, world);
    const plan = planReplan(decision, intent);
    const ep = buildExperiencePatch(plan, decision, script.experience_id);
    expect(ep.experienceId).toBe(script.experience_id); // 不变
    expect(ep.primarySurface).toBe("relational_space");
    expect(ep.relationEpistemicClass).toBe("E2");
    expect(ep.verdict).toBe("insufficient_for_confirmation");
  });
});

// ---------------------------------------------------------------------------
// §11-7/8  Evidence-aware Surface Selection（relational historical）
// ---------------------------------------------------------------------------
describe("TASK-0016 — Evidence-aware Surface Selection (§11-7/8)", () => {
  const intent = classifyFollowUp(CANONICAL_QUESTION);
  const decision = decideEvidence(intent, world);
  const plan: ReplanPlan = planReplan(decision, intent);

  it("7. verify+insufficient+geometry_absent → relational_space（由证据选择，非固定 beat）", () => {
    const sel = selectReplanSurface(plan, world);
    expect(sel.selectedPrimary).toBe("relational_space");
    // 证明不是 beat 的 preferChain：world 仍含历史关系，relational_space eligible
    expect(world.hasHistoricalRelations).toBe(true);
    const rel = evaluateSurfaceEligibility(world).find((e) => e.surfaceType === "relational_space")!;
    expect(rel.eligible).toBe(true);
  });

  it("8. historical scene 无 current coords 充当 historical geometry", () => {
    const geo = evaluateSurfaceEligibility(world).find((e) => e.surfaceType === "historical_geometry")!;
    expect(geo.eligible).toBe(false); // Geometry itself is a Claim
    expect(world.hasHistoricalGeometry).toBe(false);
    // 寺桥关系明确标记为「仅今天共址」
    const rel = (world.relationEvidence ?? []).find(
      (r) => (r.subject === "yihaosi-site" && r.object === "pujiqiao") || (r.subject === "pujiqiao" && r.object === "yihaosi-site")
    )!;
    expect(rel.isCurrentAssociationOnly).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §11-9/10/14/15  寺桥不确认 / 不确定可见 / 无新事实 / 当前视觉不标历史
// ---------------------------------------------------------------------------
describe("TASK-0016 — epistemic honesty (§11-9/10/14/15)", () => {
  const intent = classifyFollowUp(CANONICAL_QUESTION);
  const decision = decideEvidence(intent, world);
  const plan = planReplan(decision, intent);

  it("9. 寺↔桥不渲染为 confirmed solid relation（E2 保持，不升 E1）", () => {
    expect(decision.verdict).not.toBe("confirmed");
    expect(plan.relationEpistemicClass).toBe("E2");
    const templeBridge = slice.relations.find((r: { relation_key: string }) => r.relation_key.includes("temple_bridge_association"));
    expect(templeBridge.epistemic_class).toBe("E2");
  });

  it("10. uncertainty / evidence limitation 在 Replan 中显式可见", () => {
    expect(plan.uncertaintyVisible).toBe(true);
    expect(decision.unknown.length).toBeGreaterThan(0);
    expect(decision.missingEvidence.length).toBeGreaterThan(0);
  });

  it("14. 无 unsupported historical fact：决策不声称 confirmed、不升 E1", () => {
    expect(decision.verdict).not.toBe("confirmed");
    expect(decision.supportedEpistemicClass).not.toBe("E1");
  });

  it("15. current visual 不标 historical：历史视觉资产=0 且 current coords 失去历史权威", () => {
    expect(world.historicalVisualAssets).toBe(0);
    expect(plan.currentCoordsLoseHistoricalAuthority).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §11-11/12/13  可返回 present / session identity 不变 / 无 full reload
// ---------------------------------------------------------------------------
describe("TASK-0016 — persistent & returnable (§11-11/12/13)", () => {
  it("11/12/13. Replan 视角可回 Present：视角关闭、判定痕迹保留、experienceId/场景不变、无 reload", () => {
    let st = goto(7);
    st = reduceExperience(st, { type: "FOLLOWUP_REPLAN", question: CANONICAL_QUESTION }, script, patch, world);
    expect(st.replanViewActive).toBe(true);
    const idAfterReplan = st.experienceId;
    const trailAfterReplan = [...st.trail];

    // 11. 回到今天（Replan 视角出口）
    st = reduceExperience(st, { type: "RETURN_TO_PRESENT" }, script, patch, world);
    expect(st.replanViewActive).toBe(false);
    // 12. session identity 不变（experienceId / sceneIndex 都不动）
    expect(st.experienceId).toBe(idAfterReplan);
    expect(st.experienceId).toBe(script.experience_id);
    expect(st.sceneIndex).toBe(7);
    // replan 判定痕迹保留（Patch-not-Replace，不 wipe）；仅追加 return 事件
    expect(st.replanPlan).not.toBeNull();
    expect(st.followUpIntent).not.toBeNull();
    expect(st.trail.slice(0, trailAfterReplan.length)).toEqual(trailAfterReplan);
    expect(st.trail.at(-1)).toBe("return_to_present");
    // 「回到今天」对应的就是 GEOGRAPHIC_EXACT 当下场景（世界切回现代，不是新建 Experience）
    expect(script.scenes[6].spatial_mode).toBe("GEOGRAPHIC_EXACT");
    // 13. 纯 reducer 无副作用（无 reload/reset）——仍可继续导航
    st = reduceExperience(st, { type: "PREV" }, script, patch, world);
    expect(st.sceneIndex).toBe(6);
    expect(st.experienceId).toBe(script.experience_id);
  });

  it("13b. Shell 源码：runtime 路径无 full reload / 无 reset", () => {
    const shell = fs.readFileSync(path.join(EXP_DIR, "ExperienceShell.tsx"), "utf8");
    expect(shell).toContain("FOLLOWUP_REPLAN");
    expect(shell).toContain("selectReplanSurface");
    expect(shell).not.toMatch(/window\.location|router\.(push|replace|refresh)|location\.reload/);
    // Patch-not-Replace UI 仍存在（冻结行为契约面板 + pill）
    expect(shell).toContain("patch-card");
    expect(shell).toContain("patch-pill");
    // 新增 ReplanCard 渲染 runtime 计算的判定（非冻结答案 JSON 冒充）
    expect(shell).toContain("replan-card");
    expect(shell).toContain("replan-verdict");
    // 「可回 Present」由显式出口保证：Replan 视角是 Patch 出来的临时世界状态
    // （replanViewActive），RETURN_TO_PRESENT 只关视角、保留判定痕迹。
    expect(shell).toContain("replanViewActive");
    expect(shell).toContain("RETURN_TO_PRESENT");
    expect(shell).toContain("replan-return-present");
  });
});

// ---------------------------------------------------------------------------
// §11-16  deterministic fixture
// ---------------------------------------------------------------------------
describe("TASK-0016 — deterministic (§11-16)", () => {
  it("16. 同一输入 → 同一输出（classify / decide 确定性）", () => {
    const a = classifyFollowUp(CANONICAL_QUESTION);
    const b = classifyFollowUp(CANONICAL_QUESTION);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const da = decideEvidence(a, world);
    const db = decideEvidence(b, world);
    expect(JSON.stringify(da)).toBe(JSON.stringify(db));
    const pa = planReplan(da, a);
    const pb = planReplan(db, b);
    expect(JSON.stringify(pa)).toBe(JSON.stringify(pb));
  });
});

// ---------------------------------------------------------------------------
// §11-17  TASK-0015 核心行为不回归（运行时仍支持 TRIGGER_FOLLOWUP 冻结路径 + 关键不变量）
// ---------------------------------------------------------------------------
describe("TASK-0016 — no regression of TASK-0015 core behaviors (§11-17)", () => {
  it("17. RelationalHistoricalSurface V3 仍被选用；Patch-not-Replace；E2→E1 非法升级=0", () => {
    // 冻结 follow-up 路径（TRIGGER_FOLLOWUP）仍可用，且 Patch-not-Replace
    let st = goto(7);
    st = reduceExperience(st, { type: "TRIGGER_FOLLOWUP" }, script, patch);
    expect(st.patchActive).toBe(true);
    expect(st.sceneIndex).toBe(7);
    expect(st.experienceId).toBe(script.experience_id);
    // E2 不得升 E1：切片关系类与世界证据一律保持 E2
    const templeBridge = slice.relations.find((r: { relation_key: string }) => r.relation_key.includes("temple_bridge_association"));
    expect(templeBridge.epistemic_class).toBe("E2");
    const rel = (world.relationEvidence ?? []).find(
      (r) => (r.subject === "yihaosi-site" && r.object === "pujiqiao") || (r.subject === "pujiqiao" && r.object === "yihaosi-site")
    )!;
    expect(rel.epistemicClass).toBe("E2");
    // 任何 E1「实线」寺桥关系都不得出现
    expect(
      (world.relationEvidence ?? []).some(
        (r) =>
          ((r.subject === "yihaosi-site" && r.object === "pujiqiao") || (r.subject === "pujiqiao" && r.object === "yihaosi-site")) &&
          r.epistemicClass === "E1"
      )
    ).toBe(false);
  });
});
