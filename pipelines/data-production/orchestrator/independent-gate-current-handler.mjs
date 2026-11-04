import {readBoundedGateJson} from './bounded-gate-request.mjs';
// Candidate independent read service; not a Web Operator route or Gate signer.
// authenticateConsumer must resolve current credentials to a SERVER-owned job,
// Reviewer binding and read scope. Request data cannot widen that authority.
import {assertStageQualificationRequest} from '../../../packages/data-access/src/gate-stage-qualification.mjs';
import {requireQualifiedReadContext} from '../../../packages/data-access/src/qualification-read-context.mjs';

const json=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

export function createIndependentGateCurrentHandler({readQualification,authenticateConsumer,bodyReadTimeoutMs=5000}={}) {
  if(typeof readQualification!=='function'||typeof authenticateConsumer!=='function')
    throw Error('INDEPENDENT_CURRENT_SERVICE_CONFIG_REQUIRED');
  return async request=>{
    if(request.method!=='POST')return json(405,{ok:false,reason:'method_not_allowed'});
    if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json')
      return json(415,{ok:false,reason:'json_required'});
    const auth=request.headers.get('authorization')??'';
    if(!/^Bearer [^\s]{32,}$/.test(auth))return json(401,{ok:false,reason:'consumer_auth_required'});
    let actor;
    try {
      actor=await authenticateConsumer(auth.slice(7));
      if(actor?.allowed!==true||actor.readContext?.consumer!=='producer')throw Error();
      requireQualifiedReadContext(actor.readContext);
    }catch{return json(403,{ok:false,reason:'consumer_denied'});}
    let body;
    try {body=await readBoundedGateJson(request,{maxBytes:4096,timeoutMs:bodyReadTimeoutMs});assertStageQualificationRequest(body);}
    catch(error){if(error?.message==='REQUEST_BODY_TIMEOUT')return json(408,{ok:false,reason:'body_read_timeout'});return json(error?.message==='REQUEST_TOO_LARGE'?413:400,{ok:false,reason:'invalid_current_request'});}
    if(body.job_id!==actor.jobId||body.reviewer_binding_ref!==actor.reviewerBindingRef)
      return json(403,{ok:false,reason:'consumer_binding_denied'});
    try {
      const receipt=await readQualification(body,actor.readContext);
      if(!receipt)return json(409,{ok:false,reason:'current_qualification_required'});
      return json(200,receipt);
    }catch{return json(503,{ok:false,reason:'current_qualification_unavailable'});}
  };
}
