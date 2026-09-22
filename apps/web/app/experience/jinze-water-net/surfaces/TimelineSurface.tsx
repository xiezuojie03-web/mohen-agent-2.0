// apps/web/app/experience/jinze-water-net/surfaces/TimelineSurface.tsx
//
// timeline 表面：让时间状态可感知。数据来自冻结 script（time_state）与切片
// changes（有据变化链），不发明任何无着录的精确日期。

"use client";

import { useEffect, useState } from "react";
import type { SurfaceProps } from "./SurfaceRenderer";

export default function TimelineSurface({ scene, slice, compact }: SurfaceProps) {
  const evidencedChanges = slice.changes.filter((c) => c.change_epistemic === "evidenced");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="surf surf-timeline" data-testid="surface-timeline">
      <p className="surf__caption">时间带 · 只显示有着录支撑的时点</p>
      <div className="timeline-band">
        <span className="timeline-now">现在 · 2026</span>
        <span className="timeline-arrow" aria-hidden>
          ←
        </span>
        <span className="timeline-target" data-testid="time-state-display">
          {scene.time_state}
        </span>
      </div>
      {!compact && (
        <ol className="timeline-changes">
          {evidencedChanges.map((c, i) => (
            <li key={c.change_key} className={`timeline-change ${i <= tick % (evidencedChanges.length + 1) ? "timeline-change--lit" : ""}`}>
              <b>{c.canonical_label}</b>
              <span>{c.from_state}</span>
              <span className="timeline-change__to">→ {c.to_state}</span>
              {c.time_hint && <em>{c.time_hint}</em>}
            </li>
          ))}
          <li className="timeline-change timeline-change--unknown">
            <b>金泽塘</b>
            <span>历史年代：不着录（切片不作时间断言）</span>
          </li>
        </ol>
      )}
    </div>
  );
}
