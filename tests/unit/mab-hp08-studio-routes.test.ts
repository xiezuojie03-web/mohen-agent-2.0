import {beforeEach,describe,expect,it,vi} from "vitest";
const {guardRoute,getTaskStatus,resumeResearchTask,appendResearchMessage}=vi.hoisted(()=>({
  guardRoute:vi.fn(),getTaskStatus:vi.fn(),
  resumeResearchTask:vi.fn(),appendResearchMessage:vi.fn(),
}));
vi.mock("../../apps/web/lib/guard",()=>({guardRoute}));
vi.mock("../../apps/web/lib/studio-research",()=>({
  getTaskStatus,resumeResearchTask,appendResearchMessage,
}));
import {POST as resume} from "../../apps/web/app/api/studio/research-tasks/[id]/resume/route";
import {POST as message} from "../../apps/web/app/api/studio/research-tasks/[id]/messages/route";
const taskId="123e4567-e89b-42d3-a456-426614174001";
const params=Promise.resolve({id:taskId});
const post=(p:string,body:unknown)=>new Request("http://localhost"+p,{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify(body),
});
describe("HP08 Studio HTTP explicit budget and anti-replay",()=>{
  beforeEach(()=>{
    for(const mock of [guardRoute,getTaskStatus,resumeResearchTask,appendResearchMessage])mock.mockReset();
    guardRoute.mockResolvedValue(null);
    getTaskStatus.mockResolvedValue({status:"hold",prompt:"topic"});
  });
  it("uses only the existing persisted budget on an empty resume request",async()=>{
    resumeResearchTask.mockResolvedValue({status:"hold",holdReason:"resume_step_checkpoint_required"});
    const res=await resume(post("/api/studio/research-tasks/"+taskId+"/resume",{}) as never,{params});
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("resume_step_checkpoint_required");
    expect(resumeResearchTask).toHaveBeenCalledWith(taskId);
  });
  it("does not use appendResearchMessage to replay a budget HOLD",async()=>{
    resumeResearchTask.mockResolvedValue({
      status:"hold",holdReason:"reconciliation_required",
    });
    const res=await resume(post("/api/studio/research-tasks/"+taskId+"/resume",{}) as never,{params});
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("reconciliation_required");
    expect(resumeResearchTask).toHaveBeenCalledWith(taskId);
    expect(appendResearchMessage).not.toHaveBeenCalled();
  });
  it("rejects resume of a non-held task rather than running charged research again",async()=>{
    getTaskStatus.mockResolvedValue({status:"done"});
    const res=await resume(post("/api/studio/research-tasks/"+taskId+"/resume",{
      additionalCeiling:8,
    }) as never,{params});
    expect(res.status).toBe(409);
    expect(resumeResearchTask).not.toHaveBeenCalled();
  });
  it("returns HTTP 409 for held follow-up instead of misleading 404 or success",async()=>{
    appendResearchMessage.mockResolvedValue({
      ok:false,reason:"receipt_uncertain",
    });
    const res=await message(post("/api/studio/research-tasks/"+taskId+"/messages",{
      message:"another question",
    }) as never,{params});
    expect(res.status).toBe(409);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).reason).toBe("receipt_uncertain");
    expect(appendResearchMessage).toHaveBeenCalledWith(taskId,"another question");
  });
  it("denies requests at the ownership guard before touching any task",async()=>{
    const {NextResponse}=await import("next/server");
    guardRoute.mockResolvedValue(NextResponse.json({ok:false,reason:"forbidden"},{status:403}));
    const res=await message(post("/api/studio/research-tasks/"+taskId+"/messages",{
      message:"another question",
    }) as never,{params});
    expect(res.status).toBe(403);
    expect(appendResearchMessage).not.toHaveBeenCalled();
  });
});

it("does not treat positive client credit as an approved funding grant",async()=>{
 guardRoute.mockResolvedValue(null);getTaskStatus.mockResolvedValue({status:"hold"});resumeResearchTask.mockReset();
 const response=await resume(post("/api/studio/research-tasks/"+taskId+"/resume",{additionalCeiling:1000}) as never,{params});
 expect(response.status).toBe(409);expect((await response.json()).reason).toBe("additional_budget_requires_authorization");
 expect(resumeResearchTask).not.toHaveBeenCalled();
});

it.each([0,-1,"8",null])("rejects malformed additional funding %s before resumption",async additionalCeiling=>{
 guardRoute.mockResolvedValue(null);getTaskStatus.mockResolvedValue({status:"hold"});resumeResearchTask.mockReset();
 const response=await resume(post("/api/studio/research-tasks/"+taskId+"/resume",{additionalCeiling}) as never,{params});
 expect(response.status).toBe(400);expect(resumeResearchTask).not.toHaveBeenCalled();
});
it("rejects a non-object resume body rather than interpreting it as permission",async()=>{
 guardRoute.mockResolvedValue(null);getTaskStatus.mockResolvedValue({status:"hold"});resumeResearchTask.mockReset();
 const response=await resume(post("/api/studio/research-tasks/"+taskId+"/resume",[]) as never,{params});
 expect(response.status).toBe(400);expect(resumeResearchTask).not.toHaveBeenCalled();
});
