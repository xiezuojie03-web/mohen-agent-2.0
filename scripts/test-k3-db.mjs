#!/usr/bin/env node
// Fresh database only, on an explicitly marked isolated instance.
// Endpoint is either the CI workspace Unix socket or an explicit loopback TCP port for a
// disposable local cluster (Windows has no Unix sockets). Both paths require the same
// server-side instance marker below, so an unrelated database can never be used.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const psql = process.env.MOHEN_TEST_PSQL;
const socket = process.env.MOHEN_TEST_SOCKET;
const requestedHost = process.env.MOHEN_TEST_HOST;
const port = process.env.MOHEN_TEST_PORT ?? "55432";
const localHost = requestedHost === "127.0.0.1" || requestedHost === "localhost" ? requestedHost : undefined;
if (!localHost && !(socket?.startsWith("/workspace/") && fs.existsSync(socket) && fs.statSync(socket).isDirectory())) throw new Error("ISOLATED_TEST_ENDPOINT_REQUIRED");
if (!psql) throw new Error("ISOLATED_TEST_PSQL_REQUIRED");
const host = localHost ?? socket;
const root = path.resolve(import.meta.dirname, "..");
const base = ["-X", "-h", host, "-p", port, "-U", "k3_admin", "-At", "-v", "ON_ERROR_STOP=1"];
function query(database, text) { return execFileSync(psql, [...base, "-d", database], { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim(); }
if (query("postgres", "select current_setting('mohen.test_instance',true)") !== "codex-k3-isolated") throw new Error("UNMARKED_DATABASE_INSTANCE");
const database = `mohen_k3_${randomUUID().replaceAll("-", "")}_test`;
query("postgres", `create database ${database}`);
const directory = path.join(root, "supabase/migrations");
const baseline = ["202610070100_data_production_v2_baseline.sql", ...fs.readdirSync(directory).filter(n => n >= "202610160300" && n <= "202610292100_imported_materials.sql" && !n.startsWith("202610160400"))].sort();
function apply(name, folder = "migrations") {
  execFileSync(psql, [...base, "-d", database, "-f", path.join(root, "supabase", folder, name)], { stdio: ["ignore", "pipe", "pipe"] });
}
// One run reports every failing suite instead of stopping at the first one, so a fix round
// does not need one full chain execution per defect.
const failures = [];
function runTest(label, script, { args = [], env = {} } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root, env: { ...process.env, MOHEN_TEST_DATABASE: database, ...env }, stdio: "inherit" });
  if (result.status === 0) return true;
  failures.push(result.signal ? `${label}(signal ${result.signal})` : `${label}(exit ${result.status})`);
  return false;
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
  // KAD1 (2026-11-02) sits between the K3 authority migrations and the MAB studio work in the
  // production timeline, so it is applied at the same point here. It replaces
  // control.qualification_allows, which means the read-model suites below exercise the KAD1
  // version instead of the baseline one.
  for (const file of ["202611020900_kad1_watch_revision_isolation.sql",
    "202611020910_kad1_consumption_blocks.sql",
    "202611020920_kad1_account_transactions.sql"]) apply(file);
  if (query(database, snapshotSql) !== before) throw new Error("LEGACY_AUDIT_CHANGED");
  if (query(database, "select count(*) from control.gate_audits where decision_origin='legacy_untrusted'") !== "711" ||
      query(database, "select count(*) from control.qualification_current") !== "0") throw new Error("LEGACY_QUALIFICATION_PROMOTION");
  runTest("DB_SECURITY", "tests/data-production/db-security.integration.mjs");
  runTest("IMPORTED_MATERIAL_REPOSITORY", "tests/data-production/imported-material-repository.integration.mjs");
  runTest("GATE_AUTHORITY", "tests/data-production/gate-authority.integration.mjs");
  runTest("QUALIFICATION_CONSUMPTION", "tests/data-production/read-model-qualification.integration.mjs");
  runTest("WORK_G5_FACETS", "tests/data-production/work-g5-facets.integration.mjs");
  const studioMigration = fs.readdirSync(directory).find(n => n.endsWith("_mab_studio_assets.sql"));
  if (studioMigration) {
    apply(studioMigration);
    apply("20261108090000_director_plans_source_ids.sql");
    apply("20261108100000_mab_m5_director_plan_project_binding.sql");
    // CP2-F asset backlink: studio.resolve_asset_references and the reference guards are
    // required by the studio asset/repository tests below; omitting it here left the
    // function undefined in the isolated database. It must run after private_originals
    // because studio.asset_verified_original_bindings is a SQL-language function whose
    // body is validated against studio.private_originals at creation time.
    apply("20261102140000_mab_m2_private_originals.sql");
    apply("20261109130000_mab_cp2f_asset_backlink.sql");
    const planProjectColumn = query(database, "select count(*) from information_schema.columns where table_schema='public' and table_name='director_plans' and column_name='project_id' and is_nullable='YES'");
    const planProjectForeignKey = query(database, "select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='director_plans' and c.contype='f' and c.conkey=(select array[a.attnum] from pg_attribute a where a.attrelid=t.oid and a.attname='project_id') and c.confrelid='studio.projects'::regclass");
    if (planProjectColumn !== "1" || planProjectForeignKey !== "1") throw new Error("DIRECTOR_PLAN_PROJECT_BINDING_SCHEMA_FAILED");
    runTest("STUDIO_ASSET", "tests/data-production/studio-assets.integration.mjs");
    runTest("STUDIO_ASSET_REPOSITORY", "tests/data-production/studio-asset-repository.integration.mjs");
    runTest("STUDIO_DELEGATION_REPOSITORY", "tests/data-production/studio-delegation.integration.mjs");
    apply('20261104013351_mab_m4_execution_controls.sql');
    runTest("STUDIO_EXECUTION_CONTROLS", "tests/data-production/studio-execution.integration.mjs");
    apply('20261104013351_mab_m4_execution_controls.sql');

    apply(fs.readdirSync(directory).find(n => n.endsWith('_mab_m2_evidence_bridge.sql')));
    apply('20261103143451_mab_m2_private_text_reading.sql');
    apply('20261103234154_mab_m3_gate_service_auth.sql');
    runTest("PRIVATE_TEXT_READING", "tests/data-production/private-text-reading.integration.mjs");
    runTest("PRIVATE_SOURCE_BINDING", "tests/data-production/private-original-source-binding.integration.mjs");
    runTest("PRIVATE_ORIGINAL_REPOSITORY", "tests/data-production/private-original-repository.integration.mjs");
    // Remaining 2026-11 migrations, in production date order. They were authored but never
    // registered here, so the capabilities they carry (studio research read, private scanned-page
    // reading, producer run progress, D02-D05 private candidates, Gate candidate submission,
    // owner/machine signers, claim-revision read policy, rights-by-action, content-only revision
    // hashing) had no isolated coverage at all. Applying them at the point where private originals
    // already exist matches how the live database evolved.
    for (const file of [
      "20261105110000_mab_m5_studio_research_read.sql",
      "20261107120000_mab_m2_private_scanned_page.sql",
      "20261107160000_mab_m2_1_producer_run_progress.sql",
      "20261107200000_mab_m5_d02_d05_private_candidates.sql",
      "20261107210000_mab_m3_private_gate_candidate_submission.sql",
      "20261107211000_mab_m3_local_owner_gate_signer.sql",
      "20261107220000_mab_m5_machine_rule_reviewer.sql",
      "20261107230000_mab_m2_private_source_registration_source_revision.sql",
      "20261107240000_mab_m5_claim_revision_artifact_read_policy.sql",
      "20261108110000_mab_m5_source_rights_actions.sql",
      "20261109120000_mab_m5_artifact_content_revision.sql",
      "20261110100000_mab_gate_audits_rls.sql",
      // D00-C：来源发现台账（source_needs/acquisition_methods…）与 D00-C4 余下阶段的结构，
      // 已在本地 dev 库应用；补进隔离链，避免 _test 库缺表而测试"假绿"。
      "20261110110000_mab_d00c_source_discovery_ledger.sql",
      "20261110120000_mab_d00c4_remaining_stages.sql",
      // D00-C5：补 acquisition_methods 的 worker update 策略，让"当前有效性"能随真实
      // 尝试推进（此前只有列级 grant 没有策略，方法状态永远停在首次登记值）。
      "20261110150000_mab_d00c5_method_revalidation.sql",
      // D00-Y04：聚合目录原机构回溯（OriginalProviderTrace + provenance 链）的追加式落点；
      // extent/missing_parts 归 Y08 的注释更正也随这一支。
      "20261110160000_mab_d00_y04_original_provider_trace.sql",
      "20261110130000_mab_original_media_assets.sql",
      // D00-Y02：登记读取通道补出馆方目录号/来源状态/载体可得性三键，供 Y02 资源目录条目引用。
      "20261110140000_mab_d00_y02_registration_locator.sql",
      // QR-05：Studio 资产消费裁决对齐唯一九动作词典（此前 machine_read/retain 等一律
      // INVALID_ACTION）；必须排在 cp2f_asset_backlink 建函数之后。
      "20261113100000_mab_qr05_single_rights_action_dictionary.sql",
      // M5 通用入口：机器评审只读范围跟"有待评审候选的项目"走，不再写死 CP1 样本项目。
      "20261113150000_mab_m5_reviewer_scope_follows_candidates.sql",
      // M5 通用入口：Gate 授权支持"规则范围"（studio_project），同口径修正资格有效性判定，
      // 并对 CAS 期望着值；否则新题材项目签不出门、签出也立刻被判非当前。
      "20261113160000_mab_gate_scope_rule_for_studio_projects.sql"]) apply(file);
    // Capability assertions for the migrations applied immediately above. They can only run at
    // this point in the chain: the rights columns, the private worker, the machine reviewer and
    // the content-based sign_gate_candidate semantics do not exist any earlier.
    runTest("RIGHTS_BY_ACTION", "tests/data-production/rights-by-action.integration.mjs");
    runTest("PRIVATE_WORKER_ACL", "tests/data-production/private-worker-acl.integration.mjs");
    runTest("MACHINE_REVIEWER_BOUNDARY", "tests/data-production/machine-reviewer-boundary.integration.mjs");
    runTest("ARTIFACT_CONTENT_REVISION", "tests/data-production/artifact-content-revision.integration.mjs");
    if (process.env.MOHEN_TEST_STORAGE_CONFIG) {
      runTest("PRIVATE_ORIGINAL_WORKFLOW", "tests/data-production/private-original-workflow.integration.mjs");
      runTest("EVIDENCE_BRIDGE", "tests/data-production/evidence-bridge.integration.mjs");
    } else console.log("MAB_PRIVATE_ORIGINAL_STORAGE_HOLD no isolated official Storage configuration supplied");
  }
  runTest("GATE_SERVICE", "tests/data-production/gate-service.integration.mjs");
  apply("20261103095024_mab_web_session_revocation.sql");
  runTest("WEB_SESSION_REVOCATION", "tests/data-production/web-session-revocation.integration.mjs");
  const sessionSnapshot=query(database,"select md5(jsonb_agg(to_jsonb(r) order by token_hash)::text) from control.web_session_revocations r");
  apply("20261103095024_mab_web_session_revocation.sql");
  apply("20261103095024_mab_web_session_revocation.rollback.sql","rollback");
  if(query(database,"select md5(jsonb_agg(to_jsonb(r) order by token_hash)::text) from control.web_session_revocations r")!==sessionSnapshot)throw Error("SESSION_ROLLBACK_LOST_REVOCATIONS");
  if(query(database,"select has_table_privilege('mohen_app_runtime','control.web_session_revocations','SELECT') or has_table_privilege('mohen_app_runtime','control.web_session_revocations','INSERT')")!=="f")throw Error("SESSION_ROLLBACK_LEFT_ACCESS");
  console.log("MAB_WEB_SESSION_ROLLBACK_PASS tombstones-retained runtime-closed migration-repeatable");
  const researchUrl=new URL(`postgresql://k3_admin:synthetic@localhost:${port}/${database}`);
  researchUrl.searchParams.set('host',host);
  if (runTest('RESEARCH_RESUME_POSTGRES',path.join(root,'node_modules/vitest/vitest.mjs'),{
    args:['run','--config','vitest.research-db.config.ts'],
    env:{MOHEN_RESEARCH_RESUME_TEST:'isolated-pg17',DATABASE_URL:researchUrl.toString(),MOHEN_DATABASE_PASSWORD:'synthetic',
      MOHEN_DB_DRIVER:'pg',DEEPSEEK_API_KEY:'',SHANGHAI_LIBRARY_KEY:''}}))
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
  if (failures.length) {
    console.error(`K3_DB_TEST_FAILED failing_suites=${failures.length} ${failures.join(" ")}`);
    process.exitCode = 1;
  } else console.log(`K3_DB_TEST_PASS baseline_migrations=${baseline.length} synthetic_legacy_rows=711 unchanged; no automatic qualification; migrations repeatable; rollback fail-closed`);
} finally {
  query("postgres", `drop database ${database} with (force)`);
}
