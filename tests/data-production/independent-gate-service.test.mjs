import test from 'node:test';
import assert from 'node:assert/strict';
import {createIndependentGateService} from '../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
const id='11111111-1111-4111-8111-111111111111';
const bearer='synthetic-independent-capability-credential-12345';
const key='synthetic-database-session-key-at-least-32';
const request={schema:'mohen.independent-gate-decision-request.v1',candidate_id:id,request_id:id,
 result:'PASS',rule_version:'fixture-v1',valid_until:new Date(Date.now()+60000).toISOString(),expected_audit_id:null,
 receipt:{rationale:'synthetic professional checks',checks:{fixture:true},evidence_refs:[{id:'fixture'}],
 stage_binding:{job_id:'d01.carrier-reading',reviewer_binding_ref:'independent-G1',consumer:'producer',input_digest:'a'.repeat(64),output_digest:'b'.repeat(64)}}};
function pool(kind,{credential=true,unsafe=false,target=true,failCommit=false}={}){
 const events=[];
 const client={query:async(sql,args=[])=>{
  events.push({sql,args});
  if(sql.includes('pg_roles'))return {rows:[{db_identity:'dedicated_'+kind,login_identity:'dedicated_'+kind,
    can_login:true,member:true,unsafe_membership:unsafe}]};
  if(sql.includes('authenticate_gate_service'))return {rows:[{credential:credential?{
    credential_id:id,principal_user_id:id,job_id:'d01.carrier-reading',reviewer_binding_ref:'independent-G1',
    gate_code:'G1',consumer:'producer',purpose_namespace:'G1',purpose_code:'fixture',purpose_version:'1',
    allowed_scope:{project:'fixture'},valid_until:new Date(Date.now()+60000).toISOString()}:null}]};
  if(sql.includes('gate_service_target_allows'))return {rows:[{allowed:target}]};
  if(sql.includes('sign_gate_candidate'))return {rows:[{gate_audit_id:id}]};
  if(sql.includes('revoke_gate_qualification'))return {rows:[{blocked_count:1}]};
  if(sql==='commit'){if(failCommit)throw Error('commit unavailable');return {command:'COMMIT',rows:[]};}
  return {rows:[]};
 },release:()=>{events.push({sql:'release'})}};
 return {events,connect:async()=>client};
}
const req=(body=request,token=bearer)=>new Request('https://independent.example.invalid/decide',{
 method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});
test('service authenticates through real repository boundary and commits before acknowledging decision',async()=>{
 const signerPool=pool('signer'),readerPool=pool('reader');
 const handle=createIndependentGateService({signerPool,readerPool,databaseSessionKey:key});
 const res=await handle(req());assert.equal(res.status,200);
 assert.equal((await res.json()).gate_audit_id,id);
 assert.match(signerPool.events.find(e=>e.sql.includes('authenticate_gate_service')).args[0],/^[a-f0-9]{64}$/);
 assert.equal(signerPool.events.some(e=>e.args?.includes(bearer)),false,'raw capability never enters SQL');
 assert.ok(signerPool.events.findIndex(e=>e.sql.includes('gate_service_target_allows'))<signerPool.events.findIndex(e=>e.sql.includes('sign_gate_candidate')));
 assert.deepEqual(signerPool.events.slice(-2).map(e=>e.sql),['commit','release']);
 assert.equal(readerPool.events.length,0,'read endpoint pool is not used for signing');
});
test('invalid/unsafe/expired credentials and denied target never sign; commit failure never reports success',async()=>{
 for(const options of [{credential:false},{unsafe:true},{target:false},{failCommit:true}]){
  const signerPool=pool('signer',options);
  const handle=createIndependentGateService({signerPool,readerPool:pool('reader'),databaseSessionKey:key});
  const res=await handle(req());assert.notEqual(res.status,200);
  if(!options.failCommit)assert.equal(signerPool.events.some(e=>e.sql.includes('sign_gate_candidate')),false);
  assert.ok(signerPool.events.some(e=>e.sql==='rollback'));
 }
});
test('body/auth/path preflight is bounded before opening privileged connections',async()=>{
 const signerPool=pool('signer');
 const handle=createIndependentGateService({signerPool,readerPool:pool('reader'),databaseSessionKey:key});
 assert.equal((await handle(req(request,'web-cookie'))).status,401);
 assert.equal((await handle(req({...request,extra:'x'.repeat(20000)}))).status,413);
 assert.equal(signerPool.events.length,0);
 assert.throws(()=>createIndependentGateService({signerPool,readerPool:pool('reader')}),/GATE_SERVICE_CONFIG_REQUIRED/);
});

test('read-only service accepts reader configuration and rejects review before SQL',async()=>{
 const readerPool=pool('reader');
 const handle=createIndependentGateService({readOnly:true,readerPool});
 for(const path of ['/decide','/revoke']){
  const review=new Request('https://independent.example.invalid'+path,req());
  assert.equal((await handle(review)).status,404);
 }
 assert.equal(readerPool.events.length,0);
 assert.equal((await handle(new Request('https://independent.example.invalid/current',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+bearer},body:'{}',
 }))).status,400);
 assert.ok(readerPool.events.some(e=>e.sql.includes('authenticate_gate_service')&&e.args[1]==='consume'));
 assert.equal(readerPool.events.some(e=>e.sql.includes('set_config')),false);
 assert.throws(()=>createIndependentGateService({readOnly:true,readerPool,signerPool:pool('signer')}),/GATE_SERVICE_CONFIG_REQUIRED/);
});
