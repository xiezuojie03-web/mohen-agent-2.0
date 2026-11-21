import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { createRunState } from "../../pipelines/data-production/orchestrator/run-state.mjs";
import { runAuthorizedFixture as runProduction } from "./authorized-fixture.mjs";
import { buildHumanReviewReport } from "../../pipelines/data-production/reporting/human-review-report.mjs";
import { adapters as passAdapters } from "./fixture-adapters.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

test("registry has one owner per D/L/G", () => {
  const r = loadRegistry(root);
  assert.equal(r.jobs.length, 6);
  assert.deepEqual(r.jobs.map(x => `${x.stage}/${x.data_layer}/${x.exit_gate}`),
    ["D00/L0/G0", "D01/L1/G1", "D02/L2/G2", "D03/L3/G3", "D04/L4/G4", "D05/L5/G5"]);
});

test("full PASS flows D00→D05 and produces human review data", async () => {
  const registry = loadRegistry(root);
  const run = createRunState({ research_intent: "fixture" });
  const done = await runProduction({ run, registry, context: { adapters: passAdapters } });
  assert.equal(done.status, "PASS");
  assert.equal(done.stage_results.length, 6);
  const review = buildHumanReviewReport(done);
  assert.equal(review.stages.length, 6);
  assert.ok(!("gate_evidence" in review.stages[0]));
});


test("a private D01 reading candidate cannot masquerade as a D02 professional request",async()=>{
  const registry=loadRegistry(root),originalId="11111111-1111-4111-8111-111111111111";
  const run=createRunState({research_intent:"verified text source",scope:{
    project_id:"22222222-2222-4222-8222-222222222222",original_id:originalId,page_number:1}});
  let d02Calls=0;const visited=[];
  const d01Request={schema:"mohen.private-evidence-stage-request.v1",stage:"D01",
    originalId,text:{kind:"verified_utf8_full/v1",source_version_id:"33333333-3333-4333-8333-333333333333",
      raw_item_id:"44444444-4444-4444-8444-444444444444",raw_sha256:"a".repeat(64)}};
  const readingCandidate={stage:"D01",candidate_kind:"private_text_reading",qualification:"UNASSESSED",
    gate_code:"G1",read_unit_id:"55555555-5555-4555-8555-555555555555",
    read_run_id:"66666666-6666-4666-8666-666666666666"};
  const adapters={...passAdapters,
    D00:async()=>({disposition:"PASS",output:d01Request}),
    D01:async()=>({disposition:"PASS",output:readingCandidate}),
    D02:async()=>{d02Calls++;throw Error("No typed D02 request may be executed");}};
  const done=await runProduction({run,registry,context:{adapters,
    onStage:async(stage,result)=>visited.push([stage,result.disposition,result.hold?.reason_code??null])}});
  assert.equal(done.status,"HOLD");
  assert.equal(done.current_stage,"D02");
  assert.deepEqual(done.stage_results.map(x=>x.stage),["D00","D01","D02"]);
  assert.equal(done.stage_results[2].hold.reason_code,"PRIVATE_NEXT_STAGE_REQUEST_NOT_READY");
  assert.equal(d02Calls,0,"D02 must not read an unconverted D01 producer candidate");
  assert.deepEqual(visited.at(-1),["D02","HOLD","PRIVATE_NEXT_STAGE_REQUEST_NOT_READY"]);
  assert.equal(done.stage_results[1].disposition,"PASS","synthetic G1 was only a test fixture");
});

test("HOLD stops downstream stages", async () => {
  const adapters = { ...passAdapters, D03: async () => ({
    disposition: "HOLD",
    gate_evidence: { reason: "fixture" },
    content_stats: {},
    review_records: [],
    hold: { reason_code: "MISSING_EVIDENCE", missing_requirement: "independent source", next_action: "research", recheck_condition: "source found" }
  }) };
  const done = await runProduction({
    run: createRunState({ research_intent: "hold" }),
    registry: loadRegistry(root),
    context: { adapters }
  });
  assert.equal(done.status, "HOLD");
  assert.deepEqual(done.stage_results.map(x => x.stage), ["D00", "D01", "D02", "D03"]);
});

test("REJECT stops downstream stages", async () => {
  const adapters = { ...passAdapters, D02: async () => ({
    disposition: "REJECT", gate_evidence: {}, content_stats: {}, review_records: [],
    reject: { reason_code: "UNREADABLE", detail: "fixture" }
  }) };
  const done = await runProduction({
    run: createRunState({ research_intent: "reject" }),
    registry: loadRegistry(root),
    context: { adapters }
  });
  assert.equal(done.status, "REJECT");
  assert.deepEqual(done.stage_results.map(x => x.stage), ["D00", "D01", "D02"]);
});


test("independent professional HOLD prevents the next D stage even when Producer claims PASS", async () => {
  const registry=loadRegistry(root),run=createRunState({research_intent:"synthetic-gate-hold"});
  const done=await runProduction({
    run,registry,context:{adapters:passAdapters,verifyStageQualification:async () => null},
  });
  assert.equal(done.status,"HOLD");
  assert.deepEqual(done.stage_results.map(x=>x.stage),["D00"]);
  assert.equal(done.stage_results[0].hold.reason_code,"INDEPENDENT_GATE_NOT_VERIFIED");
  assert.deepEqual(done.stage_results[0].outputs,{});
});

test("stale, forged or mismatched Gate receipt never advances a stage", async () => {
  const registry=loadRegistry(root),run=createRunState({research_intent:"synthetic-stale-gate"});
  const done=await runProduction({
    run,registry,context:{adapters:passAdapters,
      verifyStageQualification:async ({run,job,stage,gate,input_digest,output_digest})=>({
        qualification_current:true,decision_origin:"independent_gate",result:"PASS",
        gate_audit_id:"11111111-1111-4111-8111-111111111111",
        artifact_revision:"test",object_type:"synthetic_fixture",object_id:"22222222-2222-4222-8222-222222222222",
        valid_until:new Date(Date.now()-60000).toISOString(),
        run_id:run.run_id,job_id:job.job_id,
        reviewer_binding_ref:job.implementation.gate_reviewer_binding,consumer:'producer',
        stage,gate_code:gate,input_digest,output_digest,
      })},
  });
  assert.equal(done.status,"HOLD");
  assert.equal(done.stage_results.length,1);
  assert.equal(done.stage_results[0].hold.reason_code,"INDEPENDENT_GATE_NOT_VERIFIED");
});

// M5 E_L1_TO_D02: actual Runner authorization/qualification boundaries, synthetic dependencies.
test("qualified C01 reading becomes an exact D02 generation request before D02 authorization", async()=>{
  const {withExecutionAuthority,activeFixtureRegistry}=await import('./authorized-fixture.mjs');
  await withExecutionAuthority(async({grant})=>{
    const registry=activeFixtureRegistry(loadRegistry(root));
    const originalId="11111111-1111-4111-8111-111111111111";
    const run=createRunState({research_intent:"test",scope:{original_id:originalId,
      project_id:"22222222-2222-4222-8222-222222222222",root_task_id:"77777777-7777-4777-8777-777777777777"}});
    const candidate={stage:'D01',candidate_kind:'private_text_reading',gate_code:'G1',qualification:'UNASSESSED',
      original_id:originalId,source_version_id:'33333333-3333-4333-8333-333333333333',
      raw_item_id:'44444444-4444-4444-8444-444444444444',raw_sha256:'a'.repeat(64),
      read_unit_id:'55555555-5555-4555-8555-555555555555',read_run_id:'66666666-6666-4666-8666-666666666666',
      artifact_revision:'b'.repeat(64),request_digest:'c'.repeat(64),
      extent:{kind:'utf8_byte_range/v1',start_byte:0,end_byte:3,quote_sha256:'d'.repeat(64)}};
    let received,authorized;
    const {runProduction:realRunner}=await import('../../pipelines/data-production/orchestrator/orchestrator.mjs');
    const done=await realRunner({run,registry,from_stage:'D01',to_stage:'D02',context:{
      resume_input:{schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId},
      adapters:{...passAdapters,D01:async()=>({disposition:'PASS',output:candidate}),
        D02:async({input})=>{received=input;return {disposition:'HOLD',hold:{missing_requirement:'synthetic generator unavailable'}};}},
      fetchStageToken:async({stage,job,run,input})=>{if(stage==='D02')authorized=input;return grant(registry,job,run,input);},
      verifyStageQualification:async({run,job,stage,gate,input_digest,output_digest})=>({
        qualification_current:true,decision_origin:'independent_gate',result:'PASS',
        gate_audit_id:'88888888-8888-4888-8888-888888888888',artifact_revision:candidate.artifact_revision,
        object_type:'read_unit',object_id:candidate.read_unit_id,valid_until:new Date(Date.now()+60000).toISOString(),
        run_id:run.run_id,job_id:job.job_id,reviewer_binding_ref:job.implementation.gate_reviewer_binding,
        consumer:'producer',stage,gate_code:gate,input_digest,output_digest}),
    }});
    assert.equal(done.current_stage,'D02');
    assert.ok(received,'the real D02 adapter must receive the typed handoff');
    assert.equal(received.stage,'D02');assert.equal(received.originalId,originalId);
    assert.equal(received.readUnitId,candidate.read_unit_id);
    assert.equal(received.reading.artifact_revision,candidate.artifact_revision);
    assert.equal(received.reading.gate_audit_id,'88888888-8888-4888-8888-888888888888');
    assert.equal(received.reading.run_id,run.run_id);
    assert.equal(received.observation,undefined,'no fabricated professional content');
    assert.deepEqual(received,authorized,'grant must bind the transformed input, not the prior candidate');
    assert.equal(done.stage_results[1].disposition,'HOLD','generation never implies G2');
    // 同一派生请求必须能被 D02 续跑入口当受信输入接收：否则 G1 合格后仍无法续跑 D02。
    const {loadTrustedResumeInput}=await import('../../pipelines/data-production/orchestrator/resume-input.mjs');
    const fs=await import('node:fs'),os=await import('node:os'),path2=await import('node:path');
    const dir=fs.mkdtempSync(path2.join(os.tmpdir(),'mohen-d02-resume-'));
    fs.chmodSync(dir,0o700);
    const file=path2.join(dir,'D02.json');
    fs.writeFileSync(file,JSON.stringify(received),{mode:0o600});
    try{
      assert.deepEqual(loadTrustedResumeInput({stage:'D02',filePath:file,trustedDirectory:dir}),received);
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  });
});
