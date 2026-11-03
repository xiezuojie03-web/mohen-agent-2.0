import {beforeEach,describe,expect,it,vi} from "vitest";
const {run}=vi.hoisted(()=>({run:vi.fn()}));
vi.mock("@mohen/data-access",()=>({run}));
import {
 createBudget,useTool,ToolReceiptPersistenceError,
} from "../../apps/web/lib/studio/tool-ledger";

describe("HP08 tool execution receipt / cost reconciliation",()=>{
 beforeEach(()=>{run.mockReset();});
 it("cannot invoke a production stage without a persistent task budget",async()=>{
   const fn=vi.fn(async()=>({ok:true}));
   await expect(useTool(undefined,"production-run",fn))
     .rejects.toThrow("PRODUCTION_LEDGER_REQUIRED");
   expect(fn).not.toHaveBeenCalled();
   expect(run).not.toHaveBeenCalled();
 });
 it("does not call provider when reservation receipt cannot persist",async()=>{
   run.mockRejectedValue(new Error("DB_OFFLINE"));
   const fn=vi.fn(async()=>({ok:true}));
   const budget=createBudget(8);
   await expect(useTool({taskId:"synthetic",budget},"retrieve-shl",fn))
     .rejects.toThrow("DB_OFFLINE");
   expect(fn).not.toHaveBeenCalled();
   expect(budget).toEqual({ceiling:8,reserved:0,spent:0});
 });
 it("does not count already-paid invocation as free when settled receipt fails",async()=>{
   run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("ACK_LOST"));
   const fn=vi.fn(async()=>({price:"synthetic"}));
   const budget=createBudget(8);
   const failure=useTool({taskId:"synthetic",budget},"retrieve-shl",fn);
   await expect(failure).rejects.toBeInstanceOf(ToolReceiptPersistenceError);
   expect(fn).toHaveBeenCalledTimes(1);
   expect(run).toHaveBeenCalledTimes(2);
   expect(budget).toEqual({ceiling:8,reserved:0,spent:1});
 });
 it("records uncertain provider execution as hold and retains reserved cost",async()=>{
   run.mockResolvedValue(undefined);
   const fn=vi.fn(async()=>{throw new Error("PROVIDER_FAILED");});
   const budget=createBudget(8);
   await expect(useTool({taskId:"synthetic",budget},"retrieve-shl",fn))
     .rejects.toThrow("HOLD_EXECUTION_UNCERTAIN");
   expect(budget).toEqual({ceiling:8,reserved:1,spent:0});
   expect(run).toHaveBeenCalledTimes(2);
   expect(run.mock.calls[1][1].status).toBe("hold");
 });
 it("returns successful output after durable settlement",async()=>{
   run.mockResolvedValue(undefined);
   const budget=createBudget(8);
   expect(await useTool({taskId:"synthetic",budget},"retrieve-shl",async()=>42)).toBe(42);
   expect(budget.spent).toBe(1);
   expect(run).toHaveBeenCalledTimes(2);
 });
});
