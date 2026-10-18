"use client";

// apps/web/app/experience/jinze-water-net/AskBar.tsx
//
// ADR-003 / 导演稿 §4 第六步：自由追问（此前全站 0 个 input，只能点 4 个冻结按钮）。
//
// 链路：用户自由输入 → /api/mohen/ask（理解 → 只读检索 → 裁决 → 编排）→ AgentDecision
//      → 本组件展示墨痕的话 + 依据 + 缺口
//      → 父组件用 engineIntent 走既有 FOLLOWUP_REPLAN 让**世界真的变**（不是换一段文字）
//
// 展示纪律（A1 断言）：默认模式只给人话，不出现认识论枚举 / uuid / 库表 / 意图名；
// 这些仅在 ?inspector=1（devMode）透出。

import { useState } from "react";
import type { AgentDecision } from "@mohen/agent-runtime";
import { humanEpistemic } from "./humanLabels";

export interface AskBarProps {
  devMode: boolean;
  /** 把 Agent 的裁决交给导演层去改变世界（Patch-not-Replace） */
  onDecision: (decision: AgentDecision, question: string) => void;
  /** 建议问题（导演稿：可以点墨痕给出的少量建议问题） */
  suggestions?: string[];
  /** 主题键（金泽默认；绿之丘传 "a001"），驱动 /api/mohen/ask 选用对应别名档案 */
  topic?: string;
}

const EXAMPLES = [
  "寺和桥真的有关系吗？",
  "你凭什么这么说？",
  "后来发生了什么变化？",
  "我现在去现场能看什么？",
];

export default function AskBar({ devMode, onDecision, suggestions, topic }: AskBarProps) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [failed, setFailed] = useState(false);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/mohen/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(topic ? { question: text, topic } : { question: text }),
      });
      const json = (await res.json()) as { ok?: boolean; degraded?: boolean; decision?: AgentDecision };
      if (!json.decision) {
        setFailed(true);
        return;
      }
      setDecision(json.decision);
      setDegraded(!!json.degraded);
      onDecision(json.decision, text);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const list = suggestions && suggestions.length ? suggestions : EXAMPLES;

  return (
    <div className="askbar" data-testid="ask-bar">
      <div className="askbar__row">
        <input
          className="askbar__input"
          data-testid="ask-input"
          value={question}
          placeholder="问墨痕：寺和桥真的有关系吗？"
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask(question);
          }}
          aria-label="向墨痕提问"
        />
        <button
          className="exp-btn exp-btn--primary"
          data-testid="ask-submit"
          disabled={busy || question.trim().length === 0}
          onClick={() => void ask(question)}
        >
          {busy ? "墨痕在查…" : "问墨痕"}
        </button>
      </div>

      <div className="askbar__chips">
        {list.slice(0, 4).map((s) => (
          <button key={s} className="exp-btn exp-btn--context" data-testid={`ask-suggest-${s}`} onClick={() => void ask(s)}>
            {s}
          </button>
        ))}
      </div>

      {failed && (
        <p className="askbar__note" data-testid="ask-failed">
          这一下没接上。可以再问一次。
        </p>
      )}

      {decision && (
        <div className="askbar__answer" data-testid="ask-answer" data-verdict={decision.verdict}>
          <p className="askbar__line" data-testid="ask-mohen-line">
            {decision.mohenLine}
          </p>

          {decision.clarifyQuestion && (
            <p className="askbar__clarify" data-testid="ask-clarify">
              {decision.clarifyQuestion}
            </p>
          )}

          {decision.materials.length > 0 && (
            <ul className="askbar__materials" data-testid="ask-materials">
              {decision.materials.map((m) => (
                <li key={m.id} className="askbar__material" data-material-id={m.id}>
                  <span className="askbar__badge">{humanEpistemic(m.epistemic, devMode)}</span>
                  <span className="askbar__snippet">{m.snippet}</span>
                  <span className="askbar__source">{m.sourceRef}</span>
                  {devMode && <span className="askbar__dev">{m.kind} · {m.id}</span>}
                </li>
              ))}
            </ul>
          )}

          {decision.gaps.length > 0 && (
            <ul className="askbar__gaps" data-testid="ask-gaps">
              {decision.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}

          {degraded && (
            <p className="askbar__note" data-testid="ask-degraded">
              暂时连不上材料库，以上只是墨痕能确定的边界，没有替你补内容。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
