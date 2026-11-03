import { beforeEach, describe, expect, it, vi } from "vitest";

const { databaseRun } = vi.hoisted(() => ({ databaseRun: vi.fn() }));
vi.mock("@mohen/data-access", () => ({ run: databaseRun }));

import { createBudget, useTool, writeReceipt } from "../../apps/web/lib/studio/tool-ledger";

describe("MAB M4 tool reservation persistence", () => {
  beforeEach(() => { databaseRun.mockReset(); });

  it("does not invoke the tool when its reserved receipt fails to persist", async () => {
    databaseRun.mockRejectedValueOnce(new Error("RECEIPT_STORAGE_UNAVAILABLE"));
    const invoke = vi.fn(async () => "must not run");
    const budget = createBudget(8);

    await expect(useTool({taskId:"synthetic-task",budget},"llm-understand",invoke))
      .rejects.toThrow("RECEIPT_STORAGE_UNAVAILABLE");
    expect(invoke).not.toHaveBeenCalled();
    expect(databaseRun).toHaveBeenCalledTimes(1);
    expect(budget).toEqual({ceiling:8,reserved:0,spent:0});
  });

  it("rejects unknown external tool cost rather than silently recording zero", async () => {
    await expect(writeReceipt({taskId:"synthetic-task",kind:"tool",stage:"tool",
      toolId:"llm-understand",status:"reserved"})).rejects.toThrow("TOOL_RECEIPT_COST_UNKNOWN");
    await expect(writeReceipt({taskId:"synthetic-task",kind:"tool",stage:"tool",
      toolId:"llm-understand",cost:Number.NaN,status:"reserved"}))
      .rejects.toThrow("TOOL_RECEIPT_COST_UNKNOWN");
    expect(databaseRun).not.toHaveBeenCalled();
  });

  it("continues reserve, execute and settle for registered tools when receipts persist", async () => {
    databaseRun.mockResolvedValue(undefined);
    const invoke = vi.fn(async () => "result");
    const budget = createBudget(8);
    await expect(useTool({taskId:"synthetic-task",budget},"llm-understand",invoke))
      .resolves.toBe("result");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(databaseRun).toHaveBeenCalledTimes(2);
    expect(budget).toEqual({ceiling:8,reserved:0,spent:1});
  });
});
