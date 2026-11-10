
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { createRunState } from "../../pipelines/data-production/orchestrator/run-state.mjs";
import { runAuthorizedFixture as runProduction } from "../data-production/authorized-fixture.mjs";
import { buildMachineReport } from "../../pipelines/data-production/reporting/machine-report.mjs";
import { buildHumanReviewReport } from "../../pipelines/data-production/reporting/human-review-report.mjs";
import { createEvidenceOnDemandService } from "../../packages/agent-runtime/src/evidence-on-demand.mjs";
import { toParticipationEvent, participationToLivingTrace, livingTraceToD01SourceLead } from "../../packages/experience-engine/src/participation-feedback.mjs";
import { makeStageAdapters, makeLineageRepo } from "./fixture-system.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

// Registry 现含 D00—D05 六个 Stage；本套件的历史断言覆盖 D01→D05（phase-G 体验/报告面），
// fixture 从未建模 D00 来源接入，故统一以 from_stage:"D01" + resume_input 起跑，保持原断言语义。

test("forward D01→D05 reaches L4", async()=>{
  const run = createRunState({research_intent:"fixture"});
  const done=await runProduction({run,registry:loadRegistry(root),from_stage:"D01",context:{adapters:makeStageAdapters(),resume_input:{research_intent:run.research_intent,scope:run.scope}}});
  assert.equal(done.status,"PASS");
  assert.deepEqual(done.stage_results.map(x=>x.stage),["D01","D02","D03","D04","D05"]);
});
test("machine/human reports stay separated", async()=>{
  const run = createRunState({research_intent:"reports"});
  const done=await runProduction({run,registry:loadRegistry(root),from_stage:"D01",context:{adapters:makeStageAdapters(),resume_input:{research_intent:run.research_intent,scope:run.scope}}});
  assert.ok(buildMachineReport(done).stages[0].gate_evidence);
  assert.ok(!("gate_evidence" in buildHumanReviewReport(done).stages[0]));
});
test("Evidence on Demand traces L4→L0", async()=>{
  const c=await createEvidenceOnDemandService(makeLineageRepo()).traceFromPointer("p1");
  assert.equal(c.sources[0].source_id,"s1");
});
test("L6→L7→D01 closes feedback", ()=>{
  const e=toParticipationEvent({participation_id:"p1",event_type:"field_observation",field_observation:"surviving stone"});
  const t=participationToLivingTrace(e,{consent:true});
  assert.equal(livingTraceToD01SourceLead(t).source_lead.source_class,"living_culture_observation");
});
test("ordinary telemetry cannot become source", ()=>{
  const e=toParticipationEvent({participation_id:"p2",event_type:"map_zoom"});
  assert.equal(participationToLivingTrace(e,{consent:true}),null);
});
test("HOLD blocks downstream", async()=>{
  const a=makeStageAdapters();
  a.D03=async()=>({disposition:"HOLD",gate_evidence:{},content_stats:{},review_records:[],hold:{reason_code:"IDENTITY_UNRESOLVED",missing_requirement:"identity proof",next_action:"research",recheck_condition:"new evidence"}});
  const run = createRunState({research_intent:"hold"});
  const done=await runProduction({run,registry:loadRegistry(root),from_stage:"D01",context:{adapters:a,resume_input:{research_intent:run.research_intent,scope:run.scope}}});
  assert.deepEqual(done.stage_results.map(x=>x.stage),["D01","D02","D03"]);
  assert.equal(done.status,"HOLD");
});
