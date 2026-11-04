import {NextResponse} from 'next/server';
import {getSession} from '../../../../../../lib/session';
import {signDatabaseSessionToken} from '../../../../../../lib/auth';
import {createStudioExecutionRepository,getNodePgPool} from '@mohen/data-access';
import {readBoundedGateJson} from '../../../../../../../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(status:number,body:unknown)=>NextResponse.json(body,{status,headers:{'cache-control':'no-store'}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Context={params:Promise<{id:string}>};
function failure(error:unknown){const code=error instanceof Error?error.message:'';
 if(code==='STUDIO_IDENTITY_REQUIRED')return json(401,{ok:false,reason:'login_required'});
 if(code==='STUDIO_EXECUTION_NOT_FOUND')return json(404,{ok:false,reason:'not_found'});
 if(code==='STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT')return json(409,{ok:false,reason:'control_request_conflict'});
 return json(503,{ok:false,reason:'studio_control_unavailable'});
}
export async function GET(_request:Request,context:Context){
 const session=await getSession();if(!session)return json(401,{ok:false,reason:'login_required'});
 const {id}=await context.params;if(!uuid.test(id))return json(400,{ok:false,reason:'invalid_delegation'});
 try{return json(200,{ok:true,execution_authorized:false,control:await createStudioExecutionRepository(getNodePgPool()).getState(id,signDatabaseSessionToken(session))});}catch(error){return failure(error);}
}
/** Web can cancel a delegation, never claim a worker lease, grant spend, or
 * manufacture a completed checkpoint. Worker operations stay server-side. */
export async function POST(request:Request,context:Context){
 const session=await getSession();if(!session)return json(401,{ok:false,reason:'login_required'});
 const {id}=await context.params;if(!uuid.test(id))return json(400,{ok:false,reason:'invalid_delegation'});
 if(!(request.headers.get('content-type')??'').toLowerCase().startsWith('application/json'))return json(415,{ok:false,reason:'json_required'});
 let body:Record<string,unknown>;
 try{const parsed=await readBoundedGateJson(request,{maxBytes:4096,timeoutMs:5000});if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();body=parsed as Record<string,unknown>;}catch{return json(400,{ok:false,reason:'invalid_control_request'});}
 if(Object.keys(body).some(k=>!['action','request_id','reason'].includes(k))||body.action!=='revoke'||typeof body.request_id!=='string'||!uuid.test(body.request_id)||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500)return json(400,{ok:false,reason:'invalid_control_request'});
 try{const control=await createStudioExecutionRepository(getNodePgPool()).revoke({delegationId:id,requestId:body.request_id,reason:body.reason.trim()},signDatabaseSessionToken(session));return json(200,{ok:true,execution_authorized:false,control});}catch(error){return failure(error);}
}
