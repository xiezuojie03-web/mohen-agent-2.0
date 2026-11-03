import test from 'node:test';
import assert from 'node:assert/strict';
import {createGateStageQualificationReader} from '../../packages/data-access/src/gate-stage-qualification.mjs';
import {createIndependentGateCurrentHandler} from '../../pipelines/data-production/orchestrator/independent-gate-current-handler.mjs';
import {createIndependentGateClient} from '../../pipelines/data-production/orchestrator/independent-gate-client.mjs';

const id='11111111-1111-4111-8111-111111111111';
const request={schema:'mohen.independent-gate-current-check.v1',run_id:id,
  job_id:'d01.carrier-reading',stage:'D01',gate_code:'G1',input_digest:'a'.repeat(64),
  output_digest:'b'.repeat(64),reviewer_binding_ref:'independent-G1',consumer:'producer'};
const context={consumer:'producer',purpose:{namespace:'G1',code:'fixture',version:'1'},scope:{project:'fixture'}};
const credential='synthetic-consumer-credential-at-least-32';
const receipt={gate_audit_id:id,object_type:'read_unit',object_id:id,artifact_revision:'r1',
  valid_until:new Date(Date.now()+60000).toISOString()};
const req=(body=request,auth=credential)=>new Request('https://gate.example.invalid/current',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth},body:JSON.stringify(body)});

test('current stage read binds digests/job/Reviewer and scoped SQL, returns only qualification metadata',async()=>{
  let calls=0;
  const reader=createGateStageQualificationReader({query:async(sql,params)=>{
    calls++;
    assert.match(sql,/qualification_allows/);
    assert.match(sql,/stage_binding/);
    assert.match(sql,/decision_origin='independent_gate'/);
    assert.match(sql,/input_fingerprint/);
    assert.deepEqual(params,[id,'D01','G1','d01.carrier-reading','independent-G1',
      'a'.repeat(64),'b'.repeat(64),'producer','G1','fixture','1','{"project":"fixture"}']);
    return {rows:[receipt]};
  }});
  assert.deepEqual(await reader(request,context),{...request,...receipt,
    schema:'mohen.independent-gate-current-receipt.v1',qualification_current:true,
    decision_origin:'independent_gate',result:'PASS'});
  assert.equal(calls,1);
});
test('reader denies missing/malformed scope, mismatched stage and ambiguous/expired results',async()=>{
  let reads=0;
  const reader=createGateStageQualificationReader({query:async()=>{reads++;return {rows:[]}}});
  for(const bad of [{...context,scope:{}},{...context,scope:{project:undefined}},{...context,consumer:'watch'}])
    await assert.rejects(()=>reader(request,bad),/QUALIFICATION_CONTEXT_REQUIRED/);
  for(const bad of [{...request,gate_code:'G2'},{...request,input_digest:'bad'},
    {...request,job_id:''},{...request,run_id:'bad'},{...request,consumer:'watch'},
    {...request,reviewer_binding_ref:''}])
    await assert.rejects(()=>reader(bad,context),/STAGE_QUALIFICATION_REQUEST_INVALID/);
  assert.equal(reads,0);
  assert.equal(await reader(request,context),null);
  for(const rows of [[receipt,receipt],[{...receipt,valid_until:'2000-01-01'}],[{...receipt,gate_audit_id:'bad'}]]) {
    const invalid=createGateStageQualificationReader({query:async()=>({rows})});
    assert.equal(await invalid(request,context),null);
  }
});
test('existing Producer client reaches current handler with server-side scope and no private payload',async()=>{
  let reads=0;
  const readQualification=async(body,scope)=>{
    reads++;assert.deepEqual(body,request);assert.deepEqual(scope,context);
    return {...request,...receipt,qualification_current:true,decision_origin:'independent_gate',result:'PASS'};
  };
  const handler=createIndependentGateCurrentHandler({readQualification,
    authenticateConsumer:async token=>token===credential?{
      allowed:true,readContext:context,jobId:request.job_id,reviewerBindingRef:request.reviewer_binding_ref}:null});
  const client=createIndependentGateClient({endpoint:'https://gate.example.invalid/current',credential,
    fetcher:async(url,options)=>handler(new Request(url,options))});
  const actual=await client({run:{run_id:id},job:{job_id:request.job_id,stage:'D01',
    implementation:{gate_reviewer_binding:'independent-G1'}},stage:'D01',gate:'G1',
    input_digest:request.input_digest,output_digest:request.output_digest});
  assert.equal(actual.gate_audit_id,id);assert.equal(reads,1);
  assert.equal((await handler(req(request,'x'.repeat(40)))).status,403);
  assert.equal((await handler(req({...request,quote:'private material'}))).status,400);
  assert.equal((await handler(req({...request,job_id:'other'}))).status,403);
  assert.equal((await handler(req({...request,reviewer_binding_ref:'other'}))).status,403);
  assert.equal(reads,1);
});
test('current handler fails closed on revocation, unavailable DB, oversized stream and missing authentication',async()=>{
  const actor={allowed:true,readContext:context,jobId:request.job_id,reviewerBindingRef:request.reviewer_binding_ref};
  for(const [readQualification,status] of [[async()=>null,409],[async()=>{throw Error('secret database connection')},503]]) {
    const handler=createIndependentGateCurrentHandler({readQualification,authenticateConsumer:async()=>actor});
    const response=await handler(req());assert.equal(response.status,status);
    assert.doesNotMatch(await response.text(),/secret database/);
  }
  let reads=0;
  const handler=createIndependentGateCurrentHandler({readQualification:async()=>{reads++},authenticateConsumer:async()=>actor});
  assert.equal((await handler(req({...request,extra:'x'.repeat(17000)}))).status,413);
  assert.equal((await handler(new Request('https://gate.example.invalid/current'))).status,405);
  assert.equal((await handler(new Request('https://gate.example.invalid/current',{
    method:'POST',headers:{'content-type':'application/json'},body:'{}'}))).status,401);
  assert.equal(reads,0);
});
