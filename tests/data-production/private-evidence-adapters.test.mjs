import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
  assertNoUnboundPrivateEvidenceInput,
  PRIVATE_EVIDENCE_ADAPTER_PATH,
} from '../../pipelines/data-production/orchestrator/adapter-binding.mjs';
import {adapters} from '../../pipelines/data-production/adapters/private-evidence-adapters.mjs';

const request=stage=>({schema:'mohen.private-evidence-stage-request.v1',
  stage,originalId:randomUUID()});
const job=stage=>({stage,implementation:{adapter_binding:PRIVATE_EVIDENCE_ADAPTER_PATH}});
test('private inputs require the exact reviewed stage binding; legacy and nested requests always reject',()=>{
  const input=request('D01');
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput(input),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput(input,{job:{stage:'D01',implementation:{adapter_binding:'pipelines/data-production/adapters/layer1-adapters.mjs'}}}),
    /PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput(input,{job:job('D02')}),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput({qualified_source:input},{job:job('D01')}),
    /PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput({...input,private_original:{}},{job:job('D01')}),
    /PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.doesNotThrow(()=>assertNoUnboundPrivateEvidenceInput(input,{job:job('D01')}));
});
test('private adapter fails closed without trusted Owner worker, session and Registry',async()=>{
  const input=request('D01'),boundJob=job('D01');
  const result=await adapters.D01({run:{},job:boundJob,input,context:{}});
  assert.equal(result.disposition,'HOLD');
  assert.equal(result.hold.reason_code,'PRIVATE_STAGE_RUNTIME_NOT_BOUND');
  assert.equal((await adapters.D00({})).disposition,'HOLD');
  assert.equal((await adapters.D04({})).disposition,'HOLD');
  assert.equal((await adapters.D05({})).disposition,'HOLD');
});
test('private D01/D02/D03 adapters only return unassessed producer candidates',async()=>{
  const registry={architecture_generation:'synthetic'},run={run_id:randomUUID()};
  for(const stage of ['D01','D02','D03']){
    const input=request(stage), j=job(stage);
    let called=0;
    const method=stage==='D01'?'draftTextReading':stage==='D02'?'linkReading':'linkClaim';
    const worker={[method]:async args=>{
      called++;
      assert.equal(args.registry,registry);
      assert.equal(args.job,j);
      assert.equal(args.input,input);
      assert.equal(args.token,'synthetic-owner-session');
      return {stage,qualification:'UNASSESSED',gate_code:'G'+stage.slice(-1),
        candidate_kind:'private_fixture'};
    }};
    const result=await adapters[stage]({run,job:j,input,
      context:{registry,privateEvidenceWorker:worker,
        privateEvidenceOwnerSessionToken:'synthetic-owner-session'}});
    assert.equal(called,1);
    assert.equal(result.disposition,'PASS');
    assert.equal(result.output.qualification,'UNASSESSED');
    assert.equal(result.gate_evidence.qualification,'UNASSESSED');
  }
});
test('mismatched stage or self-qualified worker candidate never enters handoff',async()=>{
  const input=request('D02'),j=job('D02');
  const wrong=await adapters.D01({run:{},job:j,input,context:{}});
  assert.equal(wrong.disposition,'HOLD');
  await assert.rejects(()=>adapters.D02({run:{},job:j,input,context:{
    registry:{},privateEvidenceOwnerSessionToken:'synthetic-session',
    privateEvidenceWorker:{linkReading:async()=>({stage:'D02',qualification:'PASS',gate_code:'G2'})},
  }}),/PRIVATE_STAGE_CANDIDATE_INVALID/);
});

test('private adapter lazily binds the configured runtime only for an exact Registry/Stage request',async()=>{
  let loads=0,calls=0;
  const loadPrivateEvidenceRuntime=async()=>{
    loads++;return {privateEvidenceOwnerSessionToken:'synthetic-owner-session',
      privateEvidenceWorker:{draftTextReading:async args=>{
        calls++;assert.equal(args.token,'synthetic-owner-session');
        return {stage:'D01',gate_code:'G1',qualification:'UNASSESSED'};
      }}};
  };
  const input=request('D01'),j=job('D01');
  const context={registry:{},loadPrivateEvidenceRuntime};
  assert.equal((await adapters.D01({run:{},job:j,input,context})).disposition,'PASS');
  assert.equal(loads,1);assert.equal(calls,1);
  assert.equal((await adapters.D02({run:{},job:j,input,context})).disposition,'HOLD');
  assert.equal(loads,1,'wrong Stage must never initialize privileged runtime');
  assert.equal((await adapters.D01({run:{},job:j,input,context:{loadPrivateEvidenceRuntime}})).disposition,'HOLD');
  assert.equal(loads,1,'missing authorized Registry must not initialize runtime');
});
