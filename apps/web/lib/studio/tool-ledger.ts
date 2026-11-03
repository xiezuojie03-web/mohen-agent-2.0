// apps/web/lib/studio/tool-ledger.ts
//
// E1-2 调度门面 / Tool Registry Adapter：工具注册 + 预算 + 回执。
// 对应交付包 E1-2「预算工具路由」「StudyAssetReceipts」与 CR-13 BudgetResume。
//
// 能力路由优先于模型品牌：每条工具都有 capability + cost + trust_tier；
// 未登记工具不运行；预算超限 HOLD_BUDGET（持久化 checkpoint 后停，恢复需重新授权）。

import { run } from "@mohen/data-access";

export interface ToolSpec {
  toolId: string;
  capability: string;
  /** 信用单位（credit）。预算单位明确，结算走 reserve → settle。 */
  cost: number;
  trustTier: "deterministic" | "llm" | "external" | "production";
  idempotent: boolean;
}

/** 工具注册表：未登记的 tool_id 一律不运行。 */
export const TOOL_REGISTRY: Record<string, ToolSpec> = {
  "llm-understand": { toolId: "llm-understand", capability: "意图理解", cost: 1, trustTier: "llm", idempotent: true },
  "retrieve-local": { toolId: "retrieve-local", capability: "本地合格知识检索", cost: 0, trustTier: "deterministic", idempotent: true },
  "retrieve-shl": { toolId: "retrieve-shl", capability: "上海图书馆开放数据检索", cost: 1, trustTier: "external", idempotent: true },
  "llm-extract-entities": { toolId: "llm-extract-entities", capability: "外部检索实体名抽取", cost: 1, trustTier: "llm", idempotent: true },
  "llm-polish": { toolId: "llm-polish", capability: "措辞润色", cost: 1, trustTier: "llm", idempotent: true },
  "production-run": { toolId: "production-run", capability: "D阶段生产（D00-D05）", cost: 5, trustTier: "production", idempotent: false },
};

export const DEFAULT_BUDGET_CEILING = 8;

export interface BudgetState {
  ceiling: number;
  reserved: number;
  spent: number;
}

export function createBudget(ceiling: number = DEFAULT_BUDGET_CEILING): BudgetState {
  return { ceiling, reserved: 0, spent: 0 };
}

export function remainingBudget(b: BudgetState): number {
  return b.ceiling - b.reserved - b.spent;
}

export function getTool(toolId: string): ToolSpec | undefined {
  return TOOL_REGISTRY[toolId];
}

export function canAfford(b: BudgetState, toolId: string): boolean {
  const spec = getTool(toolId);
  if (!spec) return false;
  return remainingBudget(b) >= spec.cost;
}

/** 预占预算；余额不足返回 false（不扣减）。 */
export function reserve(b: BudgetState, toolId: string): boolean {
  const spec = getTool(toolId);
  if (!spec || !canAfford(b, toolId)) return false;
  b.reserved += spec.cost;
  return true;
}

/** 结算：预占转实耗。 */
export function settle(b: BudgetState, toolId: string): void {
  const spec = getTool(toolId);
  if (!spec) return;
  b.reserved = Math.max(0, b.reserved - spec.cost);
  b.spent += spec.cost;
}

/** 释放预占（工具失败未结算时）。 */
export function release(b: BudgetState, toolId: string): void {
  const spec = getTool(toolId);
  if (!spec) return;
  b.reserved = Math.max(0, b.reserved - spec.cost);
}

export interface ReceiptInput {
  taskId: string;
  kind: "tool" | "d_stage" | "checkpoint";
  stage: string;
  toolId?: string;
  cost?: number;
  outputLocator?: string;
  status: "reserved" | "settled" | "hold";
  payload?: unknown;
}

/** 写一条资产回执（StudyAssetReceipt）。 */
export async function writeReceipt(r: ReceiptInput): Promise<void> {
  await run(
    `insert into public.study_asset_receipts (task_id, kind, stage, tool_id, cost, output_locator, status, payload)
     values (:'task', :'kind', :'stage', :'tool', :'cost', :'loc', :'status', :'payload'::jsonb)`,
    {
      task: r.taskId,
      kind: r.kind,
      stage: r.stage,
      tool: r.toolId ?? null,
      cost: r.cost ?? 0,
      loc: r.outputLocator ?? null,
      status: r.status,
      payload: JSON.stringify(r.payload ?? {}),
    }
  );
}

/** 预算不足时抛出的 HOLD 信号，上层据此持久化 checkpoint 并停（CR-13）。 */
export class BudgetHoldError extends Error {
  constructor(public taskId: string, public checkpoint: unknown) {
    super("HOLD_BUDGET");
    this.name = "BudgetHoldError";
  }
}

export interface Ledger {
  taskId: string;
  budget: BudgetState;
}

/**
 * 有预算上下文时，把一次工具调用包进 reserve → 执行 → settle/release → 回执。
 * 无预算上下文（即时问答）时直接执行，不记账。
 */
export async function useTool<T>(
  ledger: Ledger | undefined,
  toolId: string,
  fn: () => Promise<T>
): Promise<T> {
  // A missing ledger is permitted for registered immediate-answer tools only.
  // Never execute an unregistered callback: otherwise neither routing nor
  // cost/receipt protections can observe an external or production invocation.
  const spec = getTool(toolId);
  if (!spec) throw new Error("TOOL_NOT_REGISTERED");
  if (!ledger) return fn();

  if (!reserve(ledger.budget, toolId)) {
    throw new BudgetHoldError(ledger.taskId, {
      toolId,
      spent: ledger.budget.spent,
      reserved: ledger.budget.reserved,
      ceiling: ledger.budget.ceiling,
    });
  }
  // Persist the reservation before executing the tool. If the receipt write
  // fails, release the in-memory reservation and do not invoke any provider.
  try {
    await writeReceipt({ taskId: ledger.taskId, kind: "tool", stage: "tool", toolId, cost: spec.cost, status: "reserved" });
  } catch (error) {
    release(ledger.budget, toolId);
    throw error;
  }
  try {
    const out = await fn();
    settle(ledger.budget, toolId);
    await writeReceipt({ taskId: ledger.taskId, kind: "tool", stage: "tool", toolId, cost: spec.cost, status: "settled" });
    return out;
  } catch (e) {
    release(ledger.budget, toolId);
    throw e;
  }
}
