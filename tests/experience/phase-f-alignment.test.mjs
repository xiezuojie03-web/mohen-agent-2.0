import test from "node:test";
import assert from "node:assert/strict";
import { assertL4Resource } from "../../packages/agent-runtime/src/read-model-client.mjs";
import { createEvidenceOnDemandService } from "../../packages/agent-runtime/src/evidence-on-demand.mjs";
import { createExperienceState, restoreSemanticSnapshot, assertExperienceAction } from "../../packages/experience-engine/src/experience-state.mjs";
import { toParticipationEvent, participationToLivingTrace, livingTraceToD01SourceLead } from "../../packages/experience-engine/src/participation-feedback.mjs";

test("agent defaults to L4 resources only",()=>{
  assert.equal(assertL4Resource("story_seed"),true);
  assert.throws(()=>assertL4Resource("world.entities"),/DIRECT_LOWER_LAYER_READ_FORBIDDEN/);
});

test("Evidence on Demand traces from pointer and is read-only", async()=>{
  const repo={
    getEvidencePointer:async()=>({evidence_pointer_id:"p1",finding_ids:["f1"]}),
    getFinding:async()=>({finding_id:"f1",world_refs:[{type:"event",id:"w1"}]}),
    getWorldObject:async()=>({object_ref:"event:w1",evidence_ids:["e1"]}),
    getEvidence:async()=>({evidence_id:"e1",source_id:"s1"}),
    getSource:async()=>({source_id:"s1",title:"source"}),
  };
  const chain=await createEvidenceOnDemandService(repo).traceFromPointer("p1");
  assert.equal(chain.sources[0].source_id,"s1");
  assert.equal(Object.values(repo).some(fn=>fn.name?.match(/write|update|insert/i)),false);
});

test("experience snapshot preserves latest UI preferences",()=>{
  const current=createExperienceState({uiPreferences:{visibility:"expanded",dock:"floating",size:0.3}});
  const restored=restoreSemanticSnapshot(current,{place:"old",uiPreferences:{dock:"split"}});
  assert.equal(restored.place,"old");
  assert.equal(restored.uiPreferences.dock,"floating");
});

test("only registered ExperienceAction is allowed",()=>{
  assert.equal(assertExperienceAction({type:"map.focus"}),true);
  assert.throws(()=>assertExperienceAction({type:"dom.eval"}),/UNREGISTERED_EXPERIENCE_ACTION/);
});

test("participation cannot become living culture without consent",()=>{
  const e=toParticipationEvent({participation_id:"x1",event_type:"field_observation",field_observation:"bridge stone remains"});
  assert.throws(()=>participationToLivingTrace(e,{consent:false}),/CONSENT_REQUIRED/);
  const t=participationToLivingTrace(e,{consent:true});
  const lead=livingTraceToD01SourceLead(t);
  assert.equal(lead.source_lead.source_class,"living_culture_observation");
});

test("ordinary telemetry does not become living culture",()=>{
  const e=toParticipationEvent({participation_id:"x2",event_type:"map_zoom"});
  assert.equal(participationToLivingTrace(e,{consent:true}),null);
});
