import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({guard:vi.fn(),session:vi.fn(),sign:vi.fn(),prepare:vi.fn(),create:vi.fn()}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:mocks.guard}));
vi.mock('../../apps/web/lib/session',()=>({getSession:mocks.session}));
vi.mock('../../apps/web/lib/auth',()=>({signDatabaseSessionToken:mocks.sign}));
vi.mock('../../apps/web/lib/studio-director',()=>({prepareProjectDirectorInput:mocks.prepare,createDirectorPlan:mocks.create}));
import {POST} from '../../apps/web/app/api/studio/director-plans/route';
const project='11111111-1111-4111-8111-111111111111';
const request=(body:unknown)=>new Request('http://localhost/director',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(null);mocks.session.mockResolvedValue({uid:'owner',r:['owner']});mocks.sign.mockReturnValue('signed-owner-context');});
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
