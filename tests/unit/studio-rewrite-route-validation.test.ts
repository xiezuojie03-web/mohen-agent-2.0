import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({guard:vi.fn(),reviseBeat:vi.fn()}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:mocks.guard}));
vi.mock('../../apps/web/lib/studio-director',()=>({reviseBeat:mocks.reviseBeat}));
import {POST} from '../../apps/web/app/api/studio/works/[id]/rewrite-beat/route';
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(null);});
const context={params:Promise.resolve({id:'private'})};
const request=(body:unknown)=>new Request('http://localhost/rewrite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
it.each([null,'1',-1,1.2])('rejects invalid expected revision %s',async value=>{
 const response=await POST(request({expected_revision_no:value,beat_diff:[]}),context);
 expect(response.status).toBe(400);expect(mocks.reviseBeat).not.toHaveBeenCalled();
});
it('turns rejected patch into an actionable 400 without claiming a revision',async()=>{
 mocks.reviseBeat.mockRejectedValue(Error('invalid_beat_diff'));
 const response=await POST(request({expected_revision_no:1,beat_diff:[null]}),context);
 expect(response.status).toBe(400);expect(await response.json()).toEqual({ok:false,reason:'invalid_beat_diff'});
});
it('retains CAS conflict behavior',async()=>{
 mocks.reviseBeat.mockResolvedValue({conflict:true,revisionNo:3});
 const response=await POST(request({expected_revision_no:1,beat_diff:[{index:0,patch:{narration:'local'}}]}),context);
 expect(response.status).toBe(409);
});
