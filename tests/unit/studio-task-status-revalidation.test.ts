import {expect,it,vi} from 'vitest';
const d=vi.hoisted(()=>({queryRows:vi.fn(),retrieve:vi.fn()}));
vi.mock('@mohen/data-access',()=>({queryRows:d.queryRows,queryValue:vi.fn(),run:vi.fn()}));
vi.mock('../../apps/web/lib/mohen-agent/research',()=>({runResearch:vi.fn(),resolveTopic:vi.fn()}));
vi.mock('../../apps/web/lib/studio-production',()=>({triggerProduction:vi.fn(),getProductionBlocker:vi.fn()}));
vi.mock('../../apps/web/lib/studio-assets',()=>({studioAssetStore:vi.fn()}));
vi.mock('../../apps/web/lib/mohen-agent/retrieve',()=>({retrieveMaterials:d.retrieve}));
vi.mock('../../apps/web/lib/kad1-policy.mjs',()=>({consumerContext:()=>({purpose:{},scope:{requested_action:'read'}})}));
import {getTaskStatus} from '../../apps/web/lib/studio-research';
it.each([false,true])('revalidates a real persisted checkpoint, JSON string=%s',async encoded=>{
 const checkpoint={production:{run_id:'kept'},budgetSpent:3,decision:{materials:[{id:'withdrawn',kind:'evidence',snippet:'REVOKED_SECRET',sourceRef:'source'}],answer:'REVOKED_ANSWER'}};
 d.queryRows.mockResolvedValue([{task_id:'task',status:'done',checkpoint:encoded?JSON.stringify(checkpoint):checkpoint}]);
 d.retrieve.mockResolvedValue({materials:[],degraded:false});
 const task=await getTaskStatus('task');
 expect(task?.status).toBe('done');expect(JSON.stringify(task)).not.toContain('REVOKED_SECRET');expect(JSON.stringify(task)).not.toContain('REVOKED_ANSWER');
 const cp=typeof task?.checkpoint==='string'?JSON.parse(task.checkpoint):task?.checkpoint;
 expect(cp).toMatchObject({production:{run_id:'kept'},budgetSpent:3,materialRead:{state:'HOLD',reason:'MATERIAL_REVOKED_OR_CHANGED'}});
});
