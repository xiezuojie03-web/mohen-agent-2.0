// M5: existing formal L0-L4 records, filtered by current *independent* Gate.
// This is a read adapter, not a parallel knowledge store or Gate signer.
// First-phase Studio ACL is Owner/Project only (KA lifecycle contract §15).
// Do not treat other projects' private records as "shared" merely because a
// service DB credential can SELECT them. Explicit cross-project sharing remains
// NOT_VERIFIED until its authorized ACL contract and index exist.
import { getNodePgPool, createAppTransaction, assertQualificationContext, type QualificationReadOptions } from "@mohen/data-access";
import type { Material } from "@mohen/agent-runtime";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type FormalLayer="L0"|"L1"|"L2"|"L3"|"L4";
export interface FormalQualifiedRef {layer:FormalLayer;gate:string;objectType:string;objectId:string;revision:string;}
export interface FormalQualifiedRead {
  refs:FormalQualifiedRef[];
  materials:Material[];
  degraded:boolean;
  projectQualifiedCoverage:"COMPLETE"|"PARTIAL"|"NOT_SEARCHED"|"UNAVAILABLE";
  sharedQualifiedCoverage:"NOT_VERIFIED";
  truncated:boolean;
}
// This SQL first checks the live Gate projection using exactly the same
// qualification_allows() and current_qualification_is_valid() path as L5.
// q.allowed_scope must contain the trusted server-derived project_id; a
// credential with bypass-RLS cannot authorize crossing this boundary.
const SQL=`
with qualified as (
 select q.gate_code,q.object_type,q.object_id,q.artifact_revision
 from control.qualification_current q
 join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
 where q.gate_code in ('G0','G1','G2','G3','G4')
   and q.object_type in ('source','read_run','material_evidence','relation_claim','finding')
   and q.gate_code=g.gate_code and q.object_type=g.object_type and q.object_id=g.object_id
   and q.artifact_revision=g.artifact_revision
   and control.qualification_allows(g.gate_audit_id,$1,$2,$3,$4,$5::jsonb)
), matched as (
 select 'L0'::text as layer,'G0'::text as gate,q.object_type,q.object_id::text as object_id,
  q.artifact_revision as revision,coalesce(s.title,'') as snippet,
  '正式来源目录 · 已有当前G0（用途限定，需再核原件读取权）'::text as source_ref
 from qualified q join source.sources s on s.source_id=q.object_id
 where q.gate_code='G0' and q.object_type='source'
 union all
 select 'L1','G1',q.object_type,q.object_id::text,q.artifact_revision,
  coalesce(s.title,'')||' · G1读取运行 '||left(rr.read_run_id::text,8),
  '原件读取定位 · 当前G1，非材料解释'
 from qualified q join source.read_runs rr on rr.read_run_id=q.object_id
 left join source.raw_items raw on raw.raw_item_id=rr.raw_item_id
 left join source.source_versions sv on sv.source_version_id=raw.source_version_id
 left join source.sources s on s.source_id=sv.source_id
 where q.gate_code='G1' and q.object_type='read_run'
 union all
 select 'L2','G2',q.object_type,q.object_id::text,q.artifact_revision,
  left(coalesce(nullif(e.literal_reading,''),nullif(e.research_proposition,''),''),620),
  'G2材料观察 · 不是直接历史事实'
 from qualified q join evidence.material_evidence e on e.evidence_id=q.object_id
 where q.gate_code='G2' and q.object_type='material_evidence'
 union all
 select 'L3','G3',q.object_type,q.object_id::text,q.artifact_revision,
  coalesce(subject.canonical_label,'历史实体')||' · '||w.relation_type||' · '||
    coalesce(target.canonical_label,left(w.object_value::text,160),'关系对象'),
  'G3关系主张 · 限定用途和现行资格'
 from qualified q join world.relation_claims w on w.relation_claim_id=q.object_id
 left join world.entities subject on subject.entity_id=w.subject_entity_id
 left join world.entities target on target.entity_id=w.object_entity_id
 where q.gate_code='G3' and q.object_type='relation_claim'
 union all
 select 'L4','G4',q.object_type,q.object_id::text,q.artifact_revision,
  left(coalesce(nullif(m.interpretive_statement,''),nullif(m.human_question,''),''),620),
  'G4人文解释 · 不等于原件事实'
 from qualified q join meaning.findings m on m.finding_id=q.object_id
 where q.gate_code='G4' and q.object_type='finding'
), terms as (
 select trim(t) as term from unnest(string_to_array($6,'|')) t
 where length(trim(t))>1
)
select layer,gate,object_type,object_id,revision,snippet,source_ref
from matched m where nullif(trim(m.snippet),'') is not null
 and exists(select 1 from terms where m.snippet ilike '%'||term||'%')
order by case layer when 'L4' then 1 when 'L3' then 2 when 'L2' then 3 when 'L1' then 4 else 5 end,
 object_id limit __LIMIT__
`;
const RESULT_LIMIT=24;
export async function retrieveQualifiedFormalProject(
  projectId:string,terms:string[],qualification:QualificationReadOptions,sessionToken:string,
):Promise<FormalQualifiedRead>{
  if(!UUID.test(projectId))throw new Error("STUDIO_PROJECT_REQUIRED");
  if(typeof sessionToken!=="string"||!sessionToken)throw new Error("STUDIO_IDENTITY_REQUIRED");
  const {consumer,purpose,scope}=assertQualificationContext(qualification);
  if(consumer!=="agent"||scope.requested_action!=="read"||
    (scope.project_id!==undefined&&scope.project_id!==projectId))
    throw new Error("FORMAL_PROJECT_READ_CONTEXT_REQUIRED");
  const safeTerms=terms.map(t=>t.trim()).filter(t=>t.length>1)
    .slice(0,8).map(t=>t.slice(0,90));
  const empty:FormalQualifiedRead={refs:[],materials:[],degraded:false,
    projectQualifiedCoverage:"NOT_SEARCHED",sharedQualifiedCoverage:"NOT_VERIFIED",truncated:false};
  if(!safeTerms.length)return empty;
  try{
    // Reuse the existing signed-app transaction (SET LOCAL mohen_app_runtime).
    // Verify the active Owner and Project on the SAME connection as Gate lookup;
    // generic DATABASE_URL alone is not proof of reading permission.
    const transaction=createAppTransaction(getNodePgPool(),"STUDIO_IDENTITY_REQUIRED");
    const rows=await transaction(sessionToken,async(client,actorId)=>{
      const owner=await client.query(
        "select 1 from studio.projects where project_id=$1::uuid and owner_user_id=$2::uuid and lifecycle_status='ACTIVE'",
        [projectId,actorId]);
      if(owner.rows.length!==1)throw new Error("STUDIO_PROJECT_NOT_FOUND");
      const qualified=await client.query(SQL.replace("__LIMIT__",String(RESULT_LIMIT+1)),[
        consumer,purpose.namespace,purpose.code,purpose.version,
        JSON.stringify({...scope,project_id:projectId}),safeTerms.join("|"),
      ]);
      return qualified.rows;
    });
    const truncated=rows.length>RESULT_LIMIT;
    const refRows=rows.slice(0,RESULT_LIMIT);
    const refs:FormalQualifiedRef[]=refRows.map(r=>({
      layer:r.layer as FormalLayer,gate:String(r.gate),objectType:String(r.object_type),
      objectId:String(r.object_id),revision:String(r.revision),
    }));
    const materials:Material[]=refRows.filter(r=>["L2","L3","L4"].includes(String(r.layer))).map(r=>({
      id:`formal:${r.layer}:${r.object_id}@${r.revision}`,
      kind:r.layer==="L3"?"relation":r.layer==="L4"?"present":"evidence",
      entityIds:[],snippet:String(r.snippet).slice(0,620),
      sourceRef:`${r.source_ref} · ${r.object_type}:${r.object_id}@${r.revision}`,
      epistemic:r.layer==="L3"?"FACT_EVIDENCED":"SUPPORTED_CANDIDATE",
      year:null,score:0.8,matchScore:1,
    }));
    return {refs,materials,degraded:false,projectQualifiedCoverage:truncated?"PARTIAL":"COMPLETE",
      sharedQualifiedCoverage:"NOT_VERIFIED",truncated};
  }catch(error){
    console.warn("[mohen/formal] 当前项目G0-G4资格检索不可用",
      error instanceof Error?error.name:"unknown");
    return {...empty,degraded:true,projectQualifiedCoverage:"UNAVAILABLE"};
  }
}
