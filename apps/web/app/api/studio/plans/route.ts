import {NextResponse} from 'next/server';
import {getSession} from '../../../../lib/session';
import {signDatabaseSessionToken} from '../../../../lib/auth';
import {saveStudioResearchPlan} from '../../../../lib/studio-plans';
import {createStudioAssetRepository,createStudioDelegationRepository,createStudioExecutionRepository,getNodePgPool} from '@mohen/data-access';
import {readBoundedGateJson} from '../../../../../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';
import registry from '../../../../../../specs/data-production/production-registry.json';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(status:number,body:unknown)=>NextResponse.json(body,{status,headers:{'cache-control':'no-store'}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function failure(error:unknown){
 const code=error instanceof Error?error.message:'';
 if(code==='STUDIO_IDENTITY_REQUIRED')return json(401,{ok:false,reason:'login_required'});
 if(['STUDIO_SOURCE_NOT_FOUND','STUDIO_PROJECT_NOT_FOUND'].includes(code))return json(404,{ok:false,reason:code});
 if(code.includes('CONFLICT'))return json(409,{ok:false,reason:'plan_revision_conflict'});
 if(code==='STUDIO_PLAN_REQUEST_INVALID'||code.startsWith('STUDIO_PLAN_'))return json(400,{ok:false,reason:'invalid_plan'});
 return json(503,{ok:false,reason:'studio_storage_unavailable'});
}
export async function GET(request:Request){
 const session=await getSession();if(!session)return json(401,{ok:false,reason:'login_required'});
 const query=new URL(request.url).searchParams,projectId=query.get('project_id'),cursor=query.get('cursor');
 if(cursor!==null&&!uuid.test(cursor))return json(400,{ok:false,reason:'invalid_cursor'});
 if(!projectId||!uuid.test(projectId))return json(400,{ok:false,reason:'project_id_required'});
 try{
  const plans=(await createStudioAssetRepository(getNodePgPool()).listPlanAssets(projectId,signDatabaseSessionToken(session),cursor))
   .filter(asset=>asset.payload&&typeof asset.payload==='object'&&(asset.payload as Record<string,unknown>).schema==='mohen.studio-research-plan.v1');
  const pool=getNodePgPool(),token=signDatabaseSessionToken(session);
  const store=createStudioDelegationRepository(pool);
  const enriched=await Promise.all(plans.slice(0,20).map(async asset=>{
   const p=asset.payload as {request_id?:string;delegation_series_id?:string;plan?:{root_task_id?:string;plan_hash?:string}};
   const found=typeof p.request_id==='string'&&typeof p.plan?.root_task_id==='string'
    ?await store.getDelegationForPlan(projectId,p.plan.root_task_id,p.request_id,token):null;
   const snap=found?.root_task_snapshot as {plan_asset_id?:string;plan?:{plan_hash?:string}}|undefined;
   const delegation=found&&found.delegation_series_id===p.delegation_series_id&&snap?.plan_asset_id===asset.asset_id&&snap?.plan?.plan_hash===p.plan?.plan_hash?found:null;
   return delegation?{...asset,delegation_id:delegation.delegation_id,control:await createStudioExecutionRepository(pool).getState(delegation.delegation_id,token)}:asset;
  }));
  return json(200,{ok:true,plans:enriched,next_cursor:plans.length>20?plans[19].asset_id:null,execution_authorized:false});
 }catch(error){return failure(error);}
}
export async function POST(request:Request){
 const session=await getSession();if(!session)return json(401,{ok:false,reason:'login_required'});
 if(!(request.headers.get('content-type')??'').toLowerCase().startsWith('application/json'))return json(415,{ok:false,reason:'json_required'});
 let body:unknown;
 try{body=await readBoundedGateJson(request,{maxBytes:65536,timeoutMs:5000});}
 catch(error){const code=error instanceof Error?error.message:'';return json(code==='REQUEST_TOO_LARGE'?413:code==='REQUEST_BODY_TIMEOUT'?408:400,{ok:false,reason:'invalid_body'});}
 if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{ok:false,reason:'invalid_body'});
 try{
  const pool=getNodePgPool();
  let input=body as Record<string,unknown>;
  if('recover_revision_id' in input){
   if(Object.keys(input).length!==1||typeof input.recover_revision_id!=='string'||!uuid.test(input.recover_revision_id))return json(400,{ok:false,reason:'invalid_recovery'});
   const token=signDatabaseSessionToken(session),store=createStudioAssetRepository(pool),asset=await store.getRevision(input.recover_revision_id,token);
   if(!asset)return json(404,{ok:false,reason:'not_found'});
   const payload=asset.payload as {schema?:string;request_id?:string;delegation_series_id?:string;plan?:{actor_id?:string;root_task_id?:string};plan_request?:Record<string,unknown>};
   if(payload?.schema!=='mohen.studio-research-plan.v1'||payload.plan?.actor_id!==session.uid||!payload.plan_request)return json(400,{ok:false,reason:'recovery_snapshot_missing'});
   const original=payload.plan_request;
   if(original.asset_id!==asset.asset_id||original.project_id!==asset.project_id||original.root_task_ref!==payload.plan.root_task_id||
    typeof original.request_id!=='string'||original.request_id!==payload.request_id||original.series_id!==payload.delegation_series_id)return json(400,{ok:false,reason:'recovery_binding_mismatch'});
   const history=await store.listAssetRevisions(asset.project_id,asset.asset_id,token);
   if(history[0]?.revision_id!==asset.revision_id)return json(409,{ok:false,reason:'plan_revision_conflict'});
   input=payload.plan_request;
  }
  const saved=await saveStudioResearchPlan({assets:createStudioAssetRepository(pool),delegations:createStudioDelegationRepository(pool),registry},
   input,{actorId:session.uid,token:signDatabaseSessionToken(session)});
  const id=(saved.delegation as {delegation_id?:string}|undefined)?.delegation_id;
  const control=id&&uuid.test(id)?await createStudioExecutionRepository(pool).getState(id,signDatabaseSessionToken(session)):undefined;
  return json(200,{ok:true,...saved,...(control?{control,state:control.state==='REVOKED'?'REVOKED':saved.state}:{})});
 }catch(error){return failure(error);}
}
