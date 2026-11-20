// Independent process composition; no Web routes or shared credential fallback.
import {createHash,createHmac} from 'node:crypto';
import {withIndependentGateConnection} from '../../../packages/data-access/src/gate-service-connection.mjs';
import {createGateAuthorityOperations} from '../../../packages/data-access/src/gate-authority-repository.mjs';
import {createIndependentGateDecisionHandler} from './independent-gate-decision-handler.mjs';
import {createIndependentGateRevocationHandler} from './independent-gate-revocation-handler.mjs';
import {createIndependentGateCurrentHandler} from './independent-gate-current-handler.mjs';
import {readBoundedGateJson} from './bounded-gate-request.mjs';
const response=(status,reason)=>Response.json({ok:false,reason},{status,headers:{'cache-control':'no-store'}});
class Rejected extends Error {constructor(result){super('GATE_REQUEST_REJECTED');this.result=result;}}
const hash=token=>createHash('sha256').update(token).digest('hex');
const field=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128;
export function createIndependentGateService({readOnly=false,signerPool,readerPool,databaseSessionKey,bodyReadTimeoutMs=5000}={}) {
  const validSignerConfig=readOnly===true
    ? signerPool===undefined&&databaseSessionKey===undefined
    : typeof signerPool?.connect==='function'&&typeof databaseSessionKey==='string'&&
      databaseSessionKey.length>=32&&signerPool!==readerPool;
  if(typeof readerPool?.connect!=='function'||!validSignerConfig)
    throw Error('GATE_SERVICE_CONFIG_REQUIRED');
  return async request=>{
    let url;try{url=new URL(request.url);}catch{return response(400,'invalid_request');}
    const kind=url.pathname==='/current'?'consume':['/decide','/revoke'].includes(url.pathname)?'review':null;
    if(!kind||(readOnly===true&&kind==='review'))return response(404,'not_found');
    if(url.search||url.hash)return response(400,'invalid_request');
    if(request.method!=='POST')return response(405,'method_not_allowed');
    const bearer=request.headers.get('authorization')??'';
    if(!/^Bearer [A-Za-z0-9_-]{32,256}$/.test(bearer))return response(401,'independent_credential_required');
    if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json')
      return response(415,'json_required');
    let body;
    try{body=await readBoundedGateJson(request,{maxBytes:url.pathname==='/decide'?16384:4096,timeoutMs:bodyReadTimeoutMs});}
    catch(error){return response(error.message==='REQUEST_BODY_TIMEOUT'?408:error.message==='REQUEST_TOO_LARGE'?413:400,
      error.message==='REQUEST_BODY_TIMEOUT'?'body_read_timeout':'invalid_request');}
    const credentialHash=hash(bearer.slice(7));
    const localRequest=new Request(url,{method:'POST',headers:request.headers,body:JSON.stringify(body)});
    try {
      return await withIndependentGateConnection(kind==='review'?signerPool:readerPool,kind,async client=>{
        let actor;
        const authenticate=async()=>{
          const {rows}=await client.query('select control.authenticate_gate_service($1,$2) as credential',[credentialHash,kind]);
          const c=rows.length===1?rows[0].credential:null;
          if(!c||!field(c.principal_user_id)||!field(c.job_id)||!field(c.reviewer_binding_ref)||
            !Number.isFinite(Date.parse(c.valid_until))||Date.parse(c.valid_until)<=Date.now())return null;
          let sessionToken;
          if(kind==='review'){
            const payload=Buffer.from(JSON.stringify({uid:c.principal_user_id,r:[],exp:Math.min(Date.now()+30000,Date.parse(c.valid_until))})).toString('base64url');
            sessionToken=payload+'.'+createHmac('sha256',databaseSessionKey).update(payload).digest('base64url');
            await client.query("select set_config('mohen.session_token',$1,true)",[sessionToken]);
          }
          actor={allowed:true,sessionToken,reviewerIdentityRef:c.principal_user_id,reviewerBindingRef:c.reviewer_binding_ref,
            jobId:c.job_id,readContext:{consumer:c.consumer,purpose:{namespace:c.purpose_namespace,
              code:c.purpose_code,version:c.purpose_version},scope:c.allowed_scope}};
          return actor;
        };
        const operations=createGateAuthorityOperations(client),authorityRepository={};
        for(const operation of ['decide','revoke'])authorityRepository[operation]=async(args,sessionToken)=>{
          if(!actor||sessionToken!==actor.sessionToken)throw Error('REVIEWER_IDENTITY_REQUIRED');
          const {rows}=await client.query('select control.gate_service_target_allows($1,$2,$3,$4::jsonb) as allowed',
            [credentialHash,operation,operation==='decide'?args.candidateId:args.auditId,operation==='decide'?JSON.stringify(args.receipt):null]);
          if(rows.length!==1||rows[0].allowed!==true)throw Error('REVIEWER_TARGET_DENIED');
          return operations[operation](args);
        };
        const handler=url.pathname==='/decide'?createIndependentGateDecisionHandler({authorityRepository,authenticateReviewer:authenticate}):
          url.pathname==='/revoke'?createIndependentGateRevocationHandler({authorityRepository,authenticateReviewer:authenticate}):
          createIndependentGateCurrentHandler({authenticateConsumer:authenticate,readQualification:async request=>{
            const {rows}=await client.query('select control.read_gate_stage_qualification($1,$2::jsonb) as receipt',[credentialHash,JSON.stringify(request)]);
            return rows.length===1?rows[0].receipt:null;
          }});
        const result=await handler(localRequest);
        if(result.status>=400)throw new Rejected(result);
        return result;
      });
    }catch(error){return error instanceof Rejected?error.result:response(503,'independent_gate_unavailable');}
  };
}
