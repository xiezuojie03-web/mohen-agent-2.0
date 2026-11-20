import {cloudEnvironment} from './fixtures/cloud-execution-environment.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {cloudProductionInputDigest,claimCloudProductionRun,executeCloudProductionCli} from '../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs';
const id=()=>randomUUID();
const input=()=>({run_id:id(),research_intent:'cloud scope fixture',scope:{project_id:id(),root_task_id:id(),original_id:id(),page_number:1},consumer_method_plan:{methods:[{method_id:'C01',method_version:'v1'}]},owner_session_token:'test-owner'});
test('claim uses existing production run with exact frozen input, after Owner original verification',async()=>{
 const e=input();let verified=false;const db={queryRows:async(sql,params)=>{assert.equal(verified,true);assert.match(sql,/cloud_dispatch/);assert.match(sql,/scope=.*::jsonb/);assert.match(sql,/is null/);assert.equal(params.digest,cloudProductionInputDigest(e));return [{run_id:e.run_id}];}};
 assert.equal(await claimCloudProductionRun({db,input:e,verifyOwnerOriginal:async v=>{assert.equal(v,e);verified=true;}}),true);
});
test('Owner denial, frozen-scope mismatch and repeat claims never authorize execution',async()=>{
 const e=input();let queries=0;const db={queryRows:async()=>{queries++;return [];}};
 await assert.rejects(()=>claimCloudProductionRun({db,input:e,verifyOwnerOriginal:async()=>{throw Error('OWNER_DENIED');}}),/OWNER_DENIED/);assert.equal(queries,0);
 assert.equal(await claimCloudProductionRun({db,input:e,verifyOwnerOriginal:async()=>{}}),false);
});
test('short-lived Owner token is not part of immutable work identity and is never persisted',()=>{
 const e=input(),first=cloudProductionInputDigest(e);assert.equal(first,cloudProductionInputDigest({...e,owner_session_token:'renewed-token'}));
 assert.notEqual(first,cloudProductionInputDigest({...e,scope:{...e.scope,root_task_id:id()}}));
});
test('CLI receiver invokes the original Runner with server-owned arguments and awaits its exit',async()=>{
 const e=input();let called=false;
 const result=await executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:{...cloudEnvironment(),MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://independent.invalid/consume',MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL:'synthetic-credential-at-least-32-characters',MOHEN_EXECUTION_AUTH_DYNAMIC_URL:'https://independent.invalid/token',MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL:'synthetic-credential-at-least-32-characters'},
  runChild:async(command,args,options)=>{called=true;assert.equal(command,process.execPath);assert.match(args[0],/pipelines.*data-production.*run.mjs$/);assert.equal(args[args.indexOf('--run-id')+1],e.run_id);assert.equal(options.env.MOHEN_PRIVATE_WORKER_OWNER_SESSION,e.owner_session_token);assert.equal(options.env.MOHEN_CLOUD_RUN_PROGRESS_RPC,'true');assert.equal(args.includes('--report-dir'),true);return {code:0,timedOut:false};},
  readTerminal:async()=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'INDEPENDENT_GATE_NOT_VERIFIED'}),holdRun:async()=>{throw Error('must not mark fail');}});
 assert.equal(called,true);assert.equal(result.status,'HOLD');
});
test('D01 resume passes --from/--resume-input-file, injects only the D01 grant token, and needs a trusted provider',async()=>{
 const e={...input(),from_stage:'D01'};
 const env={...cloudEnvironment(),MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://independent.invalid/consume',MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL:'synthetic-credential-at-least-32-characters',MOHEN_EXECUTION_AUTH_DYNAMIC_URL:'https://independent.invalid/token',MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL:'synthetic-credential-at-least-32-characters',MOHEN_EXECUTION_AUTH_TOKENS:'{"D00":"old-d00-token"}'};
 let seenArgs,seenEnv;
 const resumeInput={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:e.scope.original_id,page:{kind:'scanned_page/v1',page_number:1}};
 const result=await executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:env,
  resumeProvider:async({fromStage,input})=>{assert.equal(fromStage,'D01');assert.equal(input.run_id,e.run_id);return {resume_input:resumeInput,token:'signed-d01-grant'};},
  runChild:async(_c,args,opts)=>{seenArgs=args;seenEnv=opts.env;return {code:0,timedOut:false};},
  readTerminal:async()=>({run_id:e.run_id,status:'HOLD',stage:'D01',reason_code:'G1_NOT_VERIFIED'}),holdRun:async()=>{throw Error('must not hold');}});
 assert.equal(seenArgs[seenArgs.indexOf('--from')+1],'D01');
 const resumeFile=seenArgs[seenArgs.indexOf('--resume-input-file')+1];assert.match(resumeFile,/resume-input\.json$/);
 const childTokens=JSON.parse(seenEnv.MOHEN_EXECUTION_AUTH_TOKENS);
 assert.equal(childTokens.D01,'signed-d01-grant');assert.equal(childTokens.D00,'old-d00-token');
 assert.equal(result.stage,'D01');
 await assert.rejects(()=>executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:env,
   runChild:async()=>({code:0,timedOut:false}),readTerminal:async()=>({}),holdRun:async()=>{}}),/CLOUD_EXECUTOR_RESUME_PROVIDER_REQUIRED/);
 const fresh=input();assert.notEqual(cloudProductionInputDigest({...fresh,from_stage:'D01'}),cloudProductionInputDigest(fresh));
});
test('missing independent execution authority stops before opening a child process',async()=>{
 let calls=0;await assert.rejects(()=>executeCloudProductionCli({input:input(),projectRoot:process.cwd(),environment:{},runChild:async()=>{calls++;}}),/CLOUD_EXECUTION_AUTHORITY_REQUIRED/);assert.equal(calls,0);
});
test('timeout is persisted as HOLD, never auto-retried or reported completed',async()=>{
 const e=input();let calls=0,held;
 const result=await executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:{...cloudEnvironment(),MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://independent.invalid/consume',MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL:'synthetic-credential-at-least-32-characters',MOHEN_EXECUTION_AUTH_DYNAMIC_URL:'https://independent.invalid/token',MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL:'synthetic-credential-at-least-32-characters'},runChild:async()=>{calls++;return {code:null,timedOut:true};},holdRun:async(v,reason)=>{held=reason;},readTerminal:async()=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:held})});
 assert.equal(calls,1);assert.equal(held,'CLOUD_EXECUTOR_DEADLINE');assert.equal(result.status,'HOLD');
});

test('a child exit without a terminal row persists HOLD instead of leaving a claimed RUNNING task',async()=>{
 for(const initial of [null,{status:'RUNNING'}]){
  const e=input();let reason,reads=0;
  const result=await executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:cloudEnvironment(),
   runChild:async()=>({code:0,timedOut:false}),
   readTerminal:async()=>++reads===1?initial:{run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:reason},
   holdRun:async(_v,code)=>{reason=code;}});
  assert.equal(reason,'CLOUD_EXECUTOR_TERMINAL_UNAVAILABLE');assert.equal(result.status,'HOLD');
 }
});

test('cloud child keeps Producer identity and excludes parent Web secrets and password override',async()=>{
 const e=input();await executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:{...cloudEnvironment(),
  MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://independent.invalid/consume',MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL:'synthetic-credential-at-least-32-characters',MOHEN_EXECUTION_AUTH_DYNAMIC_URL:'https://independent.invalid/token',MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL:'synthetic-credential-at-least-32-characters',
  DATABASE_URL:'postgresql://old_web:secret@db.invalid/test',MOHEN_DATABASE_PASSWORD:'old-web-password',MOHEN_DATABASE_SESSION_SECRET:'web-session-secret',AUTH_SECRET:'browser-secret',MOHEN_PRODUCER_DATABASE_URL:'postgresql://mohen_producer_machine@db.invalid/test?sslmode=verify-full',
  MOHEN_PRODUCER_DATABASE_PASSWORD:'fixture%producer',MOHEN_PRIVATE_WORKER_DATABASE_URL:'postgresql://mohen_private_worker@db.invalid/test?sslmode=verify-full',
  MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD:'fixture@worker'},
  runChild:async(_c,_a,o)=>{for(const [key,password] of [['DATABASE_URL','fixture%producer'],['MOHEN_PRIVATE_WORKER_DATABASE_URL','fixture@worker']]){
    const url=new URL(o.env[key]);
    assert.equal(url.searchParams.get('sslmode'),'verify-full');
    assert.equal(decodeURIComponent(url.password),password);
   }
   assert.equal(new URL(o.env.DATABASE_URL).username,'mohen_producer_machine');
   for(const key of ['MOHEN_DATABASE_PASSWORD','MOHEN_DATABASE_SESSION_SECRET','AUTH_SECRET','MOHEN_PRODUCER_DATABASE_PASSWORD','MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD'])assert.equal(o.env[key],undefined);return {code:0,timedOut:false};},
  holdRun:async()=>{},readTerminal:async()=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'WAITING_GATE'})});
});
test('real CLI reaches dynamic token validation without any pre-issued stage tokens',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mohen-cli-bootstrap-'));const loader=path.join(dir,'fetch.mjs');
 await fs.writeFile(loader,"globalThis.fetch=async()=>Response.json({token:'synthetic-malformed-stage-grant'});\n");
 const e=input();let stderr='';
 try{
  await executeCloudProductionCli({input:e,projectRoot:process.cwd(),environment:{...cloudEnvironment(),MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://independent.invalid/consume',MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL:'synthetic-verifier-credential-32-characters',MOHEN_EXECUTION_AUTH_DYNAMIC_URL:'https://independent.invalid/token',MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL:'synthetic-issuer-credential-32-characters'},
   runChild:async(c,args,o)=>{const child=cp.spawnSync(c,['--import',loader,...args],{...o,encoding:'utf8',timeout:10000});stderr=child.stderr??'';return {code:child.status,timedOut:false};},
   holdRun:async()=>{},readTerminal:async()=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'EXPECTED_TEST_REFUSAL'})});
  assert.equal(stderr.includes('EXECUTION_SIGNED_GRANT_MISSING'),false,stderr);
  assert.match(stderr,/EXECUTION_SIGNED_GRANT_FORMAT_INVALID/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});


test('D00 scope is part of the frozen run and constrains the original Runner',async()=>{
 const base=input(),e={...base,to_stage:'D00'};
 assert.notEqual(cloudProductionInputDigest(base),cloudProductionInputDigest(e));
 assert.throws(()=>cloudProductionInputDigest({...e,to_stage:'D05'}),/CLOUD_EXECUTOR_STAGE_INVALID/);
 const terminal={run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'TEST_HOLD'};
 const result=await executeCloudProductionCli({input:e,projectRoot:process.cwd(),
  environment:cloudEnvironment(),
  runChild:async(_command,args)=>{assert.equal(args[args.indexOf('--to')+1],'D00');return {code:2,timedOut:false};},
  readTerminal:async()=>terminal,holdRun:async()=>{}});
 assert.deepEqual(result,terminal);
});

test('Runner startup probe evaluates the actual entry graph without running a task',async()=>{
 const {probeCloudProductionRunner}=await import('../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs');
 const result=await probeCloudProductionRunner({projectRoot:process.cwd(),environment:cloudEnvironment()});
 assert.deepEqual(result,{ok:true,reason:'runner_ready'});
 const missing=await probeCloudProductionRunner({projectRoot:process.cwd()+'/missing-runner-fixture',environment:cloudEnvironment()});
 assert.deepEqual(missing,{ok:false,reason:'runner_file_unavailable'});
});
test('Runner startup graph has no in-process gate reader (cloud-only MODULE_NOT_FOUND regression)',async()=>{
 const fs=await import('node:fs/promises'),path=await import('node:path');
 const source=await fs.readFile(path.join(process.cwd(),'pipelines/data-production/run.mjs'),'utf8');
 assert.equal(source.includes('inprocess-gate-reader-verifier'),false);
 const verifier=await fs.readFile(path.join(process.cwd(),'pipelines/data-production/orchestrator/inprocess-gate-reader-verifier.mjs'),'utf8');
 assert.equal(/^const \{ Pool \} = require\(/m.test(verifier),false);
});
