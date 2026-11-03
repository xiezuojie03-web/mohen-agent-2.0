// MAB M3 candidate service-side route handler, NOT an app/Operator endpoint.
// Deploy ONLY in an independently authenticated Reviewer process with a
// separate dedicated signer pool and a real authenticateReviewer callback.
// Existing createGateAuthorityRepository enforces DB role, low privilege,
// transaction-scoped signed identity, idempotency and append-only event audit.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(status,body)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json','cache-control':'no-store'},
});
const MAX_REQUEST_BYTES=4096;
async function boundedRequestJson(request) {
  const declared=request.headers.get('content-length');
  if(declared!==null && (!/^\d+$/.test(declared)||Number(declared)>MAX_REQUEST_BYTES))
    throw Error('REQUEST_TOO_LARGE');
  if(!request.body?.getReader) throw Error('REQUEST_BODY_REQUIRED');
  const reader=request.body.getReader();
  const chunks=[];
  let size=0;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      size+=value.byteLength;
      if(size>MAX_REQUEST_BYTES) throw Error('REQUEST_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  try {return JSON.parse(Buffer.concat(chunks,size).toString('utf8'));}
  catch {throw Error('BAD_REQUEST_JSON');}
}
export function createIndependentGateRevocationHandler({authorityRepository,authenticateReviewer}={}) {
  if(typeof authorityRepository?.revoke!=='function'||typeof authenticateReviewer!=='function')
    throw Error('INDEPENDENT_REVOKE_SERVICE_CONFIG_REQUIRED');
  return async function handle(request) {
    if(request?.method!=='POST')return json(405,{ok:false,reason:'method_not_allowed'});
    if(!(request.headers.get('content-type')??'').toLowerCase().startsWith('application/json'))
      return json(415,{ok:false,reason:'json_required'});
    const auth=request.headers.get('authorization')??'';
    if(!/^Bearer [^\s]{32,}$/.test(auth))return json(401,{ok:false,reason:'reviewer_auth_required'});
    // No service response echoes credentials, reviewer session tokens, or
    // private material. Authentication must independently verify active
    // account, Reviewer binding, its separate role and current rights.
    let actor;
    try { actor=await authenticateReviewer(auth.slice(7)); }
    catch {return json(403,{ok:false,reason:'independent_reviewer_denied'});}
    if(!actor || actor.allowed!==true ||
       typeof actor.sessionToken!=='string'||!actor.sessionToken ||
       typeof actor.reviewerBindingRef!=='string'||!actor.reviewerBindingRef ||
       typeof actor.reviewerIdentityRef!=='string'||!actor.reviewerIdentityRef)
       return json(403,{ok:false,reason:'independent_reviewer_denied'});
    let body;
    try {body=await boundedRequestJson(request);}
    catch(error) {
      return error?.message==='REQUEST_TOO_LARGE'
        ? json(413,{ok:false,reason:'request_too_large'})
        : json(400,{ok:false,reason:'bad_request'});
    }
    if(!body || typeof body!=='object'||Array.isArray(body) ||
       body.schema!=='mohen.independent-gate-revocation-request.v1'||
       !UUID.test(body.gate_audit_id??'') || !UUID.test(body.request_id??'') ||
       typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>1024 ||
       body.reviewer_binding_ref!==actor.reviewerBindingRef)
       return json(400,{ok:false,reason:'revocation_request_invalid'});
    let count;
    try {
      count=await authorityRepository.revoke({
        auditId:body.gate_audit_id.toLowerCase(),
        requestId:body.request_id.toLowerCase(),
        reason:body.reason.trim(),
      },actor.sessionToken);
    } catch {
      // No permission, expired Reviewer, unavailable DB, invalid original
      // approval or transaction failure is never a successful revocation.
      return json(503,{ok:false,reason:'independent_revocation_unavailable'});
    }
    if(!Number.isSafeInteger(count)||count<0)
      return json(503,{ok:false,reason:'invalid_revocation_result'});
    return json(200,{
      schema:'mohen.independent-gate-revocation-receipt.v1',
      gate_audit_id:body.gate_audit_id.toLowerCase(),
      request_id:body.request_id.toLowerCase(),
      reviewer_binding_ref:actor.reviewerBindingRef,
      reviewer_identity_ref:actor.reviewerIdentityRef,
      revoked:true,blocked_count:count,
      // The authoritative SQL function returns blocked_count, not event UUID.
      // request_id is the trace key of the immutable invalidation event.
      // Do not fabricate an invalidation_event_id.
    });
  };
}
