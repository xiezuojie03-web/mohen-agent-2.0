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
    if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin; end if;
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
  const workFacetsResult=spawnSync(process.execPath,['tests/data-production/work-g5-facets.integration.mjs'],{
    cwd:root,env:{...process.env,MOHEN_TEST_DATABASE:database},stdio:'inherit'});
  if(workFacetsResult.status!==0)throw Error('WORK_G5_FACETS_TEST_FAILED');
  const studioMigration = fs.readdirSync(directory).find(n => n.endsWith("_mab_studio_assets.sql"));
  if (studioMigration) {
    apply(studioMigration);
    apply("20261108090000_director_plans_source_ids.sql");
    apply("20261108100000_mab_m5_director_plan_project_binding.sql");
    const planProjectColumn = query(database, "select count(*) from information_schema.columns where table_schema='public' and table_name='director_plans' and column_name='project_id' and is_nullable='YES'");
    const planProjectForeignKey = query(database, "select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='director_plans' and c.contype='f' and c.conkey=(select array[a.attnum] from pg_attribute a where a.attrelid=t.oid and a.attname='project_id') and c.confrelid='studio.projects'::regclass");
    if (planProjectColumn !== "1" || planProjectForeignKey !== "1") throw new Error("DIRECTOR_PLAN_PROJECT_BINDING_SCHEMA_FAILED");
    const studioResult = spawnSync(process.execPath, ["tests/data-production/studio-assets.integration.mjs"], { cwd: root,
      env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
    if (studioResult.status !== 0) throw new Error("STUDIO_ASSET_TEST_FAILED");
    const studioRepositoryResult = spawnSync(process.execPath, ["tests/data-production/studio-asset-repository.integration.mjs"], { cwd: root,
      env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
    if (studioRepositoryResult.status !== 0) throw new Error("STUDIO_ASSET_REPOSITORY_TEST_FAILED");
    const delegationResult = spawnSync(process.execPath, ["tests/data-production/studio-delegation.integration.mjs"], { cwd: root,
      env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
    if (delegationResult.status !== 0) throw new Error("STUDIO_DELEGATION_REPOSITORY_TEST_FAILED");
    apply('20261104013351_mab_m4_execution_controls.sql');
    const executionResult=spawnSync(process.execPath,['tests/data-production/studio-execution.integration.mjs'],{
      cwd:root,env:{...process.env,MOHEN_TEST_DATABASE:database},stdio:'inherit'});
    if(executionResult.status!==0)throw Error('STUDIO_EXECUTION_CONTROLS_TEST_FAILED');
    apply('20261104013351_mab_m4_execution_controls.sql');

    apply("20261102140000_mab_m2_private_originals.sql");
    apply(fs.readdirSync(directory).find(n => n.endsWith('_mab_m2_evidence_bridge.sql')));
    apply('20261103143451_mab_m2_private_text_reading.sql');
    apply('20261103234154_mab_m3_gate_service_auth.sql');
    const readingResult=spawnSync(process.execPath,['tests/data-production/private-text-reading.integration.mjs'],{
      cwd:root,env:{...process.env,MOHEN_TEST_DATABASE:database},stdio:'inherit'});
    if(readingResult.status!==0)throw Error('PRIVATE_TEXT_READING_TEST_FAILED');
    const provenanceResult = spawnSync(process.execPath, ["tests/data-production/private-original-source-binding.integration.mjs"], { cwd: root,
      env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
    if (provenanceResult.status !== 0) throw new Error("PRIVATE_SOURCE_BINDING_TEST_FAILED");
    const originalResult = spawnSync(process.execPath, ["tests/data-production/private-original-repository.integration.mjs"], { cwd: root,
      env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
    if (originalResult.status !== 0) throw new Error("PRIVATE_ORIGINAL_REPOSITORY_TEST_FAILED");
    if (process.env.MOHEN_TEST_STORAGE_CONFIG) {
      const workflowResult = spawnSync(process.execPath, ["tests/data-production/private-original-workflow.integration.mjs"], { cwd: root,
        env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
      if (workflowResult.status !== 0) throw new Error("PRIVATE_ORIGINAL_WORKFLOW_TEST_FAILED");
      const bridgeResult = spawnSync(process.execPath, ["tests/data-production/evidence-bridge.integration.mjs"], { cwd: root,
        env: { ...process.env, MOHEN_TEST_DATABASE: database }, stdio: "inherit" });
      if (bridgeResult.status !== 0) throw new Error("EVIDENCE_BRIDGE_TEST_FAILED");
    } else console.log("MAB_PRIVATE_ORIGINAL_STORAGE_HOLD no isolated official Storage configuration supplied");
  }
  const gateServiceResult=spawnSync(process.execPath,['tests/data-production/gate-service.integration.mjs'],{
    cwd:root,env:{...process.env,MOHEN_TEST_DATABASE:database},stdio:'inherit'});
  if(gateServiceResult.status!==0)throw Error('GATE_SERVICE_TEST_FAILED');
  apply("20261103095024_mab_web_session_revocation.sql");
  const sessionResult = spawnSync(process.execPath, ["tests/data-production/web-session-revocation.integration.mjs"], {
    cwd:root,env:{...process.env,MOHEN_TEST_DATABASE:database},stdio:"inherit"});
  if(sessionResult.status!==0)throw Error("WEB_SESSION_REVOCATION_TEST_FAILED");
  const sessionSnapshot=query(database,"select md5(jsonb_agg(to_jsonb(r) order by token_hash)::text) from control.web_session_revocations r");
  apply("20261103095024_mab_web_session_revocation.sql");
  apply("20261103095024_mab_web_session_revocation.rollback.sql","rollback");
  if(query(database,"select md5(jsonb_agg(to_jsonb(r) order by token_hash)::text) from control.web_session_revocations r")!==sessionSnapshot)throw Error("SESSION_ROLLBACK_LOST_REVOCATIONS");
  if(query(database,"select has_table_privilege('mohen_app_runtime','control.web_session_revocations','SELECT') or has_table_privilege('mohen_app_runtime','control.web_session_revocations','INSERT')")!=="f")throw Error("SESSION_ROLLBACK_LEFT_ACCESS");
  console.log("MAB_WEB_SESSION_ROLLBACK_PASS tombstones-retained runtime-closed migration-repeatable");
  const researchUrl=new URL(`postgresql://k3_admin:synthetic@localhost:${port}/${database}`);
  researchUrl.searchParams.set('host',socket);
  const resumeResult=spawnSync(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run','--config','vitest.research-db.config.ts'],{
    cwd:root,env:{...process.env,MOHEN_RESEARCH_RESUME_TEST:'isolated-pg17',MOHEN_TEST_DATABASE:database,
      DATABASE_URL:researchUrl.toString(),MOHEN_DATABASE_PASSWORD:'synthetic',MOHEN_DB_DRIVER:'pg',DEEPSEEK_API_KEY:'',SHANGHAI_LIBRARY_KEY:''},stdio:'inherit'});
  if(resumeResult.status!==0)throw Error('RESEARCH_RESUME_POSTGRES_TEST_FAILED');
  console.log('MAB_RESEARCH_RESUME_PG_PASS client-budget-denied single-CAS-winner crash-review-HOLD no-provider-calls');
  const allAuditSnapshot = query(database, "select md5(jsonb_agg(to_jsonb(g) order by gate_audit_id)::text) from control.gate_audits g");
  for (const file of migrations) apply(file);
  if (query(database, "select md5(jsonb_agg(to_jsonb(g) order by gate_audit_id)::text) from control.gate_audits g") !== allAuditSnapshot) throw new Error("REPEAT_MIGRATION_CHANGED_SIGNED_HISTORY");
  if (query(database, snapshotSql) !== before) throw new Error("REPEAT_MIGRATION_CHANGED_HISTORY");
  const credentialSnapshot=query(database,"select md5(jsonb_agg(to_jsonb(c) order by credential_id)::text) from control.gate_service_credentials c");
  apply('20261103234154_mab_m3_gate_service_auth.sql');
  apply('20261103234154_mab_m3_gate_service_auth.rollback.sql','rollback');
  if(query(database,"select md5(jsonb_agg(to_jsonb(c) order by credential_id)::text) from control.gate_service_credentials c")!==credentialSnapshot)throw Error('GATE_CREDENTIAL_ROLLBACK_LOST_TOMBSTONES');
  if(query(database,"select has_function_privilege('mohen_gate_signer','control.authenticate_gate_service(text,text)','EXECUTE') or has_function_privilege('mohen_gate_reader','control.read_gate_stage_qualification(text,jsonb)','EXECUTE') or has_function_privilege('mohen_gate_signer','control.gate_service_target_allows(text,text,uuid,jsonb)','EXECUTE')")!=='f')throw Error('GATE_SERVICE_ROLLBACK_LEFT_ACCESS');
  if(query(database,"select md5(jsonb_agg(to_jsonb(g) order by gate_audit_id)::text) from control.gate_audits g")!==allAuditSnapshot)throw Error('GATE_SERVICE_ROLLBACK_CHANGED_HISTORY');
  console.log('MAB_GATE_SERVICE_ROLLBACK_PASS repeatable closed-entry credential-tombstones-and-audits-preserved');
  const columnInsertBefore = query(database, "select has_any_column_privilege('mohen_producer','control.gate_candidates','INSERT')");
  if (columnInsertBefore !== "t") throw new Error("CANDIDATE_COLUMN_GRANT_FIXTURE_MISSING");
  if (studioMigration) {
    const privateReadingBefore=query(database,"select md5(jsonb_build_object('runs',(select jsonb_agg(to_jsonb(r) order by read_run_id) from source.read_runs r where r.config->>'schema'='mab.private-text-reading.v1'),'units',(select jsonb_agg(to_jsonb(u) order by read_unit_id) from source.read_units u join source.read_runs r using(read_run_id) where r.config->>'schema'='mab.private-text-reading.v1'))::text)");
    apply('20261103143451_mab_m2_private_text_reading.sql');
    apply('20261103143451_mab_m2_private_text_reading.rollback.sql','rollback');
    if(query(database,"select has_function_privilege('mohen_app_runtime','studio.persist_private_text_reading(uuid,uuid,uuid,text,uuid,jsonb,text,text)','EXECUTE')")!=='f')throw Error('PRIVATE_READING_ROLLBACK_LEFT_ACCESS');
    if(query(database,"select md5(jsonb_build_object('runs',(select jsonb_agg(to_jsonb(r) order by read_run_id) from source.read_runs r where r.config->>'schema'='mab.private-text-reading.v1'),'units',(select jsonb_agg(to_jsonb(u) order by read_unit_id) from source.read_units u join source.read_runs r using(read_run_id) where r.config->>'schema'='mab.private-text-reading.v1'))::text)")!==privateReadingBefore)throw Error('PRIVATE_READING_ROLLBACK_CHANGED_CANDIDATES');
    console.log('MAB_PRIVATE_READING_ROLLBACK_PASS repeatable entry-denied immutable-candidates-preserved');
    const bridgeBefore = query(database, "select md5(jsonb_build_object('read_links',(select jsonb_agg(to_jsonb(r) order by link_id) from evidence.read_unit_evidence_links r),'claim_links',(select jsonb_agg(to_jsonb(r) order by claim_evidence_link_id) from world.claim_evidence_links r))::text)");
    apply(fs.readdirSync(directory).find(n => n.endsWith('_mab_m2_evidence_bridge.sql')).replace('.sql','.rollback.sql'), 'rollback');
    if (query(database, "select has_function_privilege('mohen_app_runtime','studio.bind_private_read_evidence(uuid,uuid,uuid,jsonb,text,integer,text)','EXECUTE') or has_function_privilege('mohen_app_runtime','studio.bind_private_claim_evidence(uuid,uuid,uuid,text)','EXECUTE')") !== 'f') throw new Error('EVIDENCE_BRIDGE_ROLLBACK_LEFT_ACCESS');
    if (query(database, "select has_function_privilege('mohen_app_runtime','studio.private_source_binding_matches(uuid,uuid,uuid,text)','EXECUTE')") !== 'f') throw new Error('PRIVATE_SOURCE_BINDING_ROLLBACK_LEFT_ACCESS');
    if (query(database, "select md5(jsonb_build_object('read_links',(select jsonb_agg(to_jsonb(r) order by link_id) from evidence.read_unit_evidence_links r),'claim_links',(select jsonb_agg(to_jsonb(r) order by claim_evidence_link_id) from world.claim_evidence_links r))::text)") !== bridgeBefore) throw new Error('EVIDENCE_BRIDGE_ROLLBACK_LOST_LINEAGE');
    console.log('MAB_EVIDENCE_BRIDGE_ROLLBACK_PASS functions-denied immutable-lineage-preserved');
    const originalsBefore = query(database, "select md5(jsonb_agg(to_jsonb(r) order by original_id)::text) from studio.private_originals r");
    apply("20261102140000_mab_m2_private_originals.rollback.sql", "rollback");
    if (query(database, "select has_any_column_privilege('mohen_app_runtime','studio.private_originals','UPDATE') or has_table_privilege('mohen_app_runtime','studio.private_originals','SELECT')") !== "f") throw new Error("PRIVATE_ORIGINAL_ROLLBACK_LEFT_ACCESS");
    if (query(database, "select md5(jsonb_agg(to_jsonb(r) order by original_id)::text) from studio.private_originals r") !== originalsBefore) throw new Error("PRIVATE_ORIGINAL_ROLLBACK_LOST_RECEIPTS");
    console.log("MAB_PRIVATE_ORIGINAL_ROLLBACK_PASS receipt-hashes-preserved read-write-closed");
    const studioBefore = query(database, "select md5(jsonb_agg(to_jsonb(r) order by revision_id)::text) from studio.asset_revisions r");
    apply('20261104013351_mab_m4_execution_controls.rollback.sql','rollback');
    apply(studioMigration.replace(".sql", ".rollback.sql"), "rollback");
    if (query(database, "select has_schema_privilege('mohen_app_runtime','studio','USAGE')") !== "f" ||
        query(database, "select has_any_column_privilege('mohen_app_runtime','studio.asset_heads','UPDATE')") !== "f") throw new Error("STUDIO_ROLLBACK_LEFT_ACCESS");
    if (query(database, "select md5(jsonb_agg(to_jsonb(r) order by revision_id)::text) from studio.asset_revisions r") !== studioBefore) throw new Error("STUDIO_ROLLBACK_LOST_REVISIONS");
    console.log("MAB_STUDIO_ROLLBACK_PASS access-closed permanent-revision-hash-unchanged");
  }
  for (const file of [...migrations].reverse()) apply(file.replace(".sql", ".rollback.sql"), "rollback");
  if (query(database, "select has_table_privilege('mohen_app_runtime','public.imported_materials','SELECT')") !== "f") throw new Error("ROLLBACK_REOPENED_PRIVATE_DATA");
  if (query(database, "select has_any_column_privilege('mohen_producer','control.gate_candidates','INSERT')") !== "f") throw new Error("ROLLBACK_LEFT_CANDIDATE_COLUMN_INSERT");
  console.log("ROLLBACK_COLUMN_ACL_PASS column_insert=true_before,false_after on PostgreSQL17 REVOKE ALL");
  if (query(database, snapshotSql) !== before) throw new Error("ROLLBACK_CHANGED_HISTORY");
  console.log(`K3_DB_TEST_PASS baseline_migrations=${baseline.length} synthetic_legacy_rows=711 unchanged; no automatic qualification; migrations repeatable; rollback fail-closed`);
} finally {
  query("postgres", `drop database ${database} with (force)`);
}
