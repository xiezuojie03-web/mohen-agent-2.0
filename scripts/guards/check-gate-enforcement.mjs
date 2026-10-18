#!/usr/bin/env node
/**
 * guard:gate-enforcement (six-stage, G0–G5 V3.0)
 *
 * Hardens the six-gate chain so PASS-only is enforced via the append-only
 * control.gate_audits (current_valid = true), never legacy PASS views.
 *
 * Checks:
 *   1. static: no legacy PASS view reference, no upsert self-qualify, reads current_valid
 *   2. runtime (mock db): G1 reading cannot consume non-G0-PASS source
 *   3. runtime: G2 evidence cannot consume non-G1-PASS reading unit
 *   4. runtime: empty upstream dependency is blocked (missing_is_eligible=false)
 *   5. runtime: conflicted identity cannot masquerade as adjudicated
 *   6. runtime: legalInput exposes only G(n-1) PASS rows
 *
 * Any failure => non-zero exit (guard fails).
 */
import fs from "node:fs";
import path from "node:path";
import { createMockDb } from "../../tests/data-production/mock-db.mjs";
import {
  validateG1Lineage,
  validateG2Lineage,
  validateG3Lineage,
  validateG4Lineage,
  validateG5Lineage,
  validateNoConflictedAdjudicated,
} from "../../packages/data-access/src/lineage-validator.mjs";
import { createDataProductionRepository } from "../../packages/data-access/src/data-production-repository.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const repoFile = path.join(root, "packages/data-access/src/data-production-repository.mjs");
const repoSrc = fs.readFileSync(repoFile, "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(`GATE_ENFORCEMENT_FAIL:${msg}`);
}

// ---- 1. static: no legacy PASS views, no upsert, reads current_valid ----
for (const v of ["g0_pass_sources", "g1_pass_evidence", "g2_pass_world_objects", "g3_pass_findings", "g4_pass_read_models"]) {
  assert(!repoSrc.includes(v), `legacy PASS view ${v} must not be referenced`);
}
assert(!/on conflict/i.test(repoSrc), "recordGate must be append-only (no upsert self-qualify)");
assert(repoSrc.includes("current_valid"), "repository must read current_valid gate audits");

const db = createMockDb({
  gateAudits: [
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
    { object_type: "entity", object_id: "ENT_OK", gate_code: "G3", result: "PASS" },
    { object_type: "entity", object_id: "ENT_CONFLICT", gate_code: "G3", result: "HOLD" },
  ],
  worldObjects: [
    { id: "ENT_OK", kind: "entity", maturity: "adjudicated" },
    { id: "ENT_CONFLICT", kind: "entity", maturity: "adjudicated" },
    { id: "REL_OK", kind: "relation_claim", maturity: "adjudicated", subject_entity_id: "ENT_OK", object_entity_id: "ENT_OK" },
  ],
  conflicts: [
    { object_type: "entity", object_id: "ENT_CONFLICT", resolution_status: "open" },
  ],
});

const repo = createDataProductionRepository(db);

// ---- 2. G1 reading cannot consume non-G0-PASS source ----
let threw = false;
try { await validateG1Lineage(db, ["S_HOLD"]); } catch { threw = true; }
assert(threw, "G1 lineage must block source not G0 PASS");
await validateG1Lineage(db, ["S_PASS"]);

// ---- 3. G2 evidence cannot consume non-G1-PASS reading unit ----
threw = false;
try { await validateG2Lineage(db, ["R_HOLD"]); } catch { threw = true; }
assert(threw, "G2 lineage must block reading unit not G1 PASS");
await validateG2Lineage(db, ["R_PASS"]);

// ---- 3b. G3 world cannot consume non-G2-PASS material evidence ----
threw = false;
try { await validateG3Lineage(db, ["E_HOLD"]); } catch { threw = true; }
assert(threw, "G3 lineage must block material evidence not G2 PASS");
await validateG3Lineage(db, ["E_PASS"]);

// ---- 3c. G4 finding cannot consume non-G3-PASS world object ----
threw = false;
try { await validateG4Lineage(db, ["W_HOLD"]); } catch { threw = true; }
assert(threw, "G4 lineage must block world object not G3 PASS");
await validateG4Lineage(db, ["W_PASS"]);

// ---- 3d. G5 read model cannot consume non-G4-PASS finding ----
threw = false;
try { await validateG5Lineage(db, ["F_HOLD"]); } catch { threw = true; }
assert(threw, "G5 lineage must block finding not G4 PASS");
await validateG5Lineage(db, ["F_PASS"]);

// ---- 4. empty upstream dependency blocked (F09) ----
threw = false;
try { await validateG1Lineage(db, []); } catch { threw = true; }
assert(threw, "empty upstream dependency must be blocked");

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
  conflicts: [],
});
await validateNoConflictedAdjudicated(dbClean);

// ---- 6. legalInput exposes only G(n-1) PASS rows ----
const g0Input = await repo.legalInput("D01");
assert(g0Input.length === 1 && g0Input[0].object_id === "S_PASS", "D01 must consume only G0 PASS source");
const g1Input = await repo.legalInput("D02");
assert(g1Input.length === 1 && g1Input[0].object_id === "R_PASS", "D02 must consume only G1 PASS reading unit");
const g2Input = await repo.legalInput("D03");
assert(g2Input.length === 1 && g2Input[0].object_id === "E_PASS", "D03 must consume only G2 PASS material evidence");
const g3Input = await repo.legalInput("D04");
assert(g3Input.some((r) => r.object_id === "W_PASS"), "D04 must consume G3 PASS world object");
assert(!g3Input.some((r) => r.object_id === "W_HOLD"), "D04 must not consume G3 HOLD world object");

console.log("GATE_ENFORCEMENT_OK");
