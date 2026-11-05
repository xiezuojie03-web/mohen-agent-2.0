import {createHash} from "node:crypto";
import type {Material} from "@mohen/agent-runtime";
import {
  createPrivateOriginalRepository,createPrivateTextReadingRepository,getNodePgPool,
} from "@mohen/data-access";
import {studioAssetStore} from "./studio-assets";

type Obj=Record<string,unknown>;
const ALLOWED_KINDS=new Set([
  "source_anchor","reading_note","evidence_note","spacetime_candidate",
  "relation_hypothesis","humanistic_insight","research_collection","citation_snapshot",
]);
function object(value:unknown):Obj {
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Obj:{};
}
function text(value:unknown,max=1200):string {
  return typeof value==="string"?value.trim().slice(0,max):"";
}
function uuidFrom(seed:string):string {
  const chars=createHash("sha256").update(seed).digest("hex").slice(0,32).split("");
  chars[12]="5";chars[16]=((parseInt(chars[16],16)&3)|8).toString(16);
  const hex=chars.join("");
  return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
}
function kindForAsset(kind:string):Material["kind"] {
  if(kind==="spacetime_candidate")return "event";
  if(kind==="relation_hypothesis")return "relation";
  if(kind==="humanistic_insight")return "present";
  return "evidence";
}
function assetSnippet(kind:string,payload:Obj):string {
  const keys:Record<string,string[]> = {
    source_anchor:["title","file_name","description","source_title"],
    reading_note:["literal_reading","snippet","summary","interpretation"],
    evidence_note:["literal_reading","quote","text","summary","research_proposition"],
    spacetime_candidate:["period_original","place_original","summary","description"],
    relation_hypothesis:["subject","predicate","object","summary"],
    humanistic_insight:["present_connection","comparison_basis","summary","competing_explanations"],
    research_collection:["title","summary","description"],
    citation_snapshot:["source_title","title","qualification_snapshot","summary"],
  };
  const parts=(keys[kind]??["title","summary","text"]).map(k=>text(payload[k],450)).filter(Boolean);
  return parts.join("；").slice(0,1200)||"项目候选资产仅提供结构与引用，尚未独立验证。";
}
function candidateMaterial(id:string,kind:string,title:string,snippet:string,sourceRef:string):Material {
  return {id,kind:kindForAsset(kind),entityIds:[],snippet,sourceRef:title+" · "+sourceRef,year:null,score:0.45,
    matchScore:0,epistemic:"RESEARCH_LEAD"};
}
function safeRef(value:unknown):string {
  return typeof value==="string"&&/^[a-f0-9-]{36}$/i.test(value)?value:"";
}

export interface StudioResearchReadResult {
  snapshot:Obj;
  materials:Material[];
  gaps:string[];
  externalProcessingAllowed:false;
}

/** ST-02: read the current Owner project, private L0/L1 and byte-verified L2 links,
 * plus private Studio L3/L4 candidates. Formal L5 remains on the existing qualified
 * read-model path. This service never selects raw source tables or exposes storage keys.
 */
export async function readStudioResearchProject(projectId:string,sessionToken:string):Promise<StudioResearchReadResult> {
  const store=studioAssetStore();
  const projects=await store.listProjects(sessionToken);
  const project=projects.find(p=>p.project_id===projectId&&p.lifecycle_status==="ACTIVE");
  if(!project)throw new Error("STUDIO_PROJECT_NOT_FOUND");
  const [assets,originals]=await Promise.all([
    store.listAssets(projectId,sessionToken,{excludeGeneratedReadingNotes:true}),
    createPrivateOriginalRepository(getNodePgPool()).listForProject(projectId,sessionToken),
  ]);
  const readingRepository=createPrivateTextReadingRepository(getNodePgPool());
  const assetMaterials:Material[]=[];
  const readingMaterials:Material[]=[];
  const gaps:string[]=[];
  let remainingReadUnits=50;
  let readingsTruncated=false;
  const assetRefs:Obj[]=[];
  const originalRefs:Obj[]=[];
  const readingNoteRefs:Obj[]=[];
  const readUnitRefs:Obj[]=[];
  const evidenceRefs:Obj[]=[];
  let readUnitCount=0,evidenceCount=0;

  for(const asset of assets as unknown as Obj[]) {
    const assetId=safeRef(asset.asset_id),revisionId=safeRef(asset.revision_id);
    const kind=text(asset.asset_kind,80),access=text(asset.access_state,40),state=text(asset.content_state,40);
    if(!assetId||!revisionId||!ALLOWED_KINDS.has(kind)||access==="REVOKED"||state==="ARCHIVED")continue;
    const payload=object(asset.payload);
    // Generated L1 notes are represented by the currently revalidated reading
    // context below. Re-reading them as independent assets would duplicate
    // material on replay and could revive a stale source after withdrawal.
    if(kind==="reading_note"&&payload.schema==="mohen.studio-reading-note.v1")continue;
    assetRefs.push({asset_id:assetId,revision_id:revisionId,asset_kind:kind,
      revision_no:Number(asset.revision_no)||null,epistemic_class:text(asset.epistemic_class,60),
      content_state:state,access_state:access,validation_status:text(object(asset.validation).status,60)});
    const snippet=assetSnippet(kind,payload);
    const title=text(payload.title,180)||text(payload.file_name,180)||kind;
    const material=candidateMaterial("studio:"+assetId+"@"+revisionId,kind,title,snippet,
      "Studio project asset "+assetId+"@"+revisionId+" ("+kind+")");
    assetMaterials.push(material);
  }

  for(const original of originals) {
    const originalId=safeRef(original.original_id);
    if(!originalId||original.state!=="STORED_VERIFIED")continue;
    originalRefs.push({original_id:originalId,project_id:projectId,asset_id:original.asset_id,
      asset_revision_id:original.asset_revision_id,file_name:original.file_name,content_type:original.content_type,
      byte_size:original.byte_size,sha256:original.sha256,rights_status:"DECLARED_UNVERIFIED"});
    const context=await readingRepository.listByOriginal(originalId,sessionToken);
    if(context.project_id!==projectId||context.asset_revision_id!==original.asset_revision_id||
      context.sha256!==original.sha256||context.direct_storage_reference_exposed!==false)
      throw new Error("STUDIO_RESEARCH_READ_BINDING_INVALID");
    const allReadings=Array.isArray(context.readings)?context.readings:[];
    if(allReadings.length>remainingReadUnits)readingsTruncated=true;
    const readings=allReadings.slice(0,remainingReadUnits);
    for(const readingValue of readings) {
      remainingReadUnits--;
      const reading=object(readingValue);
      const readUnitId=safeRef(reading.read_unit_id),readRunId=safeRef(reading.read_run_id);
      const sourceVersionId=safeRef(reading.source_version_id),rawItemId=safeRef(reading.raw_item_id);
      if(!readUnitId||!readRunId||!sourceVersionId||!rawItemId)throw new Error("STUDIO_RESEARCH_READ_BINDING_INVALID");
      const locator=object(reading.locator),uncertainty=object(reading.uncertainty);
      const evidence=Array.isArray(reading.evidence)?reading.evidence.map(object):[];
      const verifiedEvidence=evidence.filter(e=>safeRef(e.evidence_id)&&safeRef(e.link_id)&&
        e.qualification==="UNASSESSED"&&typeof e.literal_reading==="string");
      const evidenceIds=verifiedEvidence.map(e=>safeRef(e.evidence_id));
      const payload={
        schema:"mohen.studio-reading-note.v1",original_id:originalId,
        source_read_run_id:readRunId,source_read_unit_id:readUnitId,
        source_version_id:sourceVersionId,raw_item_id:rawItemId,
        artifact_revision:text(reading.artifact_revision,100),
        method_code:text(reading.method_code,80),kind:text(reading.kind,80),
        locator_schema:text(reading.locator_schema,80),locator,
        locator_hash:text(reading.locator_hash,128),uncertainty,
        evidence_refs:verifiedEvidence.map(e=>({evidence_id:e.evidence_id,link_id:e.link_id,
          link_version:e.link_version,key_version:e.key_version,qualification:"UNASSESSED"})),
        interpretation:"not_performed",qualification:"UNASSESSED",
      };
      const note=await store.saveRevision({
        projectId,assetId:uuidFrom("mohen.studio.reading-note.v1:"+readUnitId),
        kind:"reading_note",expectedRevisionId:null,idempotencyKey:"st02:reading-note:"+readUnitId,
        payload,sourceRefs:[
          {type:"private_original",id:originalId,revision:original.asset_revision_id},
          {type:"source_read_unit",id:readUnitId,revision:text(reading.artifact_revision,100)||readRunId},
        ],
        dependencyRefs:[
          {type:"source_version",id:sourceVersionId,revision:text(reading.source_checksum_sha256,128)},
          {type:"raw_item",id:rawItemId,revision:text(reading.raw_checksum_sha256,128)},
        ],
      },sessionToken);
      readingNoteRefs.push({asset_id:note.asset_id,revision_id:note.revision_id,read_unit_id:readUnitId});
      readUnitRefs.push({read_unit_id:readUnitId,read_run_id:readRunId,source_version_id:sourceVersionId,
        raw_item_id:rawItemId,locator_hash:text(reading.locator_hash,128)});
      readUnitCount++;

      if(verifiedEvidence.length) {
        for(const item of verifiedEvidence) {
          const evidenceId=safeRef(item.evidence_id),linkId=safeRef(item.link_id);
          const literal=text(item.literal_reading,1200);
          if(!literal)continue;
          const material=candidateMaterial("private-evidence:"+evidenceId,"evidence",
            "私有原件证据候选 · "+original.file_name,literal,
            "Private original "+originalId+" / read unit "+readUnitId+" / evidence "+evidenceId);
          readingMaterials.push(material);
          evidenceRefs.push({evidence_id:evidenceId,link_id:linkId,read_unit_id:readUnitId,
            source_version_id:sourceVersionId,qualification:"UNASSESSED"});
          evidenceCount++;
        }
      } else {
        const material=candidateMaterial("private-read-unit:"+readUnitId,"reading_note",
          "L1阅读定位 · "+original.file_name,
          "已绑定原件的L1定位记录："+JSON.stringify(locator).slice(0,900)+
            "；尚无经验证的L2逐字证据链接，不能据此形成事实判断。",
          "Private original "+originalId+"@"+original.asset_revision_id+" / read unit "+readUnitId);
        readingMaterials.push(material);
      }
    }
  }

  const materials=[...readingMaterials,...assetMaterials].slice(0,24);
  const privateMaterialIds=materials.map(m=>m.id);
  const materialsTruncated=readingMaterials.length+assetMaterials.length>materials.length;
  const candidateL3=assetRefs.filter(a=>["spacetime_candidate","relation_hypothesis"].includes(String(a.asset_kind))).length;
  const candidateL4=assetRefs.filter(a=>a.asset_kind==="humanistic_insight").length;
  if(originalRefs.length===0)gaps.push("当前项目没有已核验私有原件；不能把原件元数据缺席解释为史料不存在。");
  if(originalRefs.length>0&&readUnitCount===0)gaps.push("项目原件尚无可读取的L1阅读单元；原件元数据不等于已阅读内容。");
  if(readUnitCount>0&&evidenceCount===0)gaps.push("当前L1记录没有经字节核验的L2证据链接；只有定位，不得作为事实结论。");
  if(candidateL3===0)gaps.push("项目尚无时空候选或关系假设资产。");
  if(candidateL4===0)gaps.push("项目尚无人文洞察候选资产。");
  gaps.push("L5仅由既有read-model-repository按当前G5资格/consumer/purpose/scope读取；本私有项目读取不绕过或复制L5。");

  const layerCoverage={
    L0:{private_originals:originalRefs.length,status:"OWNER_PROJECT_SCOPED"},
    L1:{read_units:readUnitCount,reading_notes:readingNoteRefs.length,status:"UNASSESSED_CANDIDATE"},
    L2:{verified_links:evidenceCount,status:"UNASSESSED_CANDIDATE"},
    L3:{project_candidates:candidateL3,status:"PROJECT_CANDIDATES_ONLY"},
    L4:{project_candidates:candidateL4,status:"PROJECT_CANDIDATES_ONLY"},
    L5:{status:"SEPARATE_CURRENT_G5_QUALIFIED_READ_MODEL"},
  };
  const stableSnapshot={
    schema:"mohen.studio-research-read-snapshot.v1",project_id:projectId,
    project_scope:object(project.research_scope),asset_refs:assetRefs,original_refs:originalRefs,
    reading_note_refs:readingNoteRefs,read_unit_refs:readUnitRefs,evidence_refs:evidenceRefs,
    layer_coverage:layerCoverage,gaps,private_material_ids:privateMaterialIds,
    external_processing_allowed:false,storage_key_exposed:false,source_table_direct_select:false,
  };
  const snapshotHash=createHash("sha256").update(JSON.stringify(stableSnapshot)).digest("hex");
  return {
    snapshot:{...stableSnapshot,snapshot_hash:snapshotHash,captured_at:new Date().toISOString(),
      assets_truncated:assets.length>=100,originals_truncated:originals.length>=20,
      readings_truncated:readingsTruncated,materials_truncated:materialsTruncated},
    materials,gaps,externalProcessingAllowed:false,
  };
}
