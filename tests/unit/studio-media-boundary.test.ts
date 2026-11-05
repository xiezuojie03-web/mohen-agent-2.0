import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({guard:vi.fn(),candidates:vi.fn()}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:mocks.guard}));
vi.mock('../../apps/web/lib/studio-director',()=>({selectMediaCandidates:mocks.candidates}));
import {POST} from '../../apps/web/app/api/studio/works/[id]/media-selection/route';
import {GET} from '../../apps/web/app/api/studio/works/[id]/media-candidates/route';
const context={params:Promise.resolve({id:'11111111-1111-4111-8111-111111111111'})};
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(null);mocks.candidates.mockResolvedValue({assets:[{title:'registered',status:'verified'}]});});
it('refuses selection without current rights and immutable revision authority; performs no candidate or mutation call',async()=>{
 const response=await POST(new Request('http://localhost/selection',{method:'POST',body:JSON.stringify({asset_id:'registered',status:'verified'})}),context);
 expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(await response.json()).toEqual({ok:false,state:'HOLD',reason:'media_selection_requires_current_rights_and_revision_binding'});
 expect(mocks.candidates).not.toHaveBeenCalled();
});
it('preserves authorization denial before selection or catalogue access',async()=>{
 mocks.guard.mockResolvedValue(new Response(JSON.stringify({ok:false,reason:'forbidden'}),{status:403}));
 expect((await POST(new Request('http://localhost/selection',{method:'POST'}),context)).status).toBe(403);
 expect((await GET(new Request('http://localhost/candidates'),context)).status).toBe(403);
 expect(mocks.candidates).not.toHaveBeenCalled();
});
it('labels registered catalogue entries as unselected candidates, never action rights',async()=>{
 const response=await GET(new Request('http://localhost/candidates'),context);
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(await response.json()).toMatchObject({ok:true,state:'REGISTERED_CANDIDATES',selection_state:'HOLD',reason:'media_selection_requires_current_rights_and_revision_binding',assets:[{title:'registered'}]});
});
it('makes catalogue storage failure explicit and private',async()=>{
 mocks.candidates.mockRejectedValue(Error('db failed'));
 const response=await GET(new Request('http://localhost/candidates'),context);
 expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(await response.json()).toEqual({ok:false,reason:'media_candidates_unavailable'});
});
