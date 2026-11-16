import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
  assertNoUnboundPrivateEvidenceInput,
  PRIVATE_EVIDENCE_ADAPTER_PATH,
} from '../../pipelines/data-production/orchestrator/adapter-binding.mjs';
import {adapters} from '../../pipelines/data-production/adapters/private-evidence-adapters.mjs';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const request=stage=>({schema:'mohen.private-evidence-stage-request.v1',
  stage,originalId:randomUUID()});
const job=stage=>({stage,job_id:'fixture-'+stage,implementation:{adapter_binding:PRIVATE_EVIDENCE_ADAPTER_PATH,gate_reviewer_binding:'fixture-reviewer'}});
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
test('typed private requests require the exact reviewed alternative binding',()=>{
  const input=request('D01');
  const j={stage:'D01',implementation:{adapter_binding:'pipelines/data-production/adapters/layer1-adapters.mjs',private_evidence_adapter_binding:PRIVATE_EVIDENCE_ADAPTER_PATH}};
  assert.doesNotThrow(()=>assertNoUnboundPrivateEvidenceInput(input,{job:j}));
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput(input,{job:{...j,implementation:{...j.implementation,private_evidence_adapter_binding:'untrusted'}}}),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
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
        ...(stage==='D01'?{read_run_id:input.originalId,read_unit_id:input.originalId,
          artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)}:{}),
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
        return {stage:'D01',gate_code:'G1',qualification:'UNASSESSED',read_run_id:input.originalId,
          read_unit_id:input.originalId,artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)};
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

test('D00 source intake returns a typed D01 request and UNASSESSED candidate refs with a trusted runtime',async()=>{
  const input={research_intent:'松江府田赋卷十一',scope:{project_id:randomUUID(),original_id:randomUUID(),page_number:37}};
  const j=job('D00');let called=0;
  const worker={verifySourceIntake:async args=>{
    called++;assert.equal(args.input,input);assert.equal(args.token,'synthetic-owner-session');
    return {stage:'D00',candidate_kind:'private_source_intake',gate_code:'G0',qualification:'UNASSESSED',
      original_id:input.scope.original_id,project_id:input.scope.project_id,page_number:37,
      source_id:randomUUID(),source_version_id:randomUUID(),raw_item_id:randomUUID(),
      sha256:'a'.repeat(64),byte_size:362221,content_type:'image/jpeg',
      rights:{status:'public_domain_secondary_use'},provider:'NAJ',title:'松江府志7',
      source_type:'gazetteer',carrier_type:'scanned_page',
      asset_revision_id:randomUUID(),artifact_revision:'b'.repeat(64),request_digest:'c'.repeat(64)};
  }};
  const result=await adapters.D00({run:{run_id:randomUUID()},job:j,input,
    context:{registry:{},privateEvidenceWorker:worker,privateEvidenceOwnerSessionToken:'synthetic-owner-session'}});
  assert.equal(called,1);
  assert.equal(result.disposition,'PASS');
  assert.equal(result.output.schema,'mohen.private-evidence-stage-request.v1');
  assert.equal(result.output.stage,'D01');
  assert.equal(result.output.originalId,input.scope.original_id);
  assert.equal(result.output.page.kind,'scanned_page/v1');
  assert.equal(result.output.page.page_number,37);
  assert.equal(result.output.page.raw_sha256,'a'.repeat(64));
  assert.equal(result.output.page.source_version_id===undefined,false,'page carries the exact registered version');
  assert.equal(result.gate_evidence.qualification,'UNASSESSED');
  assert.equal(result.gate_evidence.gate_code,'G0');
  assert.equal(result.gate_evidence.rights.status,'public_domain_secondary_use');
  assert.equal(result.gate_evidence.provider,'NAJ');
  assert.equal(result.control_outputs.candidate_refs[0].object_type,'raw_item');
  assert.equal(result.control_outputs.candidate_refs[0].qualification,'UNASSESSED');
  assert.equal(result.content_stats.sources,1);
  assert.ok(!JSON.stringify(result.output).includes('synthetic-owner-session'));
});


test('D00 hands a real text/plain C01 request to D01 without turning it into a scanned page',async()=>{
  const input={research_intent:'田赋条文',scope:{project_id:randomUUID(),original_id:randomUUID(),page_number:1}};
  const methodPlan=[{kind:'method_plan',method_id:'C01',method_version:'v1'}];
  const sourceVersionId=randomUUID(),rawItemId=randomUUID();
  const run={run_id:randomUUID()};
  const sourceJob=job('D00');
  const readingJob=job('D01');
  const registry={};
  const worker={
    verifySourceIntake:async()=>({
      stage:'D00',candidate_kind:'private_source_intake',gate_code:'G0',qualification:'UNASSESSED',
      original_id:input.scope.original_id,source_version_id:sourceVersionId,raw_item_id:rawItemId,
      sha256:'a'.repeat(64),asset_revision_id:randomUUID(),artifact_revision:'b'.repeat(64),
      request_digest:'c'.repeat(64),content_type:'text/plain',method_plan:methodPlan,
    }),
    draftTextReading:async({input:readingInput})=>{
      assert.equal(readingInput.text.kind,'verified_utf8_full/v1');
      assert.deepEqual(readingInput.method_plan,methodPlan);
      assert.equal(readingInput.text.source_version_id,sourceVersionId);
      assert.equal(readingInput.text.raw_item_id,rawItemId);
      assert.equal(readingInput.text.raw_sha256,'a'.repeat(64));
      assert.equal(readingInput.extent,undefined);
      assert.equal(readingInput.quote,undefined);
      return {stage:'D01',candidate_kind:'private_text_reading',gate_code:'G1',
        qualification:'UNASSESSED',read_run_id:randomUUID(),read_unit_id:randomUUID(),
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)};
    },
    readScannedPage:async()=>{throw Error('C02 must not read text/plain');},
  };
  const context={registry,privateEvidenceWorker:worker,
    privateEvidenceOwnerSessionToken:'synthetic-owner-session'};
  const d00=await adapters.D00({run,job:sourceJob,input,context});
  assert.equal(d00.disposition,'PASS');
  assert.equal(d00.output.page,undefined);
  assert.equal(d00.output.text.kind,'verified_utf8_full/v1');
  assert.doesNotMatch(JSON.stringify(d00.output),/田赋条文|synthetic-owner-session/);
  const d01=await adapters.D01({run,job:readingJob,input:d00.output,context});
  assert.equal(d01.disposition,'PASS');
  assert.equal(d01.control_outputs.candidate_refs[0].object_type,'read_unit');
  assert.equal(d01.gate_evidence.qualification,'UNASSESSED');
});

test('D00 refuses an unsupported carrier before forwarding a mislabelled D01 request',async()=>{
  const input={research_intent:'来源',scope:{project_id:randomUUID(),original_id:randomUUID(),page_number:1}};
  const candidate={stage:'D00',gate_code:'G0',qualification:'UNASSESSED',
    original_id:input.scope.original_id,source_version_id:randomUUID(),raw_item_id:randomUUID(),
    asset_revision_id:randomUUID(),artifact_revision:'b'.repeat(64),
    request_digest:'c'.repeat(64),sha256:'a'.repeat(64),content_type:'application/pdf'};
  await assert.rejects(()=>adapters.D00({run:{run_id:randomUUID()},job:job('D00'),input,
    context:{registry:{},privateEvidenceWorker:{verifySourceIntake:async()=>candidate},
      privateEvidenceOwnerSessionToken:'synthetic-owner-session'}}),
    /PRIVATE_D01_CARRIER_NOT_SUPPORTED/);
});

test('D00 fails closed without scope or without a trusted runtime',async()=>{
  const j=job('D00');
  const missingScope=await adapters.D00({run:{},job:j,input:{},context:{}});
  assert.equal(missingScope.disposition,'HOLD');
  assert.equal(missingScope.hold.reason_code,'PRIVATE_SOURCE_INTAKE_SCOPE_REQUIRED');
  const input={research_intent:'松江府田赋',scope:{project_id:randomUUID(),original_id:randomUUID(),page_number:1}};
  const noRuntime=await adapters.D00({run:{},job:j,input,context:{}});
  assert.equal(noRuntime.disposition,'HOLD');
  assert.equal(noRuntime.hold.reason_code,'PRIVATE_STAGE_RUNTIME_NOT_BOUND');
});

test('D00 rejects a self-qualified or unpersisted source candidate',async()=>{
  const input={research_intent:'松江府田赋',scope:{project_id:randomUUID(),original_id:randomUUID(),page_number:1}};
  const j=job('D00');
  const base={stage:'D00',candidate_kind:'private_source_intake',gate_code:'G0',qualification:'UNASSESSED',
    original_id:input.scope.original_id,project_id:input.scope.project_id,page_number:1,
    source_id:randomUUID(),source_version_id:randomUUID(),raw_item_id:randomUUID(),
    sha256:'a'.repeat(64),byte_size:1,content_type:'image/jpeg',rights:{},provider:'p',title:'t',
    source_type:'gazetteer',carrier_type:'scanned_page',asset_revision_id:randomUUID(),
    artifact_revision:'b'.repeat(64),request_digest:'c'.repeat(64)};
  await assert.rejects(()=>adapters.D00({run:{run_id:randomUUID()},job:j,input,
    context:{registry:{},privateEvidenceOwnerSessionToken:'s',
      privateEvidenceWorker:{verifySourceIntake:async()=>({...base,qualification:'PASS'})}}}),
    /PRIVATE_STAGE_CANDIDATE_INVALID/);
  await assert.rejects(()=>adapters.D00({run:{run_id:randomUUID()},job:j,input,
    context:{registry:{},privateEvidenceOwnerSessionToken:'s',
      privateEvidenceWorker:{verifySourceIntake:async()=>({...base,raw_item_id:'not-a-uuid'})}}}),
    /PRIVATE_STAGE_CANDIDATE_NOT_PERSISTED/);
});

test('D01 routes a scanned-page request to readScannedPage, never the text reader',async()=>{
  const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:randomUUID(),
    page:{kind:'scanned_page/v1',page_number:37,source_version_id:randomUUID(),raw_item_id:randomUUID(),
      raw_sha256:'a'.repeat(64),page_sha256:'a'.repeat(64)}};
  const j=job('D01');let pageCalls=0;
  const worker={readScannedPage:async args=>{
    pageCalls++;assert.equal(args.input,input);
    return {stage:'D01',candidate_kind:'private_scanned_page_reading',
      gate_code:'G1',qualification:'UNASSESSED',read_run_id:randomUUID(),read_unit_id:randomUUID(),
      artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)};
  },draftTextReading:async()=>{throw Error('draftTextReading must not run for scanned pages');}};
  const result=await adapters.D01({run:{run_id:randomUUID()},job:j,input,
    context:{registry:{},privateEvidenceWorker:worker,privateEvidenceOwnerSessionToken:'synthetic-owner-session'}});
  assert.equal(pageCalls,1);
  assert.equal(result.disposition,'PASS');
  assert.equal(result.output.candidate_kind,'private_scanned_page_reading');
  assert.equal(result.gate_evidence.candidate_kind,'private_scanned_page_reading');
  assert.equal(result.control_outputs.candidate_refs[0].object_type,'read_unit');
});

test('D01 scanned-page request fails closed when the runtime lacks the page reader',async()=>{
  const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId:randomUUID(),
    page:{kind:'scanned_page/v1',page_number:1,source_version_id:randomUUID(),raw_item_id:randomUUID(),
      raw_sha256:'a'.repeat(64),page_sha256:'a'.repeat(64)}};
  const result=await adapters.D01({run:{run_id:randomUUID()},job:job('D01'),input,
    context:{registry:{},privateEvidenceWorker:{draftTextReading:async()=>{}},privateEvidenceOwnerSessionToken:'s'}});
  assert.equal(result.disposition,'HOLD');
  assert.equal(result.hold.reason_code,'PRIVATE_STAGE_RUNTIME_NOT_BOUND');
});

test('D01 exposes only durable candidate refs outside qualified outputs and refuses an in-memory-only candidate',async()=>{
  const input=request('D01'),j=job('D01');
  const candidate={stage:'D01',gate_code:'G1',qualification:'UNASSESSED',read_run_id:input.originalId,
    read_unit_id:input.originalId,artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),quote:'private literal'};
  const context={registry:{},privateEvidenceOwnerSessionToken:'synthetic-session',
    privateEvidenceWorker:{draftTextReading:async()=>candidate}};
  const result=await adapters.D01({run:{},job:j,input,context});
  assert.equal(result.control_outputs?.candidate_refs?.[0]?.object_id,input.originalId);
  assert.equal(result.control_outputs.candidate_refs[0].input_digest,executionDigest(input));
  assert.equal(result.control_outputs.candidate_refs[0].output_digest,executionDigest(candidate));
  assert.equal(result.gate_evidence?.candidate_refs?.[0]?.object_id,input.originalId,'machine reports retain the reviewable reference');
  assert.doesNotMatch(JSON.stringify(result.control_outputs),/private literal|synthetic-session/);
  await assert.rejects(()=>adapters.D01({run:{},job:j,input,context:{...context,
    privateEvidenceWorker:{draftTextReading:async()=>({stage:'D01',gate_code:'G1',qualification:'UNASSESSED'})}}}),
    /PRIVATE_STAGE_CANDIDATE_NOT_PERSISTED/);
});

test('D02 observation form routes to observeMaterial and emits material_evidence refs',async()=>{
  const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D02',originalId:randomUUID(),
    readUnitId:randomUUID(),
    observation:{h_type:'H05',literal_reading:'均科正耗平米三斗六升五合',
      source_voice:'official_gazetteer',evidence_type:'gazetteer_tax_quota_observation',
      uncertainty:{qualification:'UNASSESSED'}}};
  const j=job('D02');const evidenceId=randomUUID(),readingUnitId=randomUUID(),linkId=randomUUID();
  let linkCalls=0;
  const worker={observeMaterial:async args=>{
    assert.equal(args.input,input);assert.equal(args.token,'synthetic-owner-session');
    return {stage:'D02',candidate_kind:'private_material_observation',qualification:'UNASSESSED',
      gate_code:'G2',evidence_id:evidenceId,reading_unit_id:readingUnitId,link_id:linkId,
      read_unit_id:input.readUnitId,read_run_id:randomUUID(),
      artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)};
  },linkReading:async()=>{linkCalls++;throw Error('linkReading must not run for the observation form');}};
  const result=await adapters.D02({run:{run_id:randomUUID()},job:j,input,
    context:{registry:{},privateEvidenceWorker:worker,privateEvidenceOwnerSessionToken:'synthetic-owner-session'}});
  assert.equal(linkCalls,0);
  assert.equal(result.disposition,'PASS');
  const ref=result.control_outputs.candidate_refs[0];
  assert.equal(ref.object_type,'material_evidence');
  assert.equal(ref.object_id,evidenceId);
  assert.equal(ref.reading_unit_id,readingUnitId);
  assert.equal(ref.link_id,linkId);
  assert.equal(ref.read_unit_id,input.readUnitId);
  assert.equal(ref.gate_code,'G2');
  assert.equal(ref.qualification,'UNASSESSED');
  assert.doesNotMatch(JSON.stringify(result.control_outputs),/synthetic-owner-session/);
});

test('D03 claim form routes to assertWorldClaim and emits claim_revision refs',async()=>{
  const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D03',originalId:randomUUID(),
    evidenceId:randomUUID(),claim:{assertion:'青浦县低田均科正耗平米三斗六升五合。',
    change_type:'taxation_quota_assessment',time_scope:{note:'n'},support_type:'supports'}};
  const j=job('D03');const changeId=randomUUID(),revisionId=randomUUID();
  let linkCalls=0;
  const worker={assertWorldClaim:async args=>{
    assert.equal(args.input,input);assert.equal(args.token,'synthetic-owner-session');
    return {stage:'D03',candidate_kind:'private_world_claim',qualification:'UNASSESSED',
      gate_code:'G3',change_id:changeId,claim_revision_id:revisionId,
      claim_evidence_link_id:randomUUID(),evidence_id:input.evidenceId,
      artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)};
  },linkClaim:async()=>{linkCalls++;throw Error('linkClaim must not run for the claim form');}};
  const result=await adapters.D03({run:{run_id:randomUUID()},job:j,input,
    context:{registry:{},privateEvidenceWorker:worker,privateEvidenceOwnerSessionToken:'synthetic-owner-session'}});
  assert.equal(linkCalls,0);
  assert.equal(result.disposition,'PASS');
  const ref=result.control_outputs.candidate_refs[0];
  assert.equal(ref.object_type,'claim_revision');
  assert.equal(ref.object_id,revisionId);
  assert.equal(ref.change_id,changeId);
  assert.equal(ref.evidence_id,input.evidenceId);
  assert.equal(ref.qualification,'UNASSESSED');
});

test('D04/D05 emit finding and world_projection refs on the new forms',async()=>{
  const run={run_id:randomUUID()};
  const d04Input={schema:'mohen.private-evidence-stage-request.v1',stage:'D04',originalId:randomUUID(),
    claimRevisionId:randomUUID(),finding:{finding_type:'institutional_mechanism',
      human_question:'?',interpretive_statement:'!',counter_view_or_alternative:[],
      missing_evidence:[],uncertainty:{qualification:'UNASSESSED'}}};
  const findingId=randomUUID();
  const d04=await adapters.D04({run,job:job('D04'),input:d04Input,
    context:{registry:{},privateEvidenceOwnerSessionToken:'s',
      privateEvidenceWorker:{recordHumanisticFinding:async()=>({stage:'D04',
        candidate_kind:'private_humanistic_finding',qualification:'UNASSESSED',gate_code:'G4',
        finding_id:findingId,claim_revision_id:d04Input.claimRevisionId,
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)})}}});
  assert.equal(d04.disposition,'PASS');
  assert.equal(d04.control_outputs.candidate_refs[0].object_type,'finding');
  assert.equal(d04.control_outputs.candidate_refs[0].object_id,findingId);
  assert.equal(d04.control_outputs.candidate_refs[0].claim_revision_id,d04Input.claimRevisionId);
  const d05Input={schema:'mohen.private-evidence-stage-request.v1',stage:'D05',originalId:randomUUID(),
    findingId:randomUUID(),projection:{projection_key:'m5.songjiang.tianze.quota-rule.v1',payload:{title:'t'}}};
  const projectionId=randomUUID();
  const d05=await adapters.D05({run,job:job('D05'),input:d05Input,
    context:{registry:{},privateEvidenceOwnerSessionToken:'s',
      privateEvidenceWorker:{projectWorld:async()=>({stage:'D05',
        candidate_kind:'private_world_projection',qualification:'UNASSESSED',gate_code:'G5',
        projection_id:projectionId,finding_id:d05Input.findingId,
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)})}}});
  assert.equal(d05.disposition,'PASS');
  assert.equal(d05.control_outputs.candidate_refs[0].object_type,'world_projection');
  assert.equal(d05.control_outputs.candidate_refs[0].object_id,projectionId);
  assert.equal(d05.control_outputs.candidate_refs[0].finding_id,d05Input.findingId);
});

test('D04/D05 hold on wrong stage and fail closed on unpersisted candidates',async()=>{
  const j=job('D04');
  const mismatch=await adapters.D04({run:{},job:j,
    input:{schema:'mohen.private-evidence-stage-request.v1',stage:'D05',originalId:randomUUID(),
      findingId:randomUUID(),projection:{projection_key:'k',payload:{}}},context:{}});
  assert.equal(mismatch.disposition,'HOLD');
  assert.equal(mismatch.hold.reason_code,'PRIVATE_STAGE_REQUEST_REQUIRED');
  const d04Input={schema:'mohen.private-evidence-stage-request.v1',stage:'D04',originalId:randomUUID(),
    claimRevisionId:randomUUID(),finding:{}};
  await assert.rejects(()=>adapters.D04({run:{},job:job('D04'),input:d04Input,
    context:{registry:{},privateEvidenceOwnerSessionToken:'s',
      privateEvidenceWorker:{recordHumanisticFinding:async()=>({stage:'D04',qualification:'UNASSESSED',
        gate_code:'G4'})}}}),/PRIVATE_STAGE_CANDIDATE_NOT_PERSISTED/);
  const d05Input={schema:'mohen.private-evidence-stage-request.v1',stage:'D05',originalId:randomUUID(),
    findingId:randomUUID(),projection:{projection_key:'k',payload:{}}};
  await assert.rejects(()=>adapters.D05({run:{},job:job('D05'),input:d05Input,
    context:{registry:{},privateEvidenceOwnerSessionToken:'s',
      privateEvidenceWorker:{projectWorld:async()=>({stage:'D05',qualification:'UNASSESSED',
        gate_code:'G5',projection_id:'not-a-uuid',finding_id:randomUUID(),
        artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64)})}}}),
    /PRIVATE_STAGE_CANDIDATE_NOT_PERSISTED/);
});

test('D02 generation failure is a bounded recoverable HOLD with no leaked source/provider error',async()=>{
 const result=await adapters.D02({run:{run_id:randomUUID()},job:job('D02'),
  input:{...request('D02'),readUnitId:randomUUID(),reading:{schema:'mohen.qualified-private-reading.v1'}},
  context:{registry:{},privateEvidenceOwnerSessionToken:'synthetic-owner',privateEvidenceWorker:{
    observeMaterial:async()=>{const e=Error('sensitive provider text');e.code='DISPATCH_UNCERTAIN';throw e;}}}});
 assert.equal(result.disposition,'HOLD');assert.equal(result.hold.reason_code,'PRIVATE_D02_GENERATION_NOT_READY');
 assert.equal(result.hold.verification_error,'DISPATCH_UNCERTAIN');
 assert.equal(JSON.stringify(result).includes('sensitive provider text'),false);
 assert.equal(result.output,undefined);
});
