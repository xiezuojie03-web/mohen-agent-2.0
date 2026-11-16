// Deployable adapter around the existing Runner. The web control-plane pool
// only claims its pre-registered run; the child uses a separate Producer URL.
import path from 'node:path';
import {loadRegistry} from './registry.mjs';
import {createCloudProductionHandler} from './cloud-production-dispatch.mjs';
import {claimCloudProductionRun,executeCloudProductionCli,assertCloudExecutionConfiguration} from './cloud-production-runtime.mjs';
import {createPrivateWorkerPool,assertPrivateWorkerIdentity} from '../../../packages/data-access/src/private-worker-pool.mjs';
import {createPrivateSourceRegistrationRepository} from '../../../packages/data-access/src/private-source-registration-repository.mjs';
const fail=()=>Response.json({ok:false,reason:'cloud_executor_not_configured'},{status:503,headers:{'cache-control':'no-store'}});
export function createCloudProductionServer({environment=process.env,projectRoot,db,verifyOwnerOriginal,execute}={}){
 if(environment.MOHEN_CLOUD_EXECUTION_ENABLED!=='true'||!projectRoot||!db||
  !environment.MOHEN_CLOUD_EXECUTOR_CREDENTIAL||!environment.MOHEN_PRODUCER_DATABASE_URL)return async()=>fail();
 if(!execute){try{assertCloudExecutionConfiguration(environment);loadRegistry(projectRoot);}catch{return async()=>fail();}}
 async function verify(v){
  if(verifyOwnerOriginal)return verifyOwnerOriginal(v);
  if(!environment.MOHEN_PRIVATE_WORKER_DATABASE_URL)throw Error('CLOUD_PRIVATE_WORKER_REQUIRED');
  const pool=createPrivateWorkerPool(environment.MOHEN_PRIVATE_WORKER_DATABASE_URL,{ca:environment.MOHEN_DATABASE_CA_CERT});
  try{
   await assertPrivateWorkerIdentity(pool);
   const r=await createPrivateSourceRegistrationRepository(pool).lookup(v.scope.original_id,v.owner_session_token);
   if(r.project_id!==v.scope.project_id||r.source_version_id!==v.scope.source_version_id||r.sha256!==v.scope.raw_sha256||
     r.asset_revision_id!==v.scope.asset_revision_id||
     (r.content_type==='text/plain'?'C01':['image/jpeg','image/png','image/webp'].includes(r.content_type)?'C02':null)!==v.consumer_method_plan.methods[0].method_id)
    throw Error('CLOUD_OWNER_ORIGINAL_MISMATCH');
  }finally{await pool.end();}
 }
 async function readTerminal(runId){
  const rows=await db.queryRows(`select run_id::text,status,current_stage,metadata->'m5_terminal' as terminal
    from control.production_runs where run_id=:'id'::uuid`,{id:runId});
  if(rows.length!==1)return null;const r=rows[0];let terminal=r.terminal;
  if(typeof terminal==='string'){try{terminal=JSON.parse(terminal);}catch{terminal=null;}}
  return {run_id:r.run_id,status:r.status,stage:r.current_stage??'D00',reason_code:terminal?.reason_code??null};
 }
 async function holdRun(v,reason){
  await db.queryRows(`update control.production_runs set status='HOLD',finished_at=now(),current_stage=coalesce(current_stage,'D00'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('m5_terminal',jsonb_build_object('stage',coalesce(current_stage,'D00'),
    'disposition','HOLD','reason_code',:'reason')) where run_id=:'id'::uuid and status='RUNNING' returning run_id::text`,{id:v.run_id,reason});
 }
 return createCloudProductionHandler({credential:environment.MOHEN_CLOUD_EXECUTOR_CREDENTIAL,
  claim:input=>claimCloudProductionRun({db,input,verifyOwnerOriginal:verify}),
  execute:async input=>{
    try{return await (execute?execute(input):executeCloudProductionCli({input,projectRoot:path.resolve(projectRoot),environment,readTerminal,holdRun}));}
    catch{await holdRun(input,'CLOUD_EXECUTOR_SETUP_FAILED');return readTerminal(input.run_id);}
  }});
}
