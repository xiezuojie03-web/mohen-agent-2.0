// Independent authority endpoint: rebuild the real D04 input from persisted
// facts, verify the CURRENT independent G3 qualifies exactly that claim revision,
// sign a one-use D04 grant, and return the resume input plus token. Never runs
// in web/Runner. Requires an attestor read connection (world/control/evidence)
// injected by the authority owner.
import {createHmac,timingSafeEqual} from 'node:crypto';
import {readBoundedGateJson} from './bounded-gate-request.mjs';
import {rebuildD04ResumeInput} from './d04-resume-input.mjs';
import {executionDigest} from './execution-authority.mjs';
const SCHEMA='mohen.d04-resume-request.v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const deny=status=>Response.json({ok:false,reason:'d04_issue_denied'},{status,headers:{'cache-control':'no-store'}});
// MUST match d04-resume-provider.mjs byte-for-byte.
const requestDigest=v=>executionDigest({run_id:v.run_id,from_stage:v.from_stage,scope:v.scope,project_id:v.project_id});
function signature(credential,time,v){return createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+requestDigest(v)).digest('hex');}
function valid(v){
 return v&&typeof v==='object'&&!Array.isArray(v)&&UUID.test(v.run_id??'')&&v.from_stage==='D04'&&
  UUID.test(v.project_id??'')&&v.scope?.project_id===v.project_id&&UUID.test(v.scope?.original_id??'')&&
  Number.isSafeInteger(v.scope?.page_number)&&v.scope.page_number>=1&&v.scope.page_number<=10000;
}
export function createD04IssueEndpoint({credential,attestorQuery,authority,registry,now=Date.now}={}){
 if(typeof credential!=='string'||credential.length<32||typeof attestorQuery!=='function'||
   !authority||typeof authority.issue!=='function'||registry?.status!=='ACTIVE_AUTHORIZED')
  throw Error('D04_ISSUE_CONFIG_INVALID');
 const jobId=registry.jobs?.find(j=>j.stage==='D04')?.job_id;
 if(typeof jobId!=='string'||!jobId)throw Error('D04_ISSUE_CONFIG_INVALID');
 return async request=>{
  const time=request.headers.get('x-mohen-d04-time')??'',sig=request.headers.get('x-mohen-d04-signature')??'';
  if(!/^\d{1,16}$/.test(time)||Math.abs(now()-Number(time))>30000||!/^[a-f0-9]{64}$/.test(sig))return deny(401);
  let v;try{v=await readBoundedGateJson(request,{maxBytes:8192,timeoutMs:5000});}catch{return deny(400);}
  if(!valid(v)||!timingSafeEqual(Buffer.from(signature(credential,time,v)),Buffer.from(sig)))return deny(401);
  try{
   const input=await rebuildD04ResumeInput({query:attestorQuery,runId:v.run_id,projectId:v.project_id,registry});
   if(input.stage!=='D04'||input.originalId!==v.scope.original_id)return deny(403);
   const {token}=await authority.issue({run_id:v.run_id,stage:'D04',job_id:jobId,mode:'attended',input});
   return Response.json({resume_input:input,token},{headers:{'cache-control':'no-store'}});
  }catch{return deny(503);}
 };
}
