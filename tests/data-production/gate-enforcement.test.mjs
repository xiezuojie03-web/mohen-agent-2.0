import test from "node:test";
import assert from "node:assert/strict";
import { createMockDb } from "./mock-db.mjs";
import {
  validateG2Lineage,
  validateG3Lineage,
  validateG4Lineage,
  validateNoConflictedAdjudicated,
} from "../../packages/data-access/src/lineage-validator.mjs";
import { createDataProductionRepository } from "../../packages/data-access/src/data-production-repository.mjs";

const AUDITS = [
  { object_type: "material_evidence", object_id: "E_PASS", gate_code: "G1", result: "PASS" },
  { object_type: "material_evidence", object_id: "E_HOLD", gate_code: "G1", result: "HOLD" },
  { object_type: "entity", object_id: "W_PASS", gate_code: "G2", result: "PASS" },
  { object_type: "entity", object_id: "W_HOLD", gate_code: "G2", result: "HOLD" },
  { object_type: "finding", object_id: "F_PASS", gate_code: "G3", result: "PASS" },
  { object_type: "finding", object_id: "F_HOLD", gate_code: "G3", result: "HOLD" },
  { object_type: "story_seed", object_id: "L4_PASS", gate_code: "G4", result: "PASS" },
  { object_type: "story_seed", object_id: "L4_HOLD", gate_code: "G4", result: "HOLD" },
  { object_type: "entity", object_id: "ENT_OK", gate_code: "G2", result: "PASS" },
  { object_type: "entity", object_id: "ENT_CONFLICT", gate_code: "G2", result: "HOLD" },
];

const FIXTURE = {
  evidence: [{ id: "E_PASS" }, { id: "E_HOLD" }],
  worldObjects: [
    { id: "W_PASS", kind: "entity", maturity: "adjudicated" },
    { id: "W_HOLD", kind: "entity", maturity: "candidate" },
    { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
    { id: "ENT_CONFLICT", kind: "entity", maturity: "adjudicated" },
    { id: "REL_BAD", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_CONFLICT", object_entity_id: "ENT_OK" },
  ],
  findings: [{ id: "F_PASS" }, { id: "F_HOLD" }],
  readModels: [{ id: "L4_PASS", kind: "story_seed" }, { id: "L4_HOLD", kind: "story_seed" }],
  gateAudits: AUDITS,
  conflicts: [{ object_type: "entity", object_id: "ENT_CONFLICT", resolution_status: "open" }],
};

// T1: G1 HOLD cannot enter D03
test("T1 G1 HOLD cannot enter D03", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d03 = await repo.legalInputForD03();
  assert.equal(d03.length, 1);
  assert.equal(d03[0].object_id, "E_PASS");
  await assert.rejects(() => validateG2Lineage(db, ["E_HOLD"]), /G2_LINEAGE_BLOCKED/);
});

// T2: G2 HOLD cannot enter D04
test("T2 G2 HOLD cannot enter D04", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d04 = await repo.legalInputForD04();
  assert.ok(d04.some((r) => r.object_id === "W_PASS"));
  assert.ok(!d04.some((r) => r.object_id === "W_HOLD"));
  await assert.rejects(() => validateG3Lineage(db, ["W_HOLD"]), /G3_LINEAGE_BLOCKED/);
});

// T3: G3 HOLD cannot enter D05
test("T3 G3 HOLD cannot enter D05", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d05 = await repo.legalInputForD05();
  assert.equal(d05.length, 1);
  assert.equal(d05[0].object_id, "F_PASS");
  await assert.rejects(() => validateG4Lineage(db, ["F_HOLD"], []), /G4_LINEAGE_BLOCKED/);
});

// T4: conflicted dependency cannot masquerade as adjudicated
test("T4 conflicted identity cannot masquerade as adjudicated", async () => {
  const db = createMockDb(FIXTURE);
  await assert.rejects(() => validateNoConflictedAdjudicated(db), /CONFLICTED_ADJUDICATED/);

  const clean = createMockDb({
    worldObjects: [
      { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
      { id: "REL_OK", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_OK", object_entity_id: "ENT_OK" },
    ],
    gateAudits: [{ object_type: "entity", object_id: "ENT_OK", gate_code: "G2", result: "PASS" }],
    conflicts: [],
  });
  await validateNoConflictedAdjudicated(clean); // must pass
});

// T5: Runtime only consumes G4 PASS
test("T5 Runtime only consumes G4 PASS read models", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const rt = await repo.passed("D05");
  assert.equal(rt.length, 1);
  assert.equal(rt[0].object_id, "L4_PASS");
});

// Positive: a fully PASS lineage is accepted
test("positive full PASS lineage is accepted", async () => {
  const db = createMockDb({
    evidence: [{ id: "E_PASS" }],
    worldObjects: [{ id: "W_PASS", kind: "entity", maturity: "adjudicated" }],
    findings: [{ id: "F_PASS" }],
    gateAudits: [
      { object_type: "material_evidence", object_id: "E_PASS", gate_code: "G1", result: "PASS" },
      { object_type: "entity", object_id: "W_PASS", gate_code: "G2", result: "PASS" },
      { object_type: "finding", object_id: "F_PASS", gate_code: "G3", result: "PASS" },
    ],
    conflicts: [],
  });
  await validateG2Lineage(db, ["E_PASS"]);
  await validateG3Lineage(db, ["W_PASS"]);
  await validateG4Lineage(db, ["F_PASS"], ["W_PASS"]);
});
