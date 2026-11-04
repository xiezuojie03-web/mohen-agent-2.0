import test from 'node:test';
import assert from 'node:assert/strict';
import {readBoundedGateJson} from '../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';
import {createIndependentGateDecisionHandler} from '../../pipelines/data-production/orchestrator/independent-gate-decision-handler.mjs';
import {createIndependentGateCurrentHandler} from '../../pipelines/data-production/orchestrator/independent-gate-current-handler.mjs';
import {createIndependentGateRevocationHandler} from '../../pipelines/data-production/orchestrator/independent-gate-revocation-handler.mjs';
const request=(body,headers={})=>new Request('https://fixture.invalid/',{method:'POST',duplex:'half',body,headers:{'content-type':'application/json',authorization:'Bearer '+'x'.repeat(40),...headers}});
const stalled=()=>new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));},cancel(){return new Promise(()=>{});}});
test('whole body deadline returns even when cancellation never settles and releases lock',async()=>{
  const req=request(stalled());
  await assert.rejects(readBoundedGateJson(req,{maxBytes:4096,timeoutMs:20}),/REQUEST_BODY_TIMEOUT/);
  assert.equal(req.body.locked,false);
});
test('deadline spans all chunks rather than restarting for each chunk',async()=>{
  let timer;
  const stream=new ReadableStream({start(c){timer=setInterval(()=>c.enqueue(new TextEncoder().encode(' ')),8);},cancel(){clearInterval(timer);}});
  await assert.rejects(readBoundedGateJson(request(stream),{maxBytes:4096,timeoutMs:30}),/REQUEST_BODY_TIMEOUT/);
});
test('bounds declared and streamed bytes and accepts numeric Content-Length',async()=>{
  assert.deepEqual(await readBoundedGateJson(request('{"ok":true}',{'content-length':'11'}),{maxBytes:11}),{ok:true});
  await assert.rejects(readBoundedGateJson(request('1234',{'content-length':'4'}),{maxBytes:3}),/REQUEST_TOO_LARGE/);
  await assert.rejects(readBoundedGateJson(request('1234'),{maxBytes:3}),/REQUEST_TOO_LARGE/);
  await assert.rejects(readBoundedGateJson(request('{}',{'content-length':'bad'}),{maxBytes:3}),/REQUEST_TOO_LARGE/);
});
test('bad JSON, missing body, and invalid bounds fail closed',async()=>{
  await assert.rejects(readBoundedGateJson(request('{'),{maxBytes:10}),/BAD_REQUEST_JSON/);
  await assert.rejects(readBoundedGateJson(request(null),{maxBytes:10}),/REQUEST_BODY_REQUIRED/);
  for(const options of [{},{maxBytes:0},{maxBytes:65537},{maxBytes:1,timeoutMs:0},{maxBytes:1,timeoutMs:30001}])
    await assert.rejects(readBoundedGateJson(request('{}'),options));
});
const actor={allowed:true,sessionToken:'fixture',reviewerIdentityRef:'reviewer',reviewerBindingRef:'binding',jobId:'job',readContext:{consumer:'producer',purpose:{namespace:'test',code:'test',version:'1'},scope:{project:'fixture'}}};
for(const [name,factory] of [['decision',createIndependentGateDecisionHandler],['current',createIndependentGateCurrentHandler],['revocation',createIndependentGateRevocationHandler]]) {
  test(`${name} authenticated stalled chunked request returns generic 408 and no-store`,async()=>{
    let calls=0;
    const handler=factory({bodyReadTimeoutMs:20,authenticateReviewer:async()=>actor,authenticateConsumer:async()=>actor,authorityRepository:{decide:async()=>{calls++;},revoke:async()=>{calls++;}},readQualification:async()=>{calls++;}});
    const res=await handler(request(stalled()));
    assert.equal(res.status,408);assert.equal(res.headers.get('cache-control'),'no-store');
    assert.deepEqual(await res.json(),{ok:false,reason:'body_read_timeout'});assert.equal(calls,0);
  });
}
