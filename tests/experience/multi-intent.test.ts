// tests/experience/multi-intent.test.ts — TASK-0017 Multi-Intent Evidence-Aware Exploration Loop 验收。
//
// 覆盖任务书 §10 全部 20 条必测不变量：
//   1  四个 canonical question 均得到确定 intent
//   2  四类 intent 均进入同一 Replan runtime（FOLLOWUP_REPLAN）
//   3  四类 plan 至少两项结构差异（§6「一模板四皮肤」禁令）
//   4  relation verification 仍 E2，不升 E1
//   5  evidence inspection 不改变 epistemic class
//   6  evidence inspection 的 evidence refs 可解析到现有 world state
//   7  temporal exploration 不生成不存在的年份
//   8  temporal exploration 不把现代坐标作为历史几何
//   9  present action 明确不是 verified route
//   10 present action 不产生 turn-by-turn
//   11 experienceId 全程不变
//   12 scene/state 不因追问 reset
//   13 no full reload（运行时纯 reducer）
//   14 trail 只追加
//   15 current visual 不冒充 historical visual
//   16 historical geometry 仍遵守 GEOMETRY_IS_A_CLAIM
//   17 未读取 frozen answer JSON 冒充决策
//   18 Legacy / DB zero-write（源码静态审计）
//   19 TASK-0016 canonical follow-up 回归通过
//   20 clean-runtime E2E 覆盖四类 intent（脚本存在性 + 含四问；真机见 scripts/e2e-multi-intent-capture.mjs）
//
// 约定（沿用 replan-loop.test.ts）：不 spawn、不连 DB；消费冻结产物 + 纯运行时；
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
const ENGINE_SRC = path.join(ROOT, "packages", "experience-engine", "src");

const script = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-script.json"), "utf8")
) as ExperienceScript;
const patch = JSON.parse(
  fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-followup-patch.json"), "utf8")
) as FollowupPatch;
const slice = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-historical-spatial-slice.json"), "utf8"));

const world: WorldEvidenceState = buildWorldEvidenceState(script, slice, {
  historicalVisualAssets: 0,
  historicalMapImageAvailable: false,
});

// 四类 canonical 问句（任务书 §3）
const Q = {
  A: "那颐浩寺和普济桥以前真的有关系吗？",
  B: "你凭什么这么判断？",
  C: "它们后来发生了什么变化？",
  D: "那我现在去现场可以看什么？",
} as const;

/** 派生四类 (intent, decision, plan) 一次，供全部用例复用 */
function deriveAll() {
  const out: Record<string, { intent: FollowUpIntent; decision: EvidenceDecision; plan: ReplanPlan }> = {};
  for (const [k, q] of Object.entries(Q)) {
    const intent = classifyFollowUp(q);
    const decision = decideEvidence(intent, world);
    const plan = planReplan(decision, intent);
    out[k] = { intent, decision, plan };
  }
  return out;
}
const ALL = deriveAll();

/** 到达第 n 场（0 基）的运行时状态 */
function goto(sceneIndex: number) {
  let st = createRuntimeState(script);
  for (let i = 0; i < sceneIndex; i++) st = reduceExperience(st, { type: "NEXT" }, script, patch);
  return st;
}

// §10-1 四个 canonical question 均得到确定 intent
describe("TASK-0017 — §10-1 四类 canonical 问句 → 确定 intent", () => {
  it("A→verify_historical_relation / B→inspect_evidence / C→explore_temporal_change / D→propose_present_action", () => {
    expect(ALL.A.intent.kind).toBe("verify_historical_relation");
    expect(ALL.B.intent.kind).toBe("inspect_evidence");
    expect(ALL.C.intent.kind).toBe("explore_temporal_change");
    expect(ALL.D.intent.kind).toBe("propose_present_action");
    // 全部确定性（无 LLM/API）
    for (const k of Object.keys(ALL)) expect(ALL[k].intent.deterministic).toBe(true);
  });

  it("B/C/D 不误判为 A，且各自决策类型标记与意图一致", () => {
    expect(ALL.B.intent.kind).not.toBe("verify_historical_relation");
    expect(ALL.C.intent.kind).not.toBe("verify_historical_relation");
    expect(ALL.D.intent.kind).not.toBe("verify_historical_relation");
    expect(ALL.B.decision.decisionKind).toBe("inspect_evidence");
    expect(ALL.C.decision.decisionKind).toBe("explore_temporal_change");
    expect(ALL.D.decision.decisionKind).toBe("propose_present_action");
    expect(ALL.A.decision.decisionKind).toBe("verify_historical_relation");
  });
});

// §10-2 四类 intent 均进入同一 Replan runtime
describe("TASK-0017 — §10-2 四类 intent 均进入同一 FOLLOWUP_REPLAN runtime", () => {
  for (const [k, q] of Object.entries(Q)) {
    it(`${k} → FOLLOWUP_REPLAN 真跑三阶段（intent/decision/plan 均非 null）`, () => {
      const st = reduceExperience(goto(7), { type: "FOLLOWUP_REPLAN", question: q }, script, patch, world);
      expect(st.followUpIntent?.kind).toBe(ALL[k].intent.kind);
      expect(st.evidenceDecision).not.toBeNull();
      expect(st.replanPlan).not.toBeNull();
      expect(st.replanViewActive).toBe(true);
    });
  }
});

// §10-3 四类 plan 至少两项结构差异（§6「一模板四皮肤」禁令）
describe("TASK-0017 — §10-3 / §6 plan 结构差异（非仅换文案）", () => {
  // §6 维度
  const sig = (p: ReplanPlan) =>
    [p.targetSurface, p.secondarySurface ?? "∅", p.spatialAuthority, p.temporalFocus, p.actionStatus, p.relationEpistemicClass ?? "∅"] as const;

  it("四个 plan 的 §6 维度签名两两不同，且每组至少 2 项差异", () => {
    const keys = Object.keys(ALL) as Array<keyof typeof ALL>;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = sig(ALL[keys[i]].plan);
        const b = sig(ALL[keys[j]].plan);
        let diff = 0;
        for (let d = 0; d < a.length; d++) if (a[d] !== b[d]) diff++;
        expect(diff).toBeGreaterThanOrEqual(2); // 满足 §6「至少两项真实结构差异」
      }
    }
  });

  it("具体预期值（证明不是同一条路径换皮）", () => {
    // A：关系历史空间
    expect(ALL.A.plan.targetSurface).toBe("relational_space");
    expect(ALL.A.plan.spatialAuthority).toBe("historical_lost");
    expect(ALL.A.plan.temporalFocus).toBe("none");
    expect(ALL.A.plan.actionStatus).toBe("judgment");
    expect(ALL.A.plan.currentCoordsLoseHistoricalAuthority).toBe(true);
    expect(ALL.A.plan.relationEpistemicClass).toBe("E2");

    // B：证据揭示成为主表达
    expect(ALL.B.plan.targetSurface).toBe("evidence_reveal");
    expect(ALL.B.plan.secondarySurface).toBe("relational_space");
    expect(ALL.B.plan.spatialAuthority).toBe("evidence_only");
    expect(ALL.B.plan.actionStatus).toBe("evidence");
    expect(ALL.B.plan.currentCoordsLoseHistoricalAuthority).toBe(false);

    // C：时间成为主角
    expect(ALL.C.plan.targetSurface).toBe("timeline");
    expect(ALL.C.plan.spatialAuthority).toBe("historical_lost");
    expect(ALL.C.plan.temporalFocus).toBe("evidenced_changes");
    expect(ALL.C.plan.actionStatus).toBe("temporal");
    expect(ALL.C.plan.currentCoordsLoseHistoricalAuthority).toBe(true);

    // D：回到今天语境
    expect(ALL.D.plan.targetSurface).toBe("current_map");
    expect(ALL.D.plan.secondarySurface).toBe("current_photo");
    expect(ALL.D.plan.spatialAuthority).toBe("present_held");
    expect(ALL.D.plan.temporalFocus).toBe("present");
    expect(ALL.D.plan.actionStatus).toBe("proposal_not_routed");
    expect(ALL.D.plan.currentCoordsLoseHistoricalAuthority).toBe(false);
  });

  it("Surface 选择确实因 intent 而不同（同一世界、不同主角）", () => {
    expect(selectReplanSurface(ALL.A.plan, world).selectedPrimary).toBe("relational_space");
    expect(selectReplanSurface(ALL.B.plan, world).selectedPrimary).toBe("evidence_reveal");
    expect(selectReplanSurface(ALL.C.plan, world).selectedPrimary).toBe("timeline");
    expect(selectReplanSurface(ALL.D.plan, world).selectedPrimary).toBe("current_map");
  });
});

// §10-4 relation verification 仍 E2，不升 E1
describe("TASK-0017 — §10-4 relation verification 仍 E2，不升 E1", () => {
  it("A：verdict=insufficient、supportedEpistemicClass 停在 E2、现代共址≠历史关系", () => {
    const rel = (world.relationEvidence ?? []).find(
      (r) => (r.subject === "yihaosi-site" && r.object === "pujiqiao") || (r.subject === "pujiqiao" && r.object === "yihaosi-site")
    )!;
    expect(rel.epistemicClass).toBe("E2");
    expect(ALL.A.decision.verdict).toBe("insufficient_for_confirmation");
    expect(ALL.A.decision.supportedEpistemicClass).toBe("E2");
    expect(ALL.A.decision.supportedEpistemicClass).not.toBe("E1");
    expect(ALL.A.decision.currentAssociationNotHistorical).toBe(true);
  });
});

// §10-5 + §10-6 evidence inspection 不改变 epistemic class + refs 可解析
describe("TASK-0017 — §10-5/6 evidence inspection 不升 class 且 refs 可解析", () => {
  const templeBridge = (world.relationEvidence ?? []).find(
    (r) => (r.subject === "yihaosi-site" && r.object === "pujiqiao") || (r.subject === "pujiqiao" && r.object === "yihaosi-site")
  )!;

  it("B：supportedEpistemicClass 与既有关系一致（E2 不升 E1）", () => {
    expect(ALL.B.decision.supportedEpistemicClass).toBe(templeBridge.epistemicClass);
    expect(ALL.B.decision.supportedEpistemicClass).not.toBe("E1");
    expect(ALL.B.decision.verdict).toBe("insufficient_for_confirmation");
  });

  it("B：evidenceRefs 非空且全部可解析回 world.relationEvidence（非编造 JSON）", () => {
    const refs = ALL.B.decision.evidenceRefs ?? [];
    expect(refs.length).toBeGreaterThan(0);
    const worldKeys = new Set((world.relationEvidence ?? []).map((r) => r.relationKey));
    const sliceKeys = new Set((slice.relations as Array<{ relation_key: string }>).map((r) => r.relation_key));
    for (const ref of refs) {
      expect(worldKeys.has(ref)).toBe(true); // 可解析回 world
      expect([...sliceKeys].some((k) => k.includes(ref) || ref.includes(k))).toBe(true); // 可溯源到切片
    }
  });
});

// §10-7 + §10-8 temporal exploration 不编造年份、不把现代坐标当历史几何
describe("TASK-0017 — §10-7/8 temporal exploration 不编造年份 / 不恢复坐标权威", () => {
  it("C：决策不声称连续历史（verdict=insufficient + 含「不伪造年份」护栏）", () => {
    expect(ALL.C.decision.verdict).toBe("insufficient_for_confirmation");
    expect(ALL.C.decision.temporal).toBeDefined();
    expect(ALL.C.decision.temporal!.hasEvidencedChanges).toBe(world.hasEvidencedChanges);
    expect(ALL.C.decision.unknown.some((t) => t.includes("伪造年份"))).toBe(true);
  });

  it("C：历史几何仍 absent → 现代坐标不升历史权威（currentCoordsLoseHistoricalAuthority=true）", () => {
    expect(world.hasHistoricalGeometry).toBe(false);
    expect(ALL.C.plan.currentCoordsLoseHistoricalAuthority).toBe(true);
    const geo = evaluateSurfaceEligibility(world).find((e) => e.surfaceType === "historical_geometry")!;
    expect(geo.eligible).toBe(false);
    // 时间主角不是 current_map（证明没把现代坐标当历史几何）
    expect(selectReplanSurface(ALL.C.plan, world).selectedPrimary).toBe("timeline");
  });
});

// §10-9 + §10-10 present action 不是 verified route / 无 turn-by-turn
describe("TASK-0017 — §10-9/10 present action 非 verified route、无 turn-by-turn", () => {
  it("D：actionStatus=proposal_not_routed 且 routeVerified=false", () => {
    expect(ALL.D.plan.actionStatus).toBe("proposal_not_routed");
    expect(ALL.D.plan.actionStatus).not.toBe("verified_route");
    expect(ALL.D.decision.present?.routeVerified).toBe(false);
  });

  it("D：nextActions 无任何逐段/导航/turn-by-turn 文案", () => {
    for (const a of ALL.D.plan.nextActions) {
      expect(a.text).not.toMatch(/逐段|导航|turn-by-turn|路线/);
    }
  });
});

// §10-11..14 Patch-not-Replace 持久性（四类共性）
describe("TASK-0017 — §10-11/12/13/14 持久 & 可回 & 无 reload & trail 追加", () => {
  for (const [k, q] of Object.entries(Q)) {
    it(`${k}：experienceId 不变、sceneIndex 不 reset、trail 仅追加、可回 Present`, () => {
      let st = goto(7);
      const idBefore = st.experienceId;
      const trailBefore = [...st.trail];
      const sceneBefore = st.sceneIndex;

      st = reduceExperience(st, { type: "FOLLOWUP_REPLAN", question: q }, script, patch, world);
      // 11/12/13：身份与场景不变（无 reload / 无 reset）
      expect(st.experienceId).toBe(idBefore);
      expect(st.sceneIndex).toBe(sceneBefore);
      // 14：trail 前段原样保留，仅追加
      expect(st.trail.slice(0, trailBefore.length)).toEqual(trailBefore);
      expect(st.trail.length).toBe(trailBefore.length + 1);

      // 可回 Present：视角关闭、判定痕迹保留、身份仍不变
      st = reduceExperience(st, { type: "RETURN_TO_PRESENT" }, script, patch, world);
      expect(st.replanViewActive).toBe(false);
      expect(st.experienceId).toBe(idBefore);
      expect(st.sceneIndex).toBe(sceneBefore);
      expect(st.replanPlan).not.toBeNull();
      expect(st.followUpIntent).not.toBeNull();
    });
  }
});

// §10-15 current visual 不冒充 historical visual
describe("TASK-0017 — §10-15 current visual 不冒充 historical visual", () => {
  it("D 主 surface=current_map 且历史视觉资产=0", () => {
    expect(world.historicalVisualAssets).toBe(0);
    expect(ALL.D.plan.targetSurface).toBe("current_map");
    expect(ALL.D.plan.targetSurface).not.toBe("historical_photo");
    expect(ALL.D.plan.targetSurface).not.toBe("historical_map_georeferenced");
  });
});

// §10-16 historical geometry 仍遵守 GEOMETRY_IS_A_CLAIM
describe("TASK-0017 — §10-16 GEOMETRY_IS_A_CLAIM 仍成立", () => {
  it("hasHistoricalGeometry=false 且 historical_geometry surface 恒 ineligible", () => {
    expect(world.hasHistoricalGeometry).toBe(false);
    const geo = evaluateSurfaceEligibility(world).find((e) => e.surfaceType === "historical_geometry")!;
    expect(geo.eligible).toBe(false);
    expect(geo.reasonCode).toBe("GEOMETRY_IS_A_CLAIM_NO_HISTORICAL_GEOMETRY_EVIDENCE");
  });
});

// §10-17 未读取 frozen answer JSON 冒充决策（B 的 refs 来自 world，不来自 patch）
describe("TASK-0017 — §10-17 决策源自 world，不读 frozen answer JSON", () => {
  it("evidenceRefs 与 patch JSON 无耦合：patch 中无 relation_key 字段被读取", () => {
    // patch 是行为契约，不含关系证据；evidenceRefs 必须来自 world.relationEvidence
    expect(patch).not.toHaveProperty("relation_evidence");
    const refs = ALL.B.decision.evidenceRefs ?? [];
    const worldKeys = new Set((world.relationEvidence ?? []).map((r) => r.relationKey));
    expect(refs.every((r) => worldKeys.has(r))).toBe(true);
  });
});

// §10-18 Legacy / DB zero-write（源码静态审计）
// 注意：先剥离注释，避免「零 Legacy」这类说明性注释误触发正则。
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}
describe("TASK-0017 — §10-18 Legacy / DB zero-write（源码静态审计）", () => {
  const forbidden =
    /writeFile|appendFile|createWriteStream|\bpg\.|\bprisma\.|insert\s+into|update\s+\w+\s+set|exec\(|spawn\(|mysql|better-sqlite|\.query\(|legacy/i;
  for (const f of ["evidence-aware-replan.ts", "experience-runtime.ts", "surface-eligibility.ts"]) {
    it(`${f} 不含写文件 / DB / spawn / legacy 调用（注释已剥离）`, () => {
      const src = stripComments(fs.readFileSync(path.join(ENGINE_SRC, f), "utf8"));
      expect(src).not.toMatch(forbidden);
    });
  }
});

// §10-19 TASK-0016 canonical follow-up 回归（A 路径核心语义不丢）
describe("TASK-0017 — §10-19 TASK-0016 canonical follow-up 回归", () => {
  it("A：E2 不升 E1、relational_space、可回 Present、buildExperiencePatch 不新建 Experience", () => {
    const intent = classifyFollowUp(Q.A);
    const decision = decideEvidence(intent, world);
    const plan = planReplan(decision, intent);
    const ep = buildExperiencePatch(plan, decision, script.experience_id);

    expect(decision.supportedEpistemicClass).toBe("E2");
    expect(plan.targetSurface).toBe("relational_space");
    expect(ep.experienceId).toBe(script.experience_id);
    expect(ep.primarySurface).toBe("relational_space");
    expect(ep.relationEpistemicClass).toBe("E2");

    // 端到端
    let st = reduceExperience(goto(7), { type: "FOLLOWUP_REPLAN", question: Q.A }, script, patch, world);
    expect(st.replanPlan?.targetSurface).toBe("relational_space");
    st = reduceExperience(st, { type: "RETURN_TO_PRESENT" }, script, patch, world);
    expect(st.replanViewActive).toBe(false);
    expect(st.experienceId).toBe(script.experience_id);
  });

  it("A：Shell 源码仍走真实 runtime，无 full reload / 无 reset", () => {
    const shell = fs.readFileSync(path.join(EXP_DIR, "ExperienceShell.tsx"), "utf8");
    expect(shell).toContain("FOLLOWUP_REPLAN");
    expect(shell).toContain("selectReplanSurface");
    expect(shell).toContain("replan-card");
    expect(shell).toContain("RETURN_TO_PRESENT");
    expect(shell).not.toMatch(/window\.location|router\.(push|replace|refresh)|location\.reload/);
  });
});

// §10-20 clean-runtime E2E 覆盖四类 intent（脚本存在性 + 四问齐备）
describe("TASK-0017 — §10-20 clean-runtime E2E 覆盖四类 intent（验收脚本）", () => {
  const e2ePath = path.join(ROOT, "scripts", "e2e-multi-intent-capture.mjs");
  it("E2E 脚本存在且覆盖四个 canonical 问句", () => {
    expect(fs.existsSync(e2ePath)).toBe(true);
    const src = fs.readFileSync(e2ePath, "utf8");
    for (const q of Object.values(Q)) {
      // 问句以子串形式出现（脚本会逐条 dispatch）
      expect(src).toContain(q);
    }
  });
});
