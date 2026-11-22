// Cloud request-lifetime adapter for the existing CLI. No second Runner,
// Registry, job queue, Gate signer or professional method is introduced.
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';
import {executionDigest} from './execution-authority.mjs';
import {cloudProductionEndStage,cloudProductionFromStage} from './cloud-production-dispatch.mjs';
import {assertCloudExecutionConfiguration,resolveMachineDatabaseUrl} from './cloud-execution-readiness.mjs';
export {assertCloudExecutionConfiguration,cloudExecutionReadiness} from './cloud-execution-readiness.mjs';
export function cloudProductionInputDigest(v){
 const from=cloudProductionFromStage(v);
 cloudProductionEndStage(v);
 return executionDigest({run_id:v.run_id,research_intent:v.research_intent,scope:v.scope,
  consumer_method_plan:v.consumer_method_plan,...(v.to_stage===undefined?{}:{to_stage:v.to_stage}),
  ...(from==='D00'?{}:{from_stage:from})});
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
export function awaitProductionChild(command,args,options,{timeoutMs=240000,startupProbe=false}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{...options,stdio:['ignore','ignore','pipe'],detached:false});
  let startupError='';
  child.stderr?.on('data',chunk=>{if(startupError.length<8192)startupError+=chunk.toString().slice(0,8192-startupError.length);});
  let timedOut=false,kill;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');kill=setTimeout(()=>child.kill('SIGKILL'),1000);},timeoutMs);
  const clear=()=>{clearTimeout(timer);clearTimeout(kill);};
  child.once('error',()=>{clear();reject(Error('CLOUD_EXECUTOR_PROCESS_UNAVAILABLE'));});
  child.once('close',code=>{
   clear();
   let failure;
   if(startupProbe&&code!==0){
    if(/Cannot find package ['"]ajv['"]/.test(startupError))failure='runner_ajv_unavailable';
    else if(/Cannot find package ['"]pg['"]/.test(startupError))failure='runner_pg_unavailable';
    else if(/ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND/.test(startupError))failure='runner_module_unavailable';
    else if(/ERR_UNKNOWN_FILE_EXTENSION/.test(startupError))failure='runner_extension_unsupported';
    else if(/SyntaxError/.test(startupError))failure='runner_syntax_invalid';
   }
   resolve({code,timedOut,stderr:startupError,...(failure?{failure}:{})});
  });
 });
}
async function runnerBootstrap(root){
 const directory=path.join(root,'apps/web/cloud-runner-dependencies');
 try{await fs.access(path.join(directory,'ajv-2020.cjs'));}
 catch{return {args:[],environment:{}};}
 return {
  args:['--import',path.join(root,'pipelines/data-production/orchestrator/cloud-runner-dependency-loader.mjs')],
  environment:{MOHEN_CLOUD_RUNNER_DEPENDENCY_DIR:directory},
 };
}

// The probe loads the same static graph as the CLI and stops before any run
// arguments, Owner session, database credentials or mutable state are used.
export async function probeCloudProductionRunner({projectRoot,environment=process.env,runChild=awaitProductionChild}){
 try{assertCloudExecutionConfiguration(environment);}
 catch{return {ok:false,reason:'executor_configuration_invalid'};}
 const root=path.resolve(projectRoot);
 const entry=path.join(root,'pipelines/data-production/run.mjs');
 try{await fs.access(entry);}
 catch{return {ok:false,reason:'runner_file_unavailable'};}
 try{
  const bootstrap=await runnerBootstrap(root);
  const result=await runChild(process.execPath,[...bootstrap.args,entry,'--check-startup'],
   {cwd:root,env:{PATH:environment.PATH??'',...bootstrap.environment}},{timeoutMs:8000,startupProbe:true});
  if(result.timedOut)return {ok:false,reason:'runner_probe_timeout'};
  return result.code===0?{ok:true,reason:'runner_ready'}:{ok:false,reason:result.failure??'runner_import_failed'};
 }catch{return {ok:false,reason:'runner_process_unavailable'};}
}

// Parent Web secrets and database-password overrides must never reach Producer.
function runnerEnvironment(environment,ownerToken){
 const keys=['PATH','NODE_ENV','TMPDIR','TMP','TEMP','SYSTEMROOT','WINDIR','NODE_EXTRA_CA_CERTS',
  'MOHEN_DATABASE_CA_CERT','MOHEN_EXECUTION_AUTH_PUBLIC_KEY','MOHEN_EXECUTION_AUTH_VERIFY_URL',
  'MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL','MOHEN_EXECUTION_AUTH_DYNAMIC_URL','MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL',
  'MOHEN_EXECUTION_AUTH_PUBLIC_KEY_D01','MOHEN_EXECUTION_AUTH_VERIFY_URL_D01','MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL_D01',
  'MOHEN_EXECUTION_AUTH_TOKENS','MOHEN_EXECUTION_AUTH_CA_CERT_PATH',
  'MOHEN_D00_PREVIEW_OIDC_TOKEN','MOHEN_D00_AUTHORITY_PREVIEW_HOST',
  'MOHEN_INDEPENDENT_GATE_VERIFY_URL','MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL','MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIALS','MOHEN_INDEPENDENT_GATE_CA_CERT_PATH',
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
// A failed child otherwise leaves only an opaque reason code. Keep a bounded,
// redacted tail so the failure is diagnosable without exposing URLs, bearers,
// session tokens or digests to anyone who can read the run row.
export function redactChildDiagnostic(stderr){
 if(typeof stderr!=='string'||!stderr.trim())return null;
 return stderr
  .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi,'<redacted-database-url>')
  .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,'Bearer <redacted>')
  .replace(/[A-Za-z0-9+/=_-]{40,}/g,'<redacted-token>')
  .slice(-1200);
}
export async function executeCloudProductionCli({input,projectRoot,environment=process.env,runChild=awaitProductionChild,readTerminal,holdRun,resumeProvider}){
 const endStage=cloudProductionEndStage(input);
 const fromStage=cloudProductionFromStage(input);
 assertCloudExecutionConfiguration(environment);
 const root=path.resolve(projectRoot);
 try{await fs.access(path.join(root,'pipelines/data-production/run.mjs'));}
 catch{throw Error('CLOUD_EXECUTOR_RUNNER_FILE_UNAVAILABLE');}
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mohen-cloud-run-'));await fs.chmod(temp,0o700);
 try{
  const scopeFile=path.join(temp,'scope.json');await fs.writeFile(scopeFile,JSON.stringify(input.scope),{mode:0o600});
  // A resumed run obtains its trusted input and one-use stage grant ONLY from
  // the injected server-side authority callback. The browser-signed body never
  // carries the resume JSON or a private signature.
  let resumeArgs=[],childEnvironment={};
  if(fromStage!=='D00'){
   if(typeof resumeProvider!=='function')throw Error('CLOUD_EXECUTOR_RESUME_PROVIDER_REQUIRED');
   const resume=await resumeProvider({input,fromStage});
   if(!resume||typeof resume!=='object'||!resume.resume_input||typeof resume.resume_input!=='object'||
      Array.isArray(resume.resume_input)||typeof resume.token!=='string'||!resume.token.trim())
     throw Error('CLOUD_EXECUTOR_RESUME_INVALID');
   const resumeFile=path.join(temp,'resume-input.json');
   await fs.writeFile(resumeFile,JSON.stringify(resume.resume_input),{mode:0o600});
   let tokens={};try{tokens=JSON.parse(environment.MOHEN_EXECUTION_AUTH_TOKENS??'{}');}catch{tokens={};}
   if(!tokens||typeof tokens!=='object'||Array.isArray(tokens))tokens={};
   tokens[fromStage]=resume.token;
   // The Runner's loadTrustedResumeInput requires the resume file to sit
   // directly inside a trusted absolute directory; that directory is this
   // request's private 0700 temp dir, never shared across runs.
   childEnvironment={MOHEN_EXECUTION_AUTH_TOKENS:JSON.stringify(tokens),MOHEN_TRUSTED_RESUME_INPUT_DIR:temp};
   resumeArgs=['--from',fromStage,'--resume-input-file',resumeFile];
  }
  const bootstrap=await runnerBootstrap(root);
  const result=await runChild(process.execPath,[...bootstrap.args,path.join(root,'pipelines/data-production/run.mjs'),
    '--project-root',root,'--intent',input.research_intent,'--adapters','pipelines/data-production/adapters/private-evidence-adapters.mjs',
    '--run-id',input.run_id,'--execution-mode','attended','--scope-file',scopeFile,
    '--method-plan',JSON.stringify(input.consumer_method_plan),...resumeArgs,'--to',endStage,'--report-dir',path.join(temp,'reports')],
    {cwd:root,env:{...runnerEnvironment(environment,input.owner_session_token),...childEnvironment,...bootstrap.environment}});
  if(result.timedOut)await holdRun(input,'CLOUD_EXECUTOR_DEADLINE');
  else if(result.code!==0){
   if(result.stderr)console.error('[runner-stderr]\n'+result.stderr);
   await holdRun(input,'CLOUD_EXECUTOR_PROCESS_FAILED',redactChildDiagnostic(result.stderr));
  }
  let terminal=await readTerminal(input.run_id);
  if(!terminal||!['PASS','HOLD','REJECT','FAILED'].includes(terminal.status)){
   await holdRun(input,'CLOUD_EXECUTOR_TERMINAL_UNAVAILABLE');
   terminal=await readTerminal(input.run_id);
  }
  if(!terminal||!['PASS','HOLD','REJECT','FAILED'].includes(terminal.status))throw Error('CLOUD_EXECUTOR_TERMINAL_UNAVAILABLE');
  if(endStage==='D00'&&terminal.stage!=='D00')throw Error('CLOUD_EXECUTOR_TERMINAL_SCOPE_MISMATCH');
  // A resumed run must have genuinely advanced to (or past) from_stage when it
  // reports PASS; a HOLD/REJECT at an earlier stage is a legitimate terminal
  // and must surface its own reason_code rather than a scope mismatch.
  if(fromStage!=='D00'&&terminal.status==='PASS'&&
     Number(terminal.stage.slice(1))<Number(fromStage.slice(1)))throw Error('CLOUD_EXECUTOR_TERMINAL_SCOPE_MISMATCH');
  return terminal;
 }finally{await fs.rm(temp,{recursive:true,force:true});}
}
