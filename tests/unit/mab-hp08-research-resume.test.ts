import {beforeEach,describe,expect,it,vi} from "vitest";

const {queryRows,queryValue,run,runResearch}=vi.hoisted(()=>({
  queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn(),runResearch:vi.fn(),
}));
vi.mock("@mohen/data-access",()=>({queryRows,queryValue,run}));
vi.mock("../../apps/web/lib/mohen-agent/research",()=>({
  runResearch,resolveTopic:(topic:unknown)=>topic==="jinze"?"jinze":"generic",
}));
vi.mock("../../apps/web/lib/studio-production",()=>({triggerProduction:vi.fn()}));
import {
  appendResearchMessage,createResearchTask,resumeResearchTask,
} from "../../apps/web/lib/studio-research";
import {
  ToolExecutionUncertainError,ToolReceiptPersistenceError,
} from "../../apps/web/lib/studio/tool-ledger";

const taskId="123e4567-e89b-42d3-a456-426614174001";
const owner="123e4567-e89b-42d3-a456-426614174002";
const decision={
  verdict:"partial",materials:[],gaps:["synthetic"],confidence:0.5,
};
const result={decision,degraded:false,researchLeads:[]};

function checkpointWrites(){
  return run.mock.calls.filter(([sql]:[string])=>
    sql.includes("update public.research_tasks") && sql.includes("checkpoint"));
}

describe("HP08 task-level budget and safe restart boundaries",()=>{
  beforeEach(()=>{
    queryRows.mockReset();queryValue.mockReset();run.mockReset();runResearch.mockReset();
    queryValue.mockResolvedValue(taskId);
    run.mockResolvedValue(undefined);
    runResearch.mockResolvedValue(result);
  });

  it("records current ceiling and cumulative spent in a successful new research task",async()=>{
    const task=await createResearchTask("historical topic","generic",owner,undefined,8);
    expect(task.status).toBe("done");
    const saved=JSON.parse(checkpointWrites().at(-1)![1].cp);
    expect(saved).toMatchObject({ceiling:8,budgetSpent:0,reserved:0});
  });

  it("persists HOLD on ambiguous execution; never reports study success",async()=>{
    runResearch.mockImplementation(async (_prompt:string,_topic:string,ledger:{budget:{reserved:number}})=>{
      ledger.budget.reserved=1;
      throw new ToolExecutionUncertainError(taskId,"retrieve-shl","synthetic-invocation-id");
    });
    const task=await createResearchTask("historical topic","generic",owner,undefined,8);
    expect(task).toMatchObject({status:"hold",holdReason:"execution_uncertain"});
    const saved=JSON.parse(checkpointWrites().at(-1)![1].cp);
    expect(saved).toMatchObject({
      holdReason:"execution_uncertain",reserved:1,budgetSpent:0,
      retry_requires_reconciliation:true,invocationId:"synthetic-invocation-id",
    });
    expect(run.mock.calls.some(([sql,params]:[string,{event?:string}])=>
      sql.includes("research_events") && params.event==="execution_uncertain")).toBe(true);
  });

  it("persists HOLD when provider succeeded but settlement receipt is uncertain",async()=>{
    runResearch.mockImplementation(async (_prompt:string,_topic:string,ledger:{budget:{spent:number}})=>{
      ledger.budget.spent=1;
      throw new ToolReceiptPersistenceError(taskId,"llm-understand","inv-123");
    });
    const task=await createResearchTask("historical topic","generic",owner);
    expect(task.holdReason).toBe("receipt_uncertain");
    expect(JSON.parse(checkpointWrites().at(-1)![1].cp)).toMatchObject({
      budgetSpent:1,holdReason:"receipt_uncertain",reserved:0,
      retry_requires_reconciliation:true,
    });
  });

  it("never restarts an ambiguous provider charge even if extra budget is offered",async()=>{
    queryRows.mockResolvedValueOnce([{
      prompt:"prior",topic:"generic",
      checkpoint:JSON.stringify({
        holdReason:"receipt_uncertain",retry_requires_reconciliation:true,
        budgetSpent:1,reserved:0,ceiling:8,
      }),
    }]);
    const task=await resumeResearchTask(taskId,10);
    expect(task).toMatchObject({status:"hold",holdReason:"reconciliation_required"});
    expect(runResearch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("does not replay already-paid steps from the beginning during budget resume",async()=>{
    queryRows.mockResolvedValueOnce([{
      prompt:"prior",topic:"generic",
      checkpoint:JSON.stringify({holdAt:{toolId:"llm-polish"},budgetSpent:3,reserved:0,ceiling:8}),
    }]);
    const task=await resumeResearchTask(taskId,5);
    expect(task.holdReason).toBe("resume_step_checkpoint_required");
    expect(runResearch).not.toHaveBeenCalled();
  });

  it("refuses client-funded increments even when no charged step needs replay",async()=>{
    queryRows.mockResolvedValueOnce([{
      prompt:"prior",topic:"generic",
      checkpoint:JSON.stringify({holdAt:{toolId:"llm-understand"},budgetSpent:0,reserved:0,ceiling:8}),
    }]);
    const task=await resumeResearchTask(taskId,3);
    expect(task).toMatchObject({status:"hold",holdReason:"additional_budget_requires_authorization"});
    expect(runResearch).not.toHaveBeenCalled();
  });

  it("does not accept a client number as authority to increase the saved ceiling",async()=>{
    queryRows.mockResolvedValueOnce([{prompt:"prior",topic:"generic",checkpoint:{holdReason:"budget",holdAt:{toolId:"llm-understand"},budgetSpent:0,reserved:0,ceiling:8}}]);
    const task=await resumeResearchTask(taskId,1000);
    expect(task).toMatchObject({status:"hold",holdReason:"additional_budget_requires_authorization"});
    expect(runResearch).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
  });
  it("claims a zero-spend first-step resume using only the saved ceiling",async()=>{
    queryRows.mockResolvedValueOnce([{prompt:"prior",topic:"generic",checkpoint:{holdReason:"budget",holdAt:{toolId:"llm-understand"},budgetSpent:0,reserved:0,ceiling:8}}]).mockResolvedValueOnce([{task_id:taskId}]);
    const task=await resumeResearchTask(taskId);
    expect(task.status).toBe("done");expect(runResearch.mock.calls[0][2].budget.ceiling).toBe(8);
    expect(queryRows.mock.calls[1][0]).toContain("status = 'hold'");
    const claimed=JSON.parse(queryRows.mock.calls[1][1].next);
    expect(claimed.retry_requires_reconciliation).toBe(true);
  });
  it("does not invoke any tool when another resume already claimed the checkpoint",async()=>{
    queryRows.mockResolvedValueOnce([{prompt:"prior",topic:"generic",checkpoint:{holdReason:"budget",holdAt:{toolId:"llm-understand"},budgetSpent:0,reserved:0,ceiling:8}}]).mockResolvedValueOnce([]);
    const task=await resumeResearchTask(taskId);
    expect(task).toMatchObject({status:"hold",holdReason:"task_state_conflict"});
    expect(runResearch).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
  });

  it.each(["budgetSpent","reserved"])("does not treat missing %s as zero cost on resume",async field=>{
    const checkpoint:Record<string,unknown>={holdReason:"budget",holdAt:{toolId:"llm-understand"},budgetSpent:0,reserved:0,ceiling:8};
    delete checkpoint[field];
    queryRows.mockResolvedValueOnce([{prompt:"prior",topic:"generic",checkpoint}]).mockResolvedValueOnce([{task_id:taskId}]);
    expect(await resumeResearchTask(taskId)).toMatchObject({status:"hold",holdReason:"resume_step_checkpoint_required"});
    expect(runResearch).not.toHaveBeenCalled();
  });
  it("prevents budget-less follow-up on legacy tasks, with no model invocation",async()=>{
    queryRows.mockResolvedValueOnce([{status:"done",topic:"generic",checkpoint:"{}"}]);
    const res=await appendResearchMessage(taskId,"more evidence");
    expect(res).toEqual({ok:false,reason:"budget_checkpoint_required"});
    expect(runResearch).not.toHaveBeenCalled();
  });

  it("atomically claims a ready task before a follow-up and preserves cumulative cost",async()=>{
    queryRows
      .mockResolvedValueOnce([{status:"done",topic:"generic",
        checkpoint:JSON.stringify({budgetSpent:2,reserved:0,ceiling:8})}])
      .mockResolvedValueOnce([{task_id:taskId}]);
    runResearch.mockImplementation(async (_prompt:string,_topic:string,ledger:{budget:{spent:number}})=>{
      ledger.budget.spent+=1;
      return result;
    });
    expect(await appendResearchMessage(taskId,"follow up")).toEqual({ok:true});
    expect(queryRows.mock.calls[1][0]).toContain("status = 'done' returning task_id");
    expect(JSON.parse(checkpointWrites().at(-1)![1].cp)).toMatchObject({
      budgetSpent:3,ceiling:8,reserved:0,
    });
  });

  it("does not invoke models after a competing task request already claimed running state",async()=>{
    queryRows
      .mockResolvedValueOnce([{status:"done",topic:"generic",
        checkpoint:JSON.stringify({budgetSpent:2,reserved:0,ceiling:8})}])
      .mockResolvedValueOnce([]);
    expect(await appendResearchMessage(taskId,"follow up"))
      .toEqual({ok:false,reason:"task_state_conflict"});
    expect(runResearch).not.toHaveBeenCalled();
  });

  it("persists a non-replay HOLD on receipt loss during a follow-up",async()=>{
    queryRows
      .mockResolvedValueOnce([{status:"done",topic:"generic",
        checkpoint:JSON.stringify({budgetSpent:2,reserved:0,ceiling:8})}])
      .mockResolvedValueOnce([{task_id:taskId}]);
    runResearch.mockImplementation(async()=>{throw new ToolReceiptPersistenceError(
      taskId,"llm-polish","inv-synthetic",
    );});
    expect(await appendResearchMessage(taskId,"follow up")).toEqual({
      ok:false,reason:"receipt_uncertain",
    });
    const saved=JSON.parse(checkpointWrites().at(-1)![1].cp);
    expect(saved).toMatchObject({
      holdReason:"receipt_uncertain",retry_requires_reconciliation:true,
      budgetSpent:2,invocationId:"inv-synthetic",
    });
  });
});
