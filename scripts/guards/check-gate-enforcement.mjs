#!/usr/bin/env node
/**
 * guard:gate-enforcement
 *
 * Hardens the production chain so that PASS-only is no longer a doc principle
 * but a real constraint executors/orchestrator/runtime cannot bypass.
 *
 * Checks (no second gate state introduced; reuses control.* PASS views):
 *   1. static: legal-input selectors read the G(n-1) PASS views, not base tables
 *   2. runtime (mock db): G1 HOLD cannot enter D03
 *   3. runtime: G2 HOLD cannot enter D04
 *   4. runtime: G3 HOLD cannot enter D05
 *   5. runtime: conflicted identity cannot masquerade as adjudicated
 *   6. runtime: Runtime only consumes G4 PASS
 *
 * Any failure => non-zero exit (guard fails).
 */
import fs from "node:fs";
import path from "node:path";
import { createMockDb } from "../../tests/data-production/mock-db.mjs";
import {
  validateG2Lineage,
  validateG3Lineage,
  validateG4Lineage,
  validateNoConflictedAdjudicated,
} from "../../packages/data-access/src/lineage-validator.mjs";
import { createDataProductionRepository } from "../../packages/data-access/src/data-production-repository.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const repoFile = path.join(root, "packages/data-access/src/data-production-repository.mjs");
const repoSrc = fs.readFileSync(repoFile, "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(`GATE_ENFORCEMENT_FAIL:${msg}`);
}

// ---- 1. static: selectors read PASS views, not base tables ----
for (const v of ["control.g1_pass_evidence", "control.g2_pass_world_objects", "control.g3_pass_findings"]) {
  assert(repoSrc.includes(v), `legal-input selector must read ${v}`);
}
assert(!/from\s+evidence\.material_evidence\b/.test(repoSrc.replace(/control\.g1_pass_evidence/g, "")), "no raw base-table read in legal-input path");

const db = createMockDb({
  evidence: [
    { id: "E_PASS" },
    { id: "E_HOLD" },
  ],
  worldObjects: [
    { id: "W_PASS", kind: "entity", maturity: "adjudicated" },
    { id: "W_HOLD", kind: "entity", maturity: "candidate" },
    { id: "REL_OK", kind: "relation_claim", maturity: "candidate", subject_entity_id: "ENT_OK", object_entity_id: "ENT_OK" },
    { id: "REL_BAD", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_CONFLICT", object_entity_id: "ENT_OK" },
    { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
    { id: "ENT_CONFLICT", kind: "entity", maturity: "adjudicated" },
  ],
  findings: [
    { id: "F_PASS" },
    { id: "F_HOLD" },
  ],
  readModels: [
    { id: "L4_PASS", kind: "story_seed" },
    { id: "L4_HOLD", kind: "story_seed" },
  ],
  gateAudits: [
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
  ],
  conflicts: [
    { object_type: "entity", object_id: "ENT_CONFLICT", resolution_status: "open" },
  ],
});

const repo = createDataProductionRepository(db);

// ---- 2. G1 HOLD cannot enter D03 ----
const d03 = await repo.legalInputForD03();
assert(d03.length === 1 && d03[0].object_id === "E_PASS", "D03 must expose only G1 PASS evidence (E_HOLD excluded)");
let threw = false;
try { await validateG2Lineage(db, ["E_HOLD"]); } catch { threw = true; }
assert(threw, "G2 lineage must block G1 HOLD evidence");

// ---- 3. G2 HOLD cannot enter D04 ----
const d04 = await repo.legalInputForD04();
assert(d04.some((r) => r.object_id === "W_PASS") && !d04.some((r) => r.object_id === "W_HOLD"), "D04 must expose only G2 PASS world objects");
threw = false;
try { await validateG3Lineage(db, ["W_HOLD"]); } catch { threw = true; }
assert(threw, "G3 lineage must block G2 HOLD world object");

// ---- 4. G3 HOLD cannot enter D05 ----
const d05 = await repo.legalInputForD05();
assert(d05.length === 1 && d05[0].object_id === "F_PASS", "D05 must expose only G3 PASS findings");
threw = false;
try { await validateG4Lineage(db, ["F_HOLD"], []); } catch { threw = true; }
assert(threw, "G4 lineage must block G3 HOLD finding");

// ---- 5. conflicted identity cannot masquerade as adjudicated ----
threw = false;
try { await validateNoConflictedAdjudicated(db); } catch { threw = true; }
assert(threw, "conflicted entity referenced by adjudicated relation must be blocked");
// positive: without the conflict, passes
const dbClean = createMockDb({
  worldObjects: [
    { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
    { id: "REL_OK2", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_OK", object_entity_id: "ENT_OK" },
  ],
  gateAudits: [
    { object_type: "entity", object_id: "ENT_OK", gate_code: "G2", result: "PASS" },
  ],
  conflicts: [],
});
await validateNoConflictedAdjudicated(dbClean); // must not throw

// ---- 6. Runtime only consumes G4 PASS ----
const rtEligible = await repo.passed("D05");
assert(rtEligible.length === 1 && rtEligible[0].object_id === "L4_PASS", "Runtime must consume only G4 PASS read models");

console.log("GATE_ENFORCEMENT_OK");
