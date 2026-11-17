import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createCloudProductionServer} from '../../pipelines/data-production/orchestrator/cloud-production-server.mjs';
import {createCloudProductionDispatch} from '../../pipelines/data-production/orchestrator/cloud-production-dispatch.mjs';
const credential='synthetic-dispatch-credential-at-least-32';
function input(){return {run_id:randomUUID(),research_intent:'fixture',scope:{project_id:randomUUID(),root_task_id:randomUUID(),original_id:randomUUID(),page_number:1},consumer_method_plan:{methods:[{method_id:'C01',method_version:'v1'}]},owner_session_token:'synthetic-owner'};}
const environment={MOHEN_CLOUD_EXECUTION_ENABLED:'true',MOHEN_CLOUD_EXECUTOR_CREDENTIAL:credential,MOHEN_PRODUCER_DATABASE_URL:'postgresql://mohen_producer:synthetic@db.invalid/test'};
test('default cloud server refuses incomplete independent authority before claiming any durable run',async()=>{
 let queries=0;const e=input();const handle=createCloudProductionServer({environment,projectRoot:process.cwd(),verifyOwnerOriginal:async()=>{},db:{queryRows:async()=>{queries++;return [{run_id:e.run_id}];}}});
 const dispatch=createCloudProductionDispatch({url:'https://worker.invalid/execute',credential,fetchImpl:async(u,o)=>handle(new Request(u,o))});
 await assert.rejects(()=>dispatch(e),/CLOUD_EXECUTOR_UNCERTAIN/);assert.equal(queries,0);
});
test('post-claim setup failure becomes durable HOLD without replaying the same claimed run',async()=>{
 const e=input();let status='RUNNING',claimed=false,reason;
 const handle=createCloudProductionServer({environment,projectRoot:process.cwd(),verifyOwnerOriginal:async()=>{},
  execute:async()=>{throw Error('untrusted secret error must not appear');},
  verifyProducerConnection:async()=>{},
  db:{queryRows:async(sql,p)=>{
    if(sql.startsWith('update')&&sql.includes('claimed_at')){if(claimed)return [];claimed=true;return [{run_id:e.run_id}];}
    if(sql.startsWith('update')&&sql.includes("status='HOLD'")){status='HOLD';reason=p.reason;return [{run_id:e.run_id}];}
    return [{run_id:e.run_id,status,current_stage:'D00',terminal:{reason_code:reason}}];
  }}});
 const dispatch=createCloudProductionDispatch({url:'https://worker.invalid/execute',credential,fetchImpl:async(u,o)=>handle(new Request(u,o))});
 const result=await dispatch(e);assert.equal(status,'HOLD');assert.equal(result.status,'HOLD');assert.equal(result.reason_code,'CLOUD_EXECUTOR_SETUP_FAILED');
 assert.equal(JSON.stringify(result).includes('untrusted secret'),false);
 await assert.rejects(()=>dispatch(e),/CLOUD_EXECUTOR_ALREADY_CLAIMED/);
});


test('invalid actual Producer TLS login is denied before claiming a run',async()=>{
 const e=input();let ownerChecks=0,claims=0,executed=0,preflight=0;
 const handle=createCloudProductionServer({environment,projectRoot:process.cwd(),
   verifyOwnerOriginal:async()=>{ownerChecks++;},
   verifyProducerConnection:async()=>{preflight++;throw Error('sensitive connection failure, do not expose');},
   execute:async()=>{executed++;return {run_id:e.run_id,status:'HOLD',stage:'D00'};},
   db:{queryRows:async()=>{claims++;return [{run_id:e.run_id}];}}});
 const dispatch=createCloudProductionDispatch({url:'https://worker.invalid/execute',credential,
   fetchImpl:async(url,options)=>handle(new Request(url,options))});
 await assert.rejects(()=>dispatch(e),/CLOUD_EXECUTOR_UNCERTAIN/);
 assert.equal(ownerChecks,1);assert.equal(preflight,1);assert.equal(claims,0);assert.equal(executed,0);
 const fake=new Request('https://worker.invalid/execute',{method:'GET'});
 assert.equal((await handle(fake)).status,405,'unauthenticated calls must not perform a login probe');
 assert.equal(preflight,1);
});

test('Owner validation still precedes Producer preflight and run claim',async()=>{
 const e=input();let probes=0,claims=0;
 const handle=createCloudProductionServer({environment,projectRoot:process.cwd(),
   verifyOwnerOriginal:async()=>{throw Error('OWNER_DENIED');},
   verifyProducerConnection:async()=>{probes++;},execute:async()=>{},
   db:{queryRows:async()=>{claims++;return [{run_id:e.run_id}];}}});
 const dispatch=createCloudProductionDispatch({url:'https://worker.invalid/execute',credential,
   fetchImpl:async(url,options)=>handle(new Request(url,options))});
 await assert.rejects(()=>dispatch(e),/CLOUD_EXECUTOR_UNCERTAIN/);
 assert.equal(probes,0);assert.equal(claims,0);
});

test('passing Producer preflight preserves one-time claim and bounded terminal',async()=>{
 const e=input();let probes=0,claimed=0,executed=0;
 const handle=createCloudProductionServer({environment,projectRoot:process.cwd(),
   verifyOwnerOriginal:async()=>{},verifyProducerConnection:async()=>{probes++;},
   execute:async()=>{executed++;return {run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'WAITING_GATE'};},
   db:{queryRows:async()=>{claimed++;return [{run_id:e.run_id}];}}});
 const dispatch=createCloudProductionDispatch({url:'https://worker.invalid/execute',credential,
   fetchImpl:async(url,options)=>handle(new Request(url,options))});
 const result=await dispatch(e);
 assert.equal(result.status,'HOLD');assert.equal(result.reason_code,'WAITING_GATE');
 assert.equal(probes,1);assert.equal(claimed,1);assert.equal(executed,1);
});
