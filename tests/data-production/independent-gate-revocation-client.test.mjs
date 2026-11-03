import test from 'node:test';
import assert from 'node:assert/strict';
import {createIndependentGateRevocationClient} from '../../pipelines/data-production/orchestrator/independent-gate-revocation-client.mjs';

const audit='123e4567-e89b-42d3-a456-426614174001';
const request='123e4567-e89b-42d3-a456-426614174002';
const event='123e4567-e89b-42d3-a456-426614174003';
const auth='synthetic-reviewer-service-token-32-bytes';
const endpoint='https://independent-gate.example.invalid/revoke';
const args={gateAuditId:audit,requestId:request,reason:'synthetic rights change',
  reviewerBindingRef:'independent-reviewer-G5'};
const valid={schema:'mohen.independent-gate-revocation-receipt.v1',
  gate_audit_id:audit,request_id:request,revoked:true,blocked_count:1,
  invalidation_event_id:event,reviewer_identity_ref:'independent-reviewer-01'};
const response=(body,options={})=>new Response(JSON.stringify(body),{
  headers:{'content-type':'application/json'},...options,
});
test('M3 isolated Reviewer transport binds exact audit, idempotent request and bounded response',async()=>{
  let calls=0;
  const client=createIndependentGateRevocationClient({
    endpoint,credential:auth,fetcher:async(url,options)=>{
      calls++;
      assert.equal(url,endpoint);
      assert.equal(options.method,'POST');
      assert.equal(options.cache,'no-store');
      assert.equal(options.redirect,'error');
      const payload=JSON.parse(options.body);
      assert.deepEqual(payload,{
        schema:'mohen.independent-gate-revocation-request.v1',
        gate_audit_id:audit,request_id:request,reason:args.reason,
        reviewer_binding_ref:args.reviewerBindingRef,
      });
      assert.equal(options.headers.authorization,'Bearer '+auth);
      return response(valid);
    },
  });
  const receipt=await client(args);
  assert.equal(calls,1);
  assert.deepEqual(receipt,{gate_audit_id:audit,request_id:request,
    invalidation_event_id:event,blocked_count:1,reviewer_identity_ref:'independent-reviewer-01'});
  assert.equal(Object.isFrozen(receipt),true);
});
test('M3 client cannot be invoked for object-only revoke or invalid request; sends zero network calls',async()=>{
  let calls=0;
  const client=createIndependentGateRevocationClient({
    endpoint,credential:auth,fetcher:async()=>{calls++;return response(valid)},
  });
  for(const bad of [
    {...args,gateAuditId:'story_seed'},
    {...args,requestId:'not-uuid'},
    {...args,reviewerBindingRef:''},
    {...args,reason:''},
    {...args,reason:'x'.repeat(1025)},
  ]) await assert.rejects(client(bad),/INDEPENDENT_REVOKE_REQUEST_INVALID/);
  assert.equal(calls,0);
});
test('M3 client refuses guessed, stale, forged, oversized, malformed and denied receipts',async()=>{
  for(const [body,opts] of [
    [{...valid,gate_audit_id:request},{}],
    [{...valid,request_id:audit},{}],
    [{...valid,revoked:false},{}],
    [{...valid,blocked_count:-1},{}],
    [{...valid,invalidation_event_id:'bad'},{}],
    [{...valid,reviewer_identity_ref:''},{}],
    [valid,{status:403}],
    [{payload:'x'.repeat(8192)},{headers:{'content-type':'application/json'}}],
  ]) {
    const client=createIndependentGateRevocationClient({
      endpoint,credential:auth,fetcher:async()=>response(body,opts),
    });
    await assert.rejects(client(args),/INDEPENDENT_REVOKE_(DENIED|RESPONSE_INVALID)/);
  }
  for(const badEndpoint of ['http://example.invalid/revoke','https://name:pw@example.invalid/revoke',
    'https://example.invalid/revoke?key=x']) assert.throws(
      ()=>createIndependentGateRevocationClient({endpoint:badEndpoint,credential:auth}),
      /INDEPENDENT_REVOKE_CONFIG_INVALID/);
});
