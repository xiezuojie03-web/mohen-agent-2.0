import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({retrieve:vi.fn(),research:vi.fn(),getCached:vi.fn(),setCache:vi.fn()}));
vi.mock('../../apps/web/lib/mohen-agent/retrieve',()=>({retrieveMaterials:mocks.retrieve,MAX_LIMIT:24}));
vi.mock('../../apps/web/lib/mohen-agent/guard',()=>({isRateLimited:()=>false,getClientSource:()=> 'synthetic',getCached:mocks.getCached,setCache:mocks.setCache}));
vi.mock('../../apps/web/lib/mohen-agent/research',()=>({runResearch:mocks.research,resolveTopic:()=> 'jinze'}));
import {POST} from '../../apps/web/app/api/mohen/materials/route';
import {POST as ask} from '../../apps/web/app/api/mohen/ask/route';
beforeEach(()=>{vi.resetAllMocks();mocks.getCached.mockReturnValue({ok:true,materials:[{snippet:'withdrawn secret'}]});mocks.retrieve.mockResolvedValue({materials:[],degraded:true});});
it('does not reuse material payload cached before a qualification was withdrawn',async()=>{
 const response=await POST(new Request('http://localhost/api/mohen/materials',{method:'POST',body:JSON.stringify({terms:['桥市']})}));
 expect(await response.json()).toEqual({ok:false,degraded:true,materials:[]});
 expect(mocks.getCached).not.toHaveBeenCalled();expect(mocks.setCache).not.toHaveBeenCalled();expect(mocks.retrieve).toHaveBeenCalledOnce();
 expect(response.headers.get('cache-control')).toContain('no-store');
});
it('does not disclose an answer cached from withdrawn materials',async()=>{
 mocks.research.mockResolvedValue({decision:{state:'HOLD'},degraded:true});
 const response=await ask(new Request('http://localhost/api/mohen/ask',{method:'POST',body:JSON.stringify({question:'桥市'})}));
 expect(await response.json()).toEqual({ok:true,degraded:true,decision:{state:'HOLD'}});
 expect(mocks.getCached).not.toHaveBeenCalled();expect(mocks.setCache).not.toHaveBeenCalled();expect(mocks.research).toHaveBeenCalledOnce();
 expect(response.headers.get('cache-control')).toContain('no-store');
});
