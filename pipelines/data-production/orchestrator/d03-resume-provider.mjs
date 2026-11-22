// Server-side-only client to the independent D03 authority. It carries only
// references (run_id/scope/project_id); the authority rebuilds the real D03
// input from persisted facts, verifies the current G2, signs a one-use grant,
// and returns {resume_input, token}. Never runs in the Producer or browser.
import {createHmac} from 'node:crypto';
import {executionDigest} from './execution-authority.mjs';
import {readBoundedGateJson} from './bounded-gate-request.mjs';
import {createTrustedPreviewFetch} from './trusted-preview-fetch.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SCHEMA='mohen.d03-resume-request.v1';

function requestDigest(v){return executionDigest({run_id:v.run_id,from_stage:v.from_stage,scope:v.scope,project_id:v.project_id});}
function signature(credential,time,v){return createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+requestDigest(v)).digest('hex');}
function valid(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||!UUID.test(v.run_id??'')||v.from_stage!=='D03'||
   !UUID.test(v.project_id??'')||!v.scope||typeof v.scope!=='object'||Array.isArray(v.scope)||
   !UUID.test(v.scope.project_id??'')||v.scope.project_id!==v.project_id||
   !UUID.test(v.scope.original_id??'')||!Number.isSafeInteger(v.scope.page_number)||
   v.scope.page_number<1||v.scope.page_number>10000||Buffer.byteLength(JSON.stringify(v))>8192)
  throw Error('D03_RESUME_REQUEST_INVALID');
}
function validReply(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||!v.resume_input||typeof v.resume_input!=='object'||
   Array.isArray(v.resume_input)||v.resume_input.stage!=='D03'||v.resume_input.schema!=='mohen.private-evidence-stage-request.v1'||
   typeof v.token!=='string'||!v.token.trim()||v.token.length>8192||Buffer.byteLength(JSON.stringify(v))>16384)
  throw Error('D03_RESUME_REPLY_INVALID');
 return {resume_input:v.resume_input,token:v.token};
}
export function createD03ResumeProvider({url,credential,environment,now=Date.now,fetchImpl=fetch,timeoutMs=15000}={}){
 let endpoint;try{endpoint=new URL(url);}catch{throw Error('D03_RESUME_PROVIDER_CONFIG_INVALID');}
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||
   !['/d03-issue','/api/d03-issue'].includes(endpoint.pathname)||
   typeof credential!=='string'||credential.length<32||credential.length>256)
  throw Error('D03_RESUME_PROVIDER_CONFIG_INVALID');
 const trusted=createTrustedPreviewFetch(environment??{},fetchImpl);
 return async ({input,fromStage})=>{
  if(fromStage!=='D03')throw Error('D03_RESUME_STAGE_INVALID');
  const v={run_id:input.run_id,from_stage:'D03',project_id:input.scope.project_id,
   scope:{project_id:input.scope.project_id,original_id:input.scope.original_id,page_number:input.scope.page_number,
     ...(input.scope.source_version_id?{source_version_id:input.scope.source_version_id}:{})}};
  valid(v);
  const time=String(now());
  let reply;
  try{reply=await trusted(endpoint.href,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
   headers:{'content-type':'application/json','x-mohen-d03-time':time,'x-mohen-d03-signature':signature(credential,time,v)},
   body:JSON.stringify(v)});}
  catch{throw Error('D03_RESUME_UNCERTAIN');}
  if(reply.status>=500)throw Error('D03_RESUME_UNCERTAIN');
  if(!reply.ok)throw Error('D03_RESUME_DENIED');
  let body;try{body=await readBoundedGateJson(reply,{maxBytes:16384,timeoutMs:5000});}catch{throw Error('D03_RESUME_UNCERTAIN');}
  return validReply(body);
 };
}
