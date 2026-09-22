// apps/web/app/experience/jinze-water-net/surfaces/EvidencePanelSurface.tsx
//
// evidence_panel 表面：证据浮出。认知等级用用户语言区分：
// 有据 / 有限 / 冲突 / 未知 / 解释框架。T11-C1/C2 冲突双卡并列，前端不代选答案。

"use client";

import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";
import type { SurfaceProps } from "./SurfaceRenderer";

export default function EvidencePanelSurface({ scene, script }: SurfaceProps) {
  const conflicts = script.conflicts.filter(
    (c) => (c as { surfaced_in_scene?: string }).surfaced_in_scene === scene.scene_id
  );
  return (
    <div className="surf surf-evidence" data-testid="surface-evidence-panel">
      <p className="surf__caption">证据浮出 · 历史知识有来源、有置信、有分歧、有未决</p>

      {conflicts.length > 0 && (
        <div className="exp-conflicts" data-testid="conflict-cards">
          {conflicts.map((c) => {
            const ruling = script.t11_rulings_applied.find((r) => r.ruling === c.ruling);
            return (
              <article key={c.ruling} className="conflict-card" data-testid={`conflict-${c.ruling}`}>
                <header>
                  <strong>{c.topic}</strong>
                  <span className="conflict-card__ruling">{c.ruling} · 未裁决</span>
                </header>
                <p>{ruling?.applied ?? c.decision}</p>
                <footer>墨痕不替你选边——两种着录都保留在案。</footer>
              </article>
            );
          })}
        </div>
      )}

      <div className="evidence-units">
        {scene.narrative.map((u) => (
          <div key={u.unit_id} className={`unit unit--${u.level}`}>
            <span className="unit__badge">{LEVEL_LABELS[u.level as NarrativeLevel]}</span>
            <span className="unit__text">{u.text}</span>
            {u.evidence_refs.length > 0 && <span className="unit__refs">证据 ×{u.evidence_refs.length}</span>}
          </div>
        ))}
      </div>

      <div className="exp-evidence__section">
        <h4>本场景不确定项</h4>
        <p>{scene.uncertainty}</p>
      </div>
    </div>
  );
}
