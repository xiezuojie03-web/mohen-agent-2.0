// Independent Reviewer service only. The supplied repository must use the
// dedicated low-privilege signer login; no shared Web/Producer pool fallback.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const field=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const json=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const FIELDS=new Set(['schema','candidate_id','request_id','result','rule_version',
  'valid_until','expected_audit_id','receipt']);
async function boundedJson(request) {
  const limit=16384,declared=request.headers.get('content-length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>limit))throw Error('TOO_LARGE');
  if(!request.body?.getReader)throw Error('BAD_REQUEST');
  const reader=request.body.getReader(),chunks=[];
  let size=0;
  try {
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>limit)throw Error('TOO_LARGE');chunks.push(Buffer.from(value));
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks,size).toString('utf8'));
}
function valid(body,actor) {
  const receipt=body?.receipt,binding=receipt?.stage_binding;
  return object(body)&&Object.keys(body).every(k=>FIELDS.has(k))&&
    body.schema==='mohen.independent-gate-decision-request.v1'&&
    UUID.test(body.candidate_id??'')&&UUID.test(body.request_id??'')&&
    ['PASS','HOLD','REJECT'].includes(body.result)&&field(body.rule_version)&&
    typeof body.valid_until==='string'&&Number.isFinite(Date.parse(body.valid_until))&&
    Date.parse(body.valid_until)>Date.now()&&
    (body.expected_audit_id===null||UUID.test(body.expected_audit_id??''))&&
    object(receipt)&&typeof receipt.rationale==='string'&&receipt.rationale.trim().length>0&&
    receipt.rationale.length<=4096&&object(receipt.checks)&&
    Object.values(receipt.checks).every(x=>typeof x==='boolean')&&
    Array.isArray(receipt.evidence_refs)&&receipt.evidence_refs.length>0&&
    object(binding)&&Object.keys(binding).every(k=>[
      'job_id','reviewer_binding_ref','consumer','input_digest','output_digest'].includes(k))&&
    binding.job_id===actor.jobId&&binding.reviewer_binding_ref===actor.reviewerBindingRef&&
    binding.consumer==='producer'&&SHA.test(binding.input_digest??'')&&SHA.test(binding.output_digest??'');
}
export function createIndependentGateDecisionHandler({authorityRepository,authenticateReviewer}={}) {
  if(typeof authorityRepository?.decide!=='function'||typeof authenticateReviewer!=='function')
    throw Error('INDEPENDENT_DECISION_SERVICE_CONFIG_REQUIRED');
  return async request=>{
    if(request.method!=='POST')return json(405,{ok:false,reason:'method_not_allowed'});
    if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json')
      return json(415,{ok:false,reason:'json_required'});
    const auth=request.headers.get('authorization')??'';
    if(!/^Bearer [^\s]{32,}$/.test(auth))return json(401,{ok:false,reason:'reviewer_auth_required'});
    let actor;
    try {
      actor=await authenticateReviewer(auth.slice(7));
      if(actor?.allowed!==true||!field(actor.reviewerIdentityRef)||!field(actor.reviewerBindingRef)||
        !field(actor.jobId)||typeof actor.sessionToken!=='string'||!actor.sessionToken)throw Error();
    }catch{return json(403,{ok:false,reason:'independent_reviewer_denied'});}
    let body;
    try {body=await boundedJson(request);if(!valid(body,actor))throw Error();}
    catch(error){return json(error?.message==='TOO_LARGE'?413:400,{ok:false,reason:'decision_request_invalid'});}
    try {
      // SQL remains the authority for current Reviewer identity, policy, scope,
      // exact candidate revision/evidence, dependencies, max validity and CAS.
      const auditId=await authorityRepository.decide({candidateId:body.candidate_id,requestId:body.request_id,
        result:body.result,ruleVersion:body.rule_version,validUntil:body.valid_until,
        expectedAuditId:body.expected_audit_id,receipt:body.receipt},actor.sessionToken);
      if(typeof auditId!=='string'||!UUID.test(auditId))throw Error();
      return json(200,{schema:'mohen.independent-gate-decision-receipt.v1',gate_audit_id:auditId,
        candidate_id:body.candidate_id,request_id:body.request_id,result:body.result,
        reviewer_binding_ref:actor.reviewerBindingRef,reviewer_identity_ref:actor.reviewerIdentityRef});
    }catch{return json(503,{ok:false,reason:'independent_decision_unavailable'});}
  };
}
