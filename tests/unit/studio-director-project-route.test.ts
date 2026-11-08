import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({guard:vi.fn(),session:vi.fn(),sign:vi.fn(),prepare:vi.fn(),create:vi.fn(),
  listSources:vi.fn(),grant:vi.fn(),read:vi.fn(),bindingReady:vi.fn()}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:mocks.guard}));
vi.mock('../../apps/web/lib/session',()=>({getSession:mocks.session}));
vi.mock('../../apps/web/lib/auth',()=>({signDatabaseSessionToken:mocks.sign}));
vi.mock('../../apps/web/lib/studio-director',()=>({prepareProjectDirectorInput:mocks.prepare,createDirectorPlan:mocks.create,isDirectorPlanProjectBindingReady:mocks.bindingReady}));
vi.mock('../../apps/web/lib/studio/dispatch-grant',()=>({listProjectSourceIds:mocks.listSources,grantForStudioLlm:mocks.grant}));
vi.mock('../../apps/web/lib/studio-research-read',()=>({readStudioResearchProject:mocks.read}));
import {POST} from '../../apps/web/app/api/studio/director-plans/route';
const project='11111111-1111-4111-8111-111111111111';
const request=(body:unknown)=>new Request('http://localhost/director',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(null);mocks.session.mockResolvedValue({uid:'owner',r:['owner']});mocks.sign.mockReturnValue('signed-owner-context');mocks.bindingReady.mockResolvedValue(true);});
it('binds through signed project ACL and returns private HOLD rather than invoking a model',async()=>{
 mocks.prepare.mockResolvedValue({state:'HOLD',reason:'external_processing_not_authorized',source_snapshot:{project_id:project,snapshot_hash:'hash'},source_refs:['asset@revision']});
 const response=await POST(request({brief:'private commission',project_id:project,external_processing_allowed:true}));
 expect(response.status).toBe(409);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(mocks.prepare).toHaveBeenCalledWith(project,'signed-owner-context');expect(mocks.create).not.toHaveBeenCalled();
 expect(await response.json()).toMatchObject({ok:false,state:'HOLD',source_refs:['asset@revision']});
});
it('refuses a foreign/inactive project without returning its snapshot',async()=>{
 mocks.prepare.mockRejectedValue(Error('STUDIO_PROJECT_NOT_FOUND'));
 const response=await POST(request({brief:'brief',project_id:project}));expect(response.status).toBe(404);expect(await response.json()).toEqual({ok:false,reason:'STUDIO_PROJECT_NOT_FOUND'});
});
it('keeps legacy requests reachable while explaining missing transfer authority',async()=>{
 mocks.create.mockResolvedValue(null);
 const response=await POST(request({brief:'legacy',topic:'jinze'}));expect(response.status).toBe(409);expect(await response.json()).toMatchObject({ok:false,state:'HOLD',reason:'external_processing_not_authorized'});
 expect(mocks.prepare).not.toHaveBeenCalled();
});

it('binds the saved director plan and every Grant to the selected project',async()=>{
 const delegation='22222222-2222-4222-8222-222222222222';
 mocks.listSources.mockResolvedValue(['source-id']);
 mocks.grant.mockResolvedValue({grant:{grantId:'synthetic-grant'}});
 mocks.read.mockResolvedValue({materials:[{snippet:'grounded fact',sourceRef:'source@revision'}]});
 mocks.create.mockResolvedValue({planId:'plan-id',planA:{},planB:{},facts:['grounded fact'],finding:{}});
 const response=await POST(request({brief:'project-scoped brief',project_id:project,delegation_id:delegation}));
 expect(response.status).toBe(200);
 expect(mocks.grant).toHaveBeenCalledWith(expect.objectContaining({delegationId:delegation,projectId:project}));
 expect(mocks.create).toHaveBeenCalledWith('project-scoped brief','jinze','owner',
  expect.objectContaining({projectId:project,sourceIds:['source-id']}));
});
