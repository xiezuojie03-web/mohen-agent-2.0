"use client";

// surfaces/ProductionDiscovery.tsx
//
// T4：真实发现 —— 把 read_model 已发布故事种子（productionSummary.stories，D05 story_seeds）
// 渲染为发现卡片，让数据生产链的真实发现成为舞台的 Discovery 内容。
// V1.4：新增「未决问题」区（productionSummary.openQuestions，D03 边界登记——
// 含"无据关系拒绝"与精度缺口）：正确拒绝错误历史关系与成功发布真实知识同等重要。
//
// 事实/解释分层（C4 §2 诚实性）：故事是「墨痕的解释 · 尚待证实」，不是已证事实。

import type { ProductionRelationSummary } from "../../../../lib/read-model-bridge";

export default function ProductionDiscovery({ summary }: { summary: ProductionRelationSummary }) {
  const stories = summary.stories ?? [];
  const openQuestions = summary.openQuestions ?? [];
  return (
    <div className="surf surf-discovery surf-discovery--production" data-testid="surface-discovery">
      <p className="surf__caption">真实产出 · 发现（D04 人文发现 → D05 故事种子）</p>
      {stories.length > 0 ? (
        <ul className="prod-discovery__list">
          {stories.map((s, i) => (
            <li key={i} className="prod-discovery__item">
              <blockquote
                className="exp-discovery exp-discovery--interpretation"
                data-testid={i === 0 ? "primary-discovery" : undefined}
              >
                <span className="exp-discovery__badge">墨痕的解释 / 尚未证实</span>
                <p>{s.statement}</p>
              </blockquote>
            </li>
          ))}
        </ul>
      ) : (
        <p className="surf__note">暂无已发布的故事种子。</p>
      )}
      {openQuestions.length > 0 && (
        <div className="prod-discovery__open" data-testid="production-open-questions">
          <h4 className="prod-discovery__open-h">仍未解决的问题 · 墨痕不装懂</h4>
          <ul>
            {openQuestions.map((q, i) => (
              <li key={i} data-testid={i === 0 ? "primary-open-question" : undefined}>
                <p className="prod-discovery__open-q">{q.question}</p>
                {q.missingEvidence ? (
                  <p className="prod-discovery__open-missing">缺：{q.missingEvidence}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
