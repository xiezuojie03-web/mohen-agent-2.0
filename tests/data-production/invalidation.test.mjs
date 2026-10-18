import test from "node:test";
import assert from "node:assert/strict";
import {
  computePreciseInvalidation,
  buildReverseDependencyIndex,
  depKey,
} from "../../packages/data-access/src/invalidation.mjs";

test("depKey renders type:id[@version]", () => {
  assert.equal(depKey({ type: "finding", id: "f1" }), "finding:f1");
  assert.equal(depKey({ type: "finding", id: "f1", version: "v2" }), "finding:f1@v2");
  assert.equal(depKey({ type: "", id: "" }), null);
});

test("buildReverseDependencyIndex maps dependency ref -> publication faces", () => {
  const idx = buildReverseDependencyIndex([
    { publication_revision: "rev1", consumer: "agent", dependency_refs: [{ type: "finding", id: "f1" }] },
    { publication_revision: "rev2", consumer: "visual_stage", dependency_refs: [{ type: "finding", id: "f1" }, { type: "entity", id: "e1" }] },
  ]);
  assert.equal(idx.get("finding:f1").length, 2);
  assert.equal(idx.get("entity:e1").length, 1);
});

test("computePreciseInvalidation returns affected revisions + suspension + recheck", () => {
  const idx = buildReverseDependencyIndex([
    { publication_revision: "rev1", purpose: "BE", consumer: "agent", dependency_refs: [{ type: "finding", id: "f1" }] },
  ]);
  const r = computePreciseInvalidation({
    change_event_ref: { id: "evt1" },
    changed_dependency_ref: { type: "finding", id: "f1" },
    dependency_index: idx,
    reason: "G4 revoked",
  });
  assert.deepEqual(r.affected_publication_revisions, ["rev1"]);
  assert.equal(r.affected_purpose_scope_consumers[0].consumer, "agent");
  assert.equal(r.suspension_request.action, "suspend_affected_consumption");
  assert.equal(r.recheck_request.action, "request_independent_g5_recheck");
  assert.equal(r.disposition, "BLOCKED");
  assert.equal(r.unknown_dependency, false);
});

test("computePreciseInvalidation unknown dependency -> fail closed (not global clear)", () => {
  const r = computePreciseInvalidation({
    changed_dependency_ref: { type: "finding", id: "f_missing" },
    dependency_index: new Map(),
    reason: "x",
  });
  assert.equal(r.unknown_dependency, true);
  assert.equal(r.disposition, "BLOCKED");
  assert.equal(r.affected_publication_revisions.length, 0);
});

test("computePreciseInvalidation missing dep key -> fail closed", () => {
  const r = computePreciseInvalidation({
    changed_dependency_ref: { type: "", id: "" },
    dependency_index: new Map(),
  });
  assert.equal(r.unknown_dependency, true);
  assert.equal(r.disposition, "BLOCKED");
});
