import {beforeEach,expect,it,vi} from 'vitest';
const d=vi.hoisted(()=>({session:vi.fn(),read:vi.fn(),sign:vi.fn()}));
vi.mock('../../apps/web/lib/session',()=>({getSession:d.session}));
vi.mock('../../apps/web/lib/auth',()=>({signDatabaseSessionToken:d.sign}));
vi.mock('../../apps/web/lib/studio-research-read',()=>({readStudioResearchProject:d.read}));
import {POST} from '../../apps/web/app/api/studio/research-read/route';
const project='11111111-1111-4111-8111-111111111111';
const request=(body:unknown)=>new Request('https://test.invalid/api/studio/research-read',{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();d.session.mockResolvedValue({uid:'owner',r:[]});d.sign.mockReturnValue('server-signed-owner');
 d.read.mockResolvedValue({snapshot:{project_id:project},materials:[],gaps:[],externalProcessingAllowed:false});});
it('requires login before project lookup or persistence',async()=>{
 d.session.mockResolvedValue(null);const r=await POST(request({project_id:project}));
 expect(r.status).toBe(401);expect(r.headers.get('cache-control')).toBe('no-store');expect(d.read).not.toHaveBeenCalled();
});
it.each([null,[],{}, {project_id:'invalid'}])('rejects malformed project requests: %j',async body=>{
 const r=await POST(request(body));expect(r.status).toBe(400);expect(r.headers.get('cache-control')).toBe('no-store');expect(d.read).not.toHaveBeenCalled();
});
it('uses only server identity and never caches private context',async()=>{
 const r=await POST(request({project_id:project,session_token:'forged',external_processing_allowed:true}));
 expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');
 expect(d.read).toHaveBeenCalledWith(project,'server-signed-owner');
 expect(await r.json()).toMatchObject({ok:true,externalProcessingAllowed:false,snapshot:{project_id:project}});
});
it.each([['STUDIO_PROJECT_NOT_FOUND',404],['STUDIO_REVISION_CONFLICT',409],['private-bucket/secret',503],['STUDIO_RESEARCH_READ_BINDING_INVALID',503]])(
 'fails closed for %s',async(reason,status)=>{
 d.read.mockRejectedValue(new Error(reason));const r=await POST(request({project_id:project}));
 expect(r.status).toBe(status);expect(r.headers.get('cache-control')).toBe('no-store');
 const body=await r.json();expect(body.ok).toBe(false);expect(JSON.stringify(body)).not.toContain('private-bucket');
});
