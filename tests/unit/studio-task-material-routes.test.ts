import {expect,it,vi} from 'vitest';
const d=vi.hoisted(()=>({get:vi.fn(),guard:vi.fn(),session:vi.fn(),access:vi.fn()}));
vi.mock('../../apps/web/lib/studio-research',()=>({getTaskStatus:d.get}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:d.guard}));
vi.mock('../../apps/web/lib/session',()=>({getSession:d.session,isOperatorSession:()=>false}));
vi.mock('../../apps/web/lib/ownership',()=>({canAccess:d.access}));
vi.mock('../../apps/web/lib/auth',()=>({signDatabaseSessionToken:()=> 'server-token'}));
import {GET as materials} from '../../apps/web/app/api/studio/research-tasks/[id]/materials/route';
import {GET as status} from '../../apps/web/app/api/studio/research-tasks/[id]/status/route';
const req=new Request('https://test.invalid'),params={params:Promise.resolve({id:'task'})};
it('fails closed materials but keeps completed operational status visible with no-store',async()=>{
 d.guard.mockResolvedValue(null);d.session.mockResolvedValue({uid:'owner',r:[]});d.access.mockResolvedValue(true);
 d.get.mockResolvedValue({status:'done',checkpoint:{production:{run_id:'run'},decision:null,materialRead:{state:'HOLD',reason:'MATERIAL_REVOKED_OR_CHANGED'}}});
 const m=await materials(req,params),s=await status(req,params);
 expect(m.status).toBe(503);expect(s.status).toBe(200);
 expect(m.headers.get('cache-control')).toBe('no-store');expect(s.headers.get('cache-control')).toBe('no-store');
 expect(await m.json()).toMatchObject({ok:false,materials:[],reason:'MATERIAL_REVOKED_OR_CHANGED'});
 expect(await s.json()).toMatchObject({ok:true,task:{status:'done',checkpoint:{production:{run_id:'run'}}}});
 expect(d.get).toHaveBeenCalledWith('task','server-token');
});
it.each([false,true])('reads current JSON checkpoint string=%s',async encoded=>{
 d.guard.mockResolvedValue(null);d.session.mockResolvedValue({uid:'owner',r:[]});
 const cp={decision:{materials:[{id:'current'}]},materialRead:{state:'CURRENT'}};
 d.get.mockResolvedValue({checkpoint:encoded?JSON.stringify(cp):cp});
 expect(await (await materials(req,params)).json()).toMatchObject({ok:true,materials:[{id:'current'}]});
});
