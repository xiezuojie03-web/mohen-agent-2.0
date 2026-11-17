import {afterEach,expect,it,vi} from 'vitest';
import {runResearch} from '../../apps/web/lib/mohen-agent/research';
afterEach(()=>vi.unstubAllEnvs());
it('holds before the first tool without provider, qualification or ledger and leaves source acquisition to D00',async()=>{
 for(const name of ['DEEPSEEK_API_KEY','SHANGHAI_LIBRARY_KEY','SHANGHAI_LIBRARY_API_KEY','MOHEN_LLM_BASE_URL','MOHEN_LLM_API_KEY','MOHEN_G5_CONTEXTS'])vi.stubEnv(name,'');
 await expect(runResearch('研究隋唐运河与江南水路的连接，保留来源和不确定性','generic')).rejects.toMatchObject({
  message:'RESEARCH_PREREQUISITES_HOLD',missingRequirements:['REAL_PROVIDER_UNAVAILABLE','AGENT_QUALIFICATION_CONTEXT_REQUIRED','PERSISTENT_TOOL_LEDGER_REQUIRED'],
 });
});
