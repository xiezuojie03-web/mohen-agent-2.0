// M5: existing formal L0-L4 records, filtered by current *independent* Gate.
// This is a read adapter, not a parallel knowledge store or Gate signer.
// First-phase Studio ACL is Owner/Project only (KA lifecycle contract §15).
// Do not treat other projects' private records as "shared" merely because a
// service DB credential can SELECT them. Explicit cross-project sharing remains
// NOT_VERIFIED until its authorized ACL contract and index exist.
import { getNodePgPool, createAppTransaction, assertQualificationContext, type QualificationReadOptions } from "@mohen/data-access";
import type { Material } from "@mohen/agent-runtime";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type FormalLayer="L0"|"L1"|"L2"|"L3"|"L4";
export interface FormalQualifiedRef {layer:FormalLayer;gate:string;objectType:string;objectId:string;revision:string;}
export interface FormalQualifiedRead {
  refs:FormalQualifiedRef[];
  materials:Material[];
  degraded:boolean;
  projectQualifiedCoverage:"COMPLETE"|"PARTIAL"|"NOT_SEARCHED"|"UNAVAILABLE";
  sharedQualifiedCoverage:"NOT_VERIFIED";
  truncated:boolean;
  failureCode?:string;
}
// One narrow database function performs the exact current independent Gate,
// active signed-Owner and Project guard. Never GRANT raw formal tables to
// mohen_app_runtime; the app stays inside its existing signed transaction.
const SQL=`select layer,gate,object_type,object_id,revision,snippet,source_ref
 from studio.search_qualified_project_layers(
   $1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::text[],$7::integer)`;
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
      const qualified=await client.query(SQL,[
        projectId,purpose.namespace,purpose.code,purpose.version,
        JSON.stringify({...scope,project_id:projectId}),safeTerms,RESULT_LIMIT,
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
    const failureCode=error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)
      ? error.message : "FORMAL_READ_UNKNOWN";
    console.warn("[mohen/formal] 当前项目G0-G4资格检索不可用",{failureCode});
    return {...empty,degraded:true,projectQualifiedCoverage:"UNAVAILABLE",failureCode};
  }
}
