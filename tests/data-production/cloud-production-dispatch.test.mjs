import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCloudProductionDispatch,createCloudProductionHandler} from '../../pipelines/data-production/orchestrator/cloud-production-dispatch.mjs';
const credential='synthetic-cloud-dispatch-credential-32-characters';
function envelope(){return {run_id:randomUUID(),research_intent:'test cloud task',scope:{project_id:randomUUID(),root_task_id:randomUUID(),original_id:randomUUID(),page_number:1},consumer_method_plan:{methods:[{method_id:'C01',method_version:'v1'}]},owner_session_token:'synthetic-short-lived-owner-session'};}
function setup({claim=async()=>true,execute=async e=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'INDEPENDENT_GATE_NOT_VERIFIED'}),now=()=>Date.now()}={}){
 const calls=[];
 const handle=createCloudProductionHandler({credential,claim,execute,now});
 const dispatch=createCloudProductionDispatch({url:'https://private-executor.example.invalid/execute',credential,now,
  fetchImpl:async(url,options)=>{calls.push({url,options});return handle(new Request(url,options));}});
 return {dispatch,handle,calls};
}
test('cloud handoff waits for the existing Runner and returns a bounded honest HOLD',async()=>{
 let finish;const pending=new Promise(r=>{finish=r});const e=envelope();
 const {dispatch}=setup({execute:async()=>{await pending;return {run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'INDEPENDENT_GATE_NOT_VERIFIED',private_bytes:'MUST NOT LEAK'};}});
 let done=false;const p=dispatch(e).then(r=>{done=true;return r;});
 await new Promise(r=>setTimeout(r,20));assert.equal(done,false,'must retain request lifetime, never detach');
 finish();const r=await p;assert.equal(r.status,'HOLD');assert.equal(r.run_id,e.run_id);assert.equal(JSON.stringify(r).includes('MUST NOT LEAK'),false);
});
test('cloud dispatch rejects missing config, credentials in URL and non-TLS destinations',()=>{
 for(const url of ['http://worker.invalid/execute','https://u:p@worker.invalid/execute','https://worker.invalid/execute?q=1','https://worker.invalid/execute#x'])
  assert.throws(()=>createCloudProductionDispatch({url,credential}),/CLOUD_EXECUTOR_CONFIG_INVALID/);
 assert.throws(()=>createCloudProductionDispatch({}),/CLOUD_EXECUTOR_CONFIG_INVALID/);
});
test('same run is claimed only once; replay cannot start a second Runner',async()=>{
 const claimed=new Set();let executed=0;
 const {dispatch}=setup({claim:async e=>{if(claimed.has(e.run_id))return false;claimed.add(e.run_id);return true;},execute:async e=>{executed++;return {run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'WAITING_GATE'};}});
 const e=envelope();await dispatch(e);await assert.rejects(()=>dispatch(e),/CLOUD_EXECUTOR_ALREADY_CLAIMED/);assert.equal(executed,1);
});
test('tampered root, project or source is rejected before durable claim or execution',async()=>{
 for(const field of ['root_task_id','project_id','original_id']){
  let claims=0;const {dispatch,handle}=setup({claim:async()=>{claims++;return true;}});
  // Capture a valid signed request, then tamper its immutable body.
  await dispatch(envelope());const {calls}=setup();
  const first=createCloudProductionDispatch({url:'https://private-executor.example.invalid/execute',credential,
    fetchImpl:async(url,options)=>{const body=JSON.parse(options.body);body.scope[field]=randomUUID();return handle(new Request(url,{...options,body:JSON.stringify(body)}));}});
  await assert.rejects(()=>first(envelope()),/CLOUD_EXECUTOR_REJECTED/);assert.equal(claims,1);
 }
});
test('expired signature and arbitrary executable fields never reach the Runner',async()=>{
 let claims=0;const e=envelope();
 const handle=createCloudProductionHandler({credential,claim:async()=>{claims++;return true;},execute:async()=>{throw Error('must not run');},now:()=>100000});
 const send=createCloudProductionDispatch({url:'https://private-executor.example.invalid/execute',credential,now:()=>10000,
  fetchImpl:async(u,o)=>handle(new Request(u,o))});
 await assert.rejects(()=>send(e),/CLOUD_EXECUTOR_REJECTED/);assert.equal(claims,0);
 const {dispatch}=setup();await assert.rejects(()=>dispatch({...e,command:'arbitrary executable'}),/CLOUD_EXECUTOR_REQUEST_INVALID/);
});
test('from_stage resume accepts verified handoff stages D01/D02, rejects later ones, and bounds the reported stage',async()=>{
 const {dispatch}=setup({execute:async e=>({run_id:e.run_id,status:'HOLD',stage:'D01',reason_code:'G1_NOT_VERIFIED'})});
 const r=await dispatch({...envelope(),from_stage:'D01'});
 assert.equal(r.stage,'D01');
 // D02 resumes only after the G1 reading handoff is qualified; the reported stage
 // must stay within [from,to].
 const d02=setup({execute:async e=>({run_id:e.run_id,status:'HOLD',stage:'D02',reason_code:'D02_PROVIDER_HOLD'})});
 const r2=await d02.dispatch({...envelope(),from_stage:'D02'});
 assert.equal(r2.stage,'D02');
 await assert.rejects(()=>dispatch({...envelope(),from_stage:'D03'}),/CLOUD_EXECUTOR_FROM_STAGE_INVALID/);
 const before=setup({execute:async e=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'X'})});
 await assert.rejects(()=>before.dispatch({...envelope(),from_stage:'D01'}),/CLOUD_EXECUTOR_UNCERTAIN/,'resume may not report a stage before D01');
 const beforeD02=setup({execute:async e=>({run_id:e.run_id,status:'HOLD',stage:'D01',reason_code:'X'})});
 await assert.rejects(()=>beforeD02.dispatch({...envelope(),from_stage:'D02'}),/CLOUD_EXECUTOR_UNCERTAIN/,'resume may not report a stage before D02');
});
test('a network failure is uncertain and never automatically retried',async()=>{
 let calls=0;const dispatch=createCloudProductionDispatch({url:'https://private-executor.example.invalid/execute',credential,
  fetchImpl:async()=>{calls++;throw Error('private network or token text');}});
 await assert.rejects(()=>dispatch(envelope()),/CLOUD_EXECUTOR_UNCERTAIN/);assert.equal(calls,1);
});
test('executor error and oversized requests return bounded codes without private error text',async()=>{
 const {dispatch}=setup({execute:async()=>{throw Error('source text and credentials MUST NOT LEAK');}});
 await assert.rejects(()=>dispatch(envelope()),/CLOUD_EXECUTOR_UNCERTAIN/);
 const {dispatch:bounded}=setup();await assert.rejects(()=>bounded({...envelope(),research_intent:'x'.repeat(50000)}),/CLOUD_EXECUTOR_REQUEST_INVALID/);
});


test('signed D00 end stage cannot be changed or report a downstream terminal',async()=>{
 const input={...envelope(),to_stage:'D00'};
 let claims=0;
 const {handle,dispatch}=setup({claim:async()=>{claims++;return true;}});
 assert.equal((await dispatch(input)).stage,'D00');
 const tamper=createCloudProductionDispatch({url:'https://private-executor.example.invalid/execute',credential,
  fetchImpl:async(url,options)=>handle(new Request(url,{...options,body:JSON.stringify({...input,to_stage:'D02'})}))});
 await assert.rejects(()=>tamper(input),/CLOUD_EXECUTOR_REJECTED/);
 assert.equal(claims,1);
 const downstream=setup({execute:async v=>({run_id:v.run_id,status:'PASS',stage:'D01'})});
 await assert.rejects(()=>downstream.dispatch(input),/CLOUD_EXECUTOR_UNCERTAIN/);
});
