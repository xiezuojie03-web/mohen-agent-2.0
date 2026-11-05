import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({stages:vi.fn(),legacy:vi.fn()}));
vi.mock('../../apps/web/app/api/studio/works/[id]/stages/route',()=>({GET:m.stages}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:async()=>null}));
vi.mock('../../apps/web/lib/publication',()=>({getWorkStageStatus:async()=>({researched:true}),getLatestRevision:async()=>[]}));
import {GET} from '../../apps/web/app/api/studio/works/[id]/status/route';
const context={params:Promise.resolve({id:'work'})};
beforeEach(()=>{vi.clearAllMocks();m.stages.mockResolvedValue(new Response(JSON.stringify({ok:true,stages:{delegated:true,researched:false,directed:false,revisioned:true},artifacts:{revisions:[{revision_id:'saved',revision_no:1,status:'draft',content:'PRIVATE_BODY'}]},gaps:['CURRENT_RESEARCH_RECEIPT_OR_MATERIALS_UNAVAILABLE']}),{headers:{'cache-control':'no-store'}}));});
it('uses the same current evidence as stages rather than treating an old done task as researched',async()=>{
 const response=await GET(new Request('http://test/status'),context),body=await response.json();
 expect(body.stages.researched).toBe(false);expect(body.revision).toEqual({revision_id:'saved',revision_no:1,status:'draft'});
 expect(JSON.stringify(body)).not.toContain('PRIVATE_BODY');expect(response.headers.get('cache-control')).toBe('no-store');
});
it.each([401,403,503])('preserves current private stage refusal %s',async status=>{
 m.stages.mockResolvedValue(new Response(JSON.stringify({ok:false,reason:'blocked'}),{status}));
 const response=await GET(new Request('http://test/status'),context);
 expect(response.status).toBe(status);expect(response.headers.get('cache-control')).toBe('no-store');
});
