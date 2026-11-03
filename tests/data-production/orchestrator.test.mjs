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
