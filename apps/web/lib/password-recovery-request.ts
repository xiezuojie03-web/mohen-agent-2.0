import {passwordResetMailConfig} from './password-reset-mail';
import {readBoundedGateJson} from '../../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';

export const recoveryReply=(status:number,reason?:string)=>Response.json(reason?{ok:false,reason}:{ok:true},
  {status,headers:{'cache-control':'private, no-store, max-age=0','referrer-policy':'no-referrer'}});

export async function readRecoveryRequest(request:Request):Promise<Record<string,unknown>|Response> {
  const config=passwordResetMailConfig();
  if(!config)return recoveryReply(503,'password_recovery_unavailable');
  // Next/reverse proxies can expose an internal request.url. Compare the browser's
  // Origin to deployment-controlled configuration; never derive email URLs from Host.
  if(request.headers.get('origin')!==config.origin)
    return recoveryReply(403,'invalid_request');
  if((request.headers.get('content-type')??'').split(';')[0].trim()!=='application/json')
    return recoveryReply(415,'json_required');
  try {
    const body=await readBoundedGateJson(request,{maxBytes:4096,timeoutMs:5000});
    return body&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:recoveryReply(400,'invalid_request');
  }catch{return recoveryReply(400,'invalid_request');}
}
