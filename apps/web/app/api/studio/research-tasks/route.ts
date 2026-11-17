import {NextResponse} from "next/server";
import {createResearchTask} from "../../../../lib/studio-research";
import {resolveTopic} from "../../../../lib/mohen-agent/research";
import {canAccess} from "../../../../lib/ownership";
import {getSession,isOperatorSession} from "../../../../lib/session";
import {signDatabaseSessionToken} from "../../../../lib/auth";
import {studioAssetStore} from "../../../../lib/studio-assets";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function privateJson(body:unknown,status=200){
  return NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
}

// API-067 / ST-01: task, project and immutable research_brief are one request lineage.
// The caller supplies only an idempotency UUID; project scope and actor are server-derived.
export async function POST(req:Request){
  const session=await getSession();
  if(!session)return privateJson({ok:false,reason:"login_required"},401);
  let prompt:unknown,topic:unknown,work_id:unknown,project_id:unknown,idempotency_key:unknown;
  try{
    const body=await req.json() as {prompt?:unknown;topic?:unknown;work_id?:unknown;project_id?:unknown;idempotency_key?:unknown};
    prompt=body.prompt;topic=body.topic;work_id=body.work_id;project_id=body.project_id;idempotency_key=body.idempotency_key;
  }catch{return privateJson({ok:false,reason:"bad_request"},400);}
  if(typeof prompt!=="string"||!prompt.trim())return privateJson({ok:false,reason:"prompt_required"},400);
  if(prompt.trim().length>2000)return privateJson({ok:false,reason:"prompt_too_long"},400);
  if(typeof project_id!=="string"||!uuid.test(project_id))return privateJson({ok:false,reason:"project_id_required"},400);
  if(typeof idempotency_key!=="string"||!uuid.test(idempotency_key))
    return privateJson({ok:false,reason:"idempotency_key_required"},400);

  const workId=typeof work_id==="string"?work_id:undefined;
  if(workId){
    const allowed=await canAccess("publication.works",workId,session.uid,isOperatorSession(session));
    if(!allowed)return privateJson({ok:false,reason:"work_forbidden"},403);
  }

  const sessionToken=signDatabaseSessionToken(session);
  const projects=await studioAssetStore().listProjects(sessionToken);
  const project=projects.find(item=>item.project_id===project_id);
  if(!project)return privateJson({ok:false,reason:"project_not_found"},404);
  const projectScope=project.research_scope&&typeof project.research_scope==="object"&&!Array.isArray(project.research_scope)
    ?project.research_scope as Record<string,unknown>:{};

  let created;
  try{
    created=await createResearchTask(prompt.trim(),resolveTopic(topic),session.uid,workId,undefined,{
      projectId:project.project_id,projectScope,sessionToken,idempotencyKey:idempotency_key,
    });
  }catch(error){
    const reason=error instanceof Error?error.message:"";
    if(reason==="STUDIO_RESEARCH_TASK_IDEMPOTENCY_CONFLICT")
      return privateJson({ok:false,reason},409);
    if(reason==="STUDIO_RESEARCH_TASK_NOT_FOUND")
      return privateJson({ok:false,reason:"task_not_found"},404);
    if(reason==="STUDIO_PROJECT_REQUIRED")
      return privateJson({ok:false,reason},400);
    throw error;
  }

  // ST-01 only creates/reuses the research task and its private brief.
  // ST-04 formal production is a separate explicit Creator decision; never auto-dispatch here.
  return privateJson({
    ok:true,status:created.status,hold_reason:created.holdReason??null,
    missing_requirements:created.missingRequirements??[],task_id:created.taskId,
    brief_asset_ref:created.briefAssetRef??null,replayed:created.replayed===true,
    degraded:created.degraded,decision:created.decision,research_leads:created.researchLeads,
    knowledge_route:created.knowledgeRoute??null,production:null,
  });
}
