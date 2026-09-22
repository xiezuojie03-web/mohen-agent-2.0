// Evidence / Temporal / Visual / Agent-Narrative Surfaces — 可复用语义组件。
// 硬规则：组件不拥有历史真相，只消费 semantic state/data。

"use client";

import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";
import type { SurfaceComponentProps } from "./types";

const L = (lv: string) => LEVEL_LABELS[lv as NarrativeLevel] ?? lv;

// ---------------------------------------------------------------------------
// TimelineSurface 2.0：时间成为主角；支持 出现/毁损/重建/当代 的视觉区分（§3, Beat04）
// ---------------------------------------------------------------------------
export function TimelineSurface({ ctx, compact }: SurfaceComponentProps) {
  const changes = ctx.slice.changes.filter((c) => c.change_epistemic === "evidenced");
  return (
    <div className="surf surf-timeline" data-testid="surface-timeline">
      <p className="surf__caption">时间成为主角 · 只列有据的变化</p>
      <div className="timeline-band">
        <span className="timeline-now">今天</span>
        <span className="timeline-arrow" aria-hidden>
          ←
        </span>
        <span className="timeline-target" data-testid="time-state-display">
          {ctx.scene.time_state}
        </span>
      </div>
      {!compact && (
        <ol className="timeline-track">
          {changes.map((c) => (
            <li key={c.change_key} className={`tl-step tl-step--${statusKind(c)}`} data-testid={`tl-${c.change_key.split("/")[1]}`}>
              <span className="tl-step__dot" />
              <div>
                <b>{c.canonical_label}</b>
                <p className="tl-step__from">{c.from_state}</p>
                <p className="tl-step__to">→ {c.to_state}</p>
              </div>
              <span className="tl-step__tag">{tagOf(statusKind(c))}</span>
            </li>
          ))}
          {ctx.slice.changes
            .filter((c) => c.change_epistemic !== "evidenced")
            .map((c) => (
              <li key={c.change_key} className="tl-step tl-step--unknown" data-testid={`tl-unknown-${c.change_key.split("/")[1]}`}>
                <span className="tl-step__dot" />
                <div>
                  <b>{c.canonical_label}</b>
                  <p className="tl-step__from">{c.from_state || "历史年代：不着录（切片不作时间断言）"}</p>
                </div>
                <span className="tl-step__tag">未知</span>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}

function statusKind(c: { to_state: string; change_status: string }): string {
  if (/毁/.test(c.to_state)) return "destroyed";
  if (/重建|原址/.test(c.to_state)) return "rebuilt";
  if (/仍|今天|今天仍/.test(c.to_state)) return "survives";
  return "appeared";
}
function tagOf(kind: string): string {
  return { appeared: "出现", destroyed: "毁损 / 毁坏", rebuilt: "原址重建", survives: "延续到今天", unknown: "未知" }[kind] ?? "变化";
}

// ---------------------------------------------------------------------------
// EvidenceRevealSurface：只揭示当前问题所需 Evidence（progressive disclosure）
// ---------------------------------------------------------------------------
export function EvidenceRevealSurface({ ctx, onAction }: SurfaceComponentProps) {
  const units = ctx.scene.narrative.filter((u) => ctx.revealed.includes(u.unit_id));
  const hidden = ctx.scene.narrative.filter((u) => !ctx.revealed.includes(u.unit_id));
  return (
    <div className="surf surf-evidence-reveal" data-testid="surface-evidence-reveal">
      <p className="surf__caption">证据按需出现 · 不一次铺满</p>
      <div className="evidence-units">
        {units.map((u) => (
          <div key={u.unit_id} className={`unit unit--${u.level}`}>
            <span className="unit__badge">{L(u.level)}</span>
            <span className="unit__text">{u.text}</span>
            {u.evidence_refs.length > 0 && <span className="unit__refs">证据 ×{u.evidence_refs.length}</span>}
          </div>
        ))}
      </div>
      {hidden.length > 0 && (
        <button className="exp-btn exp-btn--context" onClick={() => onAction?.("看事实")} data-testid="reveal-evidence">
          展开这一刻的证据（还有 {hidden.length} 条未显示）
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConflictCompareSurface：并列冲突，不替用户选边（canonical fixture: T11-C1/C2）
// ---------------------------------------------------------------------------
export function ConflictCompareSurface({ ctx }: SurfaceComponentProps) {
  const conflicts = ctx.script.conflicts.filter(
    (c) => (c as { surfaced_in_scene?: string }).surfaced_in_scene === ctx.scene.scene_id
  );
  const shown = conflicts.filter((c) => ctx.revealedConflicts.includes(c.ruling));
  return (
    <div className="surf surf-conflict" data-testid="surface-conflict-compare">
      <p className="surf__caption">着录冲突 · 并列 · <b>未裁决</b></p>
      {shown.length === 0 && <p className="surf__note">先问「为什么不能确定？」，再一组一组看。</p>}
      <div className="exp-conflicts">
        {shown.map((c) => {
          const ruling = ctx.script.t11_rulings_applied.find((r) => r.ruling === c.ruling);
          return (
            <article key={c.ruling} className="conflict-card" data-testid={`conflict-${c.ruling}`}>
              <header>
                <strong>{c.topic}</strong>
                <span className="conflict-card__ruling">{c.ruling} · 未裁决</span>
              </header>
              <p>{ruling?.applied ?? c.decision}</p>
              <footer>墨痕不替你选边——两说着录都保留在案。</footer>
            </article>
          );
        })}
      </div>
      <div className="conflict-status">
        <span className="tag tag--unresolved">静默裁决：ineligible</span>
        <span className="tag tag--confirmed">并列比较：eligible</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SourceInspectSurface：用户显式要求时查看史料元信息（Source 是 Evidence，不是装饰）
// ---------------------------------------------------------------------------
export function SourceInspectSurface({ ctx }: SurfaceComponentProps) {
  const rulings = ctx.script.t11_rulings_applied;
  return (
    <div className="surf surf-source" data-testid="surface-source-inspect">
      <p className="surf__caption">史料 / 出处查看 · 按需打开</p>
      <ul className="source-list">
        {rulings.map((r) => (
          <li key={r.ruling}>
            <b>{r.ruling}</b> · {r.topic}
            <p>{r.applied}</p>
          </li>
        ))}
      </ul>
      <p className="surf__note">
        {ctx.scene.uncertainty}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionSurface：一个强问题，最少解释
// ---------------------------------------------------------------------------
export function QuestionSurface({ ctx }: SurfaceComponentProps) {
  const q = ctx.scene.narrative.find((u) => u.level === "QUESTION") ?? null;
  const text = q?.text ?? ctx.script.primary_question;
  return (
    <div className="surf surf-question" data-testid="surface-question">
      <p className="question-text">{text}</p>
      <span className="question-mark">这是还没有答案的问题</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiscoverySurface：明确区分 FACT / INTERPRETATION_CANDIDATE / UNKNOWN（TASK-0012A 冻结）
// ---------------------------------------------------------------------------
export function DiscoverySurface({ ctx }: SurfaceComponentProps) {
  const d = ctx.script.discoveries.primary;
  const isInterpretation = d.epistemic_classification === "INTERPRETATION_CANDIDATE";
  return (
    <div className="surf surf-discovery" data-testid="surface-discovery">
      <blockquote className={`exp-discovery ${isInterpretation ? "exp-discovery--interpretation" : ""}`} data-testid="primary-discovery">
        <span className="exp-discovery__badge">{isInterpretation ? "墨痕的解释 / 尚未证实" : "发现"}</span>
        <p>{d.statement}</p>
        <footer>未决对点：{d.unresolved_counterpoint}</footer>
      </blockquote>
      <div className="discovery-rule">
        <code>Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C interpretation)</code>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentPromptSurface：短引导（不是聊天记录）
// ---------------------------------------------------------------------------
export function AgentPromptSurface({ ctx }: SurfaceComponentProps) {
  return (
    <div className="agent-prompt" data-testid="agent-prompt">
      <span className="agent-prompt__who">墨痕</span>
      <ul>
        {ctx.beat.mohen.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionDock：行动是 state transition，不是 page link
// ---------------------------------------------------------------------------
export function ActionDock({ ctx, onAction }: SurfaceComponentProps) {
  return (
    <div className="action-dock" data-testid="action-dock">
      {ctx.beat.actions.map((a) => (
        <button key={a} className="exp-btn exp-btn--context" onClick={() => onAction?.(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CurrentPhotoSurface：仅批准的 current imagery（保持 current/historical 区分）
// ---------------------------------------------------------------------------
export function CurrentPhotoSurface({ ctx, compact }: SurfaceComponentProps) {
  const all = ctx.scene.visual_assets.filter((a) => a.type === "photo");
  // compact（context/secondary 位置）只出一张，让位给 Primary Surface
  const photos = compact ? all.slice(0, 1) : all;
  return (
    <div className="surf surf-photo" data-testid="surface-current-photo">
      <p className="surf__caption">今日实景 · 不是历史影像（历史视觉资产 = 0）</p>
      <div className="photo-grid">
        {photos.map((a) => (
          <figure key={a.id} className="photo-card" data-testid={`photo-${a.label}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={commonsDirectUrl(a.uri)} alt={`${a.label} · 当代实景`} loading="lazy" />
            <figcaption>
              <b>{a.label}</b> · {a.rights}
              <a href={a.uri} target="_blank" rel="noreferrer">
                来源
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeforeAfterSurface：本任务只定义接口；无历史视觉证据则不伪造历史侧
// ---------------------------------------------------------------------------
export function BeforeAfterSurface({ ctx }: SurfaceComponentProps) {
  const historicalAvailable = ctx.world.historicalVisualAssets > 0;
  return (
    <div className="surf surf-beforeafter" data-testid="surface-before-after">
      <p className="surf__caption">今昔对照 · 接口已定义</p>
      <div className="ba-grid">
        <div className="ba-side">
          <span>历史侧</span>
          {historicalAvailable ? <p>（有历史视觉资产时在此渲染）</p> : <p className="ba-empty">不可渲染：历史视觉资产 = 0</p>}
        </div>
        <div className="ba-side">
          <span>今日侧</span>
          <CurrentPhotoSurface ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

function commonsDirectUrl(pageUri: string, width = 900): string {
  const m = pageUri.match(/File:([^?#]+)/);
  if (!m) return pageUri;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(decodeURIComponent(m[1]))}?width=${width}`;
}
