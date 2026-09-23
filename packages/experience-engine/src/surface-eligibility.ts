// packages/experience-engine/src/surface-eligibility.ts
//
// TASK-0014 §5A — Evidence-aware Surface Selection（HARD ARCHITECTURE RULE）。
//
// 冻结的架构顺序：
//   Evidence / Knowledge State
//   → Epistemic + Spatial + Visual Availability
//   → Surface Eligibility
//   → Evidence-aware Surface Selection
//   → Composition Engine → Surface Registry → Reusable Surface Components → Renderer
//
// 本模块是「能不能画」的唯一裁决层：
// - 视觉丰富度、沉浸感、动画效果 **一律不是** eligibility 理由；
// - Composition 只能从 eligible 集合里选主角（见 composition-recipes.ts）；
// - 证据不足时返回 Unknown / Question / Evidence-Gap fallback——「不画」是合法选择；
// - **Geometry itself is a Claim**：历史点/线/面/河形/街形只有在具备相应证据与
//   重建语义时才有资格成为 Historical Geometry；current geometry 不得继承为 historical geometry。

export type SurfaceType =
  | "current_map"
  | "approximate_area"
  | "relational_space"
  | "historical_map_native"
  | "historical_map_georeferenced"
  | "historical_geometry"
  | "timeline"
  | "evidence_reveal"
  | "conflict_compare"
  | "resolved_single_answer"
  | "source_inspect"
  | "current_photo"
  | "historical_photo"
  | "before_after"
  | "question"
  | "discovery"
  | "agent_prompt"
  | "action_dock"
  | "unknown_gap";

/** 对象对之间的关系证据（供证据感知决策消费；不引入任何坐标） */
export interface RelationEvidence {
  subject: string;
  object: string;
  predicate: string;
  epistemicClass: "E1" | "E2" | "E3" | "E4";
  /** 该关系唯一支持来自「今天」的共址/复合 POI，而非前现代文献记载 */
  isCurrentAssociationOnly: boolean;
  /** 证据依据（人话，来自既有状态，不编造新事实） */
  basis: string;
}

/** 世界证据状态（Renderer/Selection 的输入；不得由组件自行推断） */
export interface WorldEvidenceState {
  /** 有可靠当前精确坐标的对象 */
  currentExactEntities: string[];
  /** 仅有近似/区域 grounding 的对象（无精确点） */
  approximateEntities: string[];
  /** 存在历史关系（关系语义成立） */
  hasHistoricalRelations: boolean;
  /** 对象对关系证据（供证据感知决策消费；可缺省以兼容旧调用方） */
  relationEvidence?: RelationEvidence[];
  /** 存在可靠历史几何（本切片恒为 false） */
  hasHistoricalGeometry: boolean;
  /** 原始历史地图/史料源（native 文档空间） */
  historicalMapSource?: {
    key: string;
    status: string;
    /** 是否已可靠现代配准 —— 本切片恒 false */
    georeferenced: boolean;
    /** 是否可归因到切片对象 —— 1879 p36 = false */
    attributable: boolean;
    imageAvailable: boolean;
  };
  /** 冲突证据组（如 T11-C1/C2） */
  conflicts: Array<{ ruling: string; topic: string }>;
  /** 已确认的当代照片数量 */
  currentPhotosConfirmed: number;
  /** 可靠历史视觉资产数量（本切片 = 0） */
  historicalVisualAssets: number;
  /** 存在有据的时间变化链 */
  hasEvidencedChanges: boolean;
}

export interface SurfaceEligibility {
  surfaceType: SurfaceType;
  eligible: boolean;
  reasonCode: string;
  evidenceRefs?: string[];
  blockedBy?: string[];
}

export interface SurfaceSelection {
  eligibleSurfaces: SurfaceEligibility[];
  selectedPrimary?: SurfaceType;
  selectedSecondary?: SurfaceType[];
  fallback?: "unknown" | "question" | "evidence_gap";
}

export const SELECTION_REASON = {
  CURRENT_EXACT: "CURRENT_EXACT_GROUNDING_AVAILABLE",
  NO_CURRENT_EXACT: "NO_CURRENT_EXACT_GROUNDING",
  APPROXIMATE_ONLY: "APPROXIMATE_GROUNDING_ONLY",
  NO_APPROXIMATE: "NO_APPROXIMATE_ENTITY",
  RELATIONS_NO_GEOMETRY: "HISTORICAL_RELATIONS_WITHOUT_HISTORICAL_GEOMETRY",
  HISTORICAL_GEOMETRY_BLOCKED: "GEOMETRY_IS_A_CLAIM_NO_HISTORICAL_GEOMETRY_EVIDENCE",
  NATIVE_MAP_OK: "HISTORICAL_SOURCE_NATIVE_DOCUMENT_SPACE",
  GEOREFERENCE_BLOCKED: "NO_RELIABLE_MODERN_GEOREFERENCING",
  CONFLICT_OK: "CONFLICTING_EVIDENCE_PRESENT",
  RESOLUTION_BLOCKED: "SILENT_RESOLUTION_FORBIDDEN",
  PHOTO_OK: "CONFIRMED_CURRENT_PHOTO",
  HISTORICAL_PHOTO_BLOCKED: "HISTORICAL_VISUAL_ASSETS_ZERO",
  BEFORE_AFTER_BLOCKED: "NO_HISTORICAL_SIDE_AVAILABLE",
  TIMELINE_OK: "EVIDENCED_CHANGE_CHAIN",
  NO_TIMELINE: "NO_EVIDENCED_CHANGE_CHAIN",
  NARRATIVE_ALWAYS: "NARRATIVE_SURFACE_ALWAYS_AVAILABLE",
  NOT_DRAWING_OK: "WITHHOLDING_IS_LEGITIMATE",
} as const;

/**
 * 确定性 eligibility 评估（最小策略，非规则引擎）。
 * 每条都回答：为什么能画 / 为什么不能画 / 依据是什么。
 */
export function evaluateSurfaceEligibility(world: WorldEvidenceState): SurfaceEligibility[] {
  const out: SurfaceEligibility[] = [];

  // 1) 当前精确空间
  out.push(
    world.currentExactEntities.length > 0
      ? {
          surfaceType: "current_map",
          eligible: true,
          reasonCode: SELECTION_REASON.CURRENT_EXACT,
          evidenceRefs: world.currentExactEntities,
        }
      : {
          surfaceType: "current_map",
          eligible: false,
          reasonCode: SELECTION_REASON.NO_CURRENT_EXACT,
          blockedBy: ["no reliable current exact coordinates"],
        }
  );

  // 2) 近似区域（不得退化为精确点）
  out.push(
    world.approximateEntities.length > 0
      ? {
          surfaceType: "approximate_area",
          eligible: true,
          reasonCode: SELECTION_REASON.APPROXIMATE_ONLY,
          evidenceRefs: world.approximateEntities,
          blockedBy: ["exact_point_presentation"],
        }
      : {
          surfaceType: "approximate_area",
          eligible: false,
          reasonCode: SELECTION_REASON.NO_APPROXIMATE,
          blockedBy: ["no approximate grounding entity"],
        }
  );

  // 3) 关系历史空间（有历史关系、无历史几何 → 关系可用，重建几何不可用）
  out.push(
    world.hasHistoricalRelations
      ? {
          surfaceType: "relational_space",
          eligible: true,
          reasonCode: SELECTION_REASON.RELATIONS_NO_GEOMETRY,
          blockedBy: ["exact_or_reconstructed_historical_geometry"],
        }
      : {
          surfaceType: "relational_space",
          eligible: false,
          reasonCode: "NO_HISTORICAL_RELATIONS",
          blockedBy: ["no historical relation evidence"],
        }
  );

  // 4) 历史几何本身是 Claim：无证据则无资格（current geometry 不得继承）
  out.push({
    surfaceType: "historical_geometry",
    eligible: false,
    reasonCode: SELECTION_REASON.HISTORICAL_GEOMETRY_BLOCKED,
    blockedBy: [
      "GEOMETRY_IS_A_CLAIM",
      "current geometry must not inherit as historical geometry",
      ...(world.hasHistoricalGeometry ? [] : ["historical_geometry_count=0"]),
    ],
  });

  // 5) 历史地图：native 文档空间可用；现代配准不可用（本切片恒不可配准）
  const hm = world.historicalMapSource;
  if (hm) {
    out.push({
      surfaceType: "historical_map_native",
      eligible: true,
      reasonCode: SELECTION_REASON.NATIVE_MAP_OK,
      evidenceRefs: [hm.key],
      blockedBy: hm.imageAvailable ? [] : ["no local qualified image (prototype partial)"],
    });
    out.push({
      surfaceType: "historical_map_georeferenced",
      eligible: false,
      reasonCode: SELECTION_REASON.GEOREFERENCE_BLOCKED,
      blockedBy: ["no reliable modern georeferencing", "HR-MAP-01=PARTIAL_CONFIRM", "1879 p36 not attributable to slice objects"],
    });
  } else {
    out.push({
      surfaceType: "historical_map_native",
      eligible: false,
      reasonCode: "NO_HISTORICAL_MAP_SOURCE",
      blockedBy: ["no historical map source registered"],
    });
  }

  // 6) 冲突：并列可用，静默裁决不可用
  out.push(
    world.conflicts.length > 0
      ? {
          surfaceType: "conflict_compare",
          eligible: true,
          reasonCode: SELECTION_REASON.CONFLICT_OK,
          evidenceRefs: world.conflicts.map((c) => c.ruling),
        }
      : {
          surfaceType: "conflict_compare",
          eligible: false,
          reasonCode: "NO_CONFLICT",
          blockedBy: ["no conflicting evidence"],
        }
  );
  out.push({
    surfaceType: "resolved_single_answer",
    eligible: false,
    reasonCode: SELECTION_REASON.RESOLUTION_BLOCKED,
    blockedBy: world.conflicts.length > 0 ? world.conflicts.map((c) => c.ruling) : ["no conflict to resolve"],
  });

  // 7) 视觉资产：current photo 可用；historical photo / before-after 不可用
  out.push(
    world.currentPhotosConfirmed > 0
      ? {
          surfaceType: "current_photo",
          eligible: true,
          reasonCode: SELECTION_REASON.PHOTO_OK,
          evidenceRefs: [`confirmed_current_photos=${world.currentPhotosConfirmed}`],
        }
      : {
          surfaceType: "current_photo",
          eligible: false,
          reasonCode: "NO_CONFIRMED_CURRENT_PHOTO",
          blockedBy: ["no confirmed current photo"],
        }
  );
  out.push({
    surfaceType: "historical_photo",
    eligible: false,
    reasonCode: SELECTION_REASON.HISTORICAL_PHOTO_BLOCKED,
    blockedBy: [`historical_visual_assets=${world.historicalVisualAssets}`],
  });
  out.push({
    surfaceType: "before_after",
    eligible: false,
    reasonCode: SELECTION_REASON.BEFORE_AFTER_BLOCKED,
    blockedBy: ["no historical side available", "historical_visual_assets=0"],
  });

  // 8) 时间轴
  out.push(
    world.hasEvidencedChanges
      ? { surfaceType: "timeline", eligible: true, reasonCode: SELECTION_REASON.TIMELINE_OK }
      : {
          surfaceType: "timeline",
          eligible: false,
          reasonCode: SELECTION_REASON.NO_TIMELINE,
          blockedBy: ["no evidenced change chain"],
        }
  );

  // 9) 叙事/代理类 Surface：恒可用（它们不主张历史空间/视觉 Claim）
  for (const t of ["evidence_reveal", "source_inspect", "question", "discovery", "agent_prompt", "action_dock"] as SurfaceType[]) {
    out.push({ surfaceType: t, eligible: true, reasonCode: SELECTION_REASON.NARRATIVE_ALWAYS });
  }

  // 10) 「不画」也是合法 Surface Selection
  out.push({ surfaceType: "unknown_gap", eligible: true, reasonCode: SELECTION_REASON.NOT_DRAWING_OK });

  return out;
}

/**
 * Evidence-aware Surface Selection：Composition 只能从这里拿到的 eligible 集合里选。
 * preferences 只是「想要谁当主角」的排序，不是许可证——ineligible 一律被拒绝。
 */
export function selectSurfaces(
  world: WorldEvidenceState,
  preferences: { primary?: SurfaceType[]; secondary?: SurfaceType[] } = {}
): SurfaceSelection {
  const eligibleSurfaces = evaluateSurfaceEligibility(world);
  const isEligible = (t: SurfaceType) => eligibleSurfaces.some((e) => e.surfaceType === t && e.eligible);

  const selectedPrimary = (preferences.primary ?? []).find(isEligible);
  const selectedSecondary = (preferences.secondary ?? []).filter(isEligible);

  const fallback: SurfaceSelection["fallback"] =
    !selectedPrimary
      ? world.conflicts.length > 0
        ? "evidence_gap"
        : world.hasHistoricalRelations
          ? "question"
          : "unknown"
      : undefined;

  return { eligibleSurfaces, selectedPrimary, selectedSecondary, fallback };
}
