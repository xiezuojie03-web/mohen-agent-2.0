// apps/web/app/experience/jinze-water-net/surfaces/TextFocusSurface.tsx
//
// text_focus 表面：叙事意义为主的时刻（Discovery / 追问 / 下一步）。
// s08 的 Fact → Interpretation → Unknown 认知序列在此获得与正文一致的分级视觉。

"use client";

import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";
import type { SurfaceProps } from "./SurfaceRenderer";

export default function TextFocusSurface({ scene, script, compact }: SurfaceProps) {
  const isDiscovery = scene.scene_id.endsWith("s08-next-question");
  return (
    <div className="surf surf-textfocus" data-testid="surface-text-focus">
      <p className="surf__caption">文本聚焦 · 这一刻，意义比画面重要</p>
      {isDiscovery && !compact && (
        <blockquote className="exp-discovery exp-discovery--interpretation" data-testid="primary-discovery">
          <span className="exp-discovery__badge">
            {script.discoveries.primary.epistemic_classification === "INTERPRETATION_CANDIDATE"
              ? "墨痕的解释框架 · 非已证事实"
              : "发现"}
          </span>
          <p>{script.discoveries.primary.statement}</p>
          <footer>未决对点：{script.discoveries.primary.unresolved_counterpoint}</footer>
        </blockquote>
      )}
      <div className="textfocus-units">
        {scene.narrative.map((u) => (
          <div key={u.unit_id} className={`unit unit--${u.level} unit--large`}>
            <span className="unit__badge">{LEVEL_LABELS[u.level as NarrativeLevel]}</span>
            <span className="unit__text">{u.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
