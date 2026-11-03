import test from 'node:test';
import assert from 'node:assert/strict';
import {createIndependentGateDecisionHandler} from '../../pipelines/data-production/orchestrator/independent-gate-decision-handler.mjs';

const id='11111111-1111-4111-8111-111111111111';
const actor={allowed:true,sessionToken:'synthetic-db-session',reviewerIdentityRef:'independent-reviewer',
  reviewerBindingRef:'independent-G1',jobId:'d01.carrier-reading'};
const body={schema:'mohen.independent-gate-decision-request.v1',candidate_id:id,
  request_id:id,result:'PASS',rule_version:'fixture-rule',valid_until:new Date(Date.now()+60000).toISOString(),
  expected_audit_id:null,receipt:{rationale:'Fixture review',checks:{fidelity:true},evidence_refs:[{id:'fixture'}],
    stage_binding:{job_id:actor.jobId,reviewer_binding_ref:actor.reviewerBindingRef,
      consumer:'producer',input_digest:'a'.repeat(64),output_digest:'b'.repeat(64)}}};
const req=(value=body,auth='synthetic-independent-reviewer-bearer-32')=>new Request('https://gate.example.invalid/decide',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth},body:JSON.stringify(value)});

test('independent decision handler passes exact receipt, CAS and Reviewer session to existing signer repository',async()=>{
  let writes=0;
  const handler=createIndependentGateDecisionHandler({authenticateReviewer:async()=>actor,
    authorityRepository:{decide:async(args,token)=>{
      writes++;assert.equal(token,actor.sessionToken);
      assert.deepEqual(args,{candidateId:id,requestId:id,result:'PASS',ruleVersion:'fixture-rule',
        validUntil:body.valid_until,expectedAuditId:null,receipt:body.receipt});return id;
    }}});
  const res=await handler(req());assert.equal(res.status,200);
  const receipt=await res.json();assert.equal(receipt.gate_audit_id,id);assert.equal(writes,1);
  assert.equal(receipt.qualification_current,undefined,'signing is not a current consumption check');
  assert.doesNotMatch(JSON.stringify(receipt),/synthetic-db-session|Fixture review/);
});
test('decision handler denies unbound/forged requests and malformed or oversized bodies before signing',async()=>{
  let writes=0;
  const handler=createIndependentGateDecisionHandler({authenticateReviewer:async()=>actor,
    authorityRepository:{decide:async()=>{writes++;return id}}});
  for(const bad of [{...body,candidate_id:'bad'},{...body,expected_audit_id:'bad'},
    {...body,sessionToken:'forged'},{...body,result:'APPROVED'},
    {...body,valid_until:'2000-01-01'},{...body,receipt:{...body.receipt,stage_binding:undefined}},
    {...body,receipt:{...body.receipt,stage_binding:{...body.receipt.stage_binding,reviewer_binding_ref:'Operator'}}},
    {...body,receipt:{...body.receipt,stage_binding:{...body.receipt.stage_binding,job_id:'other'}}},
    {...body,receipt:{...body.receipt,stage_binding:{...body.receipt.stage_binding,output_digest:'bad'}}}])
    assert.equal((await handler(req(bad))).status,400);
  assert.equal((await handler(req({...body,extra:'x'.repeat(17000)}))).status,413);
  const denied=createIndependentGateDecisionHandler({authenticateReviewer:async()=>null,
    authorityRepository:{decide:async()=>{writes++;return id}}});
  assert.equal((await denied(req())).status,403);assert.equal(writes,0);
});
test('HOLD/REJECT remain independent decisions, DB failure and bad returned audit never fabricate success',async()=>{
  for(const result of ['HOLD','REJECT']) {
    const handler=createIndependentGateDecisionHandler({authenticateReviewer:async()=>actor,
      authorityRepository:{decide:async args=>{assert.equal(args.result,result);return id}}});
    assert.equal((await handler(req({...body,result}))).status,200);
  }
  for(const decide of [async()=>{throw Error('secret connection')},async()=>null]) {
    const handler=createIndependentGateDecisionHandler({authenticateReviewer:async()=>actor,authorityRepository:{decide}});
    const res=await handler(req());assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/secret connection/);
  }
});
