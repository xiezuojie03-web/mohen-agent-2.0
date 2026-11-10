import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {
  assertStageExecutionAuthorized, executionDigest,
} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {createPrivateEvidenceStageWorker} from '../../pipelines/data-production/workers/private-evidence-stage.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const id=()=>randomUUID();
const names=['MOHEN_EXECUTION_AUTH_PUBLIC_KEY','MOHEN_EXECUTION_AUTH_VERIFY_URL','MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL'];

// Same signed-grant boundary as the Runner: one EdDSA stage grant plus one live
// nonce confirmation. The verifier mock consumes the nonce exactly once, so a
// replayed grant fails closed exactly like the real trusted verifier.
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

const IMAGE=Buffer.from([0xff,0xd8,0xff,0xe0,1,2,3,4]);
// Candidate submission stub; this file asserts provenance, not Gate I/O.
// D01 现在要求 G0 已批准消费者方法预选，故这里给出 C01/C02 均在内的合成批准。
const gateStub={submitGateCandidate:async()=>'candidate-fixture',readGateAudit:async()=>null,
  readApprovedMethodPlan:async()=>({gate_audit_id:'audit-fixture',refs:buildMethodPlanRefs({methods:[
    {method_id:'C01',method_version:'v1'},{method_id:'C02',method_version:'v1'}]})})};
const IMAGE_SHA=digest(IMAGE);
const registrationFor=(originalId,projectId)=>({schema:'mohen.private-source-registration.v1',
  original_id:originalId,project_id:projectId,source_id:id(),source_version_id:id(),raw_item_id:id(),
  sha256:IMAGE_SHA,byte_size:IMAGE.length,content_type:'image/jpeg',
  storage_ref:'mohen-private-originals/'+projectId+'/'+originalId+'.bin',
  provider:'NAJ',title:'松江府志7',source_type:'gazetteer',carrier_type:'scanned_page',
  rights:{status:'public_domain_secondary_use'},asset_revision_id:id(),
  original_locator:{item:4252790,catalog_no:'NAJDA-292-0017'},
  provenance_status:'verified',content_availability:'image_scan',
  artifact_revision:'b'.repeat(64),source_version_artifact_revision:'a'.repeat(64)});

test('D00 verifySourceIntake returns an UNASSESSED registration candidate under a real stage grant',async()=>{
  const originalId=id(),projectId=id();
  const input={research_intent:'松江府田赋卷十一',scope:{project_id:projectId,original_id:originalId,page_number:35},
    acquisition:{
      method:{method_key:'M0002',method_version:'v1',access_mode:'manual_download',
        resource_scope:{provider:'国立公文书馆(NAJ)'},steps:['打开馆藏页面','下载本页 JPEG'],
        success_criteria:['字节与馆藏页面一致'],failure_modes:['页面不可达'],alternatives:[]},
      attempt:{result_state:'acquired_verified',asset_sha256:IMAGE_SHA,byte_size:IMAGE.length,
        started_at:'2026-11-10T00:00:00.000Z',finished_at:'2026-11-10T00:01:00.000Z',
        request_digest:'d'.repeat(64)}}};
  let reads=0,registrations=0,bindings=0;
  let intakeEntry=null;
  let intakeVerification=null;
  let intakePriority=null;
  let intakeAttempt=null;
  const intakeEntryId=id();
  const intakeVerificationId=id();
  const intakeAttemptId=id();
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>{reads++;return {record:{original_id:originalId,project_id:projectId,
        state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:IMAGE};},
      verifySourceBinding:async()=>{bindings++;return true;},
      readRegistration:async()=>{registrations++;return registrationFor(originalId,projectId);},
      recordSourceNeed:async()=>({need_id:id(),created_at:new Date().toISOString()}),
      readProjectStock:async()=>({originals:1,verified_originals:1,unbound_verified:0,linked_sources:1,carriers:{'image/jpeg':1}}),
      recordCatalogEntry:async entry=>{intakeEntry=entry;return {catalog_entry_id:intakeEntryId};},
      recordCandidateVerification:async item=>{intakeVerification=item;return {verification_id:intakeVerificationId};},
      recordPriorityAssessment:async item=>{intakePriority=item;return {assessment_id:id()};},
      registerAcquisitionMethod:async()=>({method_key:'M0002',method_version:'v1'}),
      appendAcquisitionAttempt:async item=>{intakeAttempt=item;return {attempt_id:intakeAttemptId};},
      recordAcquisitionCoverage:async()=>({coverage_id:id()}),
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
    });
    const candidate=await worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(reads,1);assert.equal(registrations,1);assert.equal(bindings,1);
    // Y02：工序必须从登记真值派生目录观察（含馆方目录号），不抄调用方。
    assert.equal(candidate.intake_catalog_entry_id,intakeEntryId);
    assert.equal(intakeEntry.provider,'NAJ');
    assert.equal(intakeEntry.catalogTitle,'松江府志7');
    assert.equal(intakeEntry.catalogIdentifier,'NAJDA-292-0017');
    assert.equal(intakeEntry.carrierHint,'scanned_page');
    assert.equal(intakeEntry.language,null,'本次准入没读语言真值，保持未登记');
    assert.deepEqual(intakeEntry.coverageHint,{content_availability:'image_scan'});
    assert.deepEqual(intakeEntry.rightsHint,{status:'public_domain_secondary_use'});
    assert.equal(intakeEntry.availabilityState,'catalog_found');
    assert.equal(intakeEntry.discoveredByMethod,'D00/Y02:intake_registration');
    assert.equal(intakeEntry.evidenceRef.schema,'mohen.source-catalog-observation.v1');
    assert.equal(intakeEntry.evidenceRef.original_id,originalId);
    assert.equal(intakeEntry.evidenceRef.provenance_status,'verified');
    // Y03：候选核查就地派生，挂在刚登记的准入条目上；本次没读异名词源即如实需人确认。
    assert.equal(candidate.intake_verification_id,intakeVerificationId);
    assert.equal(intakeVerification.catalogEntryId,intakeEntryId);
    assert.equal(intakeVerification.verdict,'needs_owner');
    assert.equal(intakeVerification.methodKey,'D00/Y03:intake_candidate_check');
    assert.equal(intakeVerification.checks.identity.content_type,'image/jpeg');
    assert.equal(intakeVerification.checks.locator.catalog_no,'present');
    // Y06：处置由 Y03 结论决定，needs_owner 只能 deferred，挂在准入条目上。
    assert.equal(intakePriority.catalogEntryId,intakeEntryId);
    assert.equal(intakePriority.decision,'deferred');
    assert.equal(intakePriority.methodKey,'D00/Y06:intake_priority');
    assert.equal(candidate.intake_priority_decision,'deferred');
    // Y07：获取尝试落库，candidate_ref 是本次准入的 Y05 身份分层本身，
    // 依赖引用指向版本与数字资产两层真实实体；字节与库存一致才可自称 acquired_verified。
    assert.equal(candidate.acquisition_attempt_id,intakeAttemptId);
    assert.equal(intakeAttempt.methodKey,'M0002');
    assert.equal(intakeAttempt.resultState,'acquired_verified');
    assert.equal(intakeAttempt.assetSha256,IMAGE_SHA);
    assert.equal(intakeAttempt.candidateRef.schema,'mohen.source-identity-stratification.v1');
    assert.deepEqual(intakeAttempt.dependencyRefs.map(d=>d.kind).sort(),['raw_item','source_version']);
    assert.equal(candidate.stage,'D00');
    assert.equal(candidate.gate_code,'G0');
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.candidate_kind,'private_source_intake');
    assert.equal(candidate.rights.status,'public_domain_secondary_use');
    assert.equal(candidate.sha256,IMAGE_SHA);
    // G0 must bind the source_version revision, never the raw_item revision.
    assert.equal(candidate.artifact_revision,'a'.repeat(64));
    assert.equal(candidate.provider,'NAJ');
    assert.match(candidate.request_digest,/^[a-f0-9]{64}$/);
    await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(reads,1,'a replayed grant must not read the original again');
  });
});

test('D00 rejects an authorized but invalid scope before any read',async()=>{
  const badScope={research_intent:'x',scope:{project_id:id(),original_id:'nope',page_number:1}};
  return withStageAuthority({stage:'D00',input:badScope},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>{throw Error('must not read');},
      verifySourceBinding:async()=>true,
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
    });
    await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input:badScope,token:'s'}),
      /PRIVATE_SOURCE_INTAKE_SCOPE_INVALID/);
  });
});

test('D00 requires the registration repository before touching the original',async()=>{
  const projectId=id();
  const input={research_intent:'x',scope:{project_id:projectId,original_id:id(),page_number:1}};
  return withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>{throw Error('must not read');},
      verifySourceBinding:async()=>true,
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
    });
    await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'s'}),
      /PRIVATE_SOURCE_REGISTRATION_REQUIRED/);
  });
});

test('D00 fails closed when the original bytes, project or binding disagree',async()=>{
  const originalId=id(),projectId=id();
  const input={research_intent:'x',scope:{project_id:projectId,original_id:originalId,page_number:35}};
  const registration=registrationFor(originalId,projectId);
  const cases={
    wrongBytes:{readOriginal:async()=>({record:{original_id:originalId,project_id:projectId,
        state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:Buffer.from('tampered')}),
      readRegistration:async()=>registration,verifySourceBinding:async()=>true,
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      expect:/PRIVATE_SOURCE_INTAKE_ORIGINAL_UNVERIFIED/},
    wrongProject:{readOriginal:async()=>({record:{original_id:originalId,project_id:id(),
        state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:IMAGE}),
      readRegistration:async()=>registration,verifySourceBinding:async()=>true,
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      expect:/PRIVATE_SOURCE_INTAKE_ORIGINAL_UNVERIFIED/},
    unbound:{readOriginal:async()=>({record:{original_id:originalId,project_id:projectId,
        state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:IMAGE}),
      readRegistration:async()=>registration,verifySourceBinding:async()=>false,
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      expect:/PRIVATE_READING_SOURCE_NOT_BOUND/},
  };
  for(const [name,deps] of Object.entries(cases)) {
    await withStageAuthority({stage:'D00',input},async({registry,job,run,context})=>{
      const worker=createPrivateEvidenceStageWorker(deps);
      await assert.rejects(()=>worker.verifySourceIntake({run,job,registry,context,input,token:'s'}),
        deps.expect,name);
    });
  }
});

test('D01 readScannedPage persists one C02 candidate under a real stage grant and replays fail closed',async()=>{
  const originalId=id(),sourceVersion=id(),rawItem=id();
  const input={originalId,page:{kind:'scanned_page/v1',page_number:37,
    source_version_id:sourceVersion,raw_item_id:rawItem,
    raw_sha256:IMAGE_SHA,page_sha256:IMAGE_SHA}};
  let persisted=0;
  return withStageAuthority({stage:'D01',input},async({registry,job,run,context})=>{
    const worker=createPrivateEvidenceStageWorker({
      readOriginal:async()=>({record:{original_id:originalId,project_id:id(),
        state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:IMAGE}),
      verifySourceBinding:async()=>true,
      persistPageReading:async()=>{persisted++;return {read_run_id:id(),read_unit_id:id(),
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'};},
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
    });
    const candidate=await worker.readScannedPage({run,job,registry,context,input,token:'synthetic-session'});
    assert.equal(persisted,1);
    assert.equal(candidate.stage,'D01');
    assert.equal(candidate.gate_code,'G1');
    assert.equal(candidate.qualification,'UNASSESSED');
    assert.equal(candidate.candidate_kind,'private_scanned_page_reading');
    assert.equal(candidate.raw_sha256,IMAGE_SHA);
    assert.equal(candidate.page.page_number,37);
    await assert.rejects(()=>worker.readScannedPage({run,job,registry,context,input,token:'synthetic-session'}),
      /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
    assert.equal(persisted,1,'no second persistence without a fresh grant');
  });
});

test('D01 readScannedPage rejects authorized-but-invalid locators before any read',async()=>{
  const originalId=id(),sourceVersion=id(),rawItem=id();
  const goodPage={kind:'scanned_page/v1',page_number:37,
    source_version_id:sourceVersion,raw_item_id:rawItem,
    raw_sha256:IMAGE_SHA,page_sha256:IMAGE_SHA};
  const cases=[
    {...goodPage,page_number:0},
    {...goodPage,page_sha256:'0'.repeat(64)},
    {...goodPage,raw_item_id:'nope'},
    {...goodPage,kind:'utf8_byte_range/v1'},
  ];
  for(const page of cases) {
    const input={originalId,page};
    await withStageAuthority({stage:'D01',input},async({registry,job,run,context})=>{
      const worker=createPrivateEvidenceStageWorker({
        readOriginal:async()=>{throw Error('must not read an invalid locator');},
        verifySourceBinding:async()=>true,
        persistPageReading:async()=>{throw Error('must not persist an invalid locator');},
        bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      });
      await assert.rejects(()=>worker.readScannedPage({run,job,registry,context,input,token:'s'}),
        /PRIVATE_PAGE_READING_LOCATOR_INVALID/);
    });
  }
});

test('D01 readScannedPage rejects unbound sources, wrong bytes and a missing persistence repository',async()=>{
  const originalId=id(),sourceVersion=id(),rawItem=id();
  const input={originalId,page:{kind:'scanned_page/v1',page_number:37,
    source_version_id:sourceVersion,raw_item_id:rawItem,
    raw_sha256:IMAGE_SHA,page_sha256:IMAGE_SHA}};
  const goodRead=()=>({record:{original_id:originalId,project_id:id(),
    state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:IMAGE});
  const cases={
    unbound:{readOriginal:goodRead,verifySourceBinding:async()=>false,
      persistPageReading:async()=>({read_run_id:id(),read_unit_id:id(),
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'}),
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      expect:/PRIVATE_READING_SOURCE_NOT_BOUND/},
    noPersist:{readOriginal:goodRead,verifySourceBinding:async()=>true,
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      expect:/PRIVATE_PAGE_READING_PERSISTENCE_REQUIRED/},
    wrongBytes:{readOriginal:async()=>({record:{original_id:originalId,project_id:id(),
        state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:IMAGE_SHA,byte_size:IMAGE.length},bytes:Buffer.from('tampered')}),
      verifySourceBinding:async()=>true,
      persistPageReading:async()=>{throw Error('must not persist unverified bytes');},
      bridge:{linkReading:async()=>({}),linkClaim:async()=>({})},...gateStub,
      expect:/PRIVATE_PAGE_READING_ORIGINAL_UNVERIFIED/},
  };
  for(const [name,deps] of Object.entries(cases)) {
    await withStageAuthority({stage:'D01',input},async({registry,job,run,context})=>{
      const worker=createPrivateEvidenceStageWorker(deps);
      await assert.rejects(()=>worker.readScannedPage({run,job,registry,context,input,token:'s'}),
        deps.expect,name);
    });
  }
});
