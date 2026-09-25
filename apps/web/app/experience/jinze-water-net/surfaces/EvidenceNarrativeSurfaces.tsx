// Evidence / Temporal / Visual / Agent-Narrative Surfaces — 可复用语义组件。
// 硬规则：组件不拥有历史真相，只消费 semantic state/data。

"use client";

import { useState } from "react";
import type { SurfaceComponentProps } from "./types";
import { predicateLabel } from "./SpatialSurfaces";
import {
  humanLevelLabel,
  humanFragmentBadge,
  humanResolutionStatus,
  stripInternalPrefix,
  humanUncertainty,
  CONFLICT_STATUS_HUMAN,
  DISCOVERY_FORMULA,
  DISCOVERY_FORMULA_HUMAN,
} from "../humanLabels";
import {
  TEMPORAL,
  temporalStateFromWording,
  withDepth,
  svgStyle,
  type TemporalState,
} from "../../../../lib/mohen-visual/visual-grammar";
import { VisualLegend } from "../../../../lib/mohen-visual/spatial-canvas";
import { fragmentGateDisplayItems, presentOpenQuestions } from "../culturalWorldProjection";

const dm = (ctx: SurfaceComponentProps["ctx"]) => ctx.devMode ?? false;

// ---------------------------------------------------------------------------
// Temporal Landscape V3（TASK-0015 §9）
//
// 时间不是「年份 + 资料卡列表」，而是一条连续结构：
//   · 每个对象一条 lifeline（延续 / 中断 / 原址重建各有语法）
//   · 毁损 = 生命线断裂（rupture）+ 断裂段斜纹占位
//   · 原址重建 = 中断之后重新起线（双划节奏）
//   · unknown 合法占据时间结构（斜纹占位，不作时间断言）
//   · 无年份的事件**不落在时间轴上**（有事件 ≠ 有年代）
//   · 回到今天 = 结构右端的当代终点
// ---------------------------------------------------------------------------

const TL = { w: 760, h: 470, ax: 152, axisY: 64, rowTop: 104, rowH: 62, rightPad: 76 };
const TL_AW = TL.w - TL.ax - TL.rightPad;
const TL_NOW_GAP = 44;

interface TlEvent {
  year: number | null;
  text: string;
  state: TemporalState | null;
}

/** 只对切片自带的 time_hint 做分类，不生成任何新的年代断言 */
function parseTimeHint(hint: string): TlEvent[] {
  return String(hint ?? "")
    .split(/→|->/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tok) => {
      const m = tok.match(/\d{4}/);
      return { year: m ? Number(m[0]) : null, text: tok, state: temporalStateFromWording(tok) };
    });
}

export function TimelineSurface({ ctx, compact }: SurfaceComponentProps) {
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const rows = ctx.slice.features
    .map((f) => {
      const key = f.feature_key.split("/").pop() ?? f.feature_key;
      const changes = ctx.slice.changes.filter((c) => c.feature_key === f.feature_key);
      if (changes.length === 0) return null;
      const events = changes.flatMap((c) => parseTimeHint(c.time_hint));
      const toPresent = changes.some(
        (c) => c.change_status === "survives" || c.change_status === "rebuilt" || /今|当代|今天/.test(c.to_state)
      );
      return { key, label: f.canonical_label, events, toPresent };
    })
    .filter((r): r is { key: string; label: string; events: TlEvent[]; toPresent: boolean } => r !== null);

  const years = rows
    .flatMap((r) => r.events.map((e) => e.year))
    .filter((y): y is number => typeof y === "number")
    .sort((a, b) => a - b);
  const uniqueYears = [...new Set(years)];
  const minY = uniqueYears.length ? uniqueYears[0] : 0;
  const maxY = uniqueYears.length ? uniqueYears[uniqueYears.length - 1] : 1;
  const xOf = (year: number) => TL.ax + ((year - minY) / (maxY - minY || 1)) * TL_AW;
  const xNow = TL.ax + TL_AW + TL_NOW_GAP;
  const lastRowY = TL.rowTop + (rows.length - 1) * TL.rowH + TL.rowH / 2;

  return (
    <div className="surf surf-timeline surf-timeline--v3" data-testid="surface-timeline">
      <p className="surf__caption">时间景观 · 时间本身是连续结构 · 只画有着录的变化</p>
      <div className="timeline-band">
        <span className="timeline-now">今天</span>
        <span className="timeline-arrow" aria-hidden>
          ←
        </span>
        <span className="timeline-target" data-testid="time-state-display">
          {ctx.scene.time_state}
        </span>
      </div>
      <svg viewBox={`0 0 ${TL.w} ${TL.h}`} className="surf-timeline__svg" role="img" aria-label="时间景观：对象生命线与变化事件">
        <defs>
          <pattern id="tl-hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: "var(--mist)", strokeWidth: 1.1, opacity: 0.5 }} />
          </pattern>
        </defs>

        {/* 时间轴：连续的量尺，不是年份卡片 */}
        <g className="tl-axis">
          <line x1={TL.ax - 30} y1={TL.axisY} x2={xNow + 22} y2={TL.axisY} className="tl-axis__line" />
          {uniqueYears.map((y) => (
            <g key={`tk-${y}`}>
              <line x1={xOf(y)} y1={TL.axisY} x2={xOf(y)} y2={lastRowY + 28} className="tl-axis__grid" />
              <text x={xOf(y)} y={TL.axisY - 10} textAnchor="middle" className="tl-axis__year">
                {y}
              </text>
            </g>
          ))}
          <line x1={xNow} y1={TL.axisY - 16} x2={xNow} y2={lastRowY + 28} className="tl-axis__now" style={svgStyle(TEMPORAL.return_to_present)} />
          <text x={xNow} y={TL.axisY - 22} textAnchor="middle" className="tl-axis__nowlabel">
            今
          </text>
        </g>

        {rows.map((row, i) => {
          const ry = TL.rowTop + i * TL.rowH + TL.rowH / 2;
          const depth = focusKey ? (focusKey === row.key ? "primary" : "context") : "primary";
          const rowYears = row.events.map((e) => e.year).filter((y): y is number => typeof y === "number");
          const startYear = rowYears.length ? Math.min(...rowYears) : null;
          const endYear = rowYears.length ? Math.max(...rowYears) : null;
          const destruction = row.events.find((e) => e.state === "destruction" && e.year !== null) ?? null;
          const reconstruction =
            row.events.find((e) => e.state === "reconstruction" && e.year !== null && (!destruction || (e.year as number) > (destruction.year as number))) ?? null;

          return (
            <g
              key={row.key}
              className={`tl-row tl-d-${depth}`}
              data-testid={`tl-row-${row.key}`}
              onClick={() => setFocusKey((cur) => (cur === row.key ? null : row.key))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setFocusKey((cur) => (cur === row.key ? null : row.key));
              }}
            >
              {/* 命中区（整行可点击聚焦，其余行退为语境） */}
              <rect x={0} y={ry - TL.rowH / 2} width={TL.w} height={TL.rowH} className="tl-row__hit" />
              <text x={TL.ax - 18} y={ry + 5} textAnchor="end" className="tl-row__label">
                {row.label}
              </text>

              {startYear === null ? (
                // unknown 合法占据时间结构：有对象、无年代 → 占位，不断言
                <>
                  <rect
                    x={TL.ax}
                    y={ry - 13}
                    width={xNow - TL.ax}
                    height={26}
                    className="tl-unknown"
                    style={{ fill: "url(#tl-hatch)", stroke: TEMPORAL.unknown.stroke, strokeWidth: 1, strokeDasharray: "2 7", opacity: TEMPORAL.unknown.opacity }}
                  />
                  <text x={TL.ax + 10} y={ry + 4} className="tl-unknown__label">
                    未知 · 不作时间断言
                  </text>
                </>
              ) : (
                (() => {
                  const end = row.toPresent ? xNow : xOf(endYear as number);
                  const cont = withDepth(TEMPORAL.continuity, depth);
                  const rec = withDepth(TEMPORAL.reconstruction, depth);
                  const segs: Array<{ x1: number; x2: number; token: typeof cont }> = [];
                  if (destruction) {
                    segs.push({ x1: xOf(startYear), x2: xOf(destruction.year as number), token: cont });
                    if (reconstruction) segs.push({ x1: xOf(reconstruction.year as number), x2: end, token: rec });
                  } else {
                    segs.push({ x1: xOf(startYear), x2: end, token: cont });
                  }
                  return (
                    <>
                      {segs.map((s, k) => (
                        <line key={k} x1={s.x1} y1={ry} x2={s.x2} y2={ry} className="tl-lifeline" style={svgStyle(s.token)} />
                      ))}
                      {destruction && (
                        <>
                          {/* 断裂段：斜纹占位（生命线在此中断） */}
                          <rect
                            x={xOf(destruction.year as number)}
                            y={ry - 15}
                            width={Math.max(6, (reconstruction ? xOf(reconstruction.year as number) : end) - xOf(destruction.year as number))}
                            height={30}
                            className="tl-gap"
                            style={{ fill: "url(#tl-hatch)", stroke: "none", opacity: 0.8 }}
                          />
                          {/* rupture：断口 */}
                          <g className="tl-rupture" style={svgStyle(withDepth(TEMPORAL.destruction, depth))}>
                            <line x1={xOf(destruction.year as number)} y1={ry - 16} x2={xOf(destruction.year as number)} y2={ry + 16} style={{ stroke: TEMPORAL.destruction.stroke, strokeWidth: 3.2, strokeDasharray: "3 6" }} />
                            <path
                              d={`M ${xOf(destruction.year as number) - 5} ${ry - 9} l 5 6 l -5 6 l 5 6`}
                              style={{ fill: "none", stroke: TEMPORAL.destruction.stroke, strokeWidth: 2 }}
                            />
                          </g>
                        </>
                      )}
                      {reconstruction && (
                        <g className="tl-rebuild" style={svgStyle(rec)}>
                          <line x1={xOf(reconstruction.year as number)} y1={ry - 14} x2={xOf(reconstruction.year as number)} y2={ry + 14} style={{ stroke: rec.stroke, strokeWidth: 3, strokeDasharray: "8 4 2 4" }} />
                          <circle cx={xOf(reconstruction.year as number)} cy={ry} r={7} style={{ fill: "var(--paper)", stroke: rec.stroke, strokeWidth: 2 }} />
                          <line x1={xOf(reconstruction.year as number) - 3.5} y1={ry} x2={xOf(reconstruction.year as number) + 3.5} y2={ry} style={{ stroke: rec.stroke, strokeWidth: 2 }} />
                          <line x1={xOf(reconstruction.year as number)} y1={ry - 3.5} x2={xOf(reconstruction.year as number)} y2={ry + 3.5} style={{ stroke: rec.stroke, strokeWidth: 2 }} />
                        </g>
                      )}
                      {/* 有年份的事件落在轴上；无年份的事件只能挂在轴外（不伪造年代） */}
                      {row.events.map((e, k) =>
                        e.year === null ? (
                          <g key={`dl-${k}`} className="tl-dateless" style={svgStyle(TEMPORAL.unknown)}>
                            <circle cx={xNow + 30} cy={ry + (k % 2 === 0 ? -12 : 12)} r={6} style={{ fill: "var(--paper)", stroke: TEMPORAL.unknown.stroke, strokeWidth: 1.4, strokeDasharray: "2 5" }} />
                            <text x={xNow + 30} y={ry + (k % 2 === 0 ? -8 : 16)} textAnchor="middle" className="tl-dateless__q">
                              ?
                            </text>
                          </g>
                        ) : (
                          <g key={`ev-${k}`} className={`tl-event tl-event--${e.state ?? "none"}`}>
                            {e.state === "appearance" && (
                              <circle cx={xOf(e.year)} cy={ry} r={5.5} style={svgStyle(withDepth(TEMPORAL.appearance, depth))} />
                            )}
                            {e.state === "change" && (
                              <rect x={xOf(e.year) - 4.5} y={ry - 4.5} width={9} height={9} style={{ ...svgStyle(withDepth(TEMPORAL.change, depth)), strokeWidth: 2 }} />
                            )}
                            {e.state === "destruction" && (
                              <g style={svgStyle(withDepth(TEMPORAL.destruction, depth))}>
                                <line x1={xOf(e.year) - 5} y1={ry - 5} x2={xOf(e.year) + 5} y2={ry + 5} style={{ stroke: TEMPORAL.destruction.stroke, strokeWidth: 2.6 }} />
                                <line x1={xOf(e.year) + 5} y1={ry - 5} x2={xOf(e.year) - 5} y2={ry + 5} style={{ stroke: TEMPORAL.destruction.stroke, strokeWidth: 2.6 }} />
                              </g>
                            )}
                            {e.state === "reconstruction" && null}
                            {e.state === null && <circle cx={xOf(e.year)} cy={ry} r={3} style={svgStyle(withDepth(TEMPORAL.continuity, depth))} />}
                          </g>
                        )
                      )}
                      {row.toPresent && (
                        <g className="tl-present" style={svgStyle(withDepth(TEMPORAL.return_to_present, depth))}>
                          <line x1={end} y1={ry - 12} x2={end} y2={ry + 12} style={{ stroke: TEMPORAL.return_to_present.stroke, strokeWidth: 3 }} />
                        </g>
                      )}
                    </>
                  );
                })()
              )}
            </g>
          );
        })}
      </svg>
      <VisualLegend
        className="vg-legend--temporal"
        items={[
          { token: TEMPORAL.continuity, text: "延续", shape: "line" },
          { token: TEMPORAL.change, text: "变化", shape: "line" },
          { token: TEMPORAL.destruction, text: "毁损", shape: "line" },
          { token: TEMPORAL.reconstruction, text: "原址重建", shape: "line" },
          { token: TEMPORAL.unknown, text: "未知", shape: "band" },
          { token: TEMPORAL.return_to_present, text: "今", shape: "line" },
        ]}
      />
      {!compact && <p className="surf__note">有事件但无年份的，只挂在轴外 —— 不落在时间轴上。</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EvidenceRevealSurface：只揭示当前问题所需 Evidence（progressive disclosure）
//
// TASK-0017（inspect_evidence）：当处于证据检视模式时，evidence_reveal 成为
// 「体验主表达」——直接把被检视关系的依据与缺口作为画面主体，
// 而不是弹出一个开发者式 Inspector。依据与缺口都来自 world.relationEvidence，
// 可经 relationKey 溯源，不编造。
// ---------------------------------------------------------------------------
export function EvidenceRevealSurface({ ctx, onAction }: SurfaceComponentProps) {
  const units = ctx.scene.narrative.filter((u) => ctx.revealed.includes(u.unit_id));
  const hidden = ctx.scene.narrative.filter((u) => !ctx.revealed.includes(u.unit_id));

  const featureLabel = (key: string) => {
    const short = key.split("/").pop() ?? key;
    return (
      ctx.slice.features.find((f) => (f.feature_key.split("/").pop() ?? f.feature_key) === short)?.canonical_label ?? short
    );
  };

  // 证据检视模式：把被溯源的关系依据与缺口作为主表达
  const inspectRels = ctx.evidenceInspection
    ? (ctx.world.relationEvidence ?? []).filter((r) => (ctx.evidenceInspectionRefs ?? []).includes(r.relationKey ?? ""))
    : [];
  const showInspection = ctx.evidenceInspection && inspectRels.length > 0;

  // —— M4.1（EXP-CULTURAL-03）：fragment-level gate（唯一来源 = 008 evidence_fragments 投影）——
  // hr4_usable 可显（受 claim 约束）；u10_forbidden 只作禁用边界标记（fact 恒 null，绝不形成正向事实）；
  // generic 受 claim/usage 约束。组件不自行推断——只消费 world.evidenceFragmentGates。
  const gateItems = fragmentGateDisplayItems(ctx.world.evidenceFragmentGates ?? []);
  // —— M4.1：今日开放问题（唯一真源 = world.presentConnections.open_questions，U10 等）——
  const openQuestions = presentOpenQuestions(ctx.world);

  return (
    <div className="surf surf-evidence-reveal" data-testid="surface-evidence-reveal">
      <p className="surf__caption">证据按需出现 · 不一次铺满</p>

      {showInspection && (
        <div className="evidence-inspection" data-testid="evidence-inspection">
          <p className="evidence-inspection__lead">墨痕凭什么这么判断 —— 依据与缺口（不升级 · 不编造）</p>
          {inspectRels.map((r) => (
            <article
              key={r.relationKey}
              className="evidence-rel"
              data-testid="evidence-rel"
              data-relation-key={r.relationKey}
              data-epistemic-class={r.epistemicClass}
            >
              <header className="evidence-rel__head">
                <strong>
                  {featureLabel(r.subject)} ↔ {featureLabel(r.object)}
                </strong>
                {/* EXP-UI-RECON-01 R2/R5：epistemic class（E1/E2/E3）是内部枚举，
                    默认 Human UI 不展示；仅 ?inspector=1 透出。 */}
                {dm(ctx) && (
                  <span className={`tag tag--${r.epistemicClass.toLowerCase()}`}>
                    {r.epistemicClass}（不升 E1）
                  </span>
                )}
              </header>
              <p className="evidence-rel__basis">{stripInternalPrefix(r.basis, dm(ctx))}</p>
              <ul className="evidence-rel__meta">
                <li>关系谓词：{predicateLabel(r.predicate)}</li>
                {r.isCurrentAssociationOnly && (
                  <li className="evidence-rel__warn">仅今天共址 / 复合 POI —— 非前现代文献记载的历史关系</li>
                )}
                {/* EXP-0001：relationKey 是内部溯源串，普通用户视作噪音（gap #2）；仅 DEV 模式可见 */}
                {ctx.devMode && r.relationKey && (
                  <li className="evidence-rel__prov">溯源（DEV）：{r.relationKey}</li>
                )}
              </ul>
            </article>
          ))}
        </div>
      )}

      <div className="evidence-units">
        {units.map((u) => (
          <div key={u.unit_id} className={`unit unit--${u.level}`}>
            <span className="unit__badge">{humanLevelLabel(u.level, dm(ctx))}</span>
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

      {/* —— M4.1：证据片段闸门（fragment-level，008 投影）——
          hr4_usable 可显；u10_forbidden 只以「禁用边界」出现（无任何正向事实文本）；generic 受 claim/usage 约束 */}
      {gateItems.length > 0 && (
        <div className="evidence-frag-gates" data-testid="evidence-fragment-gates">
          <p className="surf__note">证据片段闸门 · 精确到片段的放行/禁用</p>
          <ul>
            {gateItems.map((g) =>
              g.kind === "forbidden" ? (
                <li key={g.fragment_id} className="unit" data-testid="fragment-gate-forbidden" data-span-type={g.span_type} data-has-fact="false">
                  <span className="unit__badge">{humanFragmentBadge("forbidden", dm(ctx))}</span>
                  <span className="unit__text">{stripInternalPrefix(g.forbiddenNote ?? "", dm(ctx))}</span>
                </li>
              ) : g.kind === "usable" ? (
                <li key={g.fragment_id} className="unit" data-testid="fragment-gate-usable" data-span-type={g.span_type} data-has-fact="true">
                  <span className="unit__badge">{humanFragmentBadge("usable", dm(ctx))}</span>
                  <span className="unit__text">{stripInternalPrefix(g.fact ?? "", dm(ctx))}</span>
                </li>
              ) : (
                <li key={g.fragment_id} className="unit" data-testid="fragment-gate-generic" data-span-type={g.span_type} data-has-fact="false">
                  <span className="unit__badge">{humanFragmentBadge("generic", dm(ctx))}</span>
                  <span className="unit__text">{stripInternalPrefix(g.usage_note ?? "", dm(ctx))}</span>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* —— M4.1：今日开放问题（U10 单一真源 = world.presentConnections.open_questions）——
          只作为问题呈现，绝不进入事实层 */}
      {openQuestions.length > 0 && (
        <div className="evidence-open-questions" data-testid="present-open-questions">
          <p className="surf__note">今日开放问题 · 只作为问题呈现，不进事实层</p>
          <ul>
            {openQuestions.map((q, i) => (
                <li key={i} className="unit" data-testid="present-open-question">
                <span className="unit__badge">{dm(ctx) ? "开放问题" : "待确认"}</span>
                <span className="unit__text">{stripInternalPrefix(q, dm(ctx))}</span>
              </li>
            ))}
          </ul>
        </div>
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
  // —— M4.1：008 结构化冲突（preserved_open，双值并存，不静默择一）——
  // 唯一来源 = world.conflicts 中 dualValue 项（008/cultural_conflicts 投影）。
  const dualConflicts = (ctx.world.conflicts ?? []).filter((c) => c.dualValue);
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
        {/* M4.1：008 双值冲突卡 —— 两值并列 + preserved_open，不为 UI 简化而选一个年份 */}
        {dualConflicts.map((c) => (
          <article key={c.ruling} className="conflict-card" data-testid={`conflict-008-${c.ruling}`} data-dual-value="true" data-resolution={c.resolutionStatus}>
              <header>
                <strong>{c.topic}</strong>
                <span className="conflict-card__ruling">{humanResolutionStatus(c.resolutionStatus ?? "", dm(ctx))} · 未裁决</span>
              </header>
              <p>
                两说着录并列保留：<b>{c.primaryValue}</b>（权威着录）↔ <b>{c.conflictedValue}</b>（冲突变体，{c.ruling}）。
                建造年代保持开放——墨痕不替你选边。
              </p>
              <footer>来源：{c.source} · {dm(ctx) ? "双值并存 · 静默裁决：ineligible" : "双值并存"}</footer>
          </article>
        ))}
      </div>
      <div className="conflict-status">
        {/* EXP-UI-RECON-01 R3：内部裁决状态标签（ineligible / eligible）仅 ?inspector=1 透出；
            默认 Human UI 以人话表达冲突本身，不替用户选边。 */}
        {dm(ctx) ? (
          <>
            <span className="tag tag--unresolved">静默裁决：ineligible</span>
            <span className="tag tag--confirmed">并列比较：eligible</span>
          </>
        ) : (
          <span className="conflict-status__human">{CONFLICT_STATUS_HUMAN}</span>
        )}
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
      {/* EXP-UI-RECON-01 R2：scene.uncertainty 的内部编号在默认 UI 剥离；
          无法无损人话化的状态码句（ACCEPT_CONFLICT 等）默认隐藏，?inspector=1 显示原文 */}
      {(() => {
        const u = humanUncertainty(ctx.scene.uncertainty, dm(ctx));
        return u ? <p className="surf__note">{u}</p> : null;
      })()}
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
        {/* EXP-UI-RECON-01 R2：冻结发现文本中的内部引用标记（（E1）/（U5）等）仅在默认 UI 剥离，Inspector 显示原文 */}
        <p>{stripInternalPrefix(d.statement, dm(ctx))}</p>
        <footer>未决对点：{stripInternalPrefix(d.unresolved_counterpoint, dm(ctx))}</footer>
      </blockquote>
      <div className="discovery-rule">
        {/* EXP-UI-RECON-01 R3：伪公式仅 ?inspector=1 透出；默认 Human UI 改以人话表达，
            且不创造新的历史结论。 */}
        {dm(ctx) ? (
          <code>{DISCOVERY_FORMULA}</code>
        ) : (
          <p className="discovery-rule__human">{DISCOVERY_FORMULA_HUMAN}</p>
        )}
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
