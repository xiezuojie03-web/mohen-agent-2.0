// D02-D05 private candidate worker tests: real signed stage grants, one-shot
// nonce, positive/negative/idempotency-shaped cases. Candidates are UNASSESSED
// only; nothing here signs a Gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {
  assertStageExecutionAuthorized, executionDigest,
} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {createPrivateEvidenceStageWorker} from '../../pipelines/data-production/workers/private-evidence-stage.mjs';

const id=()=>randomUUID();
const names=['MOHEN_EXECUTION_AUTH_PUBLIC_KEY','MOHEN_EXECUTION_AUTH_VERIFY_URL','MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL'];

// 与 Runner 相同的签名授权边界：一个 EdDSA stage grant + 一次即时 nonce 消费。
// grant 在输入校验前即被消费，所以每个负例都重新授权。
async function withStageAuthority({stage,input},body) {
  const old=names.map(n=>process.env[n]);
  const oldFetch=globalThis.fetch;
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  process.env.MOHEN_EXECUTION_AUTH_PUBLIC_KEY=publicKey.export({type:'spki',format:'pem'}).toString();
  process.env.MOHEN_EXECUTION_AUTH_VERIFY_URL='https://execution-verifier.example.invalid/verify';
  process.env.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL='synthetic-execution-verifier-credential-32-chars';
  const job={stage,job_id:'fixture-'+stage.toLowerCase(),
    implementation:{gate_reviewer_binding:'independent-G'+stage.slice(-1)},
    execution_policy:{enabled:true,attended:true,enable_requires:[]}};
  const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},
    architecture_generation:'mohen.six-stage.v1',jobs:[job]};
  const run={run_id:id(),execution_mode:'attended',current_stage:stage};
  const now=Math.floor(Date.now()/1000);
  const claims={iss:'mohen-independent-execution-authorizer',aud:'mohen-production-stage',
    run_id:run.run_id,stage,job_id:job.job_id,mode:'attended',
    architecture_generation:registry.architecture_generation,
    iat:now,exp:now+120,jti:id(),hold_epoch:'synthetic-hold-epoch',
    registry_digest:executionDigest(registry),input_digest:executionDigest(input),
    authorized_conditions:{}};
  const header=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'MOHEN-STAGE',kid:'mohen-stage-v1'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const context={execution_authority_token:
    header+'.'+payload+'.'+sign(null,Buffer.from(header+'.'+payload),privateKey).toString('base64url')};
  let verifyCalls=0;
  globalThis.fetch=async()=>{
    verifyCalls++;
    if(verifyCalls>1)return new Response('{}',{status:409,headers:{'content-type':'application/json'}});
    return Response.json({allowed:true,consumed_nonce:claims.jti,
      run_id:run.run_id,stage,job_id:job.job_id,mode:'attended',
      hold_epoch:claims.hold_epoch,registry_digest:claims.registry_digest,
      input_digest:claims.input_digest});
  };
  try {
    await assertStageExecutionAuthorized({registry,job,run,input,context});
    return await body({registry,job,run,context});
  } finally {
    globalThis.fetch=oldFetch;
    names.forEach((n,i)=>{if(old[i]===undefined)delete process.env[n];else process.env[n]=old[i];});
  }
}

const bridgeStub={linkReading:async()=>({}),linkClaim:async()=>({})};
const observation=()=>({h_type:'H05',
  literal_reading:'均科正耗平米三斗六升五合以下低田等准熟起科同',
  normalized_text:'均科正耗平米三斗六升五合。以下低田等，准熟起科同。',
  research_proposition:'《松江府志》卷十一田赋门载青浦县低田科则：均科正耗平米三斗六升五合，准熟起科。',
  source_voice:'official_gazetteer',evidence_type:'gazetteer_tax_quota_observation',
  uncertainty:{qualification:'UNASSESSED'}});
const claim=()=>({assertion:'《松江府志》卷十一田赋门记载：青浦县低田等则均科正耗平米三斗六升五合，准熟起科。',
  change_type:'taxation_quota_assessment',
  time_scope:{note:'edition dating unresolved',qualification:'UNASSESSED'},
  support_type:'supports'});
const finding=()=>({finding_type:'institutional_mechanism',
  human_question:'松江府田赋如何通过田等差则实现税负分配？',
  interpretive_statement:'《松江府志》卷十一田赋门所示科则以田等为变量差别税额：低田均科正耗平米三斗六升五合并准熟起科。',
  understanding_delta:'将孤立的科则条文理解为田等×熟荒状态的二维征税规则。',
  counter_view_or_alternative:['需核对其他县志与赋役全书以确认科则数值与适用范围'],
  missing_evidence:['同卷其他田等科则条文','清代赋役全书对应条目'],
  uncertainty:{qualification:'UNASSESSED',basis:'single_page_reading'}});
const projection=()=>({projection_key:'m5.songjiang.tianze.quota-rule.v1',
  payload:{title:'松江府田赋科则投影（候选）',
    summary:'青浦县低田均科正耗平米三斗六升五合、准熟起科的规则投影。'}});

const INVALID_ERROR={D02:/PRIVATE_MATERIAL_OBSERVATION_INVALID/,D03:/PRIVATE_WORLD_CLAIM_INVALID/,
  D04:/PRIVATE_HUMANISTIC_FINDING_INVALID/,D05:/PRIVATE_WORLD_PROJECTION_INVALID/};
const rejectsInvalid=async(stage,input)=>{
  await withStageAuthority({stage,input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistMaterialObservation:async()=>{throw Error('must not persist an invalid D02 input');},
      persistWorldClaim:async()=>{throw Error('must not persist an invalid D03 input');},
      persistHumanisticFinding:async()=>{throw Error('must not persist an invalid D04 input');},
      persistWorldProjection:async()=>{throw Error('must not persist an invalid D05 input');}});
    const action={D02:'observeMaterial',D03:'assertWorldClaim',
      D04:'recordHumanisticFinding',D05:'projectWorld'}[stage];
    await assert.rejects(()=>worker[action]({run,job,registry,context,input,token:'s'}),
      INVALID_ERROR[stage]);
  });
};

test('D02 observeMaterial persists one H05 candidate under a real stage grant',async()=>{
  const originalId=id(),readUnitId=id();
  const input={originalId,readUnitId,observation:observation()};
  let persisted=0;
  return withStageAuthority({stage:'D02',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistMaterialObservation:async(args,token)=>{
        persisted++;
        assert.equal(args.runId,run.run_id);
        assert.equal(args.originalId,originalId);
        assert.equal(args.readUnitId,readUnitId);
        assert.equal(args.observation,input.observation);
        assert.equal(token,'synthetic-session');
        return {evidence_id:id(),reading_unit_id:id(),link_id:id(),
          read_unit_id:readUnitId,read_run_id:id(),
          artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'};
      }});
    const candidate=await worker.observeMaterial({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(persisted,1);
    assert.equal(candidate.stage,'D02');
    assert.equal(candidate.gate_code,'G2');
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.candidate_kind,'private_material_observation');
    assert.equal(candidate.original_id,originalId);
    assert.equal(candidate.read_unit_id,readUnitId);
    assert.match(candidate.evidence_id,/^[a-f0-9-]{36}$/);
    assert.match(candidate.read_run_id,/^[a-f0-9-]{36}$/);
    assert.equal(candidate.artifact_revision,'a'.repeat(64));
    await assert.rejects(()=>worker.observeMaterial({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(persisted,1,'no second persistence without a fresh grant');
  });
});

test('D02 observeMaterial rejects authorized-but-invalid inputs before any persistence',async()=>{
  const originalId=id(),readUnitId=id();
  const cases=[
    {observation:{...observation(),h_type:'H04'}},
    {observation:{...observation(),uncertainty:{qualification:'PASS'}}},
    {observation:{...observation(),uncertainty:null}},
    {observation:{...observation(),literal_reading:''}},
    {observation:{...observation(),literal_reading:'x'.repeat(32769)}},
    {observation:{...observation(),source_voice:'community_memory'}},
    {observation:{...observation(),evidence_type:'x'.repeat(201)}},
    {observation:{...observation(),normalized_text:'x'.repeat(32769)}},
    {observation:{...observation(),research_proposition:'x'.repeat(2001)}},
    {originalId:'nope',readUnitId,observation:observation()},
    {originalId,readUnitId:'nope',observation:observation()},
    {originalId,readUnitId,observation:null},
  ];
  for(const input of cases) await rejectsInvalid('D02',input);
});

test('D02 observeMaterial requires the persistence repository and a persisted result',async()=>{
  const missingDep={originalId:id(),readUnitId:id(),observation:observation()};
  await withStageAuthority({stage:'D02',input:missingDep},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub});
    await assert.rejects(()=>worker.observeMaterial({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),readUnitId:id(),observation:observation()};
  await withStageAuthority({stage:'D02',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistMaterialObservation:async()=>({read_run_id:id()})});
    await assert.rejects(()=>worker.observeMaterial({run,job,registry,context,input:unpersisted,token:'s'}),
      /PRIVATE_MATERIAL_OBSERVATION_NOT_PERSISTED/);
  });
});

test('D03 assertWorldClaim persists one W07 candidate under a real stage grant',async()=>{
  const originalId=id(),evidenceId=id();
  const input={originalId,evidenceId,claim:claim()};
  let persisted=0;
  return withStageAuthority({stage:'D03',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistWorldClaim:async(args,token)=>{
        persisted++;
        assert.equal(args.runId,run.run_id);
        assert.equal(args.originalId,originalId);
        assert.equal(args.evidenceId,evidenceId);
        assert.equal(args.claim,input.claim);
        assert.equal(token,'synthetic-session');
        return {change_id:id(),claim_revision_id:id(),claim_evidence_link_id:id(),
          evidence_id:evidenceId,artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),
          qualification:'UNASSESSED'};
      }});
    const candidate=await worker.assertWorldClaim({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(persisted,1);
    assert.equal(candidate.stage,'D03');
    assert.equal(candidate.gate_code,'G3');
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.candidate_kind,'private_world_claim');
    assert.equal(candidate.original_id,originalId);
    assert.equal(candidate.evidence_id,evidenceId);
    assert.match(candidate.claim_revision_id,/^[a-f0-9-]{36}$/);
    assert.match(candidate.change_id,/^[a-f0-9-]{36}$/);
    await assert.rejects(()=>worker.assertWorldClaim({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(persisted,1);
  });
});

test('D03 assertWorldClaim rejects authorized-but-invalid claims before any persistence',async()=>{
  const originalId=id(),evidenceId=id();
  const cases=[
    {originalId,evidenceId,claim:{...claim(),support_type:'proves'}},
    {originalId,evidenceId,claim:{...claim(),assertion:''}},
    {originalId,evidenceId,claim:{...claim(),assertion:'x'.repeat(2001)}},
    {originalId,evidenceId,claim:{...claim(),change_type:''}},
    {originalId,evidenceId,claim:{...claim(),change_type:'x'.repeat(201)}},
    {originalId,evidenceId,claim:{...claim(),time_scope:null}},
    {originalId,evidenceId,claim:{...claim(),time_scope:'edition dating unresolved'}},
    {originalId,evidenceId,claim:null},
    {originalId:'nope',evidenceId,claim:claim()},
    {originalId,evidenceId:'nope',claim:claim()},
  ];
  for(const input of cases) await rejectsInvalid('D03',input);
});

test('D03 assertWorldClaim requires the persistence repository and a persisted result',async()=>{
  const missingDep={originalId:id(),evidenceId:id(),claim:claim()};
  await withStageAuthority({stage:'D03',input:missingDep},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub});
    await assert.rejects(()=>worker.assertWorldClaim({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),evidenceId:id(),claim:claim()};
  await withStageAuthority({stage:'D03',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistWorldClaim:async()=>({change_id:id()})});
    await assert.rejects(()=>worker.assertWorldClaim({run,job,registry,context,input:unpersisted,token:'s'}),
      /PRIVATE_WORLD_CLAIM_NOT_PERSISTED/);
  });
});

test('D04 recordHumanisticFinding persists one A06 candidate under a real stage grant',async()=>{
  const originalId=id(),claimRevisionId=id();
  const input={originalId,claimRevisionId,finding:finding()};
  let persisted=0;
  return withStageAuthority({stage:'D04',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistHumanisticFinding:async(args,token)=>{
        persisted++;
        assert.equal(args.runId,run.run_id);
        assert.equal(args.originalId,originalId);
        assert.equal(args.claimRevisionId,claimRevisionId);
        assert.equal(args.finding,input.finding);
        assert.equal(token,'synthetic-session');
        return {finding_id:id(),claim_revision_id:claimRevisionId,
          artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'};
      }});
    const candidate=await worker.recordHumanisticFinding({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(persisted,1);
    assert.equal(candidate.stage,'D04');
    assert.equal(candidate.gate_code,'G4');
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.candidate_kind,'private_humanistic_finding');
    assert.equal(candidate.original_id,originalId);
    assert.equal(candidate.claim_revision_id,claimRevisionId);
    assert.match(candidate.finding_id,/^[a-f0-9-]{36}$/);
    await assert.rejects(()=>worker.recordHumanisticFinding({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(persisted,1);
  });
});

test('D04 recordHumanisticFinding rejects authorized-but-invalid findings before any persistence',async()=>{
  const originalId=id(),claimRevisionId=id();
  const cases=[
    {originalId,claimRevisionId,finding:{...finding(),finding_type:'dating'}},
    {originalId,claimRevisionId,finding:{...finding(),human_question:''}},
    {originalId,claimRevisionId,finding:{...finding(),human_question:'x'.repeat(2001)}},
    {originalId,claimRevisionId,finding:{...finding(),interpretive_statement:''}},
    {originalId,claimRevisionId,finding:{...finding(),interpretive_statement:'x'.repeat(5001)}},
    {originalId,claimRevisionId,finding:{...finding(),understanding_delta:5}},
    {originalId,claimRevisionId,finding:{...finding(),counter_view_or_alternative:['ok',1]}},
    {originalId,claimRevisionId,finding:{...finding(),counter_view_or_alternative:'需核对'}},
    {originalId,claimRevisionId,finding:{...finding(),missing_evidence:'同卷其他田等科则条文'}},
    {originalId,claimRevisionId,finding:{...finding(),uncertainty:{qualification:'ASSESSED'}}},
    {originalId,claimRevisionId,finding:null},
    {originalId:'nope',claimRevisionId,finding:finding()},
    {originalId,claimRevisionId:'nope',finding:finding()},
  ];
  for(const input of cases) await rejectsInvalid('D04',input);
});

test('D04 recordHumanisticFinding requires the persistence repository and a persisted result',async()=>{
  const missingDep={originalId:id(),claimRevisionId:id(),finding:finding()};
  await withStageAuthority({stage:'D04',input:missingDep},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub});
    await assert.rejects(()=>worker.recordHumanisticFinding({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),claimRevisionId:id(),finding:finding()};
  await withStageAuthority({stage:'D04',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistHumanisticFinding:async()=>({finding_id:'not-a-uuid'})});
    await assert.rejects(()=>worker.recordHumanisticFinding({run,job,registry,context,input:unpersisted,token:'s'}),
      /PRIVATE_HUMANISTIC_FINDING_NOT_PERSISTED/);
  });
});

test('D05 projectWorld persists one P02 candidate under a real stage grant',async()=>{
  const originalId=id(),findingId=id();
  const input={originalId,findingId,projection:projection()};
  let persisted=0;
  return withStageAuthority({stage:'D05',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistWorldProjection:async(args,token)=>{
        persisted++;
        assert.equal(args.runId,run.run_id);
        assert.equal(args.originalId,originalId);
        assert.equal(args.findingId,findingId);
        assert.equal(args.projection,input.projection);
        assert.equal(token,'synthetic-session');
        return {projection_id:id(),finding_id:findingId,
          artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'};
      }});
    const candidate=await worker.projectWorld({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(persisted,1);
    assert.equal(candidate.stage,'D05');
    assert.equal(candidate.gate_code,'G5');
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.candidate_kind,'private_world_projection');
    assert.equal(candidate.original_id,originalId);
    assert.equal(candidate.finding_id,findingId);
    assert.match(candidate.projection_id,/^[a-f0-9-]{36}$/);
    await assert.rejects(()=>worker.projectWorld({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(persisted,1);
  });
});

test('D05 projectWorld rejects authorized-but-invalid projections before any persistence',async()=>{
  const originalId=id(),findingId=id();
  const cases=[
    {originalId,findingId,projection:{...projection(),projection_key:''}},
    {originalId,findingId,projection:{...projection(),projection_key:'x'.repeat(201)}},
    {originalId,findingId,projection:{...projection(),payload:null}},
    {originalId,findingId,projection:{...projection(),payload:'rule text'}},
    {originalId,findingId,projection:null},
    {originalId:'nope',findingId,projection:projection()},
    {originalId,findingId:'nope',projection:projection()},
  ];
  for(const input of cases) await rejectsInvalid('D05',input);
});

test('D05 projectWorld requires the persistence repository and a persisted result',async()=>{
  const missingDep={originalId:id(),findingId:id(),projection:projection()};
  await withStageAuthority({stage:'D05',input:missingDep},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub});
    await assert.rejects(()=>worker.projectWorld({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),findingId:id(),projection:projection()};
  await withStageAuthority({stage:'D05',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistWorldProjection:async()=>({projection_id:id(),finding_id:'not-a-uuid'})});
    await assert.rejects(()=>worker.projectWorld({run,job,registry,context,input:unpersisted,token:'s'}),
      /PRIVATE_WORLD_PROJECTION_NOT_PERSISTED/);
  });
});
