import {beforeEach,expect,it,vi} from "vitest";
const s=vi.hoisted(()=>({
 session:vi.fn(),access:vi.fn(),task:vi.fn(),production:vi.fn(),
 stored:vi.fn(),registration:vi.fn(),token:vi.fn(),
}));
vi.mock("../../apps/web/lib/session",()=>({getSession:s.session,isOperatorSession:()=>false}));
vi.mock("../../apps/web/lib/ownership",()=>({canAccess:s.access}));
vi.mock("../../apps/web/lib/studio-research",()=>({
 getTaskStatus:s.task,requestProduction:s.production,
}));
vi.mock("../../apps/web/lib/auth",()=>({signDatabaseSessionToken:s.token}));
vi.mock("../../packages/data-access/src/index.mjs",()=>({
 getNodePgPool:()=>({}),createPrivateOriginalRepository:()=>({getStored:s.stored}),
}));
vi.mock("../../packages/data-access/src/private-source-registration-repository.mjs",()=>({
 createPrivateSourceRegistrationRepository:()=>({lookup:s.registration}),
}));
import {POST} from "../../apps/web/app/api/studio/research-tasks/[id]/production/route";
const owner="123e4567-e89b-42d3-a456-426614174001";
const taskId="123e4567-e89b-42d3-a456-426614174002";
const project="123e4567-e89b-42d3-a456-426614174003";
const originalId="123e4567-e89b-42d3-a456-426614174004";
const sourceVersionId="123e4567-e89b-42d3-a456-426614174005";
const assetRevisionId="123e4567-e89b-42d3-a456-426614174006";
const bytesSha="a".repeat(64);
function req(body?:unknown){return new Request("http://test.invalid/api/studio/research-tasks/"+taskId+"/production",{
 method:"POST",...(body===undefined?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})
});}
async function submit(body?:unknown){return POST(req(body),{params:Promise.resolve({id:taskId})});}
beforeEach(()=>{
 for(const mock of Object.values(s))mock.mockReset();
 s.session.mockResolvedValue({uid:owner});
 s.access.mockResolvedValue(true);
 s.token.mockReturnValue("owner-session");
 s.task.mockResolvedValue({task_id:taskId,status:"done",checkpoint:{studio:{project_id:project}}});
 s.stored.mockResolvedValue({original_id:originalId,project_id:project,state:"STORED_VERIFIED",
   asset_revision_id:assetRevisionId,sha256:bytesSha,content_type:"image/jpeg",byte_size:125,
   upload_started_at:"2026-11-10T00:00:00.000Z",upload_verified_at:"2026-11-10T00:01:00.000Z"});
 s.registration.mockResolvedValue({original_id:originalId,project_id:project,
   source_version_id:sourceVersionId,asset_revision_id:assetRevisionId,sha256:bytesSha,
   content_type:"image/jpeg",byte_size:125});
 s.production.mockResolvedValue({ok:false,reason:"production_acquisition_receipt_required"});
});
it("rejects anonymous and foreign Creator before any original lookup",async()=>{
 s.session.mockResolvedValueOnce(null);
 expect((await submit({original_id:originalId,page_number:3})).status).toBe(401);
 s.access.mockResolvedValueOnce(false);
 expect((await submit({original_id:originalId,page_number:3})).status).toBe(403);
 expect(s.stored).not.toHaveBeenCalled();expect(s.production).not.toHaveBeenCalled();
});
it("does not accept an uncompleted task or missing source selection",async()=>{
 s.task.mockResolvedValueOnce({status:"hold",checkpoint:{studio:{project_id:project}}});
 const held=await submit();
 expect(held.status).toBe(409);
 expect((await held.json()).reason).toBe("task_not_ready");
 const missing=await submit();
 expect(missing.status).toBe(409);
 expect((await missing.json()).reason).toBe("production_original_selection_required");
 expect(s.production).not.toHaveBeenCalled();
});
it("requires a verified original in exactly the same Owner project",async()=>{
 s.stored.mockResolvedValueOnce({original_id:originalId,project_id:owner,state:"STORED_VERIFIED",
   asset_revision_id:assetRevisionId,sha256:bytesSha,content_type:"image/jpeg",byte_size:125});
 const result=await submit({original_id:originalId,page_number:3});
 expect(result.status).toBe(403);
 expect(s.registration).not.toHaveBeenCalled();expect(s.production).not.toHaveBeenCalled();
});
it("refuses a stale source version or byte hash before budget reservation",async()=>{
 s.registration.mockResolvedValueOnce({original_id:originalId,project_id:project,
 source_version_id:sourceVersionId,asset_revision_id:assetRevisionId,sha256:"b".repeat(64),
 content_type:"image/jpeg",byte_size:125});
 const res=await submit({original_id:originalId,page_number:3});
 expect(res.status).toBe(409);
 expect((await res.json()).reason).toBe("production_original_not_bound");
 expect(s.production).not.toHaveBeenCalled();
});
it("passes only rechecked source/version/locator to the existing governed Runner preflight",async()=>{
 const res=await submit({original_id:originalId,page_number:3});
 expect(res.status).toBe(409);
 expect((await res.json()).reason).toBe("production_acquisition_receipt_required");
 expect(s.registration).toHaveBeenCalledWith(originalId,"owner-session");
 expect(s.production).toHaveBeenCalledWith(taskId,owner,undefined,undefined,{
   originalId,pageNumber:3,sourceVersionId,sha256:bytesSha,
   assetRevisionId,contentType:"image/jpeg",byteSize:125,
   uploadStartedAt:"2026-11-10T00:00:00.000Z",uploadVerifiedAt:"2026-11-10T00:01:00.000Z",
 },"owner-session",undefined,undefined);
});
const runId="123e4567-e89b-42d3-a456-426614174007";
it("rejects an unsupported from_stage before any original lookup",async()=>{
 const res=await submit({original_id:originalId,page_number:3,from_stage:"D02"});
 expect(res.status).toBe(400);
 expect((await res.json()).reason).toBe("production_from_stage_invalid");
 expect(s.production).not.toHaveBeenCalled();
});
it("requires the resumed run to be bound in the task checkpoint",async()=>{
 const res=await submit({original_id:originalId,page_number:3,from_stage:"D01"});
 expect(res.status).toBe(409);
 expect((await res.json()).reason).toBe("production_resume_run_binding_required");
 expect(s.production).not.toHaveBeenCalled();
});
it("passes the checkpoint-bound run as resume to requestProduction",async()=>{
 s.task.mockResolvedValueOnce({task_id:taskId,status:"done",
   checkpoint:{studio:{project_id:project},production_run_id:runId}});
 s.production.mockResolvedValueOnce({ok:true,run_id:runId});
 const res=await submit({original_id:originalId,page_number:3,from_stage:"D01"});
 expect(res.status).toBe(200);
 expect((await res.json()).run_id).toBe(runId);
 expect(s.production).toHaveBeenCalledWith(taskId,owner,undefined,undefined,expect.anything(),"owner-session",
   undefined,{runId,fromStage:"D01"});
});
