import {beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>db);
import {reviseBeat,reorderBeats} from '../../apps/web/lib/studio-director';
const latest={rid:'11111111-1111-4111-8111-111111111111',revision_no:1,title:'private',description:'',content:{beats:[{narration:'first'},{narration:'second'}]}};
beforeEach(()=>{vi.resetAllMocks();db.queryRows.mockResolvedValueOnce([latest]).mockResolvedValue([]);db.queryValue.mockResolvedValue('2');});
for(const [name,invoke] of [['narration',()=>reviseBeat('work',1,[{index:0,patch:{narration:'changed'}}])],['order',()=>reorderBeats('work',1,[1,0])]] as const){
 it(`${name} reports conflict if another writer inserts the next revision after the read`,async()=>{
  expect(await invoke()).toEqual({revisionId:'',revisionNo:2,conflict:true});
  expect(db.run).not.toHaveBeenCalled();
 });
 it(`${name} does not confirm a save when the actual insert fails`,async()=>{
  db.queryRows.mockReset().mockResolvedValueOnce([latest]).mockRejectedValueOnce(Error('storage unavailable'));
  await expect(invoke()).rejects.toThrow('storage unavailable');
 });
}
