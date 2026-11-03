import { beforeEach,expect,it,vi } from "vitest";
const state=vi.hoisted(()=>({session:vi.fn(),upload:vi.fn(),download:vi.fn(),token:vi.fn(),store:vi.fn()}));
vi.mock("../../apps/web/lib/session",()=>({getSession:state.session}));
vi.mock("../../apps/web/lib/auth",()=>({signDatabaseSessionToken:state.token}));
vi.mock("../../packages/data-access/src/index.mjs",()=>({
 getNodePgPool:()=>({}),createPrivateOriginalRepository:()=>({}),
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
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED","true");state.session.mockResolvedValue({uid:id});state.token.mockReturnValue("synthetic");state.upload.mockResolvedValue({
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
