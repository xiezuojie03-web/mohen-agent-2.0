import {expect,it,vi} from 'vitest';
const d=vi.hoisted(()=>({retrieve:vi.fn(),read:vi.fn(),context:vi.fn()}));
vi.mock('../../apps/web/lib/mohen-agent/retrieve',()=>({retrieveMaterials:d.retrieve}));
vi.mock('../../apps/web/lib/studio-research-read',()=>({readStudioResearchProject:d.read}));
vi.mock('../../apps/web/lib/kad1-policy.mjs',()=>({consumerContext:d.context}));
import {currentTaskCheckpoint} from '../../apps/web/lib/studio-task-material-read';
const material={id:'id',snippet:'private quotation',kind:'evidence',sourceRef:'source'};
it('fails closed on revoked formal material while retaining recovery/production wire',async()=>{
 d.context.mockReturnValue({purpose:{},scope:{requested_action:'read'}});
 d.retrieve.mockResolvedValue({materials:[],degraded:false});
 const cp=await currentTaskCheckpoint({decision:{materials:[material],answer:'old conclusion'},partial_result:{decision:{materials:[material]}},production:{run_id:'run'},budgetSpent:4},'token');
 expect(JSON.stringify(cp)).not.toContain('private quotation');expect(JSON.stringify(cp)).not.toContain('old conclusion');
 expect(cp).toMatchObject({production:{run_id:'run'},budgetSpent:4,materialRead:{state:'HOLD'}});
});
it('reuses current qualified retrieval for an unchanged material',async()=>{
 d.context.mockReturnValue({purpose:{},scope:{requested_action:'read'}});d.retrieve.mockResolvedValue({materials:[material],degraded:false});
 expect(await currentTaskCheckpoint({decision:{materials:[material]}},'token')).toMatchObject({decision:{materials:[material]},materialRead:{state:'CURRENT'}});
});
it('does not revive a private revision after project or source revocation',async()=>{
 d.read.mockResolvedValue({materials:[]});
 const cp=await currentTaskCheckpoint({studio:{project_id:'project'},decision:{materials:[{...material,id:'studio:asset@rev'}]}},'token');
 expect(cp.decision).toBeNull();expect(d.read).toHaveBeenCalledWith('project','token',{persistReadingNotes:false});
});
it('rejects leads and nested partial results without a current authority',async()=>{
 const cp=await currentTaskCheckpoint({researchLeads:[material],partial_result:{decision:{materials:[material]}}});
 expect(cp).toMatchObject({researchLeads:[],partial_result:null,materialRead:{state:'HOLD'}});
});
it('never leaks repository errors or returns stale prose on service failure',async()=>{
 d.read.mockRejectedValue(new Error('secret-storage-key'));
 const cp=await currentTaskCheckpoint({studio:{project_id:'project'},decision:{materials:[{...material,id:'private-evidence:old'}],answer:'old conclusion'}},'token');
 expect(JSON.stringify(cp)).not.toContain('secret-storage-key');expect(cp).toMatchObject({decision:null,materialRead:{state:'HOLD',reason:'CURRENT_MATERIAL_AUTHORITY_UNAVAILABLE'}});
});
