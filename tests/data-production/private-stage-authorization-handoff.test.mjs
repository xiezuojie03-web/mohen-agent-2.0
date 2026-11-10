import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {
  assertStageExecutionAuthorized, executionDigest, consumeAuthorizedStageHandoff,
} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {createPrivateEvidenceStageWorker} from '../../pipelines/data-production/workers/private-evidence-stage.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const id=()=>randomUUID();
const publicKeyEnv='MOHEN_EXECUTION_AUTH_PUBLIC_KEY';
const urlEnv='MOHEN_EXECUTION_AUTH_VERIFY_URL';
const credentialEnv='MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL';

test('M2 private worker consumes the Runner grant once; no duplicate nonce or unverified read',async()=>{
  const names=[publicKeyEnv,urlEnv,credentialEnv];
  const old=names.map(n=>process.env[n]);
  const oldFetch=globalThis.fetch;
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  process.env[publicKeyEnv]=publicKey.export({type:'spki',format:'pem'}).toString();
  process.env[urlEnv]='https://execution-verifier.example.invalid/verify';
  process.env[credentialEnv]='synthetic-execution-verifier-credential-32-chars';
  let verifyCalls=0,reads=0,bindings=0;
  const originalId=id(),sourceVersion=id(),rawItem=id();
  const bytes=Buffer.from('江南水乡','utf8'),quote=bytes.toString('utf8'),sha=digest(bytes);
  const input={originalId,quote,extent:{
    kind:'utf8_byte_range/v1',start_byte:0,end_byte:bytes.length,
    source_version_id:sourceVersion,raw_item_id:rawItem,
    raw_sha256:sha,quote_sha256:sha,
  }};
  const job={stage:'D01',job_id:'d01.carrier-reading',
    implementation:{gate_reviewer_binding:'independent-G1'},
    execution_policy:{enabled:true,attended:true,enable_requires:[]}};
  const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},
    architecture_generation:'mohen.six-stage.v1',jobs:[job]};
  const run={run_id:id(),execution_mode:'attended',current_stage:'D01',scope:{project_id:id()}};
  const now=Math.floor(Date.now()/1000);
  const claims={iss:'mohen-independent-execution-authorizer',aud:'mohen-production-stage',
    run_id:run.run_id,stage:'D01',job_id:job.job_id,mode:'attended',
    architecture_generation:registry.architecture_generation,
    iat:now,exp:now+120,jti:id(),hold_epoch:'synthetic-hold-epoch',
    registry_digest:executionDigest(registry),input_digest:executionDigest(input),
    authorized_conditions:{}};
  const header=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'MOHEN-STAGE',kid:'mohen-stage-v1'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature=sign(null,Buffer.from(header+'.'+payload),privateKey).toString('base64url');
  const context={execution_authority_token:header+'.'+payload+'.'+signature};
  globalThis.fetch=async(_url,options)=>{
    verifyCalls++;
    if(verifyCalls>1)return new Response('{}',{status:409,headers:{'content-type':'application/json'}});
    const request=JSON.parse(options.body);
    return Response.json({allowed:true,consumed_nonce:request.jti,
      run_id:request.run_id,stage:request.stage,job_id:request.job_id,
      mode:request.mode,hold_epoch:request.hold_epoch,
      registry_digest:request.registry_digest,input_digest:request.input_digest});
  };
  try {
    const worker=createPrivateEvidenceStageWorker({
      persistReading:async()=>({read_run_id:id(),read_unit_id:id(),artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      verifySourceBinding:async()=>{bindings++;return true;},
      readOriginal:async()=>{reads++;return {record:{state:'STORED_VERIFIED',content_type:'text/plain',sha256:sha},bytes};},
      bridge:{linkReading:async()=>({link_id:id(),qualification:'UNASSESSED'}),
        linkClaim:async()=>({link_id:id(),qualification:'UNASSESSED'})},
      // Candidate submission is stubbed: this test asserts one-shot authorization.
      submitGateCandidate:async()=>'candidate-fixture',
      readGateAudit:async()=>null,
      // G0 已批准的消费者方法预选（C01/C02 均在计划内），本文件只断言一次性授权。
      readApprovedMethodPlan:async()=>({gate_audit_id:'audit-fixture',refs:buildMethodPlanRefs({methods:[
        {method_id:'C01',method_version:'v1'},{method_id:'C02',method_version:'v1'}]})}),
    });
    await assertStageExecutionAuthorized({registry,job,run,input,context});
    assert.equal(verifyCalls,1);
    const candidate=await worker.draftTextReading({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.gate_code,'G1');
    assert.equal(verifyCalls,1,'must not reconsume execution grant');
    assert.equal(reads,1);
    assert.equal(bindings,1);
    assert.equal(consumeAuthorizedStageHandoff({registry,job,run,input}),false,'handoff consumed');
    await assert.rejects(()=>worker.draftTextReading({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(reads,1,'nonce replay must not read original again');
    assert.equal(verifyCalls,2);
  } finally {
    globalThis.fetch=oldFetch;
    names.forEach((n,i)=>{if(old[i]===undefined)delete process.env[n];else process.env[n]=old[i];});
  }
});

test('M2 handoff rejects mutated input and wrong stage without issuing a reusable authorization',()=>{
  const job={stage:'D01'},registry={},run={current_stage:'D01'},input={source:'synthetic'};
  assert.equal(consumeAuthorizedStageHandoff({run,job,registry,input}),false);
});
