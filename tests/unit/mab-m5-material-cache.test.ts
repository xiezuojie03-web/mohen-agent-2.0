import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({retrieve:vi.fn(),research:vi.fn(),getCached:vi.fn(),setCache:vi.fn()}));
vi.mock('../../apps/web/lib/mohen-agent/retrieve',()=>({retrieveMaterials:mocks.retrieve,MAX_LIMIT:24}));
vi.mock('../../apps/web/lib/mohen-agent/guard',()=>({isRateLimited:()=>false,getClientSource:()=> 'synthetic',getCached:mocks.getCached,setCache:mocks.setCache}));
vi.mock('../../apps/web/lib/mohen-agent/research',()=>({runResearch:mocks.research,resolveTopic:()=> 'jinze'}));
import {POST} from '../../apps/web/app/api/mohen/materials/route';
import {POST as ask} from '../../apps/web/app/api/mohen/ask/route';
import {ResearchPrerequisiteHold} from '../../apps/web/lib/mohen-agent/research-prerequisites';
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT','');mocks.getCached.mockReturnValue({ok:true,materials:[{snippet:'withdrawn secret'}]});mocks.retrieve.mockResolvedValue({materials:[],degraded:true});});
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
it('materials uses only the server Agent context and ignores caller self-grants',async()=>{
 const context={purpose:{namespace:'G5',code:'server-only',version:'1'},scope:{project:'server-project',requested_action:'read'}};
 vi.stubEnv('MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT',JSON.stringify({consumer:'agent',...context}));
 await POST(new Request('http://localhost/api/mohen/materials',{method:'POST',body:JSON.stringify({terms:['桥市'],qualification:{consumer:'agent',scope:{project:'attacker'}}})}));
 expect(mocks.retrieve).toHaveBeenCalledWith(['桥市'],12,{qualification:{consumer:'agent',...context}});
 vi.unstubAllEnvs();
});
it('does not use a server context for another rights operation',async()=>{
 vi.stubEnv('MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT',JSON.stringify({consumer:'agent',purpose:{namespace:'G5',code:'x',version:'1'},scope:{project:'p',requested_action:'download'}}));
 await POST(new Request('http://localhost/api/mohen/materials',{method:'POST',body:JSON.stringify({terms:['桥市']})}));
 expect(mocks.retrieve).toHaveBeenCalledWith(['桥市'],12,{qualification:undefined});
 vi.unstubAllEnvs();
});
it('an internal Agent context cannot enable the anonymous materials endpoint',async()=>{
 vi.stubEnv('MOHEN_G5_CONTEXTS',JSON.stringify({agent:{purpose:{namespace:'G5',code:'internal-research',version:'1'},scope:{project:'private-project',requested_action:'read'}}}));
 await POST(new Request('http://localhost/api/mohen/materials',{method:'POST',body:JSON.stringify({terms:['桥市']})}));
 expect(mocks.retrieve).toHaveBeenCalledWith(['桥市'],12,{qualification:undefined});
 vi.unstubAllEnvs();
});
it('immediate ask returns an explicit HOLD when no durable research execution can run',async()=>{
 mocks.research.mockRejectedValue(new ResearchPrerequisiteHold(['PERSISTENT_TOOL_LEDGER_REQUIRED']));
 const response=await ask(new Request('http://localhost/api/mohen/ask',{method:'POST',body:JSON.stringify({question:'运河来源'})}));
 expect(response.status).toBe(409);
 expect(await response.json()).toEqual({ok:false,status:'hold',reason:'research_prerequisites',missing_requirements:['PERSISTENT_TOOL_LEDGER_REQUIRED']});
 expect(response.headers.get('cache-control')).toContain('no-store');
});
