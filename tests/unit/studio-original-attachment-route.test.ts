import { beforeEach,expect,it,vi } from "vitest";
const state=vi.hoisted(()=>({session:vi.fn(),upload:vi.fn(),download:vi.fn(),list:vi.fn(),registration:vi.fn(),token:vi.fn(),store:vi.fn()}));
vi.mock("../../apps/web/lib/session",()=>({getSession:state.session}));
vi.mock("../../apps/web/lib/auth",()=>({signDatabaseSessionToken:state.token}));
vi.mock("../../packages/data-access/src/private-source-registration-repository.mjs",()=>({
 createPrivateSourceRegistrationRepository:()=>({lookup:state.registration}),
}));
vi.mock("../../packages/data-access/src/index.mjs",()=>({
 getNodePgPool:()=>({}),createPrivateOriginalRepository:()=>({listForProject:state.list}),
 createPrivateSourceRegistrationRepository:()=>({lookup:state.registration}),
 createPrivateOriginalWorkflow:()=>({upload:state.upload,download:state.download}),
 MAX_ORIGINAL_BYTES:10485760,createPrivateOriginalStorage:()=>state.store,
}));
import {GET,POST} from "../../apps/web/app/api/studio/attachments/route";
const id="11111111-1111-4111-8111-111111111111";
function request(){
 const form=new FormData();
 form.set("project_id",id);
 form.set("idempotency_key","stable-user-request");
 form.set("rights_declared","true");
 form.set("file",new File(["private original"],"page.txt",{type:"text/plain"}));
 return new Request("http://test.invalid/api/studio/attachments",{method:"POST",body:form});
}
beforeEach(()=>{vi.clearAllMocks();state.list.mockResolvedValue([]);
 state.registration.mockRejectedValue(new Error('PRIVATE_SOURCE_REGISTRATION_INVALID'));vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED","true");vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_LOCAL_FS","false");state.session.mockResolvedValue({uid:id});state.token.mockReturnValue("synthetic");state.upload.mockResolvedValue({
 original_id:id,asset_id:id,asset_revision_id:id,sha256:"a".repeat(64),byte_size:16,state:"STORED_VERIFIED",
});state.download.mockResolvedValue({record:{content_type:"text/plain"},bytes:Buffer.from("original")});});
it("refuses anonymous upload and download",async()=>{
 state.session.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);
 expect((await GET(new Request("http://test.invalid/api/studio/attachments?original_id="+id))).status).toBe(401);
 expect(state.upload).not.toHaveBeenCalled();
});
it("fails closed before feature activation",async()=>{
 vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED","false");
 expect((await POST(request())).status).toBe(503);expect(state.upload).not.toHaveBeenCalled();
});
it("acknowledges only verified persisted original, no object key or public URL",async()=>{
 const response=await POST(request());expect(response.status).toBe(201);
 const body=await response.json();expect(body.state).toBe("STORED_VERIFIED");
 expect(JSON.stringify(body)).not.toContain("storage_key");expect(JSON.stringify(body)).not.toContain("https://");
});
it("does not report success for aborted verification or DB rollback",async()=>{
 state.upload.mockRejectedValue(new Error("ORIGINAL_INTEGRITY_FAILED"));
 const response=await POST(request());expect(response.status).toBe(503);expect((await response.json()).ok).toBe(false);
});
it("rejects missing declaration and invalid project before storage",async()=>{
 const form=await request().formData();form.set("rights_declared","false");
 const r=await POST(new Request("http://test.invalid/api/studio/attachments",{method:"POST",body:form}));
 expect(r.status).toBe(400);expect(state.upload).not.toHaveBeenCalled();
});
it("downloads only when repo verifies ownership twice and bytes are intact",async()=>{
 const r=await GET(new Request("http://test.invalid/api/studio/attachments?original_id="+id));
 expect(r.status).toBe(200);expect(r.headers.get("cache-control")).toBe("no-store");
 expect(r.headers.get("content-type")).toBe("text/plain");
 expect(await r.text()).toBe("original");expect(state.download).toHaveBeenCalled();
});
it("does not leak original on revoked or cross-owner DB access",async()=>{
 state.download.mockRejectedValue(new Error("ORIGINAL_NOT_FOUND"));
 const r=await GET(new Request("http://test.invalid/api/studio/attachments?original_id="+id));
 expect(r.status).toBe(404);expect(await r.text()).not.toContain("original bytes");
});
it("rejects a chunked oversize body before multipart parsing or storage",async()=>{
 let supplied=0;
 const stream=new ReadableStream({pull(controller){supplied++;controller.enqueue(new Uint8Array(1024*1024));if(supplied===14)controller.close();}});
 const r=await POST(new Request('http://test.invalid/api/studio/attachments',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=synthetic'},body:stream,duplex:'half'} as RequestInit));
 expect(r.status).toBe(413);expect(state.upload).not.toHaveBeenCalled();expect(supplied).toBeLessThan(14);
});
it("rejects a browser POST from a different origin before reading bytes",async()=>{
 const r0=request();const r=new Request(r0,{headers:{...Object.fromEntries(r0.headers),'origin':'https://other.invalid'}});
 expect((await POST(r)).status).toBe(403);expect(state.upload).not.toHaveBeenCalled();
});
it('times out a stalled upload before metadata or storage writes',async()=>{
 vi.useFakeTimers();
 try{
  const stream=new ReadableStream<Uint8Array>({start(){}});
  const pending=POST(new Request('http://test.invalid/api/studio/attachments',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=synthetic'},body:stream,duplex:'half'} as RequestInit));
  await vi.advanceTimersByTimeAsync(20001);
  const response=await pending;expect(response.status).toBe(408);expect((await response.json()).reason).toBe('upload_timeout');expect(state.upload).not.toHaveBeenCalled();
 }finally{vi.useRealTimers();}
});
it('rejects unsupported file types before invoking the storage workflow',async()=>{
 const form=await request().formData();form.set('file',new File(['<svg/>'],'test.svg',{type:'image/svg+xml'}));
 const response=await POST(new Request('http://test.invalid/api/studio/attachments',{method:'POST',body:form}));
 expect(response.status).toBe(400);expect(state.upload).not.toHaveBeenCalled();
});

it('accepts the browser Origin matching the incoming Host when Next normalizes its internal URL',async()=>{
 const req=request();
 const headers=new Headers(req.headers);
 headers.set('origin','http://127.0.0.1:3000');headers.set('host','127.0.0.1:3000');
 const response=await POST(new Request('http://localhost:3000/api/studio/attachments',{method:'POST',headers,body:await req.arrayBuffer()}));
 expect(response.status).toBe(201);
});
it('does not trust a client-supplied forwarded host to authorize a foreign Origin',async()=>{
 const req=request();const headers=new Headers(req.headers);
 headers.set('origin','http://evil.invalid');headers.set('host','test.invalid');headers.set('x-forwarded-host','evil.invalid');
 expect((await POST(new Request(req.url,{method:'POST',headers,body:await req.arrayBuffer()}))).status).toBe(403);
 expect(state.upload).not.toHaveBeenCalled();
});

it("lists only Owner-RLS verified original metadata for a project, never bytes or storage keys",async()=>{
 state.list.mockResolvedValue([{
   original_id:id,project_id:id,asset_revision_id:id,file_name:"local-page.jpg",
   content_type:"image/jpeg",sha256:"a".repeat(64),byte_size:1234,
   state:"STORED_VERIFIED",storage_key:"NEVER_LEAK",private_bytes:"NEVER_LEAK",
 }]);
 const response=await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id));
 expect(response.status).toBe(200);
 expect(response.headers.get("Cache-Control")).toBe("no-store");
 const data=await response.json();
 expect(data).toMatchObject({ok:true,project_id:id,originals:[{original_id:id,state:"STORED_VERIFIED",registration_state:"UNBOUND",source_version_id:null}]});
 expect(JSON.stringify(data)).not.toContain("NEVER_LEAK");
 expect(state.list).toHaveBeenCalledWith(id,"synthetic");
 expect(state.download).not.toHaveBeenCalled();
});
it("does not turn a missing/cross-project private inventory into an available source",async()=>{
 state.list.mockResolvedValue([]);
 const noOriginal=await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id));
 expect((await noOriginal.json()).originals).toEqual([]);
 state.list.mockRejectedValueOnce(new Error("STUDIO_PROJECT_NOT_FOUND"));
 const foreign=await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id));
 expect(foreign.status).toBe(404);
});
it("rejects malformed and ambiguous project/source requests before accessing storage",async()=>{
 expect((await GET(new Request("http://test.invalid/api/studio/attachments?project_id=bad"))).status).toBe(400);
 expect((await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id+"&original_id="+id))).status).toBe(400);
 expect(state.list).not.toHaveBeenCalled();
 expect(state.download).not.toHaveBeenCalled();
});

it("marks an original as L0-bound only when owner-scoped registration matches the exact stored version",async()=>{
 state.list.mockResolvedValue([{original_id:id,project_id:id,asset_revision_id:id,
   file_name:"registered.jpg",content_type:"image/jpeg",sha256:"a".repeat(64),
   byte_size:1234,state:"STORED_VERIFIED"}]);
 state.registration.mockResolvedValue({original_id:id,project_id:id,source_version_id:id,
   asset_revision_id:id,content_type:"image/jpeg",sha256:"a".repeat(64),byte_size:1234});
 const response=await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id));
 expect(response.status).toBe(200);
 expect((await response.json()).originals).toMatchObject([{
   original_id:id,registration_state:"BOUND",source_version_id:id
 }]);
 expect(state.registration).toHaveBeenCalledWith(id,"synthetic");
 state.registration.mockResolvedValueOnce({original_id:id,project_id:id,
   source_version_id:id,asset_revision_id:id,content_type:"image/jpeg",sha256:"b".repeat(64),byte_size:1234});
 const changed=await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id));
 expect((await changed.json()).originals[0].registration_state).toBe("UNBOUND");
});
it("fails inventory closed if source-registration lookup fails for reasons other than an unbound original",async()=>{
 state.list.mockResolvedValue([{original_id:id,project_id:id,asset_revision_id:id,
   file_name:"registered.jpg",content_type:"image/jpeg",sha256:"a".repeat(64),
   byte_size:1234,state:"STORED_VERIFIED"}]);
 state.registration.mockRejectedValueOnce(new Error("permission denied"));
 const response=await GET(new Request("http://test.invalid/api/studio/attachments?project_id="+id));
 expect(response.status).toBe(503);
 expect(JSON.stringify(await response.json())).not.toContain("permission denied");
});
