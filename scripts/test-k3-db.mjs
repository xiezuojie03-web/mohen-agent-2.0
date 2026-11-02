#!/usr/bin/env node
// Fresh database only, on an explicitly marked local Unix-socket instance.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const psql = process.env.MOHEN_TEST_PSQL;
const socket = process.env.MOHEN_TEST_SOCKET;
const port = process.env.MOHEN_TEST_PORT ?? "55432";
if (!psql || !socket?.startsWith("/workspace/") || !fs.statSync(socket).isDirectory()) throw new Error("ISOLATED_TEST_SOCKET_REQUIRED");
const root = path.resolve(import.meta.dirname, "..");
const base = ["-X", "-h", socket, "-p", port, "-U", "k3_admin", "-At", "-v", "ON_ERROR_STOP=1"];
function query(database, text) { return execFileSync(psql, [...base, "-d", database], { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim(); }
if (query("postgres", "select current_setting('mohen.test_instance',true)") !== "codex-k3-isolated") throw new Error("UNMARKED_DATABASE_INSTANCE");
const database = `mohen_k3_${randomUUID().replaceAll("-", "")}_test`;
query("postgres", `create database ${database}`);
const directory = path.join(root, "supabase/migrations");
const baseline = ["202610070100_data_production_v2_baseline.sql", ...fs.readdirSync(directory).filter(n => n >= "202610160300" && n <= "202610292100_imported_materials.sql" && !n.startsWith("202610160400"))].sort();
function apply(name, folder = "migrations") {
  execFileSync(psql, [...base, "-d", database, "-f", path.join(root, "supabase", folder, name)], { stdio: ["ignore", "pipe", "pipe"] });
}
try {
  for (const file of baseline) apply(file);
  // Match managed PG installations where pgcrypto is installed outside public.
  if (process.env.MOHEN_TEST_CRYPTO_SCHEMA === "extensions") {
    query(database, "create schema if not exists extensions; alter extension pgcrypto set schema extensions");
  }
  query(database, `do $$ begin
    if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  end $$;
  grant select,insert,update on public.imported_materials to anon,authenticated;`);
  query(database, `insert into control.production_runs(run_id,research_intent,execution_mode,status) values('00000000-0000-0000-0000-000000000010','synthetic legacy audit preservation fixture','attended','PASS');
    insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result)
    select '00000000-0000-0000-0000-000000000010','D05','G5','fixture_legacy',md5(n::text)::uuid,'PASS' from generate_series(1,711) n;`);
  const columns = query(database, "select string_agg(quote_ident(attname),',' order by attnum) from pg_attribute where attrelid='control.gate_audits'::regclass and attnum>0 and not attisdropped");
  const snapshotSql = `select md5(jsonb_agg(to_jsonb(g) order by gate_audit_id)::text) from (select ${columns} from control.gate_audits where object_type='fixture_legacy') g`;
  const before = query(database, snapshotSql);
  const migrations = ["202610310900_k3_security_boundary.sql", "202610310910_k3_gate_candidates.sql", "202611010900_k3_independent_gate_authority.sql"];
  for (const file of migrations) apply(file);
  if (query(database, snapshotSql) !== before) throw new Error("LEGACY_AUDIT_CHANGED");
  if (query(database, "select count(*) from control.gate_audits where decision_origin='legacy_untrusted'") !== "711" ||
      query(database, "select count(*) from control.qualification_current") !== "0") throw new Error("LEGACY_QUALIFICATION_PROMOTION");
  const result = spawnSync(process.execPath, ["tests/data-production/db-security.integration.mjs"], { cwd: root,
    env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
  if (result.status !== 0) throw new Error("DB_SECURITY_TEST_FAILED");
  const materialResult = spawnSync(process.execPath, ["tests/data-production/imported-material-repository.integration.mjs"], { cwd: root,
    env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
  if (materialResult.status !== 0) throw new Error("IMPORTED_MATERIAL_REPOSITORY_TEST_FAILED");
  const authorityResult = spawnSync(process.execPath, ["tests/data-production/gate-authority.integration.mjs"], { cwd: root,
    env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
  if (authorityResult.status !== 0) throw new Error("GATE_AUTHORITY_TEST_FAILED");
  const consumptionResult = spawnSync(process.execPath, ["tests/data-production/read-model-qualification.integration.mjs"], { cwd: root,
    env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
  if (consumptionResult.status !== 0) throw new Error("QUALIFICATION_CONSUMPTION_TEST_FAILED");
  const allAuditSnapshot = query(database, "select md5(jsonb_agg(to_jsonb(g) order by gate_audit_id)::text) from control.gate_audits g");
  for (const file of migrations) apply(file);
  if (query(database, "select md5(jsonb_agg(to_jsonb(g) order by gate_audit_id)::text) from control.gate_audits g") !== allAuditSnapshot) throw new Error("REPEAT_MIGRATION_CHANGED_SIGNED_HISTORY");
  if (query(database, snapshotSql) !== before) throw new Error("REPEAT_MIGRATION_CHANGED_HISTORY");
  const columnInsertBefore = query(database, "select has_any_column_privilege('mohen_producer','control.gate_candidates','INSERT')");
  if (columnInsertBefore !== "t") throw new Error("CANDIDATE_COLUMN_GRANT_FIXTURE_MISSING");
  for (const file of [...migrations].reverse()) apply(file.replace(".sql", ".rollback.sql"), "rollback");
  if (query(database, "select has_table_privilege('mohen_app_runtime','public.imported_materials','SELECT')") !== "f") throw new Error("ROLLBACK_REOPENED_PRIVATE_DATA");
  if (query(database, "select has_any_column_privilege('mohen_producer','control.gate_candidates','INSERT')") !== "f") throw new Error("ROLLBACK_LEFT_CANDIDATE_COLUMN_INSERT");
  console.log("ROLLBACK_COLUMN_ACL_PASS column_insert=true_before,false_after on PostgreSQL17 REVOKE ALL");
  if (query(database, snapshotSql) !== before) throw new Error("ROLLBACK_CHANGED_HISTORY");
  console.log(`K3_DB_TEST_PASS baseline_migrations=${baseline.length} synthetic_legacy_rows=711 unchanged; no automatic qualification; migrations repeatable; rollback fail-closed`);
} finally {
  query("postgres", `drop database ${database} with (force)`);
}
