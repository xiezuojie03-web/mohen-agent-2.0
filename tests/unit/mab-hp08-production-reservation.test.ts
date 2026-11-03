import {beforeEach,describe,expect,it,vi} from "vitest";
const {queryRows,queryValue,run,runResearch,triggerProduction,getProductionBlocker}=vi.hoisted(()=>({
  queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn(),runResearch:vi.fn(),
  triggerProduction:vi.fn(),getProductionBlocker:vi.fn(),
}));
vi.mock("@mohen/data-access",()=>({queryRows,queryValue,run}));
vi.mock("../../apps/web/lib/mohen-agent/research",()=>({
  runResearch,resolveTopic:()=> "generic",
}));
vi.mock("../../apps/web/lib/studio-production",()=>({
  triggerProduction,getProductionBlocker,
}));
import {requestProduction} from "../../apps/web/lib/studio-research";
const taskId="123e4567-e89b-42d3-a456-426614174001";
const prior={prompt:"historical materials",budgetSpent:1,reserved:0,ceiling:8};
function rows(claim=true){
  queryRows.mockImplementation(async(sql:string)=>{
    if(sql.startsWith("select prompt, status, checkpoint"))return [{
      prompt:"historical materials",status:"done",checkpoint:JSON.stringify(prior),
    }];
    if(sql.includes("set checkpoint = :'next'::jsonb"))
      return claim?[{task_id:taskId}]:[];
    throw Error("UNEXPECTED_SQL:"+sql);
  });
}
describe("HP08 paid production preflight and atomic budget reservation",()=>{
  beforeEach(()=>{
    for(const mock of [queryRows,queryValue,run,runResearch,triggerProduction,getProductionBlocker])
      mock.mockReset();
    getProductionBlocker.mockReturnValue(null);
    run.mockResolvedValue(undefined);
    triggerProduction.mockResolvedValue({started:true,runId:"synthetic-run"});
  });

  it("does not reserve or start when signed production input remains inactive",async()=>{
    rows();
    getProductionBlocker.mockReturnValue("production_input_binding_required");
    expect(await requestProduction(taskId)).toEqual({
      ok:false,reason:"production_input_binding_required",
    });
    expect(triggerProduction).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(queryRows).toHaveBeenCalledTimes(1);
  });

  it("atomically claims budget and persists reservation receipt before calling Runner",async()=>{
    const order:string[]=[];
    rows();
    queryRows.mockImplementation(async(sql:string,params:Record<string,string>)=>{
      if(sql.startsWith("select prompt, status, checkpoint"))return [{
        prompt:"historical materials",status:"done",checkpoint:JSON.stringify(prior),
      }];
      if(sql.includes("set checkpoint = :'next'::jsonb")){
        const cp=JSON.parse(params.next);
        expect(cp.reserved).toBe(5);
        expect(cp.productionReservation.cost).toBe(5);
        expect(cp.productionReservation.invocation_id).toMatch(/^[0-9a-f-]{36}$/);
        expect(JSON.parse(params.previous)).toEqual(prior);
        order.push("CAS");
        return [{task_id:taskId}];
      }
      throw Error("UNEXPECTED_SQL");
    });
    run.mockImplementation(async(_sql:string,params:Record<string,string>)=>{
      order.push("durable-reservation");
      expect(params.status).toBe("reserved");
      expect(params.cost).toBe(5);
    });
    triggerProduction.mockImplementation(async()=>{order.push("RUNNER");return {
      started:true,runId:"synthetic-run",
    };});
    const outcome=await requestProduction(taskId);
    expect(outcome).toEqual({ok:true,run_id:"synthetic-run"});
    expect(order).toEqual(["CAS","durable-reservation","RUNNER"]);
  });

  it("does not invoke production if same checkpoint reservation lost the CAS",async()=>{
    rows(false);
    expect(await requestProduction(taskId)).toEqual({
      ok:false,reason:"production_reservation_conflict",
    });
    expect(run).not.toHaveBeenCalled();
    expect(triggerProduction).not.toHaveBeenCalled();
  });

  it("does not spawn Runner when durable reservation receipt is unavailable",async()=>{
    rows();
    run.mockRejectedValueOnce(new Error("DB_RECEIPT_FAILED"));
    expect(await requestProduction(taskId)).toEqual({
      ok:false,reason:"production_reservation_receipt_uncertain",
    });
    expect(triggerProduction).not.toHaveBeenCalled();
  });

  it("refuses arbitrary caller-supplied budget without authorization",async()=>{
    rows();
    expect(await requestProduction(taskId,[],500)).toEqual({
      ok:false,reason:"additional_budget_requires_authorization",
    });
    expect(queryRows).toHaveBeenCalledTimes(1);
    expect(triggerProduction).not.toHaveBeenCalled();
  });

  it("refuses insufficient authorized task balance without making any reservation",async()=>{
    queryRows.mockResolvedValueOnce([{
      prompt:"historical materials",status:"done",
      checkpoint:JSON.stringify({...prior,budgetSpent:5}),
    }]);
    expect(await requestProduction(taskId)).toEqual({ok:false,reason:"budget_hold"});
    expect(run).not.toHaveBeenCalled();
    expect(triggerProduction).not.toHaveBeenCalled();
  });

  it("does not refund an ambiguous launch; leaves HOLD receipt for reconciliation",async()=>{
    rows();
    triggerProduction.mockResolvedValueOnce({
      started:false,runId:"",reason:"production_spawn_failed",
    });
    expect(await requestProduction(taskId)).toEqual({
      ok:false,reason:"production_spawn_failed",run_id:"",
    });
    const calls=run.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.map(([,params])=>params.status)).toEqual(["reserved","hold"]);
    expect(JSON.parse(calls[1][1].payload).retry_requires_reconciliation).toBe(true);
  });
});
