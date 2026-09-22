// packages/experience-engine/src/experience-beats.ts
//
// TASK-0014 §7 — Experience Beat 模型（presentation / composition layer）。
//
// Beat 不是新 truth store：它只组合冻结的 semantic scene states，
// 不含历史事实、不含证据语义。改名不影响语义。

import type { CompositionRecipe } from "./composition-recipes";

export interface BeatDefinition {
  beatId: string;
  label: string;
  recipe: CompositionRecipe;
  /** 该 Beat 覆盖的冻结 semantic scene ids（有序） */
  sceneIds: string[];
  /** 该 Beat 想让谁当主角（只是偏好；最终由 eligibility 裁决） */
  primaryPreference?: string[];
}

/** 校验：每个冻结 scene 必须且只能落到一个 Beat（8 → 5 映射的完整性） */
export function validateBeatCoverage<T extends BeatDefinition>(
  beats: T[],
  sceneIds: string[]
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const b of beats) {
    for (const s of b.sceneIds) {
      if (seen.has(s)) errors.push(`scene ${s} assigned to both ${seen.get(s)} and ${b.beatId}`);
      seen.set(s, b.beatId);
    }
  }
  for (const s of sceneIds) if (!seen.has(s)) errors.push(`scene ${s} not covered by any beat`);
  return { ok: errors.length === 0, errors };
}

/** 按 sceneId 反查所属 Beat（泛型保留调用方的 BeatPresentation 子类型） */
export function beatForScene<T extends BeatDefinition>(beats: T[], sceneId: string): T | undefined {
  return beats.find((b) => b.sceneIds.includes(sceneId));
}
