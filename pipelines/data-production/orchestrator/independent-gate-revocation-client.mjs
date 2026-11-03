// MAB M3: client-side transport contract for the independently operated
// Reviewer authority. This module never signs, grants or revokes a Gate itself.
// It MUST be called only by a separately authenticated Reviewer service;
// the legacy Operator endpoints are intentionally NOT wired to this client.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 8192;

async function boundedJson(response) {
  const header = response.headers?.get?.('content-length');
  if (header !== null && header !== undefined && (!/^\d+$/.test(header) || Number(header) > MAX_BYTES))
    throw Error('INDEPENDENT_REVOKE_RESPONSE_INVALID');
  if (!response.body?.getReader) throw Error('INDEPENDENT_REVOKE_RESPONSE_INVALID');
  const reader = response.body.getReader();
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw Error('INDEPENDENT_REVOKE_RESPONSE_INVALID');
      parts.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
  try { return JSON.parse(Buffer.concat(parts,total).toString('utf8')); }
  catch { throw Error('INDEPENDENT_REVOKE_RESPONSE_INVALID'); }
}

export function createIndependentGateRevocationClient({endpoint,credential,fetcher=fetch}={}) {
  let url;
  try { url=new URL(endpoint); }
  catch { throw Error('INDEPENDENT_REVOKE_CONFIG_INVALID'); }
  if(url.protocol!=='https:' || !url.hostname || url.username || url.password ||
      url.search || url.hash || typeof credential!=='string' || credential.length<32 ||
      typeof fetcher!=='function') throw Error('INDEPENDENT_REVOKE_CONFIG_INVALID');
  return async function requestIndependentRevocation({
    gateAuditId,requestId,reason,reviewerBindingRef,
  }={}) {
    if(!UUID.test(gateAuditId??'') || !UUID.test(requestId??'') ||
       typeof reason!=='string' || !reason.trim() || reason.length>1024 ||
       typeof reviewerBindingRef!=='string' || !reviewerBindingRef.trim() ||
       reviewerBindingRef.length>256) throw Error('INDEPENDENT_REVOKE_REQUEST_INVALID');
    const payload = {
      schema:'mohen.independent-gate-revocation-request.v1',
      gate_audit_id:gateAuditId.toLowerCase(),
      request_id:requestId.toLowerCase(),
      reason:reason.trim(),
      reviewer_binding_ref:reviewerBindingRef,
    };
    let response;
    try {
      response=await fetcher(url.toString(),{
        method:'POST',cache:'no-store',redirect:'error',
        headers:{'content-type':'application/json','authorization':'Bearer '+credential},
        body:JSON.stringify(payload),
        signal:AbortSignal.timeout(5000),
      });
    } catch { throw Error('INDEPENDENT_REVOKE_SERVICE_UNAVAILABLE'); }
    if(!response?.ok) throw Error('INDEPENDENT_REVOKE_DENIED');
    if(!(response.headers?.get?.('content-type')??'').toLowerCase().startsWith('application/json'))
      throw Error('INDEPENDENT_REVOKE_RESPONSE_INVALID');
    const receipt=await boundedJson(response);
    if(!receipt || typeof receipt!=='object' || Array.isArray(receipt) ||
       receipt.schema!=='mohen.independent-gate-revocation-receipt.v1' ||
       receipt.gate_audit_id!==payload.gate_audit_id ||
       receipt.request_id!==payload.request_id ||
       receipt.revoked!==true ||
       receipt.reviewer_binding_ref!==payload.reviewer_binding_ref ||
       !Number.isSafeInteger(receipt.blocked_count) || receipt.blocked_count<0 ||
       (receipt.invalidation_event_id!==undefined &&
        (typeof receipt.invalidation_event_id!=='string' ||
         !UUID.test(receipt.invalidation_event_id))) ||
       typeof receipt.reviewer_identity_ref!=='string' ||
       !receipt.reviewer_identity_ref.trim())
      throw Error('INDEPENDENT_REVOKE_RESPONSE_INVALID');
    // Response is a service receipt, not proof that the current Gate is
    // revoked; consumers must recheck current independent qualification.
    return Object.freeze({
      gate_audit_id:receipt.gate_audit_id,
      request_id:receipt.request_id,
      invalidation_event_id:receipt.invalidation_event_id,
      blocked_count:receipt.blocked_count,
      reviewer_identity_ref:receipt.reviewer_identity_ref,
    });
  };
}
