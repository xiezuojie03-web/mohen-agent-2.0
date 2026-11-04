import {beforeEach,it,expect,vi} from 'vitest';
const d=vi.hoisted(()=>({session:vi.fn(),sign:vi.fn(),save:vi.fn(),list:vi.fn(),delegations:vi.fn(),state:vi.fn(),revision:vi.fn(),history:vi.fn()}));
vi.mock('../../apps/web/lib/session',()=>({getSession:d.session}));
vi.mock('../../apps/web/lib/auth',()=>({signDatabaseSessionToken:d.sign}));
vi.mock('@mohen/data-access',()=>({getNodePgPool:()=>({}),createStudioAssetRepository:()=>({listPlanAssets:d.list,getRevision:d.revision,listAssetRevisions:d.history}),createStudioDelegationRepository:()=>({getDelegationForPlan:async(p:string,r:string,k:string,t:string)=>(await d.delegations(p,r,k,t)).find((x:any)=>x.idempotency_key===k)??null}),createStudioExecutionRepository:()=>({getState:d.state})}));
vi.mock('../../apps/web/lib/studio-plans',()=>({saveStudioResearchPlan:d.save}));
import {POST,GET} from '../../apps/web/app/api/studio/plans/route';
const request=(body:unknown)=>new Request('https://test.invalid/api/studio/plans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();d.session.mockResolvedValue({uid:'owner',r:[]});d.sign.mockReturnValue('signed-owner');d.save.mockResolvedValue({state:'HOLD',execution_authorized:false});d.list.mockResolvedValue([]);d.delegations.mockResolvedValue([]);d.state.mockResolvedValue({state:"READY"});});
it('requires Owner authentication before persistence or body handling',async()=>{d.session.mockResolvedValue(null);const r=await POST(request({}));expect(r.status).toBe(401);expect(r.headers.get('cache-control')).toBe('no-store');expect(d.save).not.toHaveBeenCalled();});
it('binds signed server identity, keeps planning HOLD and never dispatches a provider',async()=>{const r=await POST(request({question:'canal'}));expect(r.status).toBe(200);expect(await r.json()).toMatchObject({ok:true,state:'HOLD',execution_authorized:false});expect(d.save).toHaveBeenCalledWith(expect.any(Object),{question:'canal'},{actorId:'owner',token:'signed-owner'});});
it('maps permission/validation/conflict failures without raw SQL disclosure',async()=>{for(const [reason,status]of [['STUDIO_SOURCE_NOT_FOUND',404],['STUDIO_PLAN_REQUEST_INVALID',400],['STUDIO_REVISION_CONFLICT',409],['secret db string',503]]as const){d.save.mockRejectedValueOnce(Error(reason));const r=await POST(request({}));expect(r.status).toBe(status);expect(await r.text()).not.toContain('secret db string');}});
it('rejects oversized/non-object bodies before persistence',async()=>{for(const body of [[],{x:'a'.repeat(70000)}])expect((await POST(request(body))).status).toBe(body instanceof Array?400:413);expect(d.save).not.toHaveBeenCalled();});
it('lists only saved plan drafts for the selected Owner project',async()=>{d.list.mockResolvedValue([{payload:{schema:'mohen.studio-research-plan.v1'}},{payload:{text:'note'}}]);const r=await GET(new Request('https://test.invalid/api/studio/plans?project_id=11111111-1111-4111-8111-111111111111'));expect(r.status).toBe(200);expect((await r.json()).plans).toHaveLength(1);expect(d.list).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111','signed-owner',null);});

it('reloads exact plan delegation and current revocation state rather than inventing execution success',async()=>{
 d.list.mockResolvedValue([{asset_id:'asset',payload:{schema:'mohen.studio-research-plan.v1',request_id:'req-A',delegation_series_id:'series-A',plan:{root_task_id:'root',plan_hash:'hash'}}}]);
 d.delegations.mockResolvedValue([{delegation_id:'delegate',root_task_ref:'root',idempotency_key:'req-A',delegation_series_id:'series-A',root_task_snapshot:{plan_asset_id:'asset',plan:{plan_hash:'hash'}}}]);d.state.mockResolvedValue({state:'REVOKED'});
 const r=await GET(new Request('https://test.invalid?project_id=11111111-1111-4111-8111-111111111111'));
 expect(r.status).toBe(200);expect((await r.json()).plans[0]).toMatchObject({delegation_id:'delegate',control:{state:'REVOKED'}});
});

it('binds two same-root/hash plans to their own immutable request and asset identities',async()=>{
 d.list.mockResolvedValue(['A','B'].map(x=>({asset_id:'asset-'+x,payload:{schema:'mohen.studio-research-plan.v1',request_id:'req-'+x,delegation_series_id:'series-'+x,plan:{root_task_id:'root',plan_hash:'same'}}})));
 d.delegations.mockResolvedValue(['B','A'].map(x=>({delegation_id:'delegate-'+x,root_task_ref:'root',idempotency_key:'req-'+x,delegation_series_id:'series-'+x,root_task_snapshot:{plan_asset_id:'asset-'+x,plan:{plan_hash:'same'}}})));
 d.state.mockImplementation(async id=>({state:id==='delegate-A'?'REVOKED':'READY'}));
 const r=await GET(new Request('https://test.invalid?project_id=11111111-1111-4111-8111-111111111111'));
 expect((await r.json()).plans.map((p:any)=>[p.delegation_id,p.control.state])).toEqual([['delegate-A','REVOKED'],['delegate-B','READY']]);
});
it('returns a continuation cursor for older plans and validates cursor before reading',async()=>{
 d.list.mockResolvedValue(Array.from({length:21},(_,i)=>({asset_id:'id-'+i,payload:{schema:'mohen.studio-research-plan.v1'}})));
 const r=await GET(new Request('https://test.invalid?project_id=11111111-1111-4111-8111-111111111111'));const b=await r.json();
 expect(b.plans).toHaveLength(20);expect(b.next_cursor).toBe('id-19');
 const bad=await GET(new Request('https://test.invalid?project_id=11111111-1111-4111-8111-111111111111&cursor=unsafe'));expect(bad.status).toBe(400);
});

it('recovers only the latest Owner plan using its stored request, never client overrides',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 d.revision.mockResolvedValue({asset_id:id,revision_id:id,project_id:id,payload:{schema:'mohen.studio-research-plan.v1',request_id:id,delegation_series_id:id,plan:{actor_id:'owner',root_task_id:id},plan_request:{project_id:id,asset_id:id,root_task_ref:id,series_id:id,request_id:id,question:'restored'}}});d.history.mockResolvedValue([{revision_id:id}]);
 expect((await POST(request({recover_revision_id:id}))).status).toBe(200);
 expect(d.save).toHaveBeenCalledWith(expect.any(Object),expect.objectContaining({question:'restored',asset_id:id}),{actorId:'owner',token:'signed-owner'});
 d.save.mockClear();expect((await POST(request({recover_revision_id:id,budget_limit:'9'}))).status).toBe(400);expect(d.save).not.toHaveBeenCalled();
 d.history.mockResolvedValue([{revision_id:'newer'}]);expect((await POST(request({recover_revision_id:id}))).status).toBe(409);expect(d.save).not.toHaveBeenCalled();
});
it('never presents an idempotent registration replay as reviving a revoked delegation',async()=>{
 const id='11111111-1111-4111-8111-111111111111';d.save.mockResolvedValue({state:'HOLD',execution_authorized:false,delegation:{delegation_id:id}});d.state.mockResolvedValue({state:'REVOKED'});
 const r=await POST(request({question:'replay'}));expect(r.status).toBe(200);expect(await r.json()).toMatchObject({state:'REVOKED',control:{state:'REVOKED'},execution_authorized:false});
});

it('does not recover a stored request aimed at a different asset or project',async()=>{
 const id='11111111-1111-4111-8111-111111111111';d.revision.mockResolvedValue({asset_id:id,revision_id:id,project_id:id,payload:{schema:'mohen.studio-research-plan.v1',plan:{actor_id:'owner'},plan_request:{asset_id:'another-asset',project_id:id}}});d.history.mockResolvedValue([{revision_id:id}]);
 const r=await POST(request({recover_revision_id:id}));expect(r.status).toBe(400);expect(d.save).not.toHaveBeenCalled();
});
