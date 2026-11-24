#!/usr/bin/env node
// Static preflight for the isolated-database test chain (no database required).
//
// D1 — every migration must be reachable from BOTH isolated chains
//      (scripts/test-k3-db.mjs and scripts/test-mab-http.mjs). Each chain applies an explicit,
//      hand-maintained list, so a migration that is authored but never registered silently
//      leaves functions/tables missing in the isolated database. That happened for real: the
//      HTTP chain lagged behind the DB chain, so product pages and write APIs failed in CI
//      against a schema that was simply missing objects. Unchained files must be declared
//      below with a reason instead of being forgotten.
// D2 — literal values written by fixtures into CHECK (column IN (...)) columns must be legal.
//      Inserts inside an expected-rejection assertion are skipped on purpose.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const migrationsDir = path.join(root, "supabase/migrations");
const chainFiles = ["scripts/test-k3-db.mjs", "scripts/test-mab-http.mjs"];

// Recorded debt: a migration listed here is known not to be applied by the isolated chain.
// Adding an entry requires a reason; a stale entry (file now chained, or deleted) fails too.
const LEGACY_SUPERSEDED = "pre-V2-baseline legacy migration, superseded by 202610070100_data_production_v2_baseline";
// M5 Studio 业务轴（ST-01→ST-09）的 DB 层迁移：只被各自专门的隔离脚本
// （scripts/test-st0X-*.mjs / scripts/test-d05-*.mjs）按需单独应用并取证，
// 不并入 k3 / mab-http 两条链。登记在此如实记账，避免"作者写了但无人应用"被静默忘记；
// 需要它们在 HTTP 链生效时，应连同对应路由一起进链，而不是靠本登记绕过。
const M5_STUDIO_AXIS_DB_ONLY = "M5 Studio 业务轴 DB 层迁移，由专门隔离脚本单独应用（不进 k3 / mab-http 链）";
const UNCHAINED = new Map([
  // Supabase-managed Storage schema/API is absent from disposable vanilla
  // PostgreSQL17 (both isolated chains). This is not a silently skipped
  // business migration: actual mohen-cloud bucket SQL applied and checked
  // public=false, 10MB, permitted MIME, RLS, 0 policies.
  // Real upload/read-byte/storage authorization still NOT_RUN.
  ["20261116173500_mab_m5_dev_private_original_bucket.sql",
    "Supabase-managed Storage bucket config: isolated vanilla PG17 lacks storage schema; real mohen-cloud private bucket created/read back, Storage API byte test pending"],
  ...["008_cultural_world_objects.sql", "202609210001_foundation.sql", "202609210002_data_factory.sql",
    "202609210003_human_review.sql", "202609220004_knowledge_weave.sql", "202609220006_visual_linkage.sql",
    "202609220007_historical_spatial_reconstruction.sql", "202610020008_visual_asset_promotion_gate.sql",
    "202610020009_review_queue_triage.sql", "202610030010_research_workspace.sql", "202610040001_research_bridge_queue.sql",
    "202610050011_second_promotion_gate.sql", "202610070200_legacy_v1_to_v2_backfill.sql"].map(f => [f, LEGACY_SUPERSEDED]),
  ...["20261113150000_mab_m5_reviewer_scope_follows_candidates.sql",
    "20261113160000_mab_gate_scope_rule_for_studio_projects.sql",
    "20261113180000_mab_g3_world_purpose_binding.sql",
    "20261113190000_mab_m5_d04_meaning_finding_generalize.sql",
    "20261114090000_mab_m5_d05_p04_story_seed.sql",
    "20261114120000_mab_m5_director_plan.sql",
    "20261114150000_mab_m5_st07_work_revision.sql",
    "20261114180000_mab_m5_st08_submission_snapshot.sql",
    "20261114190000_mab_m5_st09_editorial_publish_withdraw.sql"].map(f => [f, M5_STUDIO_AXIS_DB_ONLY]),
  // 11-17 之后 M5/D00-D05 执行链、D00-D05 journal、rights projection、formal authority 等 DB 迁移
  ...["20261118120000_m5_formal_project_read_acl_order_fix.sql",
    "20261118123000_m5_legacy_run_reconciliation.sql",
    "20261118130000_m5_repair_historical_run_status_incident.sql",
    "20261119110000_m5_private_source_rights_projection.sql",
    "20261119125821_fix_control_sha256_bytes_builtin.sql",
    "20261119235044_allow_private_registration_owner_artifact_revision.sql",
    "20261119235412_restore_private_source_registration_rights_projection.sql",
    "20261120084600_d00_execution_grant_journal.sql",
    "20261120110300_d00_preview_service_login_roles.sql",
    "20261120150000_d01_resume_grant_journal.sql",
    "20261121060000_d01_resume_journal_reissue.sql",
    "20261122130000_d02_resume_grant_journal.sql",
    "20261122140000_d02_resume_journal_reissue_expired.sql",
    "20261122170000_m5_effective_rights_projection.sql",
    "20261122180000_d03_resume_grant_journal.sql",
    "20261122190000_artifact_revision_claim_revision.sql",
    "20261122200000_g3_reviewer_changes_read.sql",
    "20261122210000_d04_resume_grant_journal.sql",
    "20261122230000_d05_resume_grant_journal.sql",
    "20261123120000_mab_m5_st05_st07_project_and_body_authority.sql",
    "20261123130000_mab_m5_director_plan_formal_body_authority.sql"].map(f => [f, M5_STUDIO_AXIS_DB_ONLY]),
]);

const chains = chainFiles.map(file => ({ file, source: fs.readFileSync(path.join(root, file), "utf8") }));
const allMigrations = fs.readdirSync(migrationsDir).filter(n => n.endsWith(".sql") && !n.endsWith(".rollback.sql")).sort();

function referencedByChain(chainSource, file) {
  if (chainSource.includes(file)) return true;
  for (const suffix of chainSource.matchAll(/endsWith\(\s*["']([^"']+)["']\s*\)/g)) {
    if (file.endsWith(suffix[1])) return true;
  }
  const range = chainSource.match(/n\s*>=\s*["'](\d{12})["']\s*&&\s*n\s*<=\s*["']([^"']+)["']/);
  if (range && file >= range[1] && file <= range[2]) return true;
  return false;
}

const missing = [];
for (const chain of chains) {
  for (const file of allMigrations) {
    if (UNCHAINED.has(file) || referencedByChain(chain.source, file)) continue;
    missing.push({ chain: chain.file, file });
  }
}
const violations = [];

// ---- D2: CHECK (column IN (...)) value preflight -------------------------------------------
const checks = new Map(); // "table|column" and "schema.table|column" -> Set(allowed)
const createOrAlter = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)|alter\s+table\s+(?:only\s+)?([\w.]+)/gi;
const checkIn = /check\s*\(\s*([a-z_][\w]*)\s*(?:in\s*\(([^)]*)\)|=\s*any\s*\(\s*array\s*\[([^\]]*)\]\s*\)\s*\))/gi;
// Only migrations the chain actually applies describe the isolated database.
const appliedMigrations = allMigrations.filter(file => chains.some(c => referencedByChain(c.source, file)));

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

for (const { chain, file } of missing) violations.push(`supabase/migrations/${file} 未被隔离链 ${chain} 应用，也未在 UNCHAINED 中登记原因`);
for (const [file, reason] of UNCHAINED) if (!allMigrations.includes(file)) violations.push(`UNCHAINED 登记的 ${file} 已不存在（${reason}）`);

if (violations.length) {
  for (const v of violations) console.error(`VIOLATION ${v}`);
  console.error(`ISOLATED_DB_FIXTURE_PREFLIGHT_FAILED violations=${violations.length}`);
  process.exit(1);
}
console.log(`ISOLATED_DB_FIXTURE_PREFLIGHT_PASS migrations=${allMigrations.length} chained_or_declared=all checked_literals=${scanned} expected_rejection_skips=${skipped} check_columns=${new Set([...checks.keys()]).size}`);
