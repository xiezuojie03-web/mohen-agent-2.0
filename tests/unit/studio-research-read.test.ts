import {beforeEach,expect,it,vi} from "vitest";
const {listProjects,listAssets,saveRevision,listForProject,listByOriginal}=vi.hoisted(()=>({
 listProjects:vi.fn(),listAssets:vi.fn(),saveRevision:vi.fn(),listForProject:vi.fn(),listByOriginal:vi.fn()
}));
vi.mock("@mohen/data-access",()=>({
 getNodePgPool:()=>({connect:vi.fn()}),
 createPrivateOriginalRepository:()=>({listForProject}),
 createPrivateTextReadingRepository:()=>({listByOriginal}),
}));
vi.mock("../../apps/web/lib/studio-assets",()=>({
 studioAssetStore:()=>({listProjects,listAssets,saveRevision})
}));
import {readStudioResearchProject} from "../../apps/web/lib/studio-research-read";

const projectId="11111111-1111-4111-8111-111111111111";
const originalId="22222222-2222-4222-8222-222222222222";
const readUnitId="33333333-3333-4333-8333-333333333333";
const readRunId="44444444-4444-4444-8444-444444444444";
const sourceVersionId="55555555-5555-4555-8555-555555555555";
const rawItemId="66666666-6666-4666-8666-666666666666";
const evidenceId="77777777-7777-4777-8777-777777777777";
const linkId="88888888-8888-4888-8888-888888888888";
const revisionId="99999999-9999-4999-8999-999999999999";
const token="signed-project-owner";

beforeEach(()=>{
 vi.clearAllMocks();
 listProjects.mockResolvedValue([{project_id:projectId,project_title:"测试项目",research_scope:{period:"TEST_ONLY"},lifecycle_status:"ACTIVE"}]);
 listAssets.mockResolvedValue([
  {asset_id:revisionId,revision_id:linkId,asset_kind:"humanistic_insight",revision_no:1,
   epistemic_class:"editorial",content_state:"WORKING",access_state:"RESTRICTED",
   validation:{status:"UNASSESSED"},payload:{present_connection:"古代水路与今天的城市生活"},rights_by_action:{external_processing:"unknown"}},
  {asset_id:originalId,revision_id:revisionId,asset_kind:"consented_feedback",revision_no:1,
   content_state:"WORKING",access_state:"REVOKED",payload:{text:"withdrawn"}},
  {asset_id:linkId,revision_id:revisionId,asset_kind:"research_brief",revision_no:1,
   content_state:"WORKING",access_state:"RESTRICTED",payload:{question:"not a source"}},
 ]);
 listForProject.mockResolvedValue([{original_id:originalId,project_id:projectId,asset_id:originalId,
  asset_revision_id:revisionId,state:"STORED_VERIFIED",sha256:"a".repeat(64),byte_size:32,
  file_name:"运河摘录.txt",content_type:"text/plain"}]);
 listByOriginal.mockResolvedValue({schema:"mohen.private-reading-context.v1",original_id:originalId,
  project_id:projectId,asset_id:originalId,asset_revision_id:revisionId,file_name:"运河摘录.txt",
  content_type:"text/plain",byte_size:32,sha256:"a".repeat(64),original_state:"STORED_VERIFIED",
  readings:[{layer:"L1",qualification:"UNASSESSED",read_run_id:readRunId,read_unit_id:readUnitId,
   artifact_revision:"b".repeat(64),source_id:revisionId,source_version_id:sourceVersionId,
   source_checksum_sha256:"a".repeat(64),raw_item_id:rawItemId,raw_checksum_sha256:"a".repeat(64),
   method_code:"C01",kind:"paragraph",locator_schema:"utf8_byte_range/v1",
   locator:{kind:"utf8_byte_range/v1",start_byte:0,end_byte:12,raw_sha256:"a".repeat(64)},
   locator_hash:"c".repeat(64),uncertainty:{interpretation:"not_performed"},
   evidence:[{layer:"L2",qualification:"UNASSESSED",link_id:linkId,evidence_id:evidenceId,
    literal_reading:"河边形成集市，后续仍需核对原件",link_version:"mab.private-read-bridge.v1",key_version:"test-v1"}]}],
  readings_limit:50,direct_storage_reference_exposed:false});
 saveRevision.mockImplementation(async input=>({asset_id:input.assetId,revision_id:revisionId,revision_no:1}));
});

it("composes Owner project L0-L2 and candidate L3/L4 context, persists an idempotent reading_note and marks all private materials as leads",async()=>{
 const result=await readStudioResearchProject(projectId,token);
 expect(listProjects).toHaveBeenCalledWith(token);
 expect(listAssets).toHaveBeenCalledWith(projectId,token,{excludeGeneratedReadingNotes:true});
 expect(listForProject).toHaveBeenCalledWith(projectId,token);
 expect(listByOriginal).toHaveBeenCalledWith(originalId,token);
 expect(saveRevision).toHaveBeenCalledOnce();
 const input=saveRevision.mock.calls[0][0];
 expect(input).toMatchObject({projectId,kind:"reading_note",expectedRevisionId:null,
  idempotencyKey:"st02:reading-note:"+readUnitId});
 expect(input.payload).toMatchObject({schema:"mohen.studio-reading-note.v1",
  original_id:originalId,source_read_unit_id:readUnitId,qualification:"UNASSESSED",
  interpretation:"not_performed"});
 expect(JSON.stringify(input)).not.toContain("private-bucket");
 expect(result.snapshot.layer_coverage).toMatchObject({
  L0:{private_originals:1},L1:{read_units:1,reading_notes:1},L2:{verified_links:1},
  L3:{project_candidates:0},L4:{project_candidates:1},
  L5:{status:"SEPARATE_CURRENT_G5_QUALIFIED_READ_MODEL"}
 });
 expect(result.snapshot.storage_key_exposed).toBe(false);
 expect(result.snapshot.source_table_direct_select).toBe(false);
 expect(result.snapshot.asset_refs.some((x:Record<string,unknown>)=>x.asset_kind==="consented_feedback")).toBe(false);
 expect(result.snapshot.asset_refs.some((x:Record<string,unknown>)=>x.asset_kind==="research_brief")).toBe(false);
 expect(result.materials.length).toBe(2);
 expect(result.materials.every(x=>x.epistemic==="RESEARCH_LEAD")).toBe(true);
 expect(result.materials[0].snippet).toContain("河边形成集市");
 expect(result.externalProcessingAllowed).toBe(false);
});

it("fails closed when the project is not owned or active",async()=>{
 listProjects.mockResolvedValue([]);
 await expect(readStudioResearchProject(projectId,token)).rejects.toThrow("STUDIO_PROJECT_NOT_FOUND");
 expect(listAssets).not.toHaveBeenCalled();expect(listForProject).not.toHaveBeenCalled();
});

it("rejects an archived project before reading or persisting its materials",async()=>{
 listProjects.mockResolvedValue([{project_id:projectId,lifecycle_status:"ARCHIVED"}]);
 await expect(readStudioResearchProject(projectId,token)).rejects.toThrow("STUDIO_PROJECT_NOT_FOUND");
 expect(listAssets).not.toHaveBeenCalled();expect(saveRevision).not.toHaveBeenCalled();
});

it("does not exceed the project-wide reading or returned material budget",async()=>{
 const context=await listByOriginal();
 context.readings=Array.from({length:51},(_,i)=>({...context.readings[0],read_unit_id:
  i.toString(16).padStart(8,'0')+'-3333-4333-8333-333333333333'}));
 listByOriginal.mockResolvedValue(context);
 const result=await readStudioResearchProject(projectId,token);
 expect(saveRevision).toHaveBeenCalledTimes(50);
 expect(result.materials).toHaveLength(24);
 expect(result.snapshot.private_material_ids).toEqual(result.materials.map(m=>m.id));
 expect(result.snapshot.readings_truncated).toBe(true);expect(result.snapshot.materials_truncated).toBe(true);
 expect(result.materials.every(m=>Array.isArray(m.entityIds))).toBe(true);
});

it("fails closed if a private reading snapshot no longer matches its original revision",async()=>{
 listByOriginal.mockResolvedValueOnce({original_id:originalId,project_id:projectId,
  asset_revision_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",sha256:"a".repeat(64),
  readings:[],direct_storage_reference_exposed:false});
 await expect(readStudioResearchProject(projectId,token)).rejects.toThrow("STUDIO_RESEARCH_READ_BINDING_INVALID");
 expect(saveRevision).not.toHaveBeenCalled();
});

it("replays the same original and L1 context without duplicating generated notes in the snapshot",async()=>{
 const first=await readStudioResearchProject(projectId,token);
 const saved=saveRevision.mock.calls[0][0],assets=await listAssets();
 listAssets.mockResolvedValue([...assets,{asset_id:saved.assetId,revision_id:revisionId,asset_kind:'reading_note',
  revision_no:1,content_state:'WORKING',access_state:'RESTRICTED',payload:saved.payload}]);
 const replay=await readStudioResearchProject(projectId,token);
 expect(replay.snapshot.snapshot_hash).toBe(first.snapshot.snapshot_hash);
 expect(replay.snapshot.asset_refs).toEqual(first.snapshot.asset_refs);
 expect(replay.materials).toEqual(first.materials);
 expect(replay.snapshot.reading_note_refs).toEqual(first.snapshot.reading_note_refs);
});
