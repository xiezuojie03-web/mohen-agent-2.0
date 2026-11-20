// Transport only: the existing six-stage Runner, Registry and independent
// execution/Gate authorizers remain the only production authorities.
import {createHmac,timingSafeEqual} from 'node:crypto';
import {executionDigest} from './execution-authority.mjs';
import {readBoundedGateJson} from './bounded-gate-request.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SCHEMA='mohen.cloud-production-dispatch.v1';
const FIELDS=new Set(['run_id','research_intent','scope','consumer_method_plan','owner_session_token','to_stage']);
const SCOPE=new Set(['project_id','root_task_id','original_id','page_number','source_version_id','asset_revision_id','raw_sha256','upload_started_at','upload_verified_at']);
export function cloudProductionEndStage(input){
 const stage=input?.to_stage;
 if(stage===undefined)return 'D02';
 if(stage!=='D00'&&stage!=='D02')throw Error('CLOUD_EXECUTOR_STAGE_INVALID');
 return stage;
}
function valid(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!FIELDS.has(k))||!UUID.test(v.run_id??'')||
   typeof v.research_intent!=='string'||!v.research_intent.trim()||v.research_intent.length>2000||
   !v.scope||typeof v.scope!=='object'||Array.isArray(v.scope)||Object.keys(v.scope).some(k=>!SCOPE.has(k))||
   !['project_id','root_task_id','original_id'].every(k=>UUID.test(v.scope[k]??''))||
   !Number.isSafeInteger(v.scope.page_number)||v.scope.page_number<1||v.scope.page_number>10000||
   typeof v.owner_session_token!=='string'||!v.owner_session_token||v.owner_session_token.length>4096||
   !Array.isArray(v.consumer_method_plan?.methods)||v.consumer_method_plan.methods.length!==1||
   !['C01','C02'].includes(v.consumer_method_plan.methods[0]?.method_id)||
   v.consumer_method_plan.methods[0]?.method_version!=='v1'||Buffer.byteLength(JSON.stringify(v))>16384)
   throw Error('CLOUD_EXECUTOR_REQUEST_INVALID');
 cloudProductionEndStage(v);
}
function signature(credential,time,v){return createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+executionDigest(v)).digest('hex');}
function configured(credential){return typeof credential==='string'&&credential.length>=32&&credential.length<=256;}
function boundedResult(v,input){
 const id=input.run_id;
 if(input.to_stage==='D00'&&v?.stage!=='D00')throw Error('CLOUD_EXECUTOR_UNCERTAIN');
 if(v?.run_id!==id||!['PASS','HOLD','REJECT','FAILED'].includes(v.status)||!/^D0[0-5]$/.test(v.stage??''))
  throw Error('CLOUD_EXECUTOR_UNCERTAIN');
 const code=typeof v.reason_code==='string'&&/^[A-Z0-9_]{3,100}$/.test(v.reason_code)?v.reason_code:null;
 return {run_id:id,status:v.status,stage:v.stage,reason_code:code};
}
export function createCloudProductionDispatch({url,credential,protectionBypass,fetchImpl=fetch,now=Date.now,timeoutMs=250000}={}){
 let endpoint;try{endpoint=new URL(url);}catch{throw Error('CLOUD_EXECUTOR_CONFIG_INVALID');}
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!['/execute','/api/internal/production-execute'].includes(endpoint.pathname)||
   !configured(credential)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>270000)
  throw Error('CLOUD_EXECUTOR_CONFIG_INVALID');
 return async v=>{
  valid(v);const time=String(now());
  let reply;
  try{reply=await fetchImpl(endpoint.href,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
    headers:{'content-type':'application/json','x-mohen-dispatch-time':time,'x-mohen-dispatch-signature':signature(credential,time,v),
      ...(protectionBypass?{'x-vercel-protection-bypass':protectionBypass}:{})},body:JSON.stringify(v)});}
  catch{throw Error('CLOUD_EXECUTOR_UNCERTAIN');}
  if(reply.status===409)throw Error('CLOUD_EXECUTOR_ALREADY_CLAIMED');
  if(reply.status>=500)throw Error('CLOUD_EXECUTOR_UNCERTAIN');
  if(!reply.ok)throw Error('CLOUD_EXECUTOR_REJECTED');
  let result;try{result=await reply.json();}catch{throw Error('CLOUD_EXECUTOR_UNCERTAIN');}
  return boundedResult(result,v);
 };
}
export function createCloudProductionAuthenticator({credential,now=Date.now}={}){
 const reply=(status,reason)=>Response.json({ok:false,reason},{status,headers:{'cache-control':'no-store'}});
 return async req=>{
  if(!configured(credential))return reply(503,'cloud_executor_not_configured');
  const url=new URL(req.url);
  if(!['/execute','/api/internal/production-execute'].includes(url.pathname)||url.search||url.hash)return reply(404,'not_found');
  if(req.method!=='POST')return reply(405,'method_not_allowed');
  if((req.headers.get('content-type')??'').split(';')[0].trim()!=='application/json')return reply(415,'json_required');
  const time=req.headers.get('x-mohen-dispatch-time')??'',sig=req.headers.get('x-mohen-dispatch-signature')??'';
  if(!/^\d{1,16}$/.test(time)||Math.abs(now()-Number(time))>30000||!/^[a-f0-9]{64}$/.test(sig))return reply(401,'dispatch_auth_required');
  let v;try{v=await readBoundedGateJson(req,{maxBytes:16384,timeoutMs:5000});valid(v);}
  catch{return reply(400,'invalid_request');}
  const expected=signature(credential,time,v);
  if(!timingSafeEqual(Buffer.from(expected),Buffer.from(sig)))return reply(401,'dispatch_auth_required');
  return v;
 };
}
export function createCloudProductionHandler({credential,claim,execute,now=Date.now}={}){
 if(!configured(credential)||typeof claim!=='function'||typeof execute!=='function')throw Error('CLOUD_EXECUTOR_CONFIG_INVALID');
 const authenticate=createCloudProductionAuthenticator({credential,now});
 const reply=(status,reason)=>Response.json({ok:false,reason},{status,headers:{'cache-control':'no-store'}});
 return async req=>{
  const v=await authenticate(req);
  if(v instanceof Response)return v;
  try{
   if(await claim(v)!==true)return reply(409,'run_already_claimed_or_mismatched');
   const result=boundedResult(await execute(v),v);
   return Response.json(result,{headers:{'cache-control':'no-store'}});
  }catch{return reply(503,'cloud_executor_uncertain');}
 };
}
