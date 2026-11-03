import { describe, expect, it, vi } from "vitest";
import { createBudget, getTool, useTool } from "../../apps/web/lib/studio/tool-ledger";

describe("MAB M4 registered-tool execution boundary", () => {
  it("never calls an unregistered tool without a budget ledger", async () => {
    const invoke = vi.fn(async () => "unexpected");
    await expect(useTool(undefined, "unregistered-external-provider", invoke))
      .rejects.toThrow("TOOL_NOT_REGISTERED");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("never calls an unregistered tool with a budget ledger", async () => {
    const invoke = vi.fn(async () => "unexpected");
    const budget = createBudget(8);
    await expect(useTool({taskId: "test-root", budget}, "unregistered-production-runner", invoke))
      .rejects.toThrow("TOOL_NOT_REGISTERED");
    expect(invoke).not.toHaveBeenCalled();
    expect(budget).toEqual({ceiling: 8, reserved: 0, spent: 0});
  });

  it("preserves registered immediate-answer tools when no ledger is passed", async () => {
    expect(getTool("retrieve-local")).toBeDefined();
    const invoke = vi.fn(async () => "allowed");
    await expect(useTool(undefined, "retrieve-local", invoke)).resolves.toBe("allowed");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
