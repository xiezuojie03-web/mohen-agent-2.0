// Independent authority endpoint: rebuild the real D01 input from persisted
// facts, verify the CURRENT independent G0 binds it, sign a one-use D01 grant,
// and return the resume input plus token. Never runs in web/Runner. Requires
// an attestor read connection (source/raw/private_originals) injected by the
// authority owner.
import {createHmac,timingSafeEqual} from 'node:crypto';
import {readBoundedGateJson} from './bounded-gate-request.mjs';
import {rebuildD01ResumeInput} from './d01-resume-input.mjs';
import {executionDigest} from './execution-authority.mjs';
const SCHEMA='mohen.d01-resume-request.v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const deny=status=>Response.json({ok:false,reason:'d01_issue_denied'},{status,headers:{'cache-control':'no-store'}});
// MUST match d01-resume-provider.mjs byte-for-byte: the canonical digest is
// the signature payload, never a raw JSON.stringify (key order is unstable).
const requestDigest=v=>executionDigest({run_id:v.run_id,from_stage:v.from_stage,scope:v.scope,project_id:v.project_id});
function signature(credential,time,v){return createHmac('sha256',credential).update(SCHEMA+'\n'+time+'\n'+requestDigest(v)).digest('hex');}
function valid(v){
 return v&&typeof v==='object'&&!Array.isArray(v)&&UUID.test(v.run_id??'')&&v.from_stage==='D01'&&
  UUID.test(v.project_id??'')&&v.scope?.project_id===v.project_id&&UUID.test(v.scope?.original_id??'')&&
  Number.isSafeInteger(v.scope?.page_number)&&v.scope.page_number>=1&&v.scope.page_number<=10000;
}
export function createD01IssueEndpoint({credential,attestorQuery,loadCandidate,loadG0Request,authority,registry,now=Date.now}={}){
 if(typeof credential!=='string'||credential.length<32||typeof attestorQuery!=='function'||
   typeof loadCandidate!=='function'||typeof loadG0Request!=='function'||!authority||typeof authority.issue!=='function'||
   registry?.status!=='ACTIVE_AUTHORIZED')throw Error('D01_ISSUE_CONFIG_INVALID');
 return async request=>{
  const time=request.headers.get('x-mohen-d01-time')??'',sig=request.headers.get('x-mohen-d01-signature')??'';
  if(!/^\d{1,16}$/.test(time)||Math.abs(now()-Number(time))>30000||!/^[a-f0-9]{64}$/.test(sig))return deny(401);
  let v;try{v=await readBoundedGateJson(request,{maxBytes:8192,timeoutMs:5000});}catch{return deny(400);}
  if(!valid(v)||!timingSafeEqual(Buffer.from(signature(credential,time,v)),Buffer.from(sig)))return deny(401);
  try{
   const candidate=await loadCandidate({run_id:v.run_id,project_id:v.project_id});
   if(!candidate)return deny(403);
   const g0=await loadG0Request({run_id:v.run_id,candidate});
   if(!g0)return deny(403);
   const resumeInput=await rebuildD01ResumeInput({query:attestorQuery,candidate,request:g0,registry,projectId:v.project_id});
   const pageMismatch=resumeInput.page&&resumeInput.page.page_number!==v.scope.page_number;
   const textMismatch=resumeInput.text&&resumeInput.originalId!==v.scope.original_id;
   if(resumeInput.stage!=='D01'||resumeInput.originalId!==v.scope.original_id||pageMismatch||textMismatch)return deny(403);
   const d01JobId=registry.jobs.find(j=>j.stage==='D01')?.job_id;
   const {token}=await authority.issue({run_id:v.run_id,stage:'D01',job_id:d01JobId,
    mode:'attended',input:resumeInput,d00_input_digest:g0.input_digest});
   return Response.json({resume_input:resumeInput,token},{headers:{'cache-control':'no-store'}});
  }catch{return deny(503);}
 };
}
