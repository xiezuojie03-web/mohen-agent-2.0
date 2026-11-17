// Real disposable PG17 Owner-Root run progress exercised under the exact
// dedicated low-privilege Producer LOGIN (not SET ROLE from admin).
// Synthetic data only; no cloud instance, real Gate review or private media.
import assert from "node:assert/strict";
import {randomUUID,createHmac} from "node:crypto";
import {createRequire} from "node:module";
import {execFileSync} from "node:child_process";
import {persistStageProgress,finalizeRun} from "../../pipelines/data-production/orchestrator/run-persistence.mjs";
import {assertProducerIdentity} from "../../packages/data-access/src/producer-identity.mjs";
import {assertPrivateWorkerIdentity} from "../../packages/data-access/src/private-worker-pool.mjs";
import {mkdtempSync,rmSync,readFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";

const database=process.env.MOHEN_TEST_DATABASE;
const host=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:null;
const socket=host??process.env.MOHEN_TEST_SOCKET;
if(!process.env.MOHEN_TEST_PSQL||!(host||socket?.startsWith("/workspace/"))||
   !/^mohen_k3_[a-z0-9_]*test$/.test(database??""))
  throw Error("ISOLATED_TEST_DATABASE_REQUIRED");
const args=["-X","-q","-h",socket,"-p",process.env.MOHEN_TEST_PORT??"55432",
  "-U","k3_admin","-d",database,"-At","-v","ON_ERROR_STOP=1"];
const sql=s=>execFileSync(process.env.MOHEN_TEST_PSQL,args,{input:s,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),"codex-k3-isolated");
const {Pool}=createRequire(new URL("../../packages/data-access/package.json",import.meta.url))("pg");
const base={host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),database,max:2};
const admin=new Pool({...base,user:"k3_admin"});
const producer=new Pool({...base,user:"mohen_m5_producer_login"});
const worker=new Pool({...base,user:"mohen_m5_worker_login"});
const uuid=()=>randomUUID();
const owner=uuid(),foreignOwner=uuid(),project=uuid(),root=uuid(),runId=uuid(),
  foreignRun=uuid(),unclaimedRun=uuid(),passRun=uuid();
const key="m5-owner-root-progress-isolated-pg17-session-key-2026";
const session=uid=>{
 const body=Buffer.from(JSON.stringify({uid,r:[],exp:Date.now()+600000})).toString("base64url");
 return body+"."+createHmac("sha256",key).update(body).digest("base64url");
};
const ownerToken=session(owner),foreignToken=session(foreignOwner);
const queryRows=async(sqlText,params={})=>{
 const values=[];const text=sqlText.replace(/:'([^']+)'/g,(_all,name)=>{
  values.push(params[name]);return "$"+values.length;
 });
 return (await producer.query(text,values)).rows;
};
const invoke=async(id,token,action,stage,status=null,terminal=null)=>
 (await producer.query("select control.m5_write_production_progress($1::uuid,$2,$3,$4,$5,$6::jsonb) as run_id",
   [id,token,action,stage,status,terminal===null?null:JSON.stringify(terminal)])).rows;
const missingToken="bad-session-not-a-signed-owner";
const scope=(p,r)=>JSON.stringify({project_id:p,root_task_id:r});
const claimed=JSON.stringify({cloud_dispatch:{claimed_at:"2026-11-17T00:00:00Z"}});
const insertRun=async(id,projectId,rootId,metadata=claimed)=>{
 await admin.query("insert into control.production_runs(run_id,research_intent,scope,execution_mode,status,metadata,architecture_generation) values($1,'isolated M5 owner-root progress',$2::jsonb,'attended','RUNNING',$3::jsonb,'mohen.six-stage.v1')",[id,scope(projectId,rootId),metadata]);
};
try{
 await admin.query("insert into public.users(user_id,email,username,password_hash)values($1,$2,'M5 test Owner','synthetic')",[owner,owner+"@example.invalid"]);
 await admin.query("insert into public.users(user_id,email,username,password_hash)values($1,$2,'M5 foreign test','synthetic')",[foreignOwner,foreignOwner+"@example.invalid"]);
 await admin.query("insert into control.session_verification_keys(verification_key) values($1) on conflict(key_slot) do update set verification_key=excluded.verification_key",[key]);
 await admin.query("insert into studio.projects(project_id,owner_user_id,project_title) values($1,$2,'synthetic M5 project')",[project,owner]);
 await admin.query("insert into public.research_tasks(task_id,prompt,topic,status,owner_user_id,checkpoint) values($1,'synthetic owner-root run','other','hold',$2,$3::jsonb)",
   [root,owner,JSON.stringify({studio:{project_id:project}})]);
 await insertRun(runId,project,root);
 await insertRun(unclaimedRun,project,root,"{}");
 await insertRun(foreignRun,uuid(),uuid());
 await insertRun(passRun,project,root);
 const id=(await producer.query("select current_user::text as current_user,session_user::text as login")).rows[0];
 assert.equal(id.login,"mohen_m5_producer_login");assert.equal(id.current_user,id.login);
 await assertProducerIdentity(queryRows,{cloud:true});
 await assertPrivateWorkerIdentity(worker);
 const roles=(await worker.query("select current_user::text as current_user,session_user::text as login")).rows[0];
 assert.equal(roles.current_user,"mohen_m5_worker_login");assert.equal(roles.login,roles.current_user);
 await assert.rejects(producer.query("select run_id from control.production_runs limit 1"),/permission denied/);
 await assert.rejects(worker.query("select control.m5_write_production_progress($1::uuid,$2,'stage','D00',null,null)",[runId,ownerToken]),/permission denied/);
 await assert.rejects(invoke(runId,missingToken,"stage","D00"),/M5_PRODUCER_OWNER_DENIED/);
 await assert.rejects(invoke(runId,foreignToken,"stage","D00"),/M5_PRODUCER_ROOT_DENIED/);
 await assert.rejects(invoke(foreignRun,ownerToken,"stage","D00"),/M5_PRODUCER_ROOT_DENIED/);
 await assert.rejects(invoke(unclaimedRun,ownerToken,"stage","D00"),/M5_PRODUCER_RUN_NOT_CLAIMED/);
 await assert.rejects(invoke(runId,ownerToken,"stage","D02"),/M5_PRODUCER_STAGE_DENIED/);
 await persistStageProgress({runId,stage:"D00",db:{queryRows},ownerSessionToken:ownerToken});
 await assert.rejects(invoke(runId,ownerToken,"stage","D02"),/M5_PRODUCER_STAGE_DENIED/);
 const before=(await admin.query("select current_stage,status,metadata from control.production_runs where run_id=$1",[runId])).rows[0];
 assert.equal(before.current_stage,"D00");assert.equal(before.status,"RUNNING");
 assert.equal(before.metadata.cloud_dispatch.claimed_at,"2026-11-17T00:00:00Z");
 await assert.rejects(invoke(runId,ownerToken,"terminal","D00","PASS",
  {stage:"D00",gate_code:"G0",disposition:"PASS",independent_gate_audit_id:uuid()}),
  /M5_PRODUCER_GATE_NOT_CURRENT/);
 const dir=mkdtempSync(path.join(os.tmpdir(),"mohen-m5-producer-progress-"));
 try{
  const result=await finalizeRun({run:{
    run_id:runId,research_intent:"synthetic M5",scope:{project_id:project,root_task_id:root},
    status:"HOLD",current_stage:"D00",stage_results:[{
      disposition:"HOLD",hold:{reason_code:"INDEPENDENT_GATE_NOT_VERIFIED",
        verification_error:"INDEPENDENT_GATE_VERIFY_UNAVAILABLE"}}]},
    db:{queryRows},outDir:dir,ownerSessionToken:ownerToken});
  assert.equal(JSON.parse(readFileSync(result.machine_report,"utf8")).status,"HOLD");
  const after=(await admin.query("select status,current_stage,finished_at,metadata->'m5_terminal' as terminal from control.production_runs where run_id=$1",[runId])).rows[0];
  assert.equal(after.status,"HOLD");assert.equal(after.current_stage,"D00");assert.ok(after.finished_at);
  assert.deepEqual(after.terminal,{
    stage:"D00",gate_code:"G0",disposition:"HOLD",independent_gate_audit_id:null,
    reason_code:"INDEPENDENT_GATE_NOT_VERIFIED",verification_error:"INDEPENDENT_GATE_VERIFY_UNAVAILABLE",
  });
  await assert.rejects(invoke(runId,ownerToken,"stage","D00"),/M5_PRODUCER_RUN_NOT_CLAIMED/);
 }finally{rmSync(dir,{recursive:true,force:true});}
 await persistStageProgress({runId:passRun,stage:"D00",db:{queryRows},ownerSessionToken:ownerToken});
 await assert.rejects(invoke(passRun,ownerToken,"terminal","D00","PASS",
   {stage:"D00",gate_code:"G0",disposition:"PASS"}),/M5_PRODUCER_GATE_REQUIRED/);
 const hold=(await admin.query("select status from control.production_runs where run_id=$1",[passRun])).rows[0].status;
 assert.equal(hold,"RUNNING","forged PASS must not close the run");
 console.log("M5_PRODUCER_SCOPED_PROGRESS_PG_PASS separate-real-LOGIN producer/worker identity owner/project/root/claimed-run guards real-stage-write real-terminal-HOLD receipt unsigned-PASS-denied wrong-owner/root/no-claim/jump/worker/direct-table/terminal-replay-denied no-cloud");
}finally{await Promise.allSettled([producer.end(),worker.end(),admin.end()]);}
