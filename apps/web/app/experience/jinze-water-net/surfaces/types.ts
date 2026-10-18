// apps/web/app/experience/jinze-water-net/surfaces/types.ts
// 冻结切片的最小类型面（Renderer 只消费这些结构；不携带任何历史几何）

export interface SliceShape {
  features: Array<{ feature_key: string; feature_type: string; canonical_label: string }>;
  relations: Array<{
    relation_key: string;
    subject_feature_key: string;
    predicate: string;
    object_feature_key: string;
    epistemic_class: string;
  }>;
  changes: Array<{
    change_key: string;
    /** 变化所属对象（与 features[].feature_key 对齐） */
    feature_key: string;
    canonical_label: string;
    change_status: string;
    change_epistemic: string;
    from_state: string;
    to_state: string;
    time_hint: string;
  }>;
  current_sources: Array<{
    anchor_key: string;
    kind: string;
    coord_system: string;
    location_raw: string;
    source_label: string;
  }>;
  /** 登记的史料源（HistoricalMapNative 只在 native 文档空间里展示，不做配准） */
  historical_sources: Array<{
    key: string;
    kind: string;
    note: string;
    method: string;
    attributable_to_slice_objects: boolean;
  }>;
  spatial_extent_current: {
    gcj02_bbox: { max_lat: number; max_lng: number; min_lat: number; min_lng: number };
    gcj02_span_m: { ew_m: number; ns_m: number; note: string };
    anchor_count: number;
  };
}

// ---------------------------------------------------------------------------
// TASK-0014：Surface Component Contract（§4）
// Surface 只消费 semantic state/data，不拥有历史真相。
// ---------------------------------------------------------------------------

/** 今貌影像策划清单（curated manifest，来自 data/experience，非冻结 JSON）。
 *  Surface 只消费该数组，不硬编码任何镇真相 —— 组件保持 town-agnostic。 */
export interface CuratedPhoto {
  /** 与切片 feature_key 对齐的键；非切片对象用描述性 id（如 fangshengqiao） */
  feature_key: string;
  /** 人话标签（数据提供，非组件硬编码） */
  label: string;
  /** 完整 Commons File 页 URL（复用 commonsDirectUrl 构造器直出图像） */
  commons_file: string;
  /** 图注（数据提供，非组件硬编码） */
  caption: string;
}
import type { ExperienceScript, ExperienceScene, WorldEvidenceState, SurfaceSelection } from "@mohen/experience-engine";
import type { CompositionState2 } from "@mohen/experience-engine";
import type { BeatPresentation } from "../beats";
import type { ProductionRelationSummary } from "../../../../lib/read-model-bridge";

export interface SurfaceContext {
  scene: ExperienceScene;
  script: ExperienceScript;
  slice: SliceShape;
  beat: BeatPresentation;
  world: WorldEvidenceState;
  selection: SurfaceSelection;
  composition: CompositionState2;
  /** 聚焦对象（FOCUS_PLACE） */
  focusPlace: string | null;
  /** 已揭示的叙事单元 id（progressive disclosure） */
  revealed: string[];
  /** 已揭示的冲突组（T11-C1/C2 逐层） */
  revealedConflicts: string[];
  /** 用户是否询问过「这两者有关系吗」（用于「没有一条线」的表达，语义通用） */
  askedMissingRelation: boolean;
  /** 可选对象组是否已「放进来」（由该体验的 Beat 行动驱动，语义通用） */
  optionalGroupIncluded: boolean;
  visualMode: "normal" | "photo";
  patchActive: boolean;
  /** TASK-0017：证据检视模式（inspect_evidence）——evidence_reveal 成为主表达，而非开发者式 Inspector */
  evidenceInspection?: boolean;
  /** TASK-0017：检视所溯源的关系 key 列表（可解析回 world.relationEvidence） */
  evidenceInspectionRefs?: string[];
  /** EXP-0001：DEV 模式（?inspector=1）才展示内部 runtime label；普通模式隐藏 relationKey 等噪音 */
  devMode?: boolean;
  /** Stage 1·2.2：今貌影像策划清单（来自 curated manifest，town-agnostic surface 消费它） */
  presentDayPhotos?: CuratedPhoto[];
  /** Stage 1·2.2：今貌影像主角钩子（来自 manifest，非组件硬编码） */
  presentDayHeroHook?: string;
  /** T4：真实数据产出（read_model · visual_stage）；可用时关系空间/发现优先渲染真实数据 */
  productionSummary?: ProductionRelationSummary;
}

export interface SurfaceComponentProps {
  ctx: SurfaceContext;
  onAction?: (action: string) => void;
  compact?: boolean;
}
