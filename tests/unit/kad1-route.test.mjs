import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({session:vi.fn(),queryRows:vi.fn()}));
vi.mock('../../apps/web/lib/session',()=>({getSession:state.session}));
vi.mock('@mohen/data-access',()=>({queryRows:state.queryRows}));
import {GET} from '../../apps/web/app/api/studio/works/[id]/revisions/[rev]/panels/[panel]/route';
const uid='11111111-1111-4111-8111-111111111111';
const params=(rev='2',panel='voiceover')=>({params:Promise.resolve({id:'22222222-2222-4222-8222-222222222222',rev,panel})});
beforeEach(()=>{vi.resetAllMocks();state.session.mockResolvedValue({uid,r:['creator']});state.queryRows.mockResolvedValue([]);});
it('refuses anonymous snapshot access before any database read',async()=>{
 state.session.mockResolvedValue(null);
 const response=await GET(new Request('https://test.invalid'),params());
 expect(response.status).toBe(401);expect(state.queryRows).not.toHaveBeenCalled();
});
it.each(['0','-1','1x','1.5','9999999999999999999'])('refuses malformed revision %s before reading',async rev=>{
 expect((await GET(new Request('https://test.invalid'),params(rev))).status).toBe(400);
 expect(state.queryRows).not.toHaveBeenCalled();
});
it.each(['native','psql'])('returns saved exact-revision content using %s JSON encoding',async encoding=>{
 const saved={panels:{voiceover:{full:'saved revision two'}}};
 state.queryRows.mockResolvedValue([{revision_id:'revision-two',content:encoding==='psql'?JSON.stringify(saved):saved}]);
 const response=await GET(new Request('https://test.invalid'),params());
 expect(response.status).toBe(200);
 expect(await response.json()).toEqual({ok:true,revision_id:'revision-two',panel:'voiceover',value:{full:'saved revision two'}});
 expect(state.queryRows.mock.calls[0][1]).toEqual({wid:'22222222-2222-4222-8222-222222222222',uid,rev:2});
});
it('does not synthesize a panel when no authorized revision is returned',async()=>{
 const response=await GET(new Request('https://test.invalid'),params());
 expect(response.status).toBe(404);expect(await response.json()).toMatchObject({reason:'not_found'});
});
it('reports unavailable snapshots instead of recreating a director plan or exposing object properties',async()=>{
 state.queryRows.mockResolvedValue([{revision_id:'revision-one',content:{plan:{angle:'draft'},panels:{}}}]);
 for(const panel of ['voiceover','__proto__']){
  const response=await GET(new Request('https://test.invalid'),params('1',panel));
  expect(response.status).toBe(404);expect(await response.json()).toMatchObject({reason:'panel_snapshot_unavailable'});
 }
});
