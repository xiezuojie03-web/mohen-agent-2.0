import test from 'node:test';
import assert from 'node:assert/strict';
import {createIndependentGateRevocationHandler} from '../../pipelines/data-production/orchestrator/independent-gate-revocation-handler.mjs';
import {createIndependentGateRevocationClient} from '../../pipelines/data-production/orchestrator/independent-gate-revocation-client.mjs';

const audit='123e4567-e89b-42d3-a456-426614174001';
const request='123e4567-e89b-42d3-a456-426614174002';
const secret='synthetic-independent-reviewer-bearer-test-key';
const binding='independent-reviewer-G5';
const identity='reviewer-user-synthetic';
const body={schema:'mohen.independent-gate-revocation-request.v1',
  gate_audit_id:audit,request_id:request,reason:'rights withdrawn',reviewer_binding_ref:binding};
const makeReq=(value=body,headers={'content-type':'application/json',authorization:'Bearer '+secret})=>
  new Request('https://independent-reviewer.example.invalid/revoke',{
    method:'POST',headers,body:JSON.stringify(value),
  });
const actor={allowed:true,sessionToken:'synthetic-short-lived-signed-database-session',
  reviewerBindingRef:binding,reviewerIdentityRef:identity};

test('M3 Reviewer handler and client use existing independent repository: exact request, no forged event UUID',async()=>{
  let count=0;
  const repository={revoke:async (args,sessionToken)=>{
    count++;
    assert.deepEqual(args,{auditId:audit,requestId:request,reason:'rights withdrawn'});
    assert.equal(sessionToken,actor.sessionToken);
    return 1;
  }};
  const handler=createIndependentGateRevocationHandler({
    authorityRepository:repository,
    authenticateReviewer:async credential=>credential===secret?actor:null,
  });
  const client=createIndependentGateRevocationClient({
    endpoint:'https://independent-reviewer.example.invalid/revoke',
    credential:secret,
    fetcher:async (_url,options)=>handler(new Request('https://independent-reviewer.example.invalid/revoke',options)),
  });
  const receipt=await client({
    gateAuditId:audit,requestId:request,reason:'rights withdrawn',reviewerBindingRef:binding,
  });
  assert.equal(receipt.blocked_count,1);
  assert.equal(receipt.invalidation_event_id,undefined);
  assert.equal(receipt.reviewer_identity_ref,identity);
  assert.equal(count,1);
});
test('M3 handler rejects fake bearer, wrong binding, malformed IDs and DB failures without fake success',async()=>{
  let writes=0;
  const handler=createIndependentGateRevocationHandler({
    authorityRepository:{revoke:async()=>{writes++;return 1}},
    authenticateReviewer:async token=>token===secret?actor:null,
  });
  assert.equal((await handler(makeReq(body,{'content-type':'application/json'}))).status,401);
  assert.equal((await handler(makeReq(body,{'content-type':'application/json',authorization:'Bearer '+'x'.repeat(40)}))).status,403);
  for(const bad of [
    {...body,gate_audit_id:'bad'},
    {...body,request_id:'bad'},
    {...body,reviewer_binding_ref:'operator'},
    {...body,reason:' '},
  ]) assert.equal((await handler(makeReq(bad))).status,400);
  assert.equal(writes,0);
  const failing=createIndependentGateRevocationHandler({
    authorityRepository:{revoke:async()=>{throw Error('DENIED_BY_DB')}},
    authenticateReviewer:async()=>actor,
  });
  const response=await failing(makeReq());
  assert.equal(response.status,503);
  assert.equal((await response.json()).ok,false);
});
test('M3 Reviewer handler rejects oversized payloads before any DB write',async()=>{
  let writes=0;
  const handler=createIndependentGateRevocationHandler({
    authorityRepository:{revoke:async()=>{writes++;return 1;}},
    authenticateReviewer:async()=>actor,
  });
  const oversized={...body,unused:'x'.repeat(7000)};
  const payload=JSON.stringify(oversized);
  const response=await handler(new Request('https://independent-reviewer.example.invalid/revoke',{
    method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+secret},
    body:payload,
  }));
  assert.equal(response.status,413);
  assert.equal((await response.json()).reason,'request_too_large');
  // A declared oversized length must also be refused before parsing.
  const declared=await handler(new Request('https://independent-reviewer.example.invalid/revoke',{
    method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+secret,
      'content-length':'99999999'},
    body:JSON.stringify(body),
  }));
  assert.equal(declared.status,413);
  assert.equal(writes,0);
});
test('M3 Reviewer handler fails closed on malformed JSON and rejects unsupported methods',async()=>{
  let writes=0;
  const handler=createIndependentGateRevocationHandler({
    authorityRepository:{revoke:async()=>{writes++;return 1;}},
    authenticateReviewer:async()=>actor,
  });
  const bad=await handler(new Request('https://independent-reviewer.example.invalid/revoke',{
    method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+secret},
    body:'{bad-json',
  }));
  assert.equal(bad.status,400);
  assert.equal((await bad.json()).ok,false);
  const get=await handler(new Request('https://independent-reviewer.example.invalid/revoke'));
  assert.equal(get.status,405);
  assert.equal(writes,0);
});
test('M3 Reviewer handler cannot boot without independent authenticator and repository',()=>{
  assert.throws(()=>createIndependentGateRevocationHandler({
    authorityRepository:{revoke:async()=>0},
  }),/INDEPENDENT_REVOKE_SERVICE_CONFIG_REQUIRED/);
});
