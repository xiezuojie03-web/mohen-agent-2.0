export type Surface = "map" | "historical_map" | "image" | "relation" | "narrative" | "evidence" | "route";
export interface CompositionState {
  primarySurface: Surface;
  secondarySurface?: Surface;
  contextSurface?: Surface;
  narrativeDensity: "minimal" | "balanced" | "deep";
  visualIntensity: "quiet" | "focused" | "immersive";
  transitionIntent?: string;
}

export interface ExperienceState {
  goal: { text: string; status: "forming" | "active" | "satisfied" };
  map: { focusId?: string; layerIds: string[] };
  time: { from?: string; to?: string; active?: string };
  visual: { mode: "map" | "compare" | "original" | "overlay" | "reconstruction"; assetIds: string[] };
  discovery: { activeId?: string; seenIds: string[] };
  narrative: { title?: string; body?: string };
  evidence: { open: boolean; evidenceIds: string[] };
  route: { routeId?: string; active: boolean };
  trail: string[];
  composition: CompositionState;
}

export type ExperienceAction =
  | { type: "FOCUS_PLACE"; placeId: string }
  | { type: "SET_TIME"; active: string }
  | { type: "SHOW_HISTORICAL_LAYER"; layerId: string }
  | { type: "SELECT_DISCOVERY"; discoveryId: string }
  | { type: "OPEN_EVIDENCE"; evidenceIds: string[] }
  | { type: "SET_VISUAL_MODE"; mode: ExperienceState["visual"]["mode"] }
  | { type: "SET_COMPOSITION"; composition: CompositionState }
  | { type: "PATCH_NARRATIVE"; title?: string; body?: string }
  | { type: "PROPOSE_ROUTE"; routeId: string }
  | { type: "REPLAN"; reason: string };

// TASK-0013：冻结体验脚本运行时（Experience Script → ExperienceState → CompositionState）
export * from "./experience-runtime";
