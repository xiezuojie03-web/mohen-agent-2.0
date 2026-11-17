import {isAuthConfigured,resetPreviewOwnerPassword,revocableSessionsEnabled} from '../../../../lib/auth';
import {readBoundedGateJson} from '../../../../../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const reply=(status:number,reason?:string)=>Response.json(
  reason?{ok:false,reason}:{ok:true},
  {status,headers:{'cache-control':'private, no-store, max-age=0','referrer-policy':'no-referrer'}}
);

export async function POST(request:Request) {
  // This route is app-public only because the whole Preview deployment is protected by Vercel SSO.
  // It is additionally disabled unless the explicit Preview-only feature flag is present.
  if(process.env.VERCEL_ENV!=='preview' ||
     process.env.MOHEN_OWNER_PASSWORD_RECOVERY_ENABLED!=='true' ||
     !isAuthConfigured() || !revocableSessionsEnabled())
    return reply(503,'owner_recovery_unavailable');

  if(request.headers.get('origin')!==new URL(request.url).origin)
    return reply(403,'invalid_request');
  if((request.headers.get('content-type')??'').split(';')[0].trim()!=='application/json')
    return reply(415,'json_required');

  let body;
  try { body=await readBoundedGateJson(request,{maxBytes:4096,timeoutMs:5000}); }
  catch { return reply(400,'invalid_request'); }
  if(!body || typeof body!=='object' || Array.isArray(body))
    return reply(400,'invalid_request');

  const input=body as Record<string,unknown>;
  if(typeof input.password!=='string' || input.password.length<8 ||
     Buffer.byteLength(input.password)>1024)
    return reply(400,'password_invalid');
  if(typeof input.confirmation!=='string' || input.password!==input.confirmation)
    return reply(400,'password_mismatch');

  try {
    const ok=await resetPreviewOwnerPassword(input.password);
    return ok?reply(200):reply(409,'owner_recovery_not_available');
  } catch {
    return reply(503,'owner_recovery_unavailable');
  }
}
