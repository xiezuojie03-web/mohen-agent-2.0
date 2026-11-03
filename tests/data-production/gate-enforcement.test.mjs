import test from "node:test";
import assert from "node:assert/strict";
import { createMockDb } from "./mock-db.mjs";
import {
  validateG1Lineage,
  validateG2Lineage,
  validateG3Lineage,
  validateG4Lineage,
  validateG5Lineage,
  validateNoConflictedAdjudicated,
} from "../../packages/data-access/src/lineage-validator.mjs";
import { createDataProductionRepository } from "../../packages/data-access/src/data-production-repository.mjs";

const AUDITS = [
  { object_type: "source", object_id: "S_PASS", gate_code: "G0", result: "PASS" },
  { object_type: "source", object_id: "S_HOLD", gate_code: "G0", result: "HOLD" },
  { object_type: "reading_unit", object_id: "R_PASS", gate_code: "G1", result: "PASS" },
  { object_type: "reading_unit", object_id: "R_HOLD", gate_code: "G1", result: "HOLD" },
  { object_type: "material_evidence", object_id: "E_PASS", gate_code: "G2", result: "PASS" },
  { object_type: "material_evidence", object_id: "E_HOLD", gate_code: "G2", result: "HOLD" },
  { object_type: "entity", object_id: "W_PASS", gate_code: "G3", result: "PASS" },
  { object_type: "entity", object_id: "W_HOLD", gate_code: "G3", result: "HOLD" },
  { object_type: "finding", object_id: "F_PASS", gate_code: "G4", result: "PASS" },
  { object_type: "finding", object_id: "F_HOLD", gate_code: "G4", result: "HOLD" },
  { object_type: "story_seed", object_id: "L5_PASS", gate_code: "G5", result: "PASS" },
  { object_type: "story_seed", object_id: "L5_HOLD", gate_code: "G5", result: "HOLD" },
  { object_type: "entity", object_id: "ENT_OK", gate_code: "G3", result: "PASS" },
  { object_type: "entity", object_id: "ENT_CONFLICT", gate_code: "G3", result: "HOLD" },
].map(a=>({...a,decision_origin:'independent_gate',
  current_qualification:a.result==='PASS',consumer:'producer',
  purpose_namespace:'mohen',purpose_code:'synthetic-eligible',purpose_version:'1',
  allowed_scope:{project:'fixture'}}));

const qualifiedContext={consumer:'producer',purpose:{namespace:'mohen',
  code:'synthetic-eligible',version:'1'},scope:{project:'fixture'}};

const FIXTURE = {
  gateAudits: AUDITS,
  worldObjects: [
    { id: "W_PASS", kind: "entity", maturity: "adjudicated" },
    { id: "W_HOLD", kind: "entity", maturity: "candidate" },
    { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
    { id: "ENT_CONFLICT", kind: "entity", maturity: "adjudicated" },
    { id: "REL_BAD", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_CONFLICT", object_entity_id: "ENT_OK" },
  ],
  conflicts: [{ object_type: "entity", object_id: "ENT_CONFLICT", resolution_status: "open" }],
};

// T1: G1 HOLD reading unit cannot enter D02
test("T1 G1 HOLD reading cannot enter D02", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d02 = await repo.legalInput("D02",qualifiedContext);
  assert.equal(d02.length, 1);
  assert.equal(d02[0].object_id, "R_PASS");
  await assert.rejects(() => validateG2Lineage(db, ["R_HOLD"], qualifiedContext), /G2_LINEAGE_BLOCKED/);
});

// T2: G2 HOLD material evidence cannot enter D03
test("T2 G2 HOLD evidence cannot enter D03", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d03 = await repo.legalInput("D03",qualifiedContext);
  assert.ok(d03.some((r) => r.object_id === "E_PASS"));
  assert.ok(!d03.some((r) => r.object_id === "E_HOLD"));
  await assert.rejects(() => validateG3Lineage(db, ["E_HOLD"], qualifiedContext), /G3_LINEAGE_BLOCKED/);
});

// T3: G3 HOLD world object cannot enter D04
test("T3 G3 HOLD world object cannot enter D04", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d04 = await repo.legalInput("D04",qualifiedContext);
  assert.ok(d04.some((r) => r.object_id === "W_PASS"));
  assert.ok(!d04.some((r) => r.object_id === "W_HOLD"));
  await assert.rejects(() => validateG4Lineage(db, ["W_HOLD"], qualifiedContext), /G4_LINEAGE_BLOCKED/);
});

// T4: G4 HOLD finding cannot enter D05
test("T4 G4 HOLD finding cannot enter D05", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const d05 = await repo.legalInput("D05",qualifiedContext);
  assert.equal(d05.length, 1);
  assert.equal(d05[0].object_id, "F_PASS");
  await assert.rejects(() => validateG5Lineage(db, ["F_HOLD"], qualifiedContext), /G5_LINEAGE_BLOCKED/);
});

// T5: conflicted identity cannot masquerade as adjudicated
test("T5 conflicted identity cannot masquerade as adjudicated", async () => {
  const db = createMockDb(FIXTURE);
  await assert.rejects(() => validateNoConflictedAdjudicated(db), /CONFLICTED_ADJUDICATED/);

  const clean = createMockDb({
    worldObjects: [
      { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
      { id: "REL_OK", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_OK", object_entity_id: "ENT_OK" },
    ],
    gateAudits: [{ object_type: "entity", object_id: "ENT_OK", gate_code: "G3", result: "PASS" }],
    conflicts: [],
  });
  await validateNoConflictedAdjudicated(clean);
});

// T6: Runtime only consumes G5 PASS read models
test("T6 Runtime only consumes G5 PASS read models", async () => {
  const db = createMockDb(FIXTURE);
  const repo = createDataProductionRepository(db);
  const rt = await repo.passed("D05",qualifiedContext);
  assert.equal(rt.length, 1);
  assert.equal(rt[0].object_id, "L5_PASS");
});

// T7: empty upstream dependency is blocked (F09)
test("T7 empty upstream dependency is blocked", async () => {
  const db = createMockDb(FIXTURE);
  await assert.rejects(() => validateG1Lineage(db, []), /MISSING_DEPENDENCY/);
  await assert.rejects(() => validateG2Lineage(db, []), /MISSING_DEPENDENCY/);
});

// Positive: a fully PASS lineage is accepted
test("positive full PASS lineage is accepted", async () => {
  const db = createMockDb({
    gateAudits: [
      { object_type: "source", object_id: "S_PASS", gate_code: "G0", result: "PASS" },
      { object_type: "reading_unit", object_id: "R_PASS", gate_code: "G1", result: "PASS" },
      { object_type: "material_evidence", object_id: "E_PASS", gate_code: "G2", result: "PASS" },
      { object_type: "entity", object_id: "W_PASS", gate_code: "G3", result: "PASS" },
      { object_type: "finding", object_id: "F_PASS", gate_code: "G4", result: "PASS" },
      { object_type: "story_seed", object_id: "L5_PASS", gate_code: "G5", result: "PASS" },
    ].map(a=>({...a,decision_origin:'independent_gate',current_qualification:true,
      consumer:'producer',purpose_namespace:'mohen',
      purpose_code:'synthetic-eligible',purpose_version:'1',allowed_scope:{project:'fixture'}})),
    worldObjects: [{ id: "W_PASS", kind: "entity", maturity: "adjudicated" }],
    conflicts: [],
  });
  await validateG1Lineage(db, ["S_PASS"], qualifiedContext);
  await validateG2Lineage(db, ["R_PASS"], qualifiedContext);
  await validateG3Lineage(db, ["E_PASS"], qualifiedContext);
  await validateG4Lineage(db, ["W_PASS"], qualifiedContext);
  await validateG5Lineage(db, ["F_PASS"], qualifiedContext);
});

test("M3 legacy PASS and bare current_valid are never legal upstream inputs",async()=>{
  const db=createMockDb({gateAudits:[{gate_code:'G1',object_id:'R_PASS',
    result:'PASS',current_valid:true,consumer:'producer'}]});
  const repo=createDataProductionRepository(db);
  assert.deepEqual(await repo.legalInput('D02',qualifiedContext),[]);
  await assert.rejects(()=>validateG2Lineage(db,['R_PASS'],qualifiedContext),/G2_LINEAGE_BLOCKED/);
  await assert.rejects(()=>repo.legalInput('D02'),/QUALIFICATION_CONTEXT_REQUIRED/);
  await assert.rejects(()=>repo.passed('D05',{...qualifiedContext,scope:{}}),/QUALIFICATION_CONTEXT_REQUIRED/);
  await assert.rejects(()=>validateG2Lineage(db,['R_PASS'],{...qualifiedContext,consumer:'unknown'}),
    /QUALIFICATION_CONTEXT_REQUIRED/);
});
test("M3 wrong purpose, consumer or scope cannot inherit a qualifying fixture",async()=>{
  const repo=createDataProductionRepository(createMockDb(FIXTURE));
  const altered=[
    {...qualifiedContext,consumer:'watch'},
    {...qualifiedContext,purpose:{...qualifiedContext.purpose,code:'unrelated'}},
    {...qualifiedContext,scope:{project:'foreign'}},
  ];
  for(const bad of altered){
    assert.deepEqual(await repo.legalInput('D02',bad),[]);
    assert.deepEqual(await repo.passed('D05',bad),[]);
  }
});
