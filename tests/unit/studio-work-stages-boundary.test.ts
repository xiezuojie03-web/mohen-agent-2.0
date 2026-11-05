import {beforeEach,expect,it,vi} from 'vitest';
const d=vi.hoisted(()=>({query:vi.fn(),guard:vi.fn(),session:vi.fn(),task:vi.fn()}));
vi.mock('@mohen/data-access',()=>({queryRows:d.query}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:d.guard}));
vi.mock('../../apps/web/lib/session',()=>({getSession:d.session}));
vi.mock('../../apps/web/lib/auth',()=>({signDatabaseSessionToken:()=> 'signed-owner'}));
vi.mock('../../apps/web/lib/studio-research',()=>({getTaskStatus:d.task}));
import {GET} from '../../apps/web/app/api/studio/works/[id]/stages/route';
const req=new Request('https://test.invalid'),params={params:Promise.resolve({id:'work'})};
beforeEach(()=>{vi.resetAllMocks();d.guard.mockResolvedValue(null);d.session.mockResolvedValue({uid:'owner',r:[]});
 d.query.mockImplementation(async(sql:string)=>{
  if(sql.includes('select work_id'))return [{work_id:'work'}];
  if(sql.includes('from public.research_tasks'))return [{task_id:'task',status:'done',has_receipt:false}];
  if(sql.includes('from public.director_plans'))return sql.includes("r.content->'director_source'->>'plan_id'")&&sql.includes('d.owner_user_id')?[]:[{brief:'FOREIGN_SECRET'}];
  return [];
 });d.task.mockResolvedValue({checkpoint:{materialRead:{state:'HOLD'}}});});
it('does not return unrelated director plans merely because this work has a task',async()=>{
 const r=await GET(req,params),body=await r.json();
 expect(JSON.stringify(body)).not.toContain('FOREIGN_SECRET');expect(body.artifacts.plans).toEqual([]);
 expect(body.stages.researched).toBe(false);expect(r.headers.get('cache-control')).toBe('no-store');
});
it('requires current material authority as well as a real receipt',async()=>{
 d.query.mockImplementation(async(sql:string)=>sql.includes('select work_id')?[{work_id:'work'}]:sql.includes('from public.research_tasks')?[{task_id:'task',status:'done',has_receipt:true}]:[]);
 expect((await (await GET(req,params)).json()).stages.researched).toBe(false);
 d.task.mockResolvedValue({checkpoint:{materialRead:{state:'CURRENT'},decision:{materials:[{id:'current'}]}}});
 expect((await (await GET(req,params)).json()).stages.researched).toBe(true);
 expect(d.task).toHaveBeenCalledWith('task','signed-owner');
});
it('rejects anonymous access even if a mocked outer guard passes',async()=>{
 d.session.mockResolvedValue(null);expect((await GET(req,params)).status).toBe(401);expect(d.query).not.toHaveBeenCalled();
});
it('rejects a cross-owner operator rather than reading private plans',async()=>{
 d.session.mockResolvedValue({uid:'operator',r:['operator']});d.query.mockResolvedValue([]);
 expect((await GET(req,params)).status).toBe(403);expect(d.query).toHaveBeenCalledTimes(1);
});
it('reads only the exact revision-bound plan under the same Owner',async()=>{
 d.query.mockImplementation(async(sql:string,vars:Record<string,string>)=>{
  expect(vars).toEqual({wid:'work',uid:'owner'});
  if(sql.includes('select work_id'))return [{work_id:'work'}];
  if(sql.includes('from public.director_plans')){
   expect(sql).toContain("d.plan_id::text=r.content->'director_source'->>'plan_id'");
   expect(sql).toContain('w.owner_user_id=d.owner_user_id');expect(sql).toContain("d.owner_user_id=:'uid'");
   expect(sql).not.toContain('join public.research_tasks');
   return [{plan_id:'bound',brief:'own brief'}];
  }
  return [];
 });
 const body=await (await GET(req,params)).json();expect(body.artifacts.plans).toEqual([{plan_id:'bound',brief:'own brief'}]);expect(body.stages.directed).toBe(true);
});
it('preserves outer guard denial and does not query or sign in again',async()=>{
 d.guard.mockResolvedValue(new Response(JSON.stringify({ok:false,reason:'forbidden'}),{status:403}));
 const r=await GET(req,params);expect(r.status).toBe(403);expect(r.headers.get('cache-control')).toBe('no-store');expect(d.query).not.toHaveBeenCalled();expect(d.session).not.toHaveBeenCalled();
});
it('returns a safe no-store failure on repository errors',async()=>{
 d.query.mockRejectedValue(new Error('secret-connection-address'));const r=await GET(req,params);
 expect(r.status).toBe(503);expect(r.headers.get('cache-control')).toBe('no-store');expect(JSON.stringify(await r.json())).not.toContain('secret-connection-address');
});
