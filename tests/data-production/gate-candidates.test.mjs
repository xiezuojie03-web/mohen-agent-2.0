import test from "node:test";
import assert from "node:assert/strict";
import { createDataProductionRepository } from "../../packages/data-access/src/data-production-repository.mjs";

const complete = {
  runId: "run-fixture", stage: "D00", gateCode: "G0", objectType: "source", objectId: "source-fixture",
  artifactRevision: "source-revision-1", purpose: { namespace: "G0", code: "source-acquisition", version: "fixture-policy-1" },
  allowedScope: { project: "fixture-project" }, consumer: "producer", dependencySnapshot: [],
  evidenceRefs: [{ type: "source_version", id: "source-version-fixture" }], inputFingerprint: "a".repeat(64),
  result: "PASS",
};

test("Producer submits a candidate and cannot write a formal audit decision", async () => {
  const writes = [];
  const repo = createDataProductionRepository({ query: async (query, values) => {
    writes.push({ query, values });
    return { rows: [{ candidate_id: "candidate-fixture", gate_audit_id: "legacy-audit-fixture" }] };
  } });
  assert.equal(await repo.recordGate(complete), "candidate-fixture");
  assert.equal(writes.length, 1);
  assert.match(writes[0].query, /insert into control\.gate_candidates/);
  assert.doesNotMatch(writes[0].query, /(?:update|insert into) control\.gate_audits/);
  assert.ok(!writes[0].values.includes("PASS"), "stage result cannot be forwarded as a candidate qualification");
});

test("incomplete qualification metadata is rejected before any database write", async () => {
  let writes = 0;
  const repo = createDataProductionRepository({ query: async () => { writes++; return { rows: [] }; } });
  const incomplete = { ...complete, artifactRevision: undefined };
  await assert.rejects(repo.recordGate(incomplete), /GATE_CANDIDATE_METADATA_REQUIRED/);
  assert.equal(writes, 0);
});
