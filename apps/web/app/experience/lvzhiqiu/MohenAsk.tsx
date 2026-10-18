"use client";

// apps/web/app/experience/lvzhiqiu/MohenAsk.tsx
//
// MH-STRAT-PROD-A001 · 墨痕对话（本题专用，不复用金泽组件的硬编码占位文案）。
//
// 链路与金泽一致、服务端零改动：本组件只调 /api/mohen/ask（topic="a001"），
// 由 agent-runtime 完成「理解 → 只读检索 L5 → 裁决」，再用 onDecision 把裁决交回舞台。
// 展示纪律：默认只出人话，不出现库表名、uuid、认识论枚举与意图名。

import { useEffect, useRef, useState } from "react";
import type { AgentDecision } from "@mohen/agent-runtime";

export interface MohenAskProps {
  suggestions: string[];
  /** 把裁决交给舞台（决定聚焦谁、切到哪个观察点、或诚实拒绝） */
  onDecision: (decision: AgentDecision, question: string) => void;
  /** 外部（例如负例按钮）灌进来的问题 */
  preset?: { id: number; text: string } | null;
}

export default function MohenAsk({ suggestions, onDecision, preset }: MohenAskProps) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const lastPreset = useRef<number | null>(null);
  const askRef = useRef<(q: string) => void>(() => {});

  async function ask(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/mohen/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, topic: "a001" }),
      });
      if (res.status === 429) {
        // 限流是保护机制，不是「查不到」：必须说清是「问太快」，别让人以为是材料没有
        setRateLimited(true);
        return;
      }
      setRateLimited(false);
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

  askRef.current = (q: string) => void ask(q);

  // 负例按钮从父组件灌入问题时自动提问一次（只在 preset.id 变化时触发）
  useEffect(() => {
    if (!preset || lastPreset.current === preset.id) return;
    lastPreset.current = preset.id;
    setQuestion(preset.text);
    askRef.current(preset.text);
  }, [preset]);

  return (
    <div className="a001-ask" data-testid="a001-ask">
      <div className="a001-ask__row">
        <input
          className="a001-ask__input"
          data-testid="a001-ask-input"
          value={question}
          placeholder="问墨痕：这里原来是什么？今天是怎样走上去的？"
          aria-label="向墨痕提问"
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask(question);
          }}
        />
        <button
          className="a001-btn a001-btn--primary"
          data-testid="a001-ask-submit"
          disabled={busy || question.trim().length === 0}
          onClick={() => void ask(question)}
        >
          {busy ? "墨痕在查…" : "问墨痕"}
        </button>
      </div>

      <div className="a001-ask__chips">
        {suggestions.slice(0, 4).map((s) => (
          <button
            key={s}
            className="a001-chip"
            data-testid={`a001-ask-suggest-${s}`}
            onClick={() => void ask(s)}
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>

      {failed && (
        <p className="a001-ask__note" data-testid="a001-ask-failed">
          这一下没接上。可以再问一次。
        </p>
      )}

      {rateLimited && (
        <p className="a001-ask__note" data-testid="a001-ask-rate-limited">
          问得有点快，等一分钟再问。这不是「材料里没有」，是接口在限流。
        </p>
      )}

      {decision && (
        <div className="a001-ask__answer" data-testid="a001-ask-answer" data-verdict={decision.verdict}>
          <p className="a001-ask__line" data-testid="a001-ask-line">
            {decision.mohenLine}
          </p>

          {decision.clarifyQuestion && (
            <p className="a001-ask__clarify" data-testid="a001-ask-clarify">
              {decision.clarifyQuestion}
            </p>
          )}

          {decision.materials.length > 0 && (
            <ul className="a001-ask__materials" data-testid="a001-ask-materials">
              {decision.materials.slice(0, 6).map((m) => (
                <li key={m.id} className="a001-ask__material">
                  <span className="a001-ask__snippet">{m.snippet}</span>
                  <span className="a001-ask__source">{m.sourceRef}</span>
                </li>
              ))}
            </ul>
          )}

          {decision.gaps.length > 0 && (
            <ul className="a001-ask__gaps" data-testid="a001-ask-gaps">
              {decision.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}

          {degraded && (
            <p className="a001-ask__note" data-testid="a001-ask-degraded">
              暂时连不上材料库，以上只是墨痕能确定的边界，没有替你补内容。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
