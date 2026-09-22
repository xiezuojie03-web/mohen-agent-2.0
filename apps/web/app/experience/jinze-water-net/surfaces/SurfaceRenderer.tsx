// apps/web/app/experience/jinze-water-net/surfaces/SurfaceRenderer.tsx
//
// TASK-0013 — SurfaceRenderer：按 CompositionState.primarySurface 选择预定义表面。
// 架构原则（§5）：semantic composition → predefined composition → renderer。
// 不存在也不允许出现 JinzeScene01.tsx 式的场景组件——场景差异全部来自数据。

import type { ExperienceScript, ExperienceScene } from "@mohen/experience-engine";
import type { SliceShape } from "./types";
import ModernMapSurface from "./ModernMapSurface";
import RelationalSpaceSurface from "./RelationalSpaceSurface";
import TimelineSurface from "./TimelineSurface";
import EvidencePanelSurface from "./EvidencePanelSurface";
import CurrentPhotoSurface from "./CurrentPhotoSurface";
import TextFocusSurface from "./TextFocusSurface";

export interface SurfaceProps {
  scene: ExperienceScene;
  script: ExperienceScript;
  slice: SliceShape;
  focusPlace: string | null;
  visualMode: "normal" | "photo";
  compact?: boolean;
}

const PREDICATE_LABELS: Record<string, string> = {
  spans_waterway: "跨",
  spans_same_waterway: "同跨一条水道",
  former_site_of: "原址即",
  named_after: "得名于",
  temple_bridge_association: "寺桥关联（未证实）",
  relative_position_south_of: "在南",
};

export { PREDICATE_LABELS };

export default function SurfaceRenderer(props: SurfaceProps) {
  const { scene, visualMode } = props;
  // SET_VISUAL_MODE 动作：把画布切到今貌照片（仍受白名单约束）
  const surface = visualMode === "photo" ? "current_photo" : scene.composition.primarySurface;
  switch (surface) {
    case "modern_map":
      return <ModernMapSurface {...props} />;
    case "relational_space":
      return <RelationalSpaceSurface {...props} />;
    case "timeline":
      return <TimelineSurface {...props} />;
    case "evidence_panel":
      return <EvidencePanelSurface {...props} />;
    case "current_photo":
      return <CurrentPhotoSurface {...props} />;
    case "text_focus":
      return <TextFocusSurface {...props} />;
    default:
      return <TextFocusSurface {...props} />;
  }
}
