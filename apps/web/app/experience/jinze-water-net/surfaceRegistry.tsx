// apps/web/app/experience/jinze-water-net/surfaceRegistry.tsx
//
// TASK-0014 §5 — Surface Registry：surfaceType + semantic state → renderer component。
// Experience/Composition 层只说「要什么语义 Surface」，Registry 决定实现组件。

"use client";

import type { SurfaceType, SurfaceEligibility } from "@mohen/experience-engine";
import type { SurfaceComponentProps } from "./surfaces/types";
import {
  CurrentMapSurface,
  ApproximateAreaSurface,
  RelationalSpaceSurface,
  HistoricalMapNativeSurface,
} from "./surfaces/SpatialSurfaces";
import {
  TimelineSurface,
  EvidenceRevealSurface,
  ConflictCompareSurface,
  SourceInspectSurface,
  QuestionSurface,
  DiscoverySurface,
  AgentPromptSurface,
  ActionDock,
  CurrentPhotoSurface,
  BeforeAfterSurface,
} from "./surfaces/EvidenceNarrativeSurfaces";

/** 「不画 / 未知 / 证据缺口」是合法 Surface Selection 结果（§5A.2 末条） */
function UnknownGapSurface({ ctx }: SurfaceComponentProps) {
  return (
    <div className="surf surf-gap" data-testid="surface-unknown-gap">
      <p className="surf__caption">这一刻，墨痕选择不画。</p>
      <div className="gap-body">
        <p className="gap-lead">证据不足以支持更强的视觉表达。</p>
        <ul>
          <li>没有可靠历史几何 → 不画河形、街形、点位</li>
          <li>没有可靠历史视觉 → 不伪造旧照</li>
          <li>存在未裁决冲突 → 不代你选边</li>
        </ul>
      </div>
      <p className="surf__note">{ctx.scene.uncertainty}</p>
    </div>
  );
}

const REGISTRY: Record<SurfaceType, React.ComponentType<SurfaceComponentProps>> = {
  current_map: CurrentMapSurface,
  approximate_area: ApproximateAreaSurface,
  relational_space: RelationalSpaceSurface,
  historical_map_native: HistoricalMapNativeSurface,
  // ineligible 类型一律落到 UnknownGap（Registry 不会渲染它们）
  historical_map_georeferenced: UnknownGapSurface,
  historical_geometry: UnknownGapSurface,
  resolved_single_answer: UnknownGapSurface,
  historical_photo: UnknownGapSurface,
  before_after: BeforeAfterSurface,
  timeline: TimelineSurface,
  evidence_reveal: EvidenceRevealSurface,
  conflict_compare: ConflictCompareSurface,
  source_inspect: SourceInspectSurface,
  current_photo: CurrentPhotoSurface,
  question: QuestionSurface,
  discovery: DiscoverySurface,
  agent_prompt: AgentPromptSurface,
  action_dock: ActionDock,
  unknown_gap: UnknownGapSurface,
};

export const REGISTERED_SURFACES: SurfaceType[] = Object.keys(REGISTRY) as SurfaceType[];

export function registryHas(t: SurfaceType): boolean {
  return t in REGISTRY;
}

/** 解析组件；若该 surface 当前 ineligible，返回 null（由调用方走 fallback） */
export function resolveSurface(
  t: SurfaceType | undefined,
  eligibility: SurfaceEligibility[]
): React.ComponentType<SurfaceComponentProps> | null {
  if (!t) return null;
  const e = eligibility.find((x) => x.surfaceType === t);
  if (e && !e.eligible) return null;
  return REGISTRY[t] ?? null;
}

export { UnknownGapSurface };
