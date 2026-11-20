// Cloud request-lifetime adapter for the existing CLI. No second Runner,
// Registry, job queue, Gate signer or professional method is introduced.
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';
import {executionDigest} from './execution-authority.mjs';
import {cloudProductionEndStage} from './cloud-production-dispatch.mjs';
import {assertCloudExecutionConfiguration,resolveMachineDatabaseUrl} from './cloud-execution-readiness.mjs';
export {assertCloudExecutionConfiguration,cloudExecutionReadiness} from './cloud-execution-readiness.mjs';
export function cloudProductionInputDigest(v){
 cloudProductionEndStage(v);
 return executionDigest({run_id:v.run_id,research_intent:v.research_intent,scope:v.scope,
  consumer_method_plan:v.consumer_method_plan,...(v.to_stage===undefined?{}:{to_stage:v.to_stage})});
}
export async function claimCloudProductionRun({db,input,verifyOwnerOriginal}){
 if(typeof verifyOwnerOriginal!=='function')throw Error('CLOUD_OWNER_VERIFIER_REQUIRED');
 await verifyOwnerOriginal(input);
 const rows=await db.queryRows(`update control.production_runs
   set metadata=jsonb_set(metadata,'{cloud_dispatch,claimed_at}',to_jsonb(now()::text),true)
   where run_id=:'id'::uuid and architecture_generation='mohen.six-stage.v1' and status='RUNNING'
     and research_intent=:'intent' and scope=:'scope'::jsonb
     and metadata->'cloud_dispatch'->>'input_digest'=:'digest'
     and metadata->'cloud_dispatch'->>'claimed_at' is null
   returning run_id::text as run_id`,{id:input.run_id,intent:input.research_intent,scope:JSON.stringify(input.scope),digest:cloudProductionInputDigest(input)});
 return rows.length===1&&rows[0].run_id===input.run_id;
}
export function awaitProductionChild(command,args,options,{timeoutMs=240000}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{...options,stdio:['ignore','ignore','ignore'],detached:false});
  let timedOut=false,kill;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');kill=setTimeout(()=>child.kill('SIGKILL'),1000);},timeoutMs);
  const clear=()=>{clearTimeout(timer);clearTimeout(kill);};
  child.once('error',()=>{clear();reject(Error('CLOUD_EXECUTOR_PROCESS_UNAVAILABLE'));});
  child.once('close',code=>{clear();resolve({code,timedOut});});
 });
}
// Parent Web secrets and database-password overrides must never reach Producer.
function runnerEnvironment(environment,ownerToken){
 const keys=['PATH','NODE_ENV','TMPDIR','TMP','TEMP','SYSTEMROOT','WINDIR','NODE_EXTRA_CA_CERTS',
  'MOHEN_DATABASE_CA_CERT','MOHEN_EXECUTION_AUTH_PUBLIC_KEY','MOHEN_EXECUTION_AUTH_VERIFY_URL',
  'MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL','MOHEN_EXECUTION_AUTH_DYNAMIC_URL','MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL',
  'MOHEN_EXECUTION_AUTH_TOKENS','MOHEN_EXECUTION_AUTH_CA_CERT_PATH',
  'MOHEN_INDEPENDENT_GATE_VERIFY_URL','MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL','MOHEN_INDEPENDENT_GATE_CA_CERT_PATH',
  'MOHEN_PRIVATE_WORKER_DATABASE_URL','MOHEN_SUPABASE_URL','MOHEN_PRIVATE_STORAGE_SERVICE_KEY',
  'MOHEN_ORIGINAL_BRIDGE_SECRET','MOHEN_ORIGINAL_BRIDGE_KEY_VERSION','MOHEN_PRIVATE_D02_DELEGATION_ID',
  'MOHEN_PRIVATE_D02_MODEL','MOHEN_LLM_API_KEY','DEEPSEEK_API_KEY','MOHEN_LLM_BASE_URL'];
 const env=Object.fromEntries(keys.filter(k=>environment[k]!==undefined).map(k=>[k,environment[k]]));
 // Never fall back to the web application's generic (potentially privileged)
 // DATABASE_URL. The Runner must use the dedicated limited Producer login.
 const producerDatabaseUrl=resolveMachineDatabaseUrl(
   environment.MOHEN_PRODUCER_DATABASE_URL,environment.MOHEN_PRODUCER_DATABASE_PASSWORD);
 const workerDatabaseUrl=resolveMachineDatabaseUrl(
   environment.MOHEN_PRIVATE_WORKER_DATABASE_URL,environment.MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD);
 if(typeof producerDatabaseUrl!=='string'||!producerDatabaseUrl.trim())
   throw Error('CLOUD_PRODUCER_REQUIRED');
 if(typeof workerDatabaseUrl!=='string'||!workerDatabaseUrl.trim())
   throw Error('CLOUD_PRIVATE_WORKER_REQUIRED');
 // The child receives only resolved protected URLs, not raw password Secrets.
 return {...env,MOHEN_PRIVATE_WORKER_DATABASE_URL:workerDatabaseUrl,DATABASE_URL:producerDatabaseUrl,
  MOHEN_DB_DRIVER:'pg',MOHEN_EXECUTION_AUTH_TOKENS:environment.MOHEN_EXECUTION_AUTH_TOKENS??'{}',MOHEN_PRIVATE_WORKER_OWNER_SESSION:ownerToken,MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED:'true',MOHEN_CLOUD_RUN_PROGRESS_RPC:'true',
  MOHEN_TOPIC_JSON_FILE:'',MOHEN_TOPIC_CONFIG:''};
}
export async function executeCloudProductionCli({input,projectRoot,environment=process.env,runChild=awaitProductionChild,readTerminal,holdRun}){
 const endStage=cloudProductionEndStage(input);
 assertCloudExecutionConfiguration(environment);
 const root=path.resolve(projectRoot);await fs.access(path.join(root,'pipelines/data-production/run.mjs'));
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mohen-cloud-run-'));await fs.chmod(temp,0o700);
 try{
  const scopeFile=path.join(temp,'scope.json');await fs.writeFile(scopeFile,JSON.stringify(input.scope),{mode:0o600});
  const result=await runChild(process.execPath,[path.join(root,'pipelines/data-production/run.mjs'),
    '--project-root',root,'--intent',input.research_intent,'--adapters','pipelines/data-production/adapters/private-evidence-adapters.mjs',
    '--run-id',input.run_id,'--execution-mode','attended','--scope-file',scopeFile,
    '--method-plan',JSON.stringify(input.consumer_method_plan),'--to',endStage,'--report-dir',path.join(temp,'reports')],
    {cwd:root,env:runnerEnvironment(environment,input.owner_session_token)});
  if(result.timedOut)await holdRun(input,'CLOUD_EXECUTOR_DEADLINE');
  else if(result.code!==0)await holdRun(input,'CLOUD_EXECUTOR_PROCESS_FAILED');
  let terminal=await readTerminal(input.run_id);
  if(!terminal||!['PASS','HOLD','REJECT','FAILED'].includes(terminal.status)){
   await holdRun(input,'CLOUD_EXECUTOR_TERMINAL_UNAVAILABLE');
   terminal=await readTerminal(input.run_id);
  }
  if(!terminal||!['PASS','HOLD','REJECT','FAILED'].includes(terminal.status))throw Error('CLOUD_EXECUTOR_TERMINAL_UNAVAILABLE');
  if(endStage==='D00'&&terminal.stage!=='D00')throw Error('CLOUD_EXECUTOR_TERMINAL_SCOPE_MISMATCH');
  return terminal;
 }finally{await fs.rm(temp,{recursive:true,force:true});}
}
