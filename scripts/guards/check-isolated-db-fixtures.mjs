#!/usr/bin/env node
// Static preflight for the isolated-database test chain (no database required).
//
// D1 — every migration must be reachable from scripts/test-k3-db.mjs. The chain applies an
//      explicit, hand-maintained list, so a migration that is authored but never registered
//      silently leaves functions/tables missing in the isolated database. Unchained files must
//      be declared below with a reason instead of being forgotten.
// D2 — literal values written by fixtures into CHECK (column IN (...)) columns must be legal.
//      Inserts inside an expected-rejection assertion are skipped on purpose.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const migrationsDir = path.join(root, "supabase/migrations");
const chainFile = path.join(root, "scripts/test-k3-db.mjs");

// Recorded debt: a migration listed here is known not to be applied by the isolated chain.
// Adding an entry requires a reason; a stale entry (file now chained, or deleted) fails too.
const LEGACY_SUPERSEDED = "pre-V2-baseline legacy migration, superseded by 202610070100_data_production_v2_baseline";
const CHAIN_GAP = "not applied by the isolated chain yet - recorded gap, see progress.md 2026-11-09";
const UNCHAINED = new Map([
  ...["008_cultural_world_objects.sql", "202609210001_foundation.sql", "202609210002_data_factory.sql",
    "202609210003_human_review.sql", "202609220004_knowledge_weave.sql", "202609220006_visual_linkage.sql",
    "202609220007_historical_spatial_reconstruction.sql", "202610020008_visual_asset_promotion_gate.sql",
    "202610020009_review_queue_triage.sql", "202610030010_research_workspace.sql", "202610040001_research_bridge_queue.sql",
    "202610050011_second_promotion_gate.sql", "202610070200_legacy_v1_to_v2_backfill.sql"].map(f => [f, LEGACY_SUPERSEDED]),
  ...["202611020900_kad1_watch_revision_isolation.sql", "202611020910_kad1_consumption_blocks.sql",
    "202611020920_kad1_account_transactions.sql", "20261105110000_mab_m5_studio_research_read.sql",
    "20261107120000_mab_m2_private_scanned_page.sql", "20261107160000_mab_m2_1_producer_run_progress.sql",
    "20261107200000_mab_m5_d02_d05_private_candidates.sql", "20261107210000_mab_m3_private_gate_candidate_submission.sql",
    "20261107211000_mab_m3_local_owner_gate_signer.sql", "20261107220000_mab_m5_machine_rule_reviewer.sql",
    "20261107230000_mab_m2_private_source_registration_source_revision.sql",
    "20261107240000_mab_m5_claim_revision_artifact_read_policy.sql", "20261108110000_mab_m5_source_rights_actions.sql",
    "20261109120000_mab_m5_artifact_content_revision.sql"].map(f => [f, CHAIN_GAP])
]);

const chainSource = fs.readFileSync(chainFile, "utf8");
const allMigrations = fs.readdirSync(migrationsDir).filter(n => n.endsWith(".sql") && !n.endsWith(".rollback.sql")).sort();

function referencedByChain(file) {
  if (chainSource.includes(file)) return true;
  for (const suffix of chainSource.matchAll(/endsWith\(\s*["']([^"']+)["']\s*\)/g)) {
    if (file.endsWith(suffix[1])) return true;
  }
  const range = chainSource.match(/n\s*>=\s*["'](\d{12})["']\s*&&\s*n\s*<=\s*["']([^"']+)["']/);
  if (range && file >= range[1] && file <= range[2]) return true;
  return false;
}

const missing = allMigrations.filter(f => !referencedByChain(f) && !UNCHAINED.has(f));
const violations = [];

// ---- D2: CHECK (column IN (...)) value preflight -------------------------------------------
const checks = new Map(); // "table|column" and "schema.table|column" -> Set(allowed)
const createOrAlter = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)|alter\s+table\s+(?:only\s+)?([\w.]+)/gi;
const checkIn = /check\s*\(\s*([a-z_][\w]*)\s*(?:in\s*\(([^)]*)\)|=\s*any\s*\(\s*array\s*\[([^\]]*)\]\s*\)\s*\))/gi;
// Only migrations the chain actually applies describe the isolated database.
const appliedMigrations = allMigrations.filter(referencedByChain);

for (const file of appliedMigrations) {
  const text = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const events = [];
  for (const m of text.matchAll(createOrAlter)) events.push({ at: m.index, table: (m[1] ?? m[2]).replaceAll('"', "").toLowerCase() });
  for (const m of text.matchAll(checkIn)) events.push({ at: m.index, column: m[1].toLowerCase(), values: m[2] ?? m[3] });
  events.sort((a, b) => a.at - b.at);
  let table;
  for (const e of events) {
    if (e.table) { table = e.table; continue; }
    if (!table) continue;
    const allowed = new Set([...e.values.matchAll(/'([^']*)'/g)].map(v => v[1]));
    if (!allowed.size) continue;
    for (const key of [table, table.includes(".") ? table.split(".").pop() : table]) {
      const id = `${key}|${e.column}`;
      if (!checks.has(id)) checks.set(id, new Set());
      for (const value of allowed) checks.get(id).add(value);
    }
  }
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0, quote = false, current = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" && text[i - 1] !== "\\") quote = !quote;
    if (!quote && c === "$" && text[i + 1] === "{") depth++;
    if (!quote && c === "}" && depth) depth--;
    if (!quote && !depth && c === "(") depth++;
    if (!quote && !depth && c === ")") depth--;
    if (c === "," && !quote && depth === 0) { parts.push(current); current = ""; continue; }
    current += c;
  }
  parts.push(current);
  return parts.map(p => p.trim());
}

const testFiles = [
  ...fs.readdirSync(path.join(root, "tests/data-production")).filter(n => n.endsWith(".integration.mjs")).map(n => `tests/data-production/${n}`),
  ...fs.readdirSync(path.join(root, "tests/integration")).filter(n => n.endsWith(".integration.ts")).map(n => `tests/integration/${n}`)
];

let scanned = 0, skipped = 0;
const insertPattern = /insert\s+into\s+([\w.]+)\s*\(([^)]*)\)\s*values\s*\(/gi;
for (const rel of testFiles) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  for (const m of text.matchAll(insertPattern)) {
    const table = m[1].replaceAll('"', "").toLowerCase();
    const columns = splitTopLevel(m[2]).map(c => c.replaceAll('"', "").toLowerCase());
    let depth = 1, i = m.index + m[0].length, quote = false, start = i;
    for (; i < text.length && depth; i++) {
      const c = text[i];
      if (c === "'" && text[i - 1] !== "\\") quote = !quote;
      if (!quote && c === "(") depth++;
      if (!quote && c === ")") depth--;
    }
    const values = splitTopLevel(text.slice(start, i - 1));
    const context = text.slice(Math.max(0, m.index - 220), m.index);
    const expectedRejection = /throws?\s*\(|rejects\s*\(/.test(context);
    for (let k = 0; k < columns.length && k < values.length; k++) {
      const literal = values[k].match(/^'([^'$]*)'$/);
      if (!literal) continue;
      const keys = [table, table.includes(".") ? table.split(".").pop() : table].map(t => `${t}|${columns[k]}`);
      const allowed = keys.map(key => checks.get(key)).find(Boolean);
      if (!allowed) continue;
      scanned++;
      if (allowed.has(literal[1])) continue;
      if (expectedRejection) { skipped++; continue; }
      const line = text.slice(0, m.index).split(/\r?\n/).length;
      violations.push(`${rel}:${line} ${table}.${columns[k]}='${literal[1]}' 不在允许集合 [${[...allowed].join(",")}]`);
    }
  }
}

for (const file of missing) violations.push(`supabase/migrations/${file} 未被隔离链应用，也未在 UNCHAINED 中登记原因`);
for (const [file, reason] of UNCHAINED) if (!allMigrations.includes(file)) violations.push(`UNCHAINED 登记的 ${file} 已不存在（${reason}）`);

if (violations.length) {
  for (const v of violations) console.error(`VIOLATION ${v}`);
  console.error(`ISOLATED_DB_FIXTURE_PREFLIGHT_FAILED violations=${violations.length}`);
  process.exit(1);
}
console.log(`ISOLATED_DB_FIXTURE_PREFLIGHT_PASS migrations=${allMigrations.length} chained_or_declared=all checked_literals=${scanned} expected_rejection_skips=${skipped} check_columns=${new Set([...checks.keys()]).size}`);
