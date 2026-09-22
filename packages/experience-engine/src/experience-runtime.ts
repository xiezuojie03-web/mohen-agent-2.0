// packages/experience-engine/src/experience-runtime.ts
//
// TASK-0013 — Jinze Experience Renderer 纯运行时（框架无关，可被测试直接 import）。
//
// 职责：消费 TASK-0012/0012A 冻结产物（experience script + follow-up patch），
// 维护 ExperienceState（场景导航 / 证据开合 / Patch-not-Replace），输出派生视图状态。
// Renderer（apps/web）只做呈现，不得在本模块之外重写剧情。
//
// 铁律：
// - 本模块是语义消费者，不是第二真相源：全部叙事/冲突/裁定/分类来自冻结 script；
// - Patch-not-Replace：canonical follow-up 只改 focus/foreground，不改 sceneIndex、
//   不清 trail、不重置任何已积累状态；
// - GEOGRAPHIC_EXACT 只允许出现在「当下」场景（由冻结 script 保证，这里提供校验）；
// - 零 DB、零 Legacy、零网络。

// ---------------------------------------------------------------------------
// 冻结产物类型（与 data/experience/*.json 对齐的最小类型面）
// ---------------------------------------------------------------------------

export type SpatialMode =
  | "GEOGRAPHIC_EXACT"
  | "GEOGRAPHIC_APPROXIMATE"
  | "RELATIONAL_HISTORICAL"
  | "HISTORICAL_MAP_SOURCE"
  | "RECONSTRUCTED_HISTORICAL"
  | "SPATIAL_UNKNOWN";

export type SurfaceName =
  | "modern_map"
  | "relational_space"
  | "timeline"
  | "evidence_panel"
  | "current_photo"
  | "historical_source"
  | "text_focus";

export type NarrativeLevel =
  | "FACT_EVIDENCED"
  | "FACT_LIMITED"
  | "CONFLICT"
  | "QUESTION"
  | "INTERPRETATION_CANDIDATE"
  | "UNKNOWN"
  | "INTERACTION";

export interface NarrativeUnit {
  unit_id: string;
  level: NarrativeLevel;
  text: string;
  evidence_refs: string[];
}

export interface SceneComposition {
  primarySurface: SurfaceName;
  secondarySurface: SurfaceName;
  contextSurface: SurfaceName;
  narrativeDensity: string;
  visualIntensity: string;
  transitionIntent: string;
}

export interface ExperienceScene {
  scene_id: string;
  duration_sec: number;
  experience_goal: string;
  primary_focus: string;
  spatial_mode: SpatialMode;
  time_state: string;
  map_state: string;
  visual_assets: Array<{ id: string; type: string; uri: string; rights: string; label: string }>;
  narrative: NarrativeUnit[];
  evidence_refs: string[];
  epistemic_status: string;
  uncertainty: string;
  transition_in: string;
  transition_out: string;
  allowed_user_actions: string[];
  composition_intent: string;
  composition: SceneComposition;
  renderer_neutral: Record<string, unknown>;
}

export interface ExperienceScript {
  schema: string;
  experience_id: string;
  title: string;
  primary_question: string;
  scene_count: number;
  duration_sec: number;
  waterway_temporal_semantics: Record<string, unknown>;
  spatial_mode_policy: { allowed: string[]; forbidden_active: string[]; principle: string };
  t11_rulings_applied: Array<{ ruling: string; topic: string; decision: string; applied: string }>;
  conflicts: Array<{ ruling: string; topic: string; decision: string; surfaced_in_scene: string }>;
  discoveries: {
    primary: {
      statement: string;
      epistemic_classification?: string;
      classification_note?: string;
      unresolved_counterpoint: string;
      [k: string]: unknown;
    };
    secondary: Array<{ statement: string; [k: string]: unknown }>;
  };
  visual_policy: { allowed: string[]; forbidden: string[]; historical_visual_assets_used: number };
  scenes: ExperienceScene[];
  followup: {
    patch_id: string;
    trigger_question: string;
    behavior_contract: Record<string, unknown>;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface FollowupPatch {
  schema: string;
  patch_id: string;
  trigger_question: string;
  behavior_contract: { restart_experience: boolean; patch_not_replace: boolean; may_invent_answer: boolean; patch_target: string };
  preserved: Record<string, unknown>;
  changed: Record<string, unknown>;
  foregrounded: Record<string, unknown>;
  next_actions: Array<{ action: string; text: string }>;
  invariants: string[];
  base_experience_id: string;
  base_scene_count: number;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// 面向用户的自然语言标签（禁止把内部枚举名直接抛给用户）
// ---------------------------------------------------------------------------

export const SPATIAL_MODE_LABELS: Record<SpatialMode, string> = {
  GEOGRAPHIC_EXACT: "现代精确坐标",
  GEOGRAPHIC_APPROXIMATE: "现代近似位置",
  RELATIONAL_HISTORICAL: "关系历史空间（无坐标）",
  HISTORICAL_MAP_SOURCE: "历史地图依据",
  RECONSTRUCTED_HISTORICAL: "历史重建（本体验禁用）",
  SPATIAL_UNKNOWN: "位置未知",
};

export const LEVEL_LABELS: Record<NarrativeLevel, string> = {
  FACT_EVIDENCED: "有据事实",
  FACT_LIMITED: "有限事实（附来源限制）",
  CONFLICT: "着录冲突（未裁决）",
  QUESTION: "开放问题",
  INTERPRETATION_CANDIDATE: "墨痕的解释框架（非已证事实）",
  UNKNOWN: "未知（缺证据）",
  INTERACTION: "互动提示",
};

export const ACTION_LABELS: Record<string, string> = {
  NEXT: "继续",
  PREV: "上一步",
  OPEN_EVIDENCE: "查看证据",
  CLOSE_EVIDENCE: "收起证据",
  FOCUS_PLACE: "聚焦地点",
  SET_TIME: "查看时间",
  SHOW_HISTORICAL_LAYER: "看历史关系",
  SET_VISUAL_MODE: "看今貌照片",
  PROPOSE_ROUTE: "看看还能去哪",
  REPLAN: "换个走法",
};

// 「当下」判定：GEOGRAPHIC_EXACT 仅允许出现在 time_state 命中这些词的场景
export function isPresentScene(scene: ExperienceScene): boolean {
  return /当下|今天|2026/.test(scene.time_state);
}

// ---------------------------------------------------------------------------
// Runtime 状态与动作（纯 reducer，可测试、可回放）
// ---------------------------------------------------------------------------

export interface ExperienceRuntimeState {
  experienceId: string;
  sceneIndex: number;
  /** 已访问场景 id（含重复访问），Patch 后必须原样保留 */
  trail: string[];
  evidenceOpen: boolean;
  /** canonical follow-up Patch 已应用（Patch-not-Replace：不影响 sceneIndex/trail） */
  patchActive: boolean;
  patchId: string | null;
  /** Patch 触发问（来自冻结 patch JSON，不得在前端硬编码改写） */
  followupQuestion: string | null;
  finished: boolean;
}

export type ExperienceRuntimeAction =
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "OPEN_EVIDENCE" }
  | { type: "CLOSE_EVIDENCE" }
  | { type: "TRIGGER_FOLLOWUP"; question?: string }
  | { type: "RESTART" };

export function createRuntimeState(script: ExperienceScript): ExperienceRuntimeState {
  return {
    experienceId: script.experience_id,
    sceneIndex: 0,
    trail: [script.scenes[0].scene_id],
    evidenceOpen: false,
    patchActive: false,
    patchId: null,
    followupQuestion: null,
    finished: false,
  };
}

export function reduceExperience(
  state: ExperienceRuntimeState,
  action: ExperienceRuntimeAction,
  script: ExperienceScript,
  patch: FollowupPatch | null
): ExperienceRuntimeState {
  const last = state.sceneIndex >= script.scenes.length - 1;
  switch (action.type) {
    case "NEXT": {
      if (last) return { ...state, finished: true };
      const sceneIndex = state.sceneIndex + 1;
      return {
        ...state,
        sceneIndex,
        finished: false,
        trail: [...state.trail, script.scenes[sceneIndex].scene_id],
      };
    }
    case "PREV": {
      if (state.sceneIndex === 0) return state;
      const sceneIndex = state.sceneIndex - 1;
      return { ...state, sceneIndex, finished: false, trail: [...state.trail, script.scenes[sceneIndex].scene_id] };
    }
    case "OPEN_EVIDENCE":
      return { ...state, evidenceOpen: true };
    case "CLOSE_EVIDENCE":
      return { ...state, evidenceOpen: false };
    case "TRIGGER_FOLLOWUP": {
      // Patch-not-Replace：不改 sceneIndex、不清 trail、不重置 evidenceOpen 语义之外任何状态
      if (!patch) return state;
      const question = action.question ?? patch.trigger_question;
      return {
        ...state,
        patchActive: true,
        patchId: patch.patch_id,
        followupQuestion: question,
        // trail 追加补丁事件记录，但不移除任何历史
        trail: [...state.trail, "patch:" + patch.patch_id],
      };
    }
    case "RESTART":
      // 仅显式用户动作才允许重启（canonical follow-up 永远不触发它）
      return createRuntimeState(script);
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// 派生视图状态（Renderer 直接消费）
// ---------------------------------------------------------------------------

export interface DerivedExperience {
  scene: ExperienceScene;
  isFirst: boolean;
  isLast: boolean;
  canFollowUp: boolean;
  /** 本场景需要浮出的冲突（T11-C1/C2 在 s05），由冻结 script.conflicts 提供 */
  sceneConflicts: ExperienceScript["conflicts"];
  /** s08 需要的认知序列素材 */
  discoveryPrimary: ExperienceScript["discoveries"]["primary"];
}

export function deriveView(
  state: ExperienceRuntimeState,
  script: ExperienceScript
): DerivedExperience {
  const scene = script.scenes[state.sceneIndex];
  return {
    scene,
    isFirst: state.sceneIndex === 0,
    isLast: state.sceneIndex === script.scenes.length - 1,
    canFollowUp: state.sceneIndex === script.scenes.length - 1 && !state.patchActive,
    sceneConflicts: script.conflicts.filter((c) => (c as { surfaced_in_scene?: string }).surfaced_in_scene === scene.scene_id),
    discoveryPrimary: script.discoveries.primary,
  };
}

// ---------------------------------------------------------------------------
// 冻结不变量校验（构建/测试期运行；运行时也可调用做防御）
// ---------------------------------------------------------------------------

export interface InvariantReport {
  ok: boolean;
  errors: string[];
}

export function checkFrozenInvariants(script: ExperienceScript, patch: FollowupPatch): InvariantReport {
  const errors: string[] = [];
  if (script.scene_count !== script.scenes.length) errors.push("scene_count mismatch");
  if (script.scenes.length < 6 || script.scenes.length > 8) errors.push("scene count out of 6-8");
  if (script.duration_sec < 150 || script.duration_sec > 210) errors.push("duration out of 150-210");
  for (const s of script.scenes) {
    if (s.spatial_mode === "RECONSTRUCTED_HISTORICAL") errors.push(`${s.scene_id}: forbidden mode`);
    if (s.spatial_mode === "GEOGRAPHIC_EXACT" && !isPresentScene(s))
      errors.push(`${s.scene_id}: GEOGRAPHIC_EXACT outside present time`);
    if (!s.composition?.primarySurface) errors.push(`${s.scene_id}: missing primarySurface`);
    for (const u of s.narrative) {
      if (u.level === "FACT_EVIDENCED" && /(三个节点|同一片水网)/.test(u.text))
        errors.push(`${u.unit_id}: composite interpretation leaked into FACT_EVIDENCED`);
    }
  }
  if (script.discoveries.primary.epistemic_classification !== "INTERPRETATION_CANDIDATE")
    errors.push("primary discovery not INTERPRETATION_CANDIDATE");
  if (patch.behavior_contract.restart_experience !== false) errors.push("patch must not restart");
  if (patch.behavior_contract.patch_not_replace !== true) errors.push("patch_not_replace must be true");
  if (patch.behavior_contract.may_invent_answer !== false) errors.push("patch must not invent answers");
  if (patch.trigger_question !== script.followup.trigger_question)
    errors.push("patch trigger question mismatch with script followup");
  if (script.visual_policy.historical_visual_assets_used !== 0)
    errors.push("historical visual assets must remain 0");
  return { ok: errors.length === 0, errors };
}
