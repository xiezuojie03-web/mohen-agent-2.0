import {beforeEach,describe,expect,it,vi} from "vitest";

const {run}=vi.hoisted(()=>({run:vi.fn()}));
vi.mock("@mohen/data-access",()=>({run}));

import {
  createBudget,remainingBudget,useTool,writeReceipt,getTool,
  BudgetHoldError,ToolReceiptPersistenceError,ToolExecutionUncertainError,
} from "../../apps/web/lib/studio/tool-ledger";

const taskId="123e4567-e89b-42d3-a456-426614174001";
const receipts=()=>run.mock.calls.map(([,params])=>({
  status:params.status,tool:params.tool,cost:params.cost,
  payload:JSON.parse(params.payload),
}));

describe("HP08 durable reservation and uncertain provider costs",()=>{
  beforeEach(()=>{run.mockReset();run.mockResolvedValue(undefined);});

  it("refuses unregistered tools, unaudited production, and over-budget calls",async()=>{
    const fn=vi.fn(async()=>({ok:true}));
    await expect(useTool(undefined,"production-run",fn))
      .rejects.toThrow("PRODUCTION_LEDGER_REQUIRED");
    await expect(useTool(undefined,"unknown-provider",fn))
      .rejects.toThrow("TOOL_NOT_REGISTERED");
    const budget=createBudget(3);
    await expect(useTool({taskId,budget},"production-run",fn))
      .rejects.toBeInstanceOf(BudgetHoldError);
    expect(fn).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses provider invocation if reservation cannot be persisted",async()=>{
    run.mockRejectedValueOnce(new Error("RECEIPT_DB_DOWN"));
    const fn=vi.fn(async()=>({ok:true}));
    const budget=createBudget(2);
    await expect(useTool({taskId,budget},"retrieve-shl",fn))
      .rejects.toThrow("RECEIPT_DB_DOWN");
    expect(fn).not.toHaveBeenCalled();
    expect(budget.reserved).toBe(0);
    expect(budget.spent).toBe(0);
  });

  it("correlates success reservation and settlement with one unique invocation ID",async()=>{
    const budget=createBudget(4);
    const result=await useTool({taskId,budget},"retrieve-shl",async()=>({items:2}));
    expect(result).toEqual({items:2});
    expect(budget).toEqual({ceiling:4,reserved:0,spent:1});
    const [reserved,settled]=receipts();
    expect([reserved.status,settled.status]).toEqual(["reserved","settled"]);
    expect(reserved.payload.invocation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(settled.payload.invocation_id).toBe(reserved.payload.invocation_id);
  });

  it("holds possibly charged external failure instead of releasing and retrying",async()=>{
    const fn=vi.fn(async()=>{throw new Error("PROVIDER_TIMEOUT");});
    const budget=createBudget(2);
    let error:unknown;
    try {await useTool({taskId,budget},"retrieve-shl",fn);}
    catch(e){error=e;}
    expect(error).toBeInstanceOf(ToolExecutionUncertainError);
    expect((error as Error).message).toBe("HOLD_EXECUTION_UNCERTAIN");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(budget).toEqual({ceiling:2,reserved:1,spent:0});
    expect(remainingBudget(budget)).toBe(1);
    const [reservation,hold]=receipts();
    expect([reservation.status,hold.status]).toEqual(["reserved","hold"]);
    expect(hold.payload.reason).toBe("provider_execution_uncertain");
    expect(hold.payload.retry_requires_reconciliation).toBe(true);
    expect(hold.payload.invocation_id).toBe(reservation.payload.invocation_id);
    expect(hold.payload).not.toHaveProperty("provider_error");
  });

  it("preserves reserved budget when even the uncertainty hold receipt fails",async()=>{
    run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("DB_DOWN"));
    const budget=createBudget(1);
    await expect(useTool({taskId,budget},"retrieve-shl",async()=>{
      throw new Error("REMOTE_CONNECTION_LOST");
    })).rejects.toBeInstanceOf(ToolExecutionUncertainError);
    expect(budget.reserved).toBe(1);
    expect(budget.spent).toBe(0);
  });

  it("releases uncharged deterministic failures; retains original error",async()=>{
    const budget=createBudget(1);
    await expect(useTool({taskId,budget},"retrieve-local",async()=>{
      throw new Error("LOCAL_FILE_MISSING");
    })).rejects.toThrow("LOCAL_FILE_MISSING");
    expect(budget.reserved).toBe(0);
    expect(budget.spent).toBe(0);
    expect(receipts().at(-1)?.payload.retry_requires_reconciliation).toBe(false);
  });

  it("does not refund a successful charged tool when settlement receipt fails",async()=>{
    run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("DB_WRITE_LOST"));
    const budget=createBudget(2),fn=vi.fn(async()=>({ok:true}));
    let error:unknown;
    try {await useTool({taskId,budget},"retrieve-shl",fn);}
    catch(e){error=e;}
    expect(error).toBeInstanceOf(ToolReceiptPersistenceError);
    expect((error as ToolReceiptPersistenceError).invocationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(budget).toEqual({ceiling:2,reserved:0,spent:1});
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("refuses missing or unpriced tool cost in durable receipt",async()=>{
    await expect(writeReceipt({
      taskId,kind:"tool",stage:"tool",toolId:"retrieve-shl",status:"reserved",
    })).rejects.toThrow("TOOL_RECEIPT_COST_UNKNOWN");
    expect(run).not.toHaveBeenCalled();
  });
});

// Paid callbacks without a durable task must never reach a provider.
it.each(["llm-understand", "llm-polish", "retrieve-shl"])("refuses %s without a ledger", async toolId => {
  const fn = vi.fn(async () => 42);
  await expect(useTool(undefined, toolId, fn)).rejects.toThrow("TOOL_LEDGER_REQUIRED");
  expect(fn).not.toHaveBeenCalled();
});

it('registers read-only candidate intake as a deterministic zero-credit local tool',()=>{
 const spec=getTool('receive-candidate');expect(spec).toMatchObject({cost:0,trustTier:'deterministic',idempotent:true});
});
