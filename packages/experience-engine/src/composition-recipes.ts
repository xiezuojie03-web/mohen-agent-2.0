// packages/experience-engine/src/composition-recipes.ts
//
// TASK-0014 §6 — 通用 Composition Recipes（不得按金泽场景命名）。
//
// Recipe 只回答：「在 eligible 的 Surface 中，此刻谁当视觉主角」。
// 硬规则（§5A.1 / §30 / §31）：
//   Composition 不得绕过 Surface Eligibility；
//   视觉丰富性不得成为 Evidence-ineligible Surface 的选择理由。

import type { SurfaceType, SurfaceSelection, WorldEvidenceState } from "./surface-eligibility";
import { selectSurfaces } from "./surface-eligibility";

export type CompositionRecipe =
  | "IMMERSIVE_SPATIAL"
  | "TIME_SHIFT"
  | "RELATION_DISCOVERY"
  | "EVIDENCE_FOCUS"
  | "RETURN_TO_PRESENT"
  | "DISCOVERY_QUESTION";

export interface CompositionState2 {
  recipe: CompositionRecipe;
  primarySurface?: SurfaceType;
  secondarySurfaces: SurfaceType[];
  contextSurfaces: SurfaceType[];
  narrativeDensity: "low" | "medium" | "high";
  visualIntensity: "quiet" | "focused" | "immersive";
  transitionIntent: string;
  /** 无法选出 eligible 主角时的诚实退路（不画 / 提问 / 证据缺口） */
  fallback?: "unknown" | "question" | "evidence_gap";
}

export const RECIPES: Record<CompositionRecipe, { primary: SurfaceType[]; secondary: SurfaceType[]; context: SurfaceType[]; density: CompositionState2["narrativeDensity"]; intensity: CompositionState2["visualIntensity"]; transitionIntent: string }> = {
  IMMERSIVE_SPATIAL: {
    primary: ["current_map", "approximate_area"],
    secondary: ["question", "action_dock"],
    context: ["current_photo", "agent_prompt"],
    density: "low",
    intensity: "immersive",
    transitionIntent: "enter-space",
  },
  TIME_SHIFT: {
    primary: ["relational_space", "timeline"],
    secondary: ["agent_prompt", "action_dock"],
    context: ["question"],
    density: "low",
    intensity: "immersive",
    transitionIntent: "coordinate-exit",
  },
  RELATION_DISCOVERY: {
    primary: ["relational_space"],
    secondary: ["evidence_reveal", "action_dock"],
    context: ["question", "agent_prompt"],
    density: "low",
    intensity: "focused",
    transitionIntent: "relation-build",
  },
  EVIDENCE_FOCUS: {
    // source_inspect 不自动出现：它由用户显式行动打开（否则默认就会铺一屏出处清单）
    primary: ["conflict_compare", "evidence_reveal"],
    secondary: ["timeline"],
    context: ["question"],
    density: "medium",
    intensity: "quiet",
    transitionIntent: "evidence-reveal",
  },
  RETURN_TO_PRESENT: {
    primary: ["current_map", "current_photo"],
    secondary: ["action_dock"],
    context: ["agent_prompt"],
    density: "low",
    intensity: "focused",
    transitionIntent: "return-present",
  },
  DISCOVERY_QUESTION: {
    primary: ["discovery", "question"],
    secondary: ["evidence_reveal", "action_dock"],
    context: ["agent_prompt"],
    density: "medium",
    intensity: "quiet",
    transitionIntent: "discovery-question",
  },
};

/**
 * 由「世界证据状态 + Recipe」解析出本次构图。
 * 只从 eligible 集合中选；若一个都选不出 → 返回 fallback（不画 / 提问 / 证据缺口）。
 */
export function resolveComposition(
  recipe: CompositionRecipe,
  world: WorldEvidenceState
): { selection: SurfaceSelection; composition: CompositionState2 } {
  const spec = RECIPES[recipe];
  const selection = selectSurfaces(world, { primary: spec.primary, secondary: spec.secondary });

  return {
    selection,
    composition: {
      recipe,
      primarySurface: selection.selectedPrimary,
      secondarySurfaces: selection.selectedSecondary ?? [],
      contextSurfaces: spec.context,
      narrativeDensity: spec.density,
      visualIntensity: spec.intensity,
      transitionIntent: spec.transitionIntent,
      fallback: selection.fallback,
    },
  };
}
