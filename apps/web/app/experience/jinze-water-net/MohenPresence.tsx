"use client";

// apps/web/app/experience/jinze-water-net/MohenPresence.tsx
//
// EXP-UI-RECON-01 · 墨痕三态在场（PART IV 原型04「Presence」+ C4 §25）。
//
// 采用 C 为主、吸收 A 的轻常驻：
//   · Ambient —— 极轻的「墨痕在场」标记，常驻于变化区一隅，不抢焦点、不占整条右栏；
//   · Guide   —— 关键判断 / 意图切换时在变化区浮现（replan 收口层），停留后自动淡出；
//   · Dialogue—— 仅当用户点「问墨痕」才展开（自由追问入口），平时不出现。
//
// 红线（C4 §25）：不渲染「右下角聊天框」。墨痕以浮动标记 + 触发按钮存在于变化区，
// 世界多变、墨痕少说；追问经既有 FOLLOWUP_REPLAN 让「世界真的变」，而非换一段文字。

import { useState, useEffect, type ReactNode } from "react";
import AskBar from "./AskBar";
import type { AgentDecision } from "@mohen/agent-runtime";

interface MohenPresenceProps {
  devMode: boolean;
  /** 把 Agent 的裁决交给导演层去改变世界（Patch-not-Replace） */
  onDecision: (decision: AgentDecision, question: string) => void;
  /** Guide 收口层（IntentGuide）。replan 激活且有 translation 时传入，否则为 null */
  guide?: ReactNode | null;
}

export default function MohenPresence({ devMode, onDecision, guide }: MohenPresenceProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [guideFaded, setGuideFaded] = useState(false);

  // Guide 出现时自动淡出（原型04 Guide 状态：浮现 → 停留 → 淡出，不强行占屏）。
  // 用户悬停 / 聚焦即恢复，保证可读。
  useEffect(() => {
    if (!guide) return;
    setGuideFaded(false);
    const t = window.setTimeout(() => setGuideFaded(true), 7000);
    return () => window.clearTimeout(t);
  }, [guide]);

  return (
    <>
      {/* Guide：变化区浮现，自动淡出（C4 §25：不渲染右下角聊天框，墨痕以浮动标记 + 触发按钮存在） */}
      {guide && (
        <div
          className={`mohen-guide ${guideFaded ? "mohen-guide--faded" : ""}`}
          data-testid="mohen-guide"
          onMouseEnter={() => setGuideFaded(false)}
          onFocus={() => setGuideFaded(false)}
        >
          {guide}
        </div>
      )}

      {/* Dialogue：仅用户点「问墨痕」才展开 */}
      {dialogOpen ? (
        <div className="mohen-dialog" data-testid="mohen-dialog">
          <div className="mohen-dialog__head">
            <span className="mohen-dialog__who">问墨痕</span>
            <button className="mohen-dialog__close" onClick={() => setDialogOpen(false)} aria-label="收起追问">
              收起
            </button>
          </div>
          <AskBar devMode={devMode} onDecision={onDecision} />
        </div>
      ) : (
        <button className="mohen-askbtn" data-testid="mohen-ask-open" onClick={() => setDialogOpen(true)}>
          问墨痕
        </button>
      )}
    </>
  );
}
