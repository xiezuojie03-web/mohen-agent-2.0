// packages/agent-runtime/src/index.ts
//
// ADR-003 · 墨痕 Agent 分层架构 —— 第 ① 理解 / ② 检索契约 / ④ 编排的实现入口。
//
// 取代 TASK-0001 的 `foundation-only` 占位（此前全仓库零 import）。
// 铁律：**本包永不产生事实**。事实只来自第 ② 层注入的已审核材料（RetrieveFn）。

export * from "./types";
export * from "./understand";
export * from "./select";
export { llmUnderstand, llmPolish, passesFactGuard } from "./llm";

/** 包状态标记（供治理审计读取；非运行时逻辑） */
export const packageStatus = "adr-003-layered" as const;
