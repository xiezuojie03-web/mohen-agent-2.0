// D02-D05 private candidate worker tests: real signed stage grants, one-shot
// nonce, positive/negative/idempotency-shaped cases. Candidates are UNASSESSED
// only; nothing here signs a Gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {
  assertStageExecutionAuthorized, executionDigest,
} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {createPrivateEvidenceStageWorker} from '../../pipelines/data-production/workers/private-evidence-stage.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';

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
  const run={run_id:id(),execution_mode:'attended',current_stage:stage,scope:{project_id:id()}};
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
// Minimal candidate-submission stub: a candidate id, never a Gate decision.
// D01 现在要求 G0 已批准消费者方法预选，故这里给出 C01/C02 均在内的合成批准。
const approvedPlanStub={gate_audit_id:'audit-fixture',refs:buildMethodPlanRefs({methods:[
  {method_id:'C01',method_version:'v1'},{method_id:'C02',method_version:'v1'}]})};
const gateStub={submitGateCandidate:async()=>'candidate-fixture',readGateAudit:async()=>null,
  readApprovedMethodPlan:async()=>approvedPlanStub};
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
const finding=()=>({method_id:'A06',finding_type:'institutional_mechanism',
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub});
    await assert.rejects(()=>worker.observeMaterial({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),readUnitId:id(),observation:observation()};
  await withStageAuthority({stage:'D02',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub});
    await assert.rejects(()=>worker.assertWorldClaim({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),evidenceId:id(),claim:claim()};
  await withStageAuthority({stage:'D03',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    // method_id 必须属于设计登记的 A01—A12（finding_type 本身是方法派生的标签，非封闭枚举）
    {originalId,claimRevisionId,finding:{...finding(),method_id:null}},
    {originalId,claimRevisionId,finding:{...finding(),method_id:'A13'}},
    {originalId,claimRevisionId,finding:{...finding(),method_id:'a06'}},
    {originalId,claimRevisionId,finding:{...finding(),finding_type:''}},
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub});
    await assert.rejects(()=>worker.recordHumanisticFinding({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),claimRevisionId:id(),finding:finding()};
  await withStageAuthority({stage:'D04',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
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
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub});
    await assert.rejects(()=>worker.projectWorld({run,job,registry,context,input:missingDep,token:'s'}),
      /PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED/);
  });
  const unpersisted={originalId:id(),findingId:id(),projection:projection()};
  await withStageAuthority({stage:'D05',input:unpersisted},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,...gateStub,
      persistWorldProjection:async()=>({projection_id:id(),finding_id:'not-a-uuid'})});
    await assert.rejects(()=>worker.projectWorld({run,job,registry,context,input:unpersisted,token:'s'}),
      /PRIVATE_WORLD_PROJECTION_NOT_PERSISTED/);
  });
});

// ---- Candidate submission: one SUBMITTED candidate per successful private stage.
// No Gate decision, no audit write, no result field. No real DB is touched.
const IMAGE=Buffer.from([0xff,0xd8,0xff,0xe0,1,2,3,4]);
const IMAGE_SHA=createHash('sha256').update(IMAGE).digest('hex');
const TEXT=Buffer.from('均科正耗平米三斗六升五合。','utf8');
const TEXT_SHA=createHash('sha256').update(TEXT).digest('hex');
const TEXT_QUOTE='均科正耗平米三斗六升五合。';
const CANDIDATE_PURPOSE={namespace:'data-production',code:'m5-remediation',version:'v1'};
// gate-contracts.v3.json purpose_rule：G3/G4 保留原语义命名空间；
// G3 用途取自 G3.purpose_codes（purpose_source: G3.world.v1）。
const G3_CANDIDATE_PURPOSE={namespace:'world',code:'explain_bounded',version:'v1'};
const registrationFor=(originalId,projectId,overrides={})=>({
  original_id:originalId,project_id:projectId,source_id:id(),source_version_id:id(),raw_item_id:id(),
  sha256:IMAGE_SHA,byte_size:IMAGE.length,content_type:'image/jpeg',
  provider:'NAJ',title:'松江府志7',source_type:'gazetteer',carrier_type:'scanned_page',
  rights:{status:'public_domain_secondary_use'},asset_revision_id:id(),
  original_locator:{item:4252790,catalog_no:'NAJDA-292-0017'},
  provenance_status:'verified',content_availability:'image_scan',
  artifact_revision:'c'.repeat(64),source_version_artifact_revision:'c'.repeat(64),
  ...overrides});
const imageRecord=(originalId,projectId)=>({record:{original_id:originalId,project_id:projectId,
  state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:IMAGE});
const textRecord=()=>({record:{state:'STORED_VERIFIED',content_type:'text/plain',sha256:TEXT_SHA},
  bytes:TEXT});
const extentFor=(sourceVersionId)=>({kind:'utf8_byte_range/v1',start_byte:0,end_byte:TEXT.length,
  source_version_id:sourceVersionId,raw_item_id:id(),raw_sha256:TEXT_SHA,
  quote_sha256:createHash('sha256').update(Buffer.from(TEXT_QUOTE,'utf8')).digest('hex')});
const scannedPageFor=(sourceVersionId)=>({kind:'scanned_page/v1',page_number:35,
  source_version_id:sourceVersionId,raw_item_id:id(),raw_sha256:IMAGE_SHA,page_sha256:IMAGE_SHA});
const persistedReading=(readUnitId)=>({read_run_id:id(),read_unit_id:readUnitId,
  artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'});

test('a private stage cannot be constructed without candidate submission or audit read',()=>{
  const base={readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub};
  assert.throws(()=>createPrivateEvidenceStageWorker({...base,readGateAudit:async()=>null}),
    /PRIVATE_GATE_CANDIDATE_SUBMISSION_REQUIRED/);
  assert.throws(()=>createPrivateEvidenceStageWorker({...base,submitGateCandidate:async()=>'candidate'}),
    /PRIVATE_GATE_AUDIT_READ_REQUIRED/);
  assert.doesNotThrow(()=>createPrivateEvidenceStageWorker({...base,
    submitGateCandidate:async()=>'candidate',readGateAudit:async()=>null}));
});

// Y07：获取账是 D00 必填——每次成功的准入都要带一份合法获取方案与尝试。
// 这份夹具给出通过工序校验的最小真实形状（NAJ 页面人工下载、字节与库存一致）。
const acquisitionInput=()=>({
  method:{method_key:'M0002',method_version:'v1',access_mode:'manual_download',
    resource_scope:{provider:'国立公文书馆(NAJ)'},steps:['打开馆藏页面','下载本页 JPEG'],
    success_criteria:['字节与馆藏页面一致'],failure_modes:['页面不可达'],alternatives:[]},
  attempt:{result_state:'acquired_verified',asset_sha256:IMAGE_SHA,byte_size:IMAGE.length,
    started_at:'2026-11-10T00:00:00.000Z',finished_at:'2026-11-10T00:01:00.000Z',
    request_digest:'d'.repeat(64)},
});
const acquisitionMocks=()=>({
  registerAcquisitionMethod:async()=>({method_key:'M0002',method_version:'v1'}),
  appendAcquisitionAttempt:async()=>({attempt_id:id()}),
  recordAcquisitionCoverage:async()=>({coverage_id:id()}),
});

test('D00 verifySourceIntake submits exactly one G0 source_version candidate',async()=>{
  const originalId=id(),projectId=id(),sourceVersionId=id();
  const input={research_intent:'松江府田赋卷十一',scope:{project_id:projectId,original_id:originalId,page_number:35},
    acquisition:acquisitionInput()};
  const submitted=[];
  const intakeEntries=[];
  const intakeVerifications=[];
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    const needId=id(),intakeCatalogId=id(),intakeVerificationId=id(),
      attemptId=id(),coverageId=id();
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>imageRecord(originalId,projectId),
      verifySourceBinding:async()=>true,
      readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
      recordSourceNeed:async()=>({need_id:needId,created_at:new Date().toISOString()}),
      readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
      recordCatalogEntry:async entry=>{intakeEntries.push(entry);return {catalog_entry_id:intakeCatalogId};},
      recordCandidateVerification:async item=>{intakeVerifications.push(item);return {verification_id:intakeVerificationId};},
      recordPriorityAssessment:async()=>({assessment_id:id()}),
      registerAcquisitionMethod:async()=>({method_key:'M0002',method_version:'v1'}),
      appendAcquisitionAttempt:async()=>({attempt_id:attemptId}),
      recordAcquisitionCoverage:async()=>({coverage_id:coverageId}),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted.push(metadata);return 'candidate-g0';},
      readGateAudit:async()=>{throw Error('G0 must not read an upstream audit');},
    });
    const candidate=await worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'});
    // Y02 目录观察必须先于 G0 候选落库，且由工序从登记真值派生。
    assert.equal(intakeEntries.length,1);
    assert.equal(intakeEntries[0].provider,'NAJ');
    assert.equal(intakeEntries[0].catalogIdentifier,'NAJDA-292-0017');
    assert.equal(intakeEntries[0].availabilityState,'catalog_found');
    assert.equal(intakeEntries[0].discoveredByMethod,'D00/Y02:intake_registration');
    assert.match(candidate.intake_catalog_entry_id,/^[a-f0-9-]{36}$/);
    // Y03 候选核查同样由工序就地派生：身份已核，但时空异名词源本次没读，如实需人确认。
    assert.equal(intakeVerifications.length,1);
    assert.equal(intakeVerifications[0].catalogEntryId,candidate.intake_catalog_entry_id);
    assert.equal(intakeVerifications[0].verdict,'needs_owner');
    assert.equal(intakeVerifications[0].reasonCode,'Y03_EXPANSION_UNASSESSED:place_name,era');
    assert.equal(intakeVerifications[0].methodKey,'D00/Y03:intake_candidate_check');
    assert.equal(intakeVerifications[0].checks.identity.sha256,IMAGE_SHA);
    assert.match(candidate.intake_verification_id,/^[a-f0-9-]{36}$/);
    assert.equal(candidate.intake_verification_verdict,'needs_owner');
    assert.equal(submitted.length,1);
    // Y08：G0 证据引用在版本修订之外追加 D00 链上五条可回读记录（回执的依据）。
    assert.deepEqual(submitted[0],{runId:run.run_id,stage:'D00',gateCode:'G0',
      objectType:'source_version',objectId:sourceVersionId,artifactRevision:'c'.repeat(64),
      purpose:CANDIDATE_PURPOSE,allowedScope:{project_id:projectId},consumer:'producer',
      dependencySnapshot:[],evidenceRefs:[{kind:'source_version',id:sourceVersionId,
        artifact_revision:'c'.repeat(64)},
      {kind:'source_need',id:needId},{kind:'resource_catalog',id:intakeCatalogId},
      {kind:'candidate_verification',id:intakeVerificationId},
      {kind:'acquisition_attempt',id:attemptId},{kind:'acquisition_coverage',id:coverageId}],
      inputFingerprint:candidate.request_digest});
    // Y08：回执随候选输出存证——依据六道工序逐条可回读，核查结论原样带回不升级。
    assert.equal(candidate.asset_receipt.schema,'mohen.validated-asset-receipt.v1');
    assert.equal(candidate.asset_receipt.qualification,'UNASSESSED');
    assert.equal(candidate.asset_receipt.verification_verdict,'needs_owner');
    assert.deepEqual(candidate.asset_receipt.basis,['storage_readback_sha256',
      'registration_consistency','identity_stratification',
      'acquisition_attempt_verified','coverage_conclusion','candidate_verification']);
    assert.equal('result' in submitted[0],false,'a candidate is not a decision');
    assert.equal(candidate.gate_candidate_id,'candidate-g0');
    assert.equal(candidate.gate_candidate_status,'SUBMITTED');
    assert.equal(candidate.qualification,'UNASSESSED');
  });
});

test('D00 carries the consumer C method plan as typed refs on the G0 candidate',async()=>{
  const originalId=id(),projectId=id(),sourceVersionId=id();
  const input={research_intent:'松江府田赋卷十一',
    scope:{project_id:projectId,original_id:originalId,page_number:35},
    acquisition:acquisitionInput(),
    consumer_method_plan:[{method_id:'C02',method_version:'v1'},{method_id:'C03',method_version:'v2'}]};
  const expected=buildMethodPlanRefs({methods:input.consumer_method_plan});
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    let submitted=null;
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>imageRecord(originalId,projectId),
      verifySourceBinding:async()=>true,
      readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
      recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
      readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
      recordCatalogEntry:async()=>({catalog_entry_id:id()}),
      recordCandidateVerification:async()=>({verification_id:id()}),
      recordPriorityAssessment:async()=>({assessment_id:id()}),
      ...acquisitionMocks(),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g0';},
      readGateAudit:async()=>{throw Error('G0 must not read an upstream audit');},
    });
    const candidate=await worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'});
    assert.deepEqual(submitted.evidenceRefs.slice(0,1),[
      {kind:'source_version',id:sourceVersionId,artifact_revision:'c'.repeat(64)}]);
    // Y08 链上五条引用位于版本引用之后、方法计划引用之前。
    assert.deepEqual(submitted.evidenceRefs.slice(-expected.length),expected);
    assert.deepEqual(candidate.method_plan,expected);
  });
});

test('D00 rejects a malformed consumer method plan before submitting any candidate',async()=>{
  const cases=[
    {consumer_method_plan:[]},
    {consumer_method_plan:[{method_id:'H05',method_version:'v1'}]},
    {consumer_method_plan:[{method_id:'C02',method_version:'1'}]},
    {consumer_method_plan:[{method_id:'C02',method_version:'v1'},{method_id:'C02',method_version:'v1'}]},
  ];
  for(const extra of cases){
    const originalId=id(),projectId=id(),sourceVersionId=id();
    const input={research_intent:'松江府田赋卷十一',
      scope:{project_id:projectId,original_id:originalId,page_number:35},
      acquisition:acquisitionInput(),...extra};
    await withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
      let submitted=0;
      const worker=createPrivateEvidenceStageWorker({
        readOriginal:async()=>imageRecord(originalId,projectId),
        verifySourceBinding:async()=>true,
        readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
        recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
        readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
        recordCatalogEntry:async()=>({catalog_entry_id:id()}),
        recordCandidateVerification:async()=>({verification_id:id()}),
        recordPriorityAssessment:async()=>({assessment_id:id()}),
        ...acquisitionMocks(),
        bridge:bridgeStub,
        submitGateCandidate:async()=>{submitted+=1;return 'candidate-g0';},
        readGateAudit:async()=>null,
      });
      await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'s'}),
        /PRIVATE_METHOD_PLAN_/);
      assert.equal(submitted,0,'a rejected plan must not reach the candidate table');
    });
  }
});

test('D00 records intake observation then Y02/Y04/Y03/Y06 in order and exposes the written ids',async()=>{
  const originalId=id(),projectId=id(),sourceVersionId=id();
  const calls=[];
  const intakeId=id();
  const catalogIds=[id(),id()];
  const coverageId=id(),verificationId=id(),assessmentId=id();
  const existingAttemptId=id();
  const input={research_intent:'松江府田赋卷十一',
    scope:{project_id:projectId,original_id:originalId,page_number:35},
    acquisition:acquisitionInput(),
    catalog:[
      {provider:'国立公文书馆(NAJ)',catalog_title:'松江府志7',catalog_identifier:'NAJ-14373',
        availability_state:'catalog_found',discovered_by_method:'M0001',method_version:'v1'},
      {provider:'上海图书馆',catalog_title:'松江府志（另一版本）',availability_state:'catalog_listed_no_item',
        discovered_by_method:'M0001',method_version:'v1'},
    ],
    coverage:[{catalog_index:0,attempt_id:existingAttemptId,completeness_state:'partial',
      missing_parts:[{part:'卷十二'}]}],
    verifications:[{catalog_index:0,checks:{identity_matched:'pass'},verdict:'admissible',
      reason_code:'IDENTITY_CONFIRMED',method_key:'M0001',method_version:'v1'}],
    priorities:[{catalog_index:0,criteria:{authority:'primary'},decision:'selected',
      rationale:'唯一身份已核且有权利依据的版本',method_key:'M0001',method_version:'v1'}],
  };
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    let submitted=null;
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>imageRecord(originalId,projectId),
      verifySourceBinding:async()=>true,
      readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
      recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
      readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
      recordCatalogEntry:async entry=>{
        calls.push(`catalog:${entry.catalogTitle}`);
        return {catalog_entry_id:[intakeId,...catalogIds][calls.filter(c=>c.startsWith('catalog:')).length-1]};
      },
      recordAcquisitionCoverage:async item=>{
        calls.push(`coverage:${item.catalogEntryId}`);
        return {coverage_id:coverageId};
      },
      recordCandidateVerification:async item=>{
        calls.push(`verification:${item.verdict}`);
        return {verification_id:verificationId};
      },
      recordPriorityAssessment:async item=>{
        calls.push(`priority:${item.decision}`);
        return {assessment_id:assessmentId};
      },
      registerAcquisitionMethod:async()=>{calls.push('method');return {method_key:'M0002',method_version:'v1'};},
      appendAcquisitionAttempt:async()=>{calls.push('attempt');return {attempt_id:id()};},
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g0';},
      readGateAudit:async()=>null,
    });
    const candidate=await worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'});
    // 顺序固定：工序先落自己的准入目录观察（松江府志7，来自登记真值）与就地
    // 候选核查（Y03，词源未读 → 需人确认），Y06 准入处置紧跟核查结论
    // （needs_owner 只能 deferred，绝不放宽为 selected）；Y07 获取方法与尝试随后，
    // Y04 准入覆盖结论挂在本次尝试与准入条目上；再登记调用方补充的候选，
    // 然后才有覆盖/核查/优先级的引用对象。
    assert.deepEqual(calls,['catalog:松江府志7','verification:needs_owner','priority:deferred',
      'method','attempt',`coverage:${intakeId}`,
      'catalog:松江府志7','catalog:松江府志（另一版本）',
      `coverage:${catalogIds[0]}`,'verification:admissible','priority:selected']);
    assert.equal(candidate.intake_catalog_entry_id,intakeId);
    assert.equal(candidate.intake_verification_verdict,'needs_owner');
    assert.equal(candidate.intake_priority_decision,'deferred');
    assert.equal(candidate.intake_priority_id,assessmentId);
    assert.deepEqual(candidate.catalog_entry_ids,catalogIds);
    assert.deepEqual(candidate.coverage_ids,[coverageId]);
    assert.deepEqual(candidate.verification_ids,[verificationId]);
    assert.deepEqual(candidate.assessment_ids,[assessmentId]);
    assert.equal(submitted!==null,true);
  });
});

test('D00 derives the Y04 intake coverage conclusion from the recorded acquisition attempt',async()=>{
  const originalId=id(),projectId=id(),sourceVersionId=id();
  const intakeId=id(),attemptId=id(),coverageId=id();
  const input={research_intent:'松江府田赋卷十一',
    scope:{project_id:projectId,original_id:originalId,page_number:35},
    acquisition:{
      method:{method_key:'M0002',method_version:'v1',access_mode:'manual_download',
        resource_scope:{provider:'国立公文书馆(NAJ)'},steps:['打开馆藏页面','下载本页 JPEG'],
        success_criteria:['字节与馆藏页面一致'],failure_modes:['页面不可达'],alternatives:[]},
      attempt:{result_state:'acquired_verified',asset_sha256:IMAGE_SHA,byte_size:IMAGE.length,
        started_at:'2026-11-10T00:00:00.000Z',finished_at:'2026-11-10T00:01:00.000Z',
        request_digest:'d'.repeat(64)},
    }};
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    const calls=[];let coverageArgs=null;
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>imageRecord(originalId,projectId),
      verifySourceBinding:async()=>true,
      readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
      recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
      readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
      recordCatalogEntry:async()=>{calls.push('catalog');return {catalog_entry_id:intakeId};},
      recordCandidateVerification:async()=>{calls.push('verification');return {verification_id:id()};},
      recordPriorityAssessment:async()=>{calls.push('priority');return {assessment_id:id()};},
      registerAcquisitionMethod:async()=>{calls.push('method');return {method_key:'M0002',method_version:'v1'};},
      appendAcquisitionAttempt:async()=>{calls.push('attempt');return {attempt_id:attemptId};},
      recordAcquisitionCoverage:async item=>{calls.push('coverage');coverageArgs=item;return {coverage_id:coverageId};},
      bridge:bridgeStub,
      submitGateCandidate:async()=>'candidate-g0',
      readGateAudit:async()=>null,
    });
    const candidate=await worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'});
    // 顺序固定：先有准入目录观察、就地核查与 Y06 处置，再落获取尝试，
    // 然后才有覆盖结论的引用对象。
    assert.deepEqual(calls,['catalog','verification','priority','method','attempt','coverage']);
    assert.equal(candidate.acquisition_attempt_id,attemptId);
    assert.equal(candidate.intake_coverage_id,coverageId);
    // 覆盖结论由工序派生：挂在本次尝试与准入目录条目上，只核到第 35 页，总量未核实。
    assert.equal(coverageArgs.attemptId,attemptId);
    assert.equal(coverageArgs.catalogEntryId,intakeId);
    assert.equal(coverageArgs.completenessState,'unknown');
    assert.deepEqual(coverageArgs.coverageScope.acquired,{pages:[35],byte_size:IMAGE.length,sha256:IMAGE_SHA});
    assert.deepEqual(coverageArgs.missingParts,[{part:'other_pages',state:'unassessed'}]);
    assert.equal(coverageArgs.verifiedAgainst.matched,true);
  });
});

test('D00 fails closed when the Y04 coverage conclusion cannot be recorded',async()=>{
  const originalId=id(),projectId=id(),sourceVersionId=id();
  const cases=[
    // 有获取尝试就必须有覆盖结论：撤掉写入口即失败关闭。
    {drop:'recordAcquisitionCoverage',pattern:/PRIVATE_SOURCE_COVERAGE_RECORDING_REQUIRED/},
    // 尝试自称取得已核验但字节对不上：Y07 先拒这份说谎的取得账，覆盖结论无从落笔。
    {tamperSha:true,pattern:/ACQUISITION_ASSET_MISMATCH/},
  ];
  for(const {drop,tamperSha,pattern} of cases){
    const input={research_intent:'松江府田赋卷十一',
      scope:{project_id:projectId,original_id:originalId,page_number:35},
      acquisition:{method:acquisitionInput().method,
        attempt:{result_state:'acquired_verified',
          asset_sha256:tamperSha?'e'.repeat(64):IMAGE_SHA,byte_size:IMAGE.length,
          started_at:'2026-11-10T00:00:00.000Z',request_digest:'d'.repeat(64)}}};
    await withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
      let submitted=0;
      const deps={
        readOriginal:async()=>imageRecord(originalId,projectId),
        verifySourceBinding:async()=>true,
        readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
        recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
        readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
        recordCatalogEntry:async()=>({catalog_entry_id:id()}),
        recordCandidateVerification:async()=>({verification_id:id()}),
        recordPriorityAssessment:async()=>({assessment_id:id()}),
        registerAcquisitionMethod:async()=>({method_key:'M0002',method_version:'v1'}),
        appendAcquisitionAttempt:async()=>({attempt_id:id()}),
        recordAcquisitionCoverage:async()=>({coverage_id:id()}),
        bridge:bridgeStub,
        submitGateCandidate:async()=>{submitted+=1;return 'candidate-g0';},
        readGateAudit:async()=>null,
      };
      if(drop)delete deps[drop];
      const worker=createPrivateEvidenceStageWorker(deps);
      await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'s'}),
        pattern);
      assert.equal(submitted,0,'coverage write failure must not reach G0');
    });
  }
});

test('D00 writes only the intake observation when the caller supplies no extra material',async()=>{
  const originalId=id(),projectId=id(),sourceVersionId=id();
  const input={research_intent:'松江府田赋卷十一',scope:{project_id:projectId,original_id:originalId,page_number:35},
    acquisition:acquisitionInput()};
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    let catalogCalls=0,intakeVerifications=0,intakePriorities=0,coverageCalls=0;
    let intakePriorityArgs=null;
    const intakeId=id();
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>imageRecord(originalId,projectId),
      verifySourceBinding:async()=>true,
      readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
      recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
      readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
      recordCatalogEntry:async()=>{catalogCalls+=1;return {catalog_entry_id:intakeId};},
      recordCandidateVerification:async()=>{intakeVerifications+=1;return {verification_id:id()};},
      recordPriorityAssessment:async item=>{intakePriorities+=1;intakePriorityArgs=item;return {assessment_id:id()};},
      ...acquisitionMocks(),
      recordAcquisitionCoverage:async()=>{coverageCalls+=1;return {coverage_id:id()};},
      bridge:bridgeStub,
      submitGateCandidate:async()=>'candidate-g0',
      readGateAudit:async()=>null,
    });
    const candidate=await worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'});
    // 调用方没给材料，工序只落自己从登记真值派生的目录观察、候选核查与 Y06 处置，
    // 加上 Y07 获取账强制的 Y04 准入覆盖结论；不替研究者补额外覆盖或优先级判断。
    assert.equal(catalogCalls,1);
    assert.equal(intakeVerifications,1);
    // Y06 准入处置由 Y03 结论决定：needs_owner 只能 deferred；理由可回读核查结论；
    // 与研究意图的相关性等未评估维度如实 unknown。
    assert.equal(intakePriorities,1);
    assert.equal(intakePriorityArgs.decision,'deferred');
    assert.equal(intakePriorityArgs.catalogEntryId,intakeId);
    assert.equal(intakePriorityArgs.methodKey,'D00/Y06:intake_priority');
    assert.match(intakePriorityArgs.rationale,/Y03_EXPANSION_UNASSESSED:place_name,era/);
    assert.equal(intakePriorityArgs.criteria.relevance.state,'unknown');
    assert.equal(intakePriorityArgs.criteria.authority.state,'known');
    assert.equal(candidate.intake_priority_decision,'deferred');
    // 唯一一次覆盖写入是 Y07 获取账带来的准入覆盖结论，没有调用方补充的第二条。
    assert.equal(coverageCalls,1);
    assert.equal(candidate.intake_catalog_entry_id,intakeId);
    assert.deepEqual(candidate.catalog_entry_ids,[]);
    assert.deepEqual(candidate.verification_ids,[]);
    assert.deepEqual(candidate.assessment_ids,[]);
    // Y05 身份分层随候选输出存证（不落新表）：七层齐全，收藏未读如实 unknown，
    // 数字资产层的哈希就是库存原件的哈希。
    assert.equal(candidate.source_identity.schema,'mohen.source-identity-stratification.v1');
    assert.equal(candidate.source_identity.method,'D00/Y05:intake_identity@v1');
    assert.equal(candidate.source_identity.layers.length,7);
    assert.equal(candidate.source_identity.layers.find(l=>l.layer==='collection').state,'unknown');
    assert.equal(candidate.source_identity.layers.find(l=>l.layer==='digital_asset').value.sha256,IMAGE_SHA);
    assert.deepEqual(candidate.source_identity.dependencies.unresolved,['collection']);
  });
});

test('D00 fails closed on malformed or unwritable Y02—Y07 material',async()=>{
  const cases=[
    // Y02 准入观察先于 input.catalog 校验：本例不撤写入口，让畸形 catalog 在自身校验处失败。
    {extra:{catalog:'not-an-array'},pattern:/PRIVATE_SOURCE_CATALOG_INVALID/,drop:null},
    // 撤掉写入口时，强制的 Y02 准入观察本身即失败关闭（等不到调用方材料）。
    {extra:{catalog:[{provider:'X',catalog_title:'Y',availability_state:'unknown'}]},
      pattern:/PRIVATE_SOURCE_CATALOG_RECORDING_REQUIRED/,drop:'recordCatalogEntry'},
    // 调用方补充的覆盖引用了不存在的目录条目：拒绝落库。
    {extra:{coverage:[{catalog_index:9,completeness_state:'partial',missing_parts:[{part:'卷十二'}]}]},
      pattern:/PRIVATE_SOURCE_COVERAGE_CATALOG_INVALID/,drop:null},
    {extra:{verifications:[{catalog_index:0,checks:{},verdict:'admissible'}]},
      pattern:/PRIVATE_SOURCE_VERIFICATION_CATALOG_INVALID/,drop:null},
    // Y03 准入核查是强制项：撤掉写入口即失败关闭，不能"看起来跑了 D00 却没有核查记录"。
    {extra:{},pattern:/PRIVATE_SOURCE_VERIFICATIONS_RECORDING_REQUIRED/,drop:'recordCandidateVerification'},
    // Y07 获取账是 D00 硬前提：原件在库却没有"怎么来的"账，失败关闭。
    {extra:{},pattern:/ACQUISITION_REQUIRED/,drop:null,noAcquisition:true},
    {extra:{},pattern:/PRIVATE_ACQUISITION_RECORDING_REQUIRED/,drop:'registerAcquisitionMethod'},
  ];
  for(const {extra,pattern,drop,noAcquisition} of cases){
    const originalId=id(),projectId=id(),sourceVersionId=id();
    const input={research_intent:'松江府田赋卷十一',
      scope:{project_id:projectId,original_id:originalId,page_number:35},
      ...(noAcquisition?{}:{acquisition:acquisitionInput()}),...extra};
    await withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
      let submitted=0;
      const deps={
        readOriginal:async()=>imageRecord(originalId,projectId),
        verifySourceBinding:async()=>true,
        readRegistration:async()=>registrationFor(originalId,projectId,{source_version_id:sourceVersionId}),
        recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
        readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
        recordCatalogEntry:async()=>({catalog_entry_id:id()}),
        recordAcquisitionCoverage:async()=>({coverage_id:id()}),
        recordCandidateVerification:async()=>({verification_id:id()}),
        recordPriorityAssessment:async()=>({assessment_id:id()}),
        ...acquisitionMocks(),
        bridge:bridgeStub,
        submitGateCandidate:async()=>{submitted+=1;return 'candidate-g0';},
        readGateAudit:async()=>null,
      };
      if(drop)delete deps[drop];
      const worker=createPrivateEvidenceStageWorker(deps);
      await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'s'}),
        pattern);
      assert.equal(submitted,0,'malformed source material must not reach G0');
    });
  }
});

test('D01 refuses to read a page when G0 has not approved a consumer method plan',async()=>{
  const originalId=id(),sourceVersionId=id(),readUnitId=id();
  const input={originalId,page:scannedPageFor(sourceVersionId)};
  const audits=[];
  let submitted=null,reads=0;
  return withStageAuthority({stage:'D01',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>{reads++;return imageRecord(originalId,run.scope.project_id);},
      verifySourceBinding:async()=>true,
      persistPageReading:async()=>persistedReading(readUnitId),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g1';},
      readGateAudit:async query=>{audits.push(query);return null;},
      // G0 未签 = 没有批准的计划：预选不能由生产者自述替代。
      readApprovedMethodPlan:async()=>null,
    });
    await assert.rejects(()=>worker.readScannedPage({run,job,registry,context,input,token:'synthetic-session'}),
      /PRIVATE_D01_G0_METHOD_PLAN_NOT_APPROVED/);
    assert.deepEqual(audits,[]);
    assert.equal(submitted,null,'unsigned G0 must not reach G1');
    assert.equal(reads,0,'original bytes must not be consumed before approval');
  });
});

test('D01 draftTextReading submits one G1 read_unit candidate against the extent source version',async()=>{
  const originalId=id(),sourceVersionId=id(),readUnitId=id();
  const extent=extentFor(sourceVersionId);
  const input={originalId,extent,quote:TEXT_QUOTE};
  const audits=[];
  let submitted=null;
  return withStageAuthority({stage:'D01',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>textRecord(),
      verifySourceBinding:async()=>true,
      persistReading:async()=>persistedReading(readUnitId),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g1-text';},
      readGateAudit:async query=>{audits.push(query);return null;},
      // 本用例只断言候选元数据；D01 的方法计划前置用合成批准满足，审计仍为空，
      // 因此依赖快照保持 []（未签上游不伪造）。
      readApprovedMethodPlan:async()=>approvedPlanStub,
    });
    const candidate=await worker.draftTextReading({run,job,registry,context,input,token:'synthetic-session'});
    assert.deepEqual(audits,[{gateCode:'G0',objectType:'source_version',objectId:sourceVersionId}]);
    assert.equal(submitted.stage,'D01');
    assert.equal(submitted.gateCode,'G1');
    assert.equal(submitted.objectType,'read_unit');
    assert.equal(submitted.objectId,readUnitId);
    assert.equal(submitted.artifactRevision,'a'.repeat(64));
    assert.equal(submitted.inputFingerprint,executionDigest(input));
    assert.deepEqual(submitted.evidenceRefs,[
      {kind:'read_unit',id:readUnitId,artifact_revision:'a'.repeat(64)},
      {kind:'source_version',id:sourceVersionId}]);
    assert.deepEqual(submitted.dependencySnapshot,[]);
    assert.equal(candidate.gate_candidate_id,'candidate-g1-text');
    assert.equal(candidate.gate_candidate_status,'SUBMITTED');
  });
});

test('D02 observeMaterial submits one G2 material_evidence candidate with the signed G1 dependency',async()=>{
  const originalId=id(),readUnitId=id(),evidenceId=id();
  const auditId=id();
  const input={originalId,readUnitId,observation:observation()};
  const audits=[];
  let submitted=null;
  return withStageAuthority({stage:'D02',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>({}),
      verifySourceBinding:async()=>true,
      persistMaterialObservation:async()=>({evidence_id:evidenceId,reading_unit_id:id(),link_id:id(),
        read_unit_id:readUnitId,read_run_id:id(),artifact_revision:'a'.repeat(64),
        request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g2';},
      readGateAudit:async query=>{audits.push(query);return {gate_audit_id:auditId,
        qualification_digest:'d'.repeat(64),artifact_revision:'e'.repeat(64)};},
    });
    const candidate=await worker.observeMaterial({run,job,registry,context,input,token:'synthetic-session'});
    assert.deepEqual(audits,[{gateCode:'G1',objectType:'read_unit',objectId:readUnitId}]);
    assert.deepEqual(submitted,{runId:run.run_id,stage:'D02',gateCode:'G2',
      objectType:'material_evidence',objectId:evidenceId,artifactRevision:'a'.repeat(64),
      purpose:CANDIDATE_PURPOSE,allowedScope:{project_id:run.scope.project_id},consumer:'producer',
      dependencySnapshot:[{gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}],
      evidenceRefs:[{kind:'material_evidence',id:evidenceId,artifact_revision:'a'.repeat(64)},
        {kind:'read_unit',id:readUnitId}],inputFingerprint:executionDigest(input)});
    assert.equal(candidate.gate_candidate_id,'candidate-g2');
    assert.equal(candidate.gate_candidate_status,'SUBMITTED');
    assert.equal(candidate.qualification,'UNASSESSED');
  });
});

test('D03 assertWorldClaim submits one G3 claim_revision candidate with the signed G2 dependency',async()=>{
  const originalId=id(),evidenceId=id(),claimRevisionId=id();
  const auditId=id();
  const input={originalId,evidenceId,claim:claim()};
  let submitted=null;
  return withStageAuthority({stage:'D03',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>({}),
      verifySourceBinding:async()=>true,
      persistWorldClaim:async()=>({change_id:id(),claim_revision_id:claimRevisionId,
        claim_evidence_link_id:id(),evidence_id:evidenceId,artifact_revision:'a'.repeat(64),
        request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g3';},
      readGateAudit:async()=>({gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}),
    });
    const candidate=await worker.assertWorldClaim({run,job,registry,context,input,token:'synthetic-session'});
    assert.deepEqual(submitted,{runId:run.run_id,stage:'D03',gateCode:'G3',
      objectType:'claim_revision',objectId:claimRevisionId,artifactRevision:'a'.repeat(64),
      purpose:G3_CANDIDATE_PURPOSE,allowedScope:{project_id:run.scope.project_id},consumer:'producer',
      dependencySnapshot:[{gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}],
      evidenceRefs:[{kind:'claim_revision',id:claimRevisionId,artifact_revision:'a'.repeat(64)},
        {kind:'material_evidence',id:evidenceId}],inputFingerprint:executionDigest(input)});
    assert.equal(candidate.gate_candidate_id,'candidate-g3');
    assert.equal(candidate.gate_candidate_status,'SUBMITTED');
  });
});

test('D04 recordHumanisticFinding submits one G4 finding candidate with the signed G3 dependency',async()=>{
  const originalId=id(),claimRevisionId=id(),findingId=id();
  const auditId=id();
  const input={originalId,claimRevisionId,finding:finding()};
  let submitted=null;
  return withStageAuthority({stage:'D04',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>({}),
      verifySourceBinding:async()=>true,
      persistHumanisticFinding:async()=>({finding_id:findingId,claim_revision_id:claimRevisionId,
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g4';},
      readGateAudit:async()=>({gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}),
    });
    const candidate=await worker.recordHumanisticFinding({run,job,registry,context,input,token:'synthetic-session'});
    assert.deepEqual(submitted,{runId:run.run_id,stage:'D04',gateCode:'G4',
      objectType:'finding',objectId:findingId,artifactRevision:'a'.repeat(64),
      // G4 人文发现门按合同绑 G4.interpretation.v1 五用途，不走 data-production 生产用途
      purpose:{namespace:'G4.interpretation.v1',code:'BE',version:'v1'},
      allowedScope:{project_id:run.scope.project_id},consumer:'producer',
      dependencySnapshot:[{gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}],
      evidenceRefs:[{kind:'finding',id:findingId,artifact_revision:'a'.repeat(64)},
        {kind:'claim_revision',id:claimRevisionId}],inputFingerprint:executionDigest(input)});
    assert.equal(candidate.gate_candidate_id,'candidate-g4');
    assert.equal(candidate.gate_candidate_status,'SUBMITTED');
  });
});

test('D05 projectWorld submits one G5 world_projection candidate with the signed G4 dependency',async()=>{
  const originalId=id(),findingId=id(),projectionId=id();
  const auditId=id();
  const input={originalId,findingId,projection:projection()};
  let submitted=null;
  return withStageAuthority({stage:'D05',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>({}),
      verifySourceBinding:async()=>true,
      persistWorldProjection:async()=>({projection_id:projectionId,finding_id:findingId,
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      bridge:bridgeStub,
      submitGateCandidate:async metadata=>{submitted=metadata;return 'candidate-g5';},
      readGateAudit:async()=>({gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}),
    });
    const candidate=await worker.projectWorld({run,job,registry,context,input,token:'synthetic-session'});
    assert.deepEqual(submitted,{runId:run.run_id,stage:'D05',gateCode:'G5',
      objectType:'world_projection',objectId:projectionId,artifactRevision:'a'.repeat(64),
      purpose:CANDIDATE_PURPOSE,allowedScope:{project_id:run.scope.project_id},consumer:'producer',
      dependencySnapshot:[{gate_audit_id:auditId,qualification_digest:'d'.repeat(64),
        artifact_revision:'e'.repeat(64)}],
      evidenceRefs:[{kind:'world_projection',id:projectionId,artifact_revision:'a'.repeat(64)},
        {kind:'finding',id:findingId}],inputFingerprint:executionDigest(input)});
    assert.equal(candidate.gate_candidate_id,'candidate-g5');
    assert.equal(candidate.gate_candidate_status,'SUBMITTED');
  });
});

test('candidate submission fails closed on a missing project scope, a non-hex revision and empty evidence refs',async()=>{
  // A run without a project scope cannot submit a scoped candidate.
  const originalId=id(),readUnitId=id();
  const scoped={originalId,readUnitId,observation:observation()};
  await withStageAuthority({stage:'D02',input:scoped},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>({}),verifySourceBinding:async()=>true,bridge:bridgeStub,
      persistMaterialObservation:async()=>({evidence_id:id(),reading_unit_id:id(),link_id:id(),
        read_unit_id:readUnitId,read_run_id:id(),artifact_revision:'a'.repeat(64),
        request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      submitGateCandidate:async()=>'candidate-never',readGateAudit:async()=>null});
    delete run.scope;
    await assert.rejects(()=>worker.observeMaterial({run,job,registry,context,input:scoped,token:'s'}),
      /PRIVATE_GATE_CANDIDATE_SCOPE_INVALID/);
  });
  // A registration without a lowercase sha256-shaped source_version artifact
  // revision cannot become a Gate candidate revision.
  for (const spec of [
    {name:'upper-case revision',overrides:{source_version_artifact_revision:'C'.repeat(64)},pattern:/PRIVATE_SOURCE_REGISTRATION_REVISION_INVALID/},
    {name:'missing source revision',overrides:{source_version_artifact_revision:undefined},pattern:/PRIVATE_SOURCE_REGISTRATION_REVISION_INVALID/},
    // Y02 派生复核登记身份：空 source_version_id 在目录观察处即失败关闭，
    // 比 G0 证据检查更早、更靠近事实点。
    {name:'empty source version',overrides:{source_version_id:''},pattern:/SOURCE_CATALOG_REGISTRATION_INVALID/},
  ]) {
    const originalId=id(),projectId=id();
    const input={research_intent:'松江府田赋卷十一',
      scope:{project_id:projectId,original_id:originalId,page_number:35}};
    await withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
      const worker=createPrivateEvidenceStageWorker({
        readOriginal:async()=>imageRecord(originalId,projectId),
        verifySourceBinding:async()=>true,
        readRegistration:async()=>registrationFor(originalId,projectId,spec.overrides),
        recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
        readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
        recordCatalogEntry:async()=>({catalog_entry_id:id()}),
        bridge:bridgeStub,
        submitGateCandidate:async()=>{throw Error('must not submit '+spec.name);},
        readGateAudit:async()=>null,
      });
      await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'s'}),
        spec.pattern);
    });
  }
});
