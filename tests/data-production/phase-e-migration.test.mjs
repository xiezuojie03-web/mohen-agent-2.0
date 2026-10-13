import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const baseline=fs.readFileSync(path.join(root,"supabase/migrations/202610070100_data_production_v2_baseline.sql"),"utf8");
const backfill=fs.readFileSync(path.join(root,"supabase/migrations/202610070200_legacy_v1_to_v2_backfill.sql"),"utf8");

test("semantic schemas only",()=>{
  for (const s of ["source","evidence","world","meaning","read_model","control"])
    assert.match(baseline,new RegExp(`create schema if not exists ${s}`));
  assert.doesNotMatch(baseline,/create schema if not exists d0[1-5]/i);
});

test("candidate incompleteness is allowed",()=>{
  assert.match(baseline,/literal_reading text,/);
  assert.match(baseline,/human_question text,/);
  assert.match(baseline,/understanding_delta text,/);
});

test("legacy audits are quarantined",()=>{
  assert.match(backfill,/insert into control\.legacy_gate_audits/i);
  assert.doesNotMatch(backfill,/insert into control\.gate_audits/i);
  assert.match(backfill,/LEGACY_BACKFILL_MUST_NOT_CREATE_NEW_GATE_PASS/);
});

test("research workspace is not recreated",()=>{
  assert.doesNotMatch(baseline,/create table\s+(if not exists\s+)?(?:public\.)?research_[a-z0-9_]+/i);
  assert.doesNotMatch(baseline,/research_workspace/i);
});

test("raw items are append only",()=>{
  assert.match(baseline,/RAW_APPEND_ONLY/);
});
