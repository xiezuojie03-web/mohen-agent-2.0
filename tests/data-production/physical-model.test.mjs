import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPersistenceScope } from "../../pipelines/data-production/adapters/persistence-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (f) => fs.readFileSync(path.join(root, "supabase/migrations", f), "utf8");
const baseline = read("202610070100_data_production_v2_baseline.sql");
const sixStage = read("202610160300_six_stage_gate_audits.sql");
const dropV1 = read("202610160400_drop_legacy_v1_public.sql");

test("semantic schemas", () => {
  for (const s of ["source", "evidence", "world", "meaning", "read_model", "control"])
    assert.match(baseline, new RegExp(`create schema if not exists ${s}`));
  assert.doesNotMatch(baseline, /create schema if not exists d0[1-5]/i);
});

test("raw append-only", () => {
  assert.match(baseline, /RAW_APPEND_ONLY/);
  assert.match(baseline, /before update or delete on source\.raw_items/i);
});

test("six-stage migration retires legacy G0-G4 PASS views", () => {
  for (const v of ["g0_pass_sources", "g1_pass_evidence", "g2_pass_world_objects", "g3_pass_findings", "g4_pass_read_models"])
    assert.match(sixStage, new RegExp(`drop view if exists control\\.${v}`, "i"));
});

test("six-stage gate_audits uses G0-G5 gates and append-only columns", () => {
  assert.match(sixStage, /G5/);
  assert.match(sixStage, /gate_audits_stage_check/);
  assert.match(sixStage, /architecture_generation/);
  assert.match(sixStage, /current_valid/);
  assert.match(sixStage, /supersedes_id/);
});

test("legacy v1 public tables are dropped", () => {
  assert.match(dropV1, /drop table if exists/i);
  assert.match(dropV1, /public\.entities/i);
  assert.match(dropV1, /public\.evidence_gate_audit/i);
  assert.match(dropV1, /public\.relations/i);
});

test("stage-owned persistence", () => {
  assert.equal(assertPersistenceScope("D00", "source.sources"), true);
  assert.equal(assertPersistenceScope("D01", "source.read_units"), true);
  assert.equal(assertPersistenceScope("D03", "world.entities"), true);
  assert.throws(() => assertPersistenceScope("D03", "meaning.findings"), /PERSISTENCE_SCOPE_VIOLATION/);
});

test("no Research Workspace", () => {
  assert.doesNotMatch(baseline, /create schema[^;]*research/i);
  assert.doesNotMatch(baseline, /research_workspace/i);
});
