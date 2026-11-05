import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn(),summary:vi.fn(),research:vi.fn()}));
vi.mock('../../apps/web/lib/studio-research-read',()=>({readStudioResearchProject:mocks.read}));
vi.mock('../../apps/web/lib/read-model-bridge',()=>({readProductionRelationSummary:mocks.summary}));
vi.mock('../../apps/web/lib/mohen-agent/research',()=>({runResearch:mocks.research}));
import {generateDirectorPlans,identifyMotifs,generateBeats,suggestNarration,generateWorkPanels,generateInsightView} from '../../apps/web/lib/studio-creation';
import {prepareProjectDirectorInput} from '../../apps/web/lib/studio-director';
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('MOHEN_LLM_API_KEY','synthetic-key-is-not-consent');vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}')));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('does not treat display rights or API keys as external processing/spend authority',async()=>{
 mocks.summary.mockResolvedValue({available:true,stories:[{statement:'private-ish'}],relations:[],evidence:[]});
 await generateDirectorPlans('brief');await identifyMotifs(['text'],'brief');
 await generateBeats({angle:'a',points:['p'],cover:'c'},['text']);await suggestNarration('private narration');
 await generateWorkPanels({angle:'a',points:['p'],cover:'c'},['text'],[]);await generateInsightView('question');
 expect(fetch).not.toHaveBeenCalled();expect(mocks.summary).not.toHaveBeenCalled();expect(mocks.research).not.toHaveBeenCalled();
});
it('binds private project materials to their exact read snapshot but holds external generation',async()=>{
 const snapshot={schema:'mohen.studio-research-read-snapshot.v1',project_id:'project',snapshot_hash:'hash',private_material_ids:['studio:asset@revision'],asset_refs:[{asset_id:'asset',revision_id:'revision'}],external_processing_allowed:false};
 mocks.read.mockResolvedValue({snapshot,materials:[{id:'studio:asset@revision',snippet:'PRIVATE TEXT',sourceRef:'private ref'}],gaps:['qualification pending'],externalProcessingAllowed:false});
 const result=await prepareProjectDirectorInput('project','signed-token');
 expect(mocks.read).toHaveBeenCalledWith('project','signed-token',{persistReadingNotes:false});
 expect(result).toMatchObject({state:'HOLD',reason:'external_processing_not_authorized',source_snapshot:snapshot,source_refs:['studio:asset@revision']});
 expect(result.material_snapshots).toEqual([{ref:'studio:asset@revision',epistemic:undefined,content_sha256:expect.stringMatching(/^[a-f0-9]{64}$/)}]);
 expect(JSON.stringify(result)).not.toContain('PRIVATE TEXT');expect(fetch).not.toHaveBeenCalled();
});
it('rejects a mismatched project or material snapshot before returning a binding',async()=>{
 mocks.read.mockResolvedValue({snapshot:{project_id:'other',snapshot_hash:'hash',private_material_ids:[]},materials:[],gaps:[],externalProcessingAllowed:false});
 await expect(prepareProjectDirectorInput('project','token')).rejects.toThrow('STUDIO_RESEARCH_READ_BINDING_INVALID');
 expect(fetch).not.toHaveBeenCalled();
});
it('does not turn a caller-supplied external flag into delegation authority',async()=>{
 mocks.read.mockResolvedValue({snapshot:{project_id:'project',snapshot_hash:'hash',private_material_ids:[],external_processing_allowed:true},materials:[],gaps:[],externalProcessingAllowed:true});
 expect(await prepareProjectDirectorInput('project','token')).toMatchObject({state:'HOLD',execution_authorized:false});
 expect(fetch).not.toHaveBeenCalled();
});
