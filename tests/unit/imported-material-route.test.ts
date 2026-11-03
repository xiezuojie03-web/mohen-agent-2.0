import { beforeEach, expect, it, vi } from 'vitest';
const dependencies=vi.hoisted(()=>({session:vi.fn(),token:vi.fn(),list:vi.fn(),create:vi.fn(),get:vi.fn()}));
vi.mock('../../apps/web/lib/session',()=>({getSession:dependencies.session,getSessionToken:dependencies.token}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({queryRows:dependencies.list,queryValue:async()=> 'unacknowledged-id',run:dependencies.create,getNodePgPool:()=>({}),createImportedMaterialRepository:()=>({list:dependencies.list,create:dependencies.create,get:dependencies.get})}));
import {GET,POST} from '../../apps/web/app/api/studio/materials/import/route';
const request=(body:unknown)=>new Request('http://test.invalid/api/studio/materials/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const body={title:'私有史料',text:'这是供本人研究使用的一段材料，足够长以便通过文本长度检查。',rights_declared:true};
beforeEach(()=>{vi.stubEnv('MOHEN_DATABASE_SESSION_SECRET','synthetic-db-attestation-key-only-at-least-32');vi.clearAllMocks();dependencies.session.mockResolvedValue({uid:'creator',r:['creator']});dependencies.token.mockResolvedValue('signed-session');dependencies.list.mockResolvedValue([]);dependencies.create.mockResolvedValue({material_id:'persisted-material',owner_user_id:'creator'});});
it('refuses anonymous listing and importing',async()=>{dependencies.session.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await POST(request(body))).status).toBe(401);});
it('reports retryable storage failure instead of crashing or reporting successful listing',async()=>{dependencies.list.mockRejectedValue(new Error('connection unavailable'));const r=await GET();expect(r.status).toBe(503);expect(await r.json()).toEqual({ok:false,reason:'materials_unavailable'});});
it('acknowledges the material identity actually persisted by the session-scoped repository',async()=>{const r=await POST(request(body));expect(r.status).toBe(200);expect(await r.json()).toEqual({ok:true,material_id:'persisted-material',kind:'text',chars:body.text.length});});
it('does not acknowledge an import when storage or RLS is unavailable',async()=>{dependencies.create.mockRejectedValue(new Error('role unavailable'));const r=await POST(request(body));expect(r.status).toBe(503);expect(await r.json()).toEqual({ok:false,reason:'materials_unavailable'});});
it('rejects a session disabled between the route check and SQL operation',async()=>{dependencies.list.mockRejectedValue(new Error('MATERIAL_IDENTITY_REQUIRED'));expect((await GET()).status).toBe(401);});
it('rejects non-object JSON with a client error',async()=>{for(const value of [null,[],7,'text'])expect((await POST(request(value))).status).toBe(400);});
it('still requires a rights declaration',async()=>{expect((await POST(request({...body,rights_declared:false}))).status).toBe(400);});

const uuid = "11111111-1111-4111-8111-111111111111";
const privateRequest = (id = uuid) =>
  new Request("http://test.invalid/api/studio/materials/import?material_id=" + id);
it("reads a single private material via a session-scoped repository, no cache", async () => {
  const material = { material_id:uuid,title:"私有史料",text:"合成原文，仅供拥有者阅读。" };
  dependencies.get.mockResolvedValue(material);
  const r = await GET(privateRequest());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(await r.json()).toEqual({ok:true,material});
  expect(dependencies.get).toHaveBeenCalledWith(uuid,expect.any(String));
  expect(dependencies.list).not.toHaveBeenCalled();
});
it("hides foreign or non-existent material IDs without leaking private text", async () => {
  dependencies.get.mockResolvedValue(null);
  const r=await GET(privateRequest());
  expect(r.status).toBe(404);
  expect(await r.json()).toEqual({ok:false,reason:"not_found"});
});
it("refuses invalid material IDs before touching the repository",async()=>{
  const r=await GET(privateRequest("../unsafe"));
  expect(r.status).toBe(400);
  expect(dependencies.get).not.toHaveBeenCalled();
});
it("fails closed on a revoked session during DB read",async()=>{
  dependencies.get.mockRejectedValue(new Error("MATERIAL_IDENTITY_REQUIRED"));
  const r=await GET(privateRequest());
  expect(r.status).toBe(401);
  expect(dependencies.get).toHaveBeenCalledOnce();
});
it("does not leak private text on storage errors",async()=>{
  dependencies.get.mockRejectedValue(new Error("synthetic secret SQL trace"));
  const r=await GET(privateRequest());
  expect(r.status).toBe(503);
  expect(JSON.stringify(await r.json())).not.toContain("synthetic secret");
});
it("rejects an anonymous private material detail request",async()=>{
  dependencies.session.mockResolvedValue(null);
  const r=await GET(privateRequest());
  expect(r.status).toBe(401);
  expect(dependencies.get).not.toHaveBeenCalled();
});
