"use client";

// apps/web/app/experience/jinze-water-net/ProductionBoard.tsx
//
// D2（Owner 决断，2026-10-17）：内容生产看板。按 Owner 既定偏好呈现真实数据生产链的产出：
//   原始资料原文 → AI 读出的发现（实体/关系）→ 可讲的故事。
// 数据全部来自 read_model（G5 · visual_stage）经 read-model-bridge 传入；本组件零写库、不产生事实。
//
// 纪律：
//   · 默认 Human UI：不出现工程枚举 / uuid / 表名；关系谓词人话化；
//   · 故事种子是「墨痕的解释（尚待证实）」，不是已证事实（事实/解释分层，C4 §19 / §2 诚实性）；
//   · 按需打开（Evidence on Demand），不常驻、不抢占舞台。

import type { ProductionRelationSummary } from "../../../lib/read-model-bridge";
import { humanizeRelation } from "./productionRelationLabels";

export default function ProductionBoard({
  summary,
  onClose,
}: {
  summary: ProductionRelationSummary;
  onClose: () => void;
}) {
  const entities = summary.entities ?? [];
  const relations = summary.relations ?? [];
  const evidence = summary.evidence ?? [];
  const stories = summary.stories ?? [];
  const timelineEvents = summary.timeline?.events ?? [];
  const conflicts = summary.conflicts ?? [];
  const openQuestions = summary.openQuestions ?? [];
  const visuals = summary.visuals ?? [];

  return (
    <aside className="prod-board" data-testid="production-board" aria-label="真实产出 · 内容看板">
      <header className="prod-board__head">
        <div>
          <span className="prod-board__kicker">真实产出 · 内容看板</span>
          <h3 className="prod-board__title">{summary.title || "金泽 · 第一层真实闭环"}</h3>
        </div>
        <button type="button" className="exp-btn" onClick={onClose} data-testid="production-board-close">
          收起
        </button>
      </header>

      <section className="prod-board__section" data-testid="pb-discovery">
        <h4 className="prod-board__h">
          发现了哪些人物 / 地点 / 关系
          <span className="prod-board__count">{entities.length} 实体 · {relations.length} 关系</span>
        </h4>
        {entities.length > 0 && (
          <ul className="prod-board__chips">
            {entities.map((e) => (
              <li key={e} className="prod-board__chip">{e}</li>
            ))}
          </ul>
        )}
        {relations.length > 0 && (
          <ul className="prod-board__lines">
            {relations.map((r, i) => (
              <li key={i} className="prod-board__line">{humanizeRelation(r)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="prod-board__section" data-testid="pb-evidence">
        <h4 className="prod-board__h">
          原始资料 · AI 读出的原文
          <span className="prod-board__count">{evidence.length} 段</span>
        </h4>
        {evidence.length > 0 ? (
          <ul className="prod-board__excerpts">
            {evidence.map((e, i) => (
              <li key={i} className="prod-board__excerpt">
                <blockquote>{e.excerpt}</blockquote>
                <cite>—— {e.sourceTitle}</cite>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-board__empty">暂无已发布的史料原文摘录。</p>
        )}
      </section>

      <section className="prod-board__section" data-testid="pb-stories">
        <h4 className="prod-board__h">
          可以支持什么故事
          <span className="prod-board__count">{stories.length} 条</span>
        </h4>
        {stories.length > 0 ? (
          <ul className="prod-board__stories">
            {stories.map((s, i) => (
              <li key={i} className="prod-board__story">
                <span className="prod-board__badge">墨痕的解释 · 尚待证实</span>
                <p>{s.statement}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-board__empty">暂无已发布的故事种子。</p>
        )}
      </section>

      {/* V1.4：时间投影（P03）——只列有着录的年代 */}
      <section className="prod-board__section" data-testid="pb-timeline">
        <h4 className="prod-board__h">
          有着录的时间变化
          <span className="prod-board__count">{timelineEvents.length} 条</span>
        </h4>
        {timelineEvents.length > 0 ? (
          <ul className="prod-board__lines">
            {timelineEvents.map((e, i) => (
              <li key={i} className="prod-board__line">
                {e.entity} · {e.year !== null ? (e.precision === "era" ? `约${e.year}` : e.year) : e.dynasty || "年代不详"}
                {e.after_state ? ` · ${e.after_state}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-board__empty">暂无已发布的时间投影（无有着录年代时不画）。</p>
        )}
      </section>

      {/* V1.4：着录分歧（W09）——并列保留，未裁决 */}
      <section className="prod-board__section" data-testid="pb-conflicts">
        <h4 className="prod-board__h">
          着录分歧 · 并列未裁决
          <span className="prod-board__count">{conflicts.length} 组</span>
        </h4>
        {conflicts.length > 0 ? (
          <ul className="prod-board__conflicts">
            {conflicts.map((c, i) => (
              <li key={i}>
                <b>{c.subject || c.key}</b>
                <span className="prod-board__badge">{c.key} · 未裁决</span>
                <p>{c.variants.map((v) => `${v.value}（${v.source}）`).join("；")}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-board__empty">暂无已登记的着录分歧。</p>
        )}
      </section>

      {/* V1.4：未决问题（含无据关系拒绝）——不装懂 */}
      <section className="prod-board__section" data-testid="pb-open-questions">
        <h4 className="prod-board__h">
          仍未解决的问题
          <span className="prod-board__count">{openQuestions.length} 条</span>
        </h4>
        {openQuestions.length > 0 ? (
          <ul className="prod-board__questions">
            {openQuestions.map((q, i) => (
              <li key={i}>
                <p>{q.question}</p>
                {q.missingEvidence ? <span className="prod-board__missing">缺：{q.missingEvidence}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-board__empty">暂无已登记的未决问题。</p>
        )}
      </section>

      {/* V1.5：今貌影像（P06 视觉证据；V3 今日观察） */}
      <section className="prod-board__section" data-testid="pb-visuals">
        <h4 className="prod-board__h">
          今貌影像 · 今日观察
          <span className="prod-board__count">{visuals.length} 帧</span>
        </h4>
        {visuals.length > 0 ? (
          <ul className="prod-board__visuals">
            {visuals.map((v, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.displayUrl} alt={`${v.entities.join("、")} · 当代实景`} loading="lazy" />
                <div>
                  <b>{v.entities.join("、") || "今貌影像"}</b>
                  <span className="prod-board__missing">来源：{v.sourceTitle} · {v.artist} · {v.license} · {v.timeIdentity}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-board__empty">暂无已发布的今貌影像（照片未作为史料进生产链）。</p>
        )}
      </section>

      <footer className="prod-board__foot">
        来源：数据生产链 D00–D05 真实产出（read_model · G5 已发布）。故事为解释增量，非已证事实。
      </footer>
    </aside>
  );
}
