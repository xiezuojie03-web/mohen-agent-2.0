import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({guard:vi.fn(),reviseBeat:vi.fn()}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:mocks.guard}));
vi.mock('../../apps/web/lib/studio-director',()=>({reviseBeat:mocks.reviseBeat}));
import {POST as revision} from '../../apps/web/app/api/studio/works/[id]/revisions/[rev]/route';
import {POST as narration} from '../../apps/web/app/api/studio/works/[id]/narration/route';
const req=(body:unknown)=>new Request('http://localhost/private-edit',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(null);});
for(const rev of ['0','-1','1.2','1e2','0x10',' 1','9007199254740992'])it('rejects noncanonical revision '+rev,async()=>{
 const result=await revision(req({beat_diff:[{index:0,patch:{narration:'valid'}}]}),{params:Promise.resolve({id:'work',rev})});
 expect(result.status).toBe(400);expect(mocks.reviseBeat).not.toHaveBeenCalled();
});
for(const [name,invoke] of [
 ['revision',()=>revision(req({beat_diff:[null]}),{params:Promise.resolve({id:'work',rev:'1'})})],
 ['narration',()=>narration(req({expected_revision_no:1,beat_index:4,narration:'text'}),{params:Promise.resolve({id:'work'})})],
] as const){
 it(name+' maps invalid patch to 400 without claiming a saved revision',async()=>{
  mocks.reviseBeat.mockRejectedValue(Error('invalid_beat_diff'));const result=await invoke();expect(result.status).toBe(400);expect(result.headers.get('cache-control')).toBe('no-store');expect(await result.json()).toEqual({ok:false,reason:'invalid_beat_diff'});
 });
 it(name+' preserves conflict status and private cache policy',async()=>{
  mocks.reviseBeat.mockResolvedValue({conflict:true,revisionNo:3});const result=await invoke();expect(result.status).toBe(409);expect(result.headers.get('cache-control')).toBe('no-store');
 });
}
for(const body of [{expected_revision_no:null,beat_index:null,narration:'text'},{expected_revision_no:'1',beat_index:0,narration:'text'},{expected_revision_no:1,beat_index:-1,narration:'text'},{expected_revision_no:1,beat_index:0,narration:' '}])it('rejects invalid narration args '+JSON.stringify(body),async()=>{
 const result=await narration(req(body),{params:Promise.resolve({id:'work'})});expect(result.status).toBe(400);expect(mocks.reviseBeat).not.toHaveBeenCalled();
});
