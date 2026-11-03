import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {runProduction} from '../../pipelines/data-production/orchestrator/orchestrator.mjs';
import {createRunState} from '../../pipelines/data-production/orchestrator/run-state.mjs';
import {executionDigest,consumeAuthorizedStageHandoff} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {PRIVATE_EVIDENCE_ADAPTER_PATH} from '../../pipelines/data-production/orchestrator/adapter-binding.mjs';
import {adapters} from '../../pipelines/data-production/adapters/private-evidence-adapters.mjs';

test('M2 real Runner sets current stage before single-use private adapter handoff, and still holds without independent Gate',async()=>{
  const vars=['MOHEN_EXECUTION_AUTH_PUBLIC_KEY','MOHEN_EXECUTION_AUTH_VERIFY_URL',
    'MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL','MOHEN_TOPIC_JSON_FILE','MOHEN_TOPIC_CONFIG'];
  const saved=vars.map(k=>process.env[k]),savedFetch=globalThis.fetch;
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  process.env.MOHEN_EXECUTION_AUTH_PUBLIC_KEY=publicKey.export({format:'pem',type:'spki'}).toString();
  process.env.MOHEN_EXECUTION_AUTH_VERIFY_URL='https://synthetic-verifier.example.invalid/verify';
  process.env.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL='synthetic-verifier-credential-32-character-secret';
  delete process.env.MOHEN_TOPIC_JSON_FILE;
  delete process.env.MOHEN_TOPIC_CONFIG;
  const run=createRunState({research_intent:'synthetic river history',execution_mode:'attended'});
  assert.equal(run.current_stage,null,'real Runner starts without stage state');
  const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:randomUUID()};
  const job={job_id:'d01.carrier-reading',stage:'D01',implementation:{
    adapter_binding:PRIVATE_EVIDENCE_ADAPTER_PATH,gate_reviewer_binding:'independent-G1'},
    execution_policy:{enabled:true,attended:true,enable_requires:[]}};
  const registry={architecture_generation:'mohen.six-stage.v1',status:'ACTIVE_AUTHORIZED',
    activation:{enabled:true},jobs:[job]};
  const now=Math.floor(Date.now()/1000);
  const claims={iss:'mohen-independent-execution-authorizer',aud:'mohen-production-stage',
    run_id:run.run_id,stage:job.stage,job_id:job.job_id,mode:'attended',
    architecture_generation:registry.architecture_generation,iat:now,exp:now+90,
    jti:randomUUID(),hold_epoch:'synthetic-epoch',
    registry_digest:executionDigest(registry),input_digest:executionDigest(input),
    authorized_conditions:{}};
  const header=Buffer.from(JSON.stringify({typ:'MOHEN-STAGE',alg:'EdDSA',kid:'mohen-stage-v1'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature=sign(null,Buffer.from(header+'.'+payload),privateKey).toString('base64url');
  let verifyCalls=0,workerCalls=0,loaded=0;
  globalThis.fetch=async(_url,options)=>{
    verifyCalls++;
    const b=JSON.parse(options.body);
    return Response.json({...b,allowed:true,consumed_nonce:b.jti});
  };
  try{
    const finished=await runProduction({run,registry,from_stage:'D01',to_stage:'D01',
      context:{resume_input:input,execution_authority_token:header+'.'+payload+'.'+signature,
        loadAdapters:async()=>{loaded++;return adapters;},
        loadPrivateEvidenceRuntime:async()=>{
          assert.equal(verifyCalls,1,'runtime must initialize only after signed grant nonce verification');
          return {privateEvidenceOwnerSessionToken:'synthetic-owner-session',
          privateEvidenceWorker:{draftTextReading:async({run:actual,job:actualJob,input:actualInput,registry:actualRegistry})=>{
          workerCalls++;
          assert.equal(actual.current_stage,'D01');
          assert.equal(actualJob,job);
          assert.equal(actualInput,input);
          assert.equal(actualRegistry,registry);
          assert.equal(consumeAuthorizedStageHandoff({run:actual,job:actualJob,
            input:actualInput,registry:actualRegistry}),true);
          return {stage:'D01',qualification:'UNASSESSED',gate_code:'G1',candidate_kind:'synthetic',
            read_run_id:input.originalId,read_unit_id:input.originalId,artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)};
          }}};
        }}});
    assert.equal(finished.current_stage,'D01');
    assert.equal(finished.status,'HOLD','candidate must not bypass independent Gate');
    assert.equal(finished.stage_results[0].hold.reason_code,'INDEPENDENT_GATE_NOT_VERIFIED');
    assert.equal(workerCalls,1);
    assert.equal(verifyCalls,1,'signed grant nonce must only be consumed once');
    assert.equal(loaded,1);
  }finally{
    globalThis.fetch=savedFetch;
    vars.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]);
  }
});


test('M2 actual Runner must not load private adapter or invoke worker under disabled Registry or missing grant',async()=>{
  let loads=0,invocations=0;
  const job={stage:'D01',job_id:'d01.carrier-reading',
    implementation:{adapter_binding:PRIVATE_EVIDENCE_ADAPTER_PATH,gate_reviewer_binding:'independent-G1'},
    execution_policy:{enabled:true,attended:true,enable_requires:[]}};
  const privateInput={schema:'mohen.private-evidence-stage-request.v1',
    stage:'D01',originalId:randomUUID()};
  const context={resume_input:privateInput,
    loadAdapters:async()=>{loads++;return adapters;},
    privateEvidenceWorker:{draftTextReading:async()=>{invocations++;return {};}},
    privateEvidenceOwnerSessionToken:'synthetic-session'};
  const disabled={architecture_generation:'mohen.six-stage.v1',
    status:'DESIGN_TARGET_NOT_APPLIED',activation:{enabled:false},jobs:[job]};
  await assert.rejects(()=>runProduction({run:createRunState({research_intent:'synthetic'}),
    registry:disabled,from_stage:'D01',to_stage:'D01',context}),/REGISTRY_NOT_ACTIVE/);
  assert.equal(loads,0);
  assert.equal(invocations,0);
  const enabled={...disabled,status:'ACTIVE_AUTHORIZED',activation:{enabled:true}};
  await assert.rejects(()=>runProduction({run:createRunState({research_intent:'synthetic'}),
    registry:enabled,from_stage:'D01',to_stage:'D01',context}),/EXECUTION_SIGNED_GRANT_MISSING/);
  assert.equal(loads,0);
  assert.equal(invocations,0);
});
