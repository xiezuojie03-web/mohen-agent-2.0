// apps/web/app/experience/jinze-water-net/IntentGuide.tsx
//
// EXP-0001 — 人类可感知收口层（IntentGuide）。
//
// 这是普通用户看到墨痕「因为问题不同而改变判断方式」的主要入口，替代原 Inspector 的
// 结构化列表。四条 canonical path 均通过本组件收口：一句判断句 + 身份提示 + 该意图专属
// 补充（已知/缺口、人话时间、现场观察问题）+ 下一步探索。
//
// 硬纪律（任务书 §5 / §6 / §15）：
//   · 不展示内部 runtime label（intent kind / epistemic class / surface / evidenceFocus /
//     spatialAuthority / actionStatus / routeVerified）；这些只在 ?inspector=1 DEV 模式可见。
//   · 不替用户升档结论；不确定性自然呈现。

"use client";

import type { IntentExperienceTranslation } from "./intentTranslation";

interface IntentGuideProps {
  translation: IntentExperienceTranslation;
  onReturn: () => void;
  onExplore?: () => void;
}

export default function IntentGuide({ translation: t, onReturn, onExplore }: IntentGuideProps) {
  return (
    <section
      className={`exp-intent-guide exp-intent-guide--${t.intentKind}`}
      data-testid="intent-guide"
      data-intent-experience={t.intentKind}
      data-coordinate-authority-lost={t.coordinateAuthorityLost ? "yes" : "no"}
    >
      <header className="exp-intent-guide__head">
        <span className="exp-intent-guide__chip" data-testid="intent-guide-identity">
          {t.identityLabel}
        </span>
        <span className="exp-intent-guide__blurb">{t.identityBlurb}</span>
      </header>

      <p className="exp-intent-guide__lead" data-testid="intent-guide-lead">
        {t.guideLead}
      </p>

      {/* B：已知 / 仍缺（人话，不升档） */}
      {t.intentKind === "inspect_evidence" && (
        <div className="exp-intent-guide__body" data-testid="intent-guide-evidence">
          {t.known && t.known.length > 0 && (
            <div className="exp-ig-known" data-testid="intent-guide-known">
              <h5>已知（依据）</h5>
              <ul>
                {t.known.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}
          {t.missing && t.missing.length > 0 && (
            <div className="exp-ig-missing" data-testid="intent-guide-missing">
              <h5>还缺（缺口）</h5>
              <ul>
                {t.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* C：人话时间总结 */}
      {t.intentKind === "explore_temporal_change" && t.temporalSummary && (
        <p className="exp-intent-guide__body exp-ig-temporal" data-testid="intent-guide-temporal">
          {t.temporalSummary}
        </p>
      )}

      {/* D：2–3 个证据可溯现场观察问题（受约束建议，非导航） */}
      {t.intentKind === "propose_present_action" && t.observationPrompts && (
        <div className="exp-intent-guide__body exp-ig-observe" data-testid="intent-guide-observe">
          <h5>带着史料去现场看（不是路线导航）</h5>
          <ul>
            {t.observationPrompts.map((p, i) => (
              <li key={i} data-testid="intent-guide-observe-item">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="exp-intent-guide__actions">
        {t.exploreHint && onExplore && (
          <button className="exp-btn exp-btn--context" onClick={onExplore} data-testid="intent-guide-explore">
            {t.exploreHint.length > 16 ? "继续看证据 / 时间" : t.exploreHint}
          </button>
        )}
        <button className="exp-btn exp-btn--primary" onClick={onReturn} data-testid="intent-guide-return">
          {t.returnHint}
        </button>
      </div>
    </section>
  );
}
