import test from "node:test";
import assert from "node:assert/strict";
import d05ReadModelPublication from "../../pipelines/data-production/adapters/d05-read-model-publication.mjs";

test("D05 no publish injection -> HOLD (honest, no fake PASS)", async () => {
  const r = await d05ReadModelPublication({ run: {}, job: { methods: ["P01", "P02"] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "PUBLICATION_NOT_IMPLEMENTED");
});

test("D05 injected publish returns six L5 candidates -> PASS + gate_evidence", async () => {
  const r = await d05ReadModelPublication({
    run: {}, job: { methods: ["P02", "P04"] }, input: {},
    context: {
      publishReadModels: async () => ({
        candidates: {
          world_projections: [{ projection_id: "p1" }],
          story_seeds: [{ story_seed_id: "s1" }],
          agent_contexts: [],
          map_timeline_projections: [],
          discovery_paths: [],
          evidence_pointers: [],
        },
        consumers: ["visual_stage", "agent"],
        stats: {}, reviews: [],
      }),
    },
  });
  assert.equal(r.disposition, "PASS");
  assert.equal(r.gate_evidence.stage, "D05");
  assert.equal(r.output.world_projections.length, 1);
  assert.equal(r.output.story_seeds.length, 1);
  assert.deepEqual(r.gate_evidence.consumers, ["visual_stage", "agent"]);
});

test("D05 unknown method -> HOLD", async () => {
  const r = await d05ReadModelPublication({ run: {}, job: { methods: ["P99"] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "UNKNOWN_METHOD");
});

test("D05 no method -> HOLD", async () => {
  const r = await d05ReadModelPublication({ run: {}, job: { methods: [] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "NO_METHOD");
});

test("D05 P08 mixed with P01 -> HOLD (single responsibility)", async () => {
  const r = await d05ReadModelPublication({ run: {}, job: { methods: ["P01", "P08"] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "MIXED_CONTROL_PUBLISH");
});

test("D05 P08 invalidation computes closure (control duty, no L5 candidate)", async () => {
  const r = await d05ReadModelPublication({
    run: {}, job: { methods: ["P08"] },
    input: {
      change_event_ref: { id: "evt1" },
      changed_dependency_ref: { type: "finding", id: "f1" },
      dependency_index: new Map([["finding:f1", [{ publication_revision: "rev1", consumer: "agent" }]]]),
      reason: "upstream G4 revoked",
    },
    context: {},
  });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "INVALIDATION_COMPUTED");
  assert.equal(r.control_outputs.invalidation_event.affected_publication_revisions.length, 1);
  assert.equal(r.control_outputs.invalidation_event.suspension_request.action, "suspend_affected_consumption");
});
