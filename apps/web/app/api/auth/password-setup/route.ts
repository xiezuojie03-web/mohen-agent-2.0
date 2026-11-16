import {completePasswordSetup,isAuthConfigured,revocableSessionsEnabled} from '../../../../lib/auth';
import {readBoundedGateJson} from '../../../../../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(status:number,reason?:string)=>Response.json(reason?{ok:false,reason}:{ok:true},
  {status,headers:{'cache-control':'private, no-store, max-age=0','referrer-policy':'no-referrer'}});

export async function POST(request:Request) {
  // Account recovery is enabled only on the protected development Preview.
  if(process.env.VERCEL_ENV!=='preview'||!isAuthConfigured()||!revocableSessionsEnabled())
    return reply(503,'password_setup_unavailable');
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply(403,'invalid_request');
  if((request.headers.get('content-type')??'').split(';')[0].trim()!=='application/json')return reply(415,'json_required');
  let body;
  try{body=await readBoundedGateJson(request,{maxBytes:4096,timeoutMs:5000});}
  catch{return reply(400,'invalid_request');}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,'invalid_request');
  const input=body as Record<string,unknown>;
  try {
    const ok=await completePasswordSetup({email:input.email,token:input.token,password:input.password});
    return ok?reply(200):reply(400,'setup_invalid_or_expired');
  }catch{return reply(503,'password_setup_unavailable');}
}
