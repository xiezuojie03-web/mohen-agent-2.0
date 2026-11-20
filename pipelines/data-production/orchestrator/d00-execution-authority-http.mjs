import {createHash,timingSafeEqual} from 'node:crypto';
import {readBoundedGateJson} from './bounded-gate-request.mjs';

const credentialPattern=/^[A-Za-z0-9_-]{32,256}$/;
const digest=value=>createHash('sha256').update(value).digest();
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
const fail=(status,reason)=>json({ok:false,reason},status);

export function createD00ExecutionAuthorityHandler({authority,issueCredential,verifyCredential}={}){
 if(typeof authority?.issue!=='function'||typeof authority.consume!=='function'||
  typeof issueCredential!=='string'||!credentialPattern.test(issueCredential)||
  typeof verifyCredential!=='string'||!credentialPattern.test(verifyCredential)||issueCredential===verifyCredential){
  throw Error('D00_EXECUTION_AUTHORITY_HTTP_CONFIG_INVALID');
 }
 const issueDigest=digest(issueCredential),verifyDigest=digest(verifyCredential);
 return async request=>{
  const url=new URL(request.url);
  const issue=url.pathname==='/token';
  if((!issue&&url.pathname!=='/consume')||url.search||url.hash)return fail(404,'not_found');
  if(request.method!=='POST')return fail(405,'method_not_allowed');
  const bearer=request.headers.get('authorization')??'';
  if(!bearer.startsWith('Bearer ')||!credentialPattern.test(bearer.slice(7))||
   !timingSafeEqual(digest(bearer.slice(7)),issue?issueDigest:verifyDigest)){
   return fail(401,'independent_credential_required');
  }
  if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json'){
   return fail(415,'json_required');
  }
  let body;
  try{
   body=await readBoundedGateJson(request,{maxBytes:issue?16384:4096});
  }catch(error){
   if(error.message==='REQUEST_TOO_LARGE')return fail(413,'request_too_large');
   if(error.message==='REQUEST_BODY_TIMEOUT')return fail(408,'body_read_timeout');
   return fail(400,'invalid_request');
  }
  if(!body||typeof body!=='object'||Array.isArray(body))return fail(400,'invalid_request');
  try{
   return json(await (issue?authority.issue(body):authority.consume(body)));
  }catch(error){
   if(error.message==='D00_EXECUTION_AUTHORITY_DENIED')return fail(403,'execution_authority_denied');
   return fail(503,'execution_authority_unavailable');
  }
 };
}
