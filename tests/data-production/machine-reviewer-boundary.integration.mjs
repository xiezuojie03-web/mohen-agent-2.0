// MAB 5 (20261107220000): the machine rule-reviewer is a dedicated NOINHERIT login whose only
// membership is mohen_gate_signer. It may read the exact artifacts it verifies and execute the
// existing signing functions — it may never write Gate state directly. These assertions pin
// that boundary, including the project-scoped read on studio.private_originals.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const psql = process.env.MOHEN_TEST_PSQL;
const localTcpHost = ["127.0.0.1", "localhost"].includes(process.env.MOHEN_TEST_HOST ?? "") ? process.env.MOHEN_TEST_HOST : undefined;
const socket = localTcpHost ?? process.env.MOHEN_TEST_SOCKET;
const database = process.env.MOHEN_TEST_DATABASE;
if (!psql || !(localTcpHost || socket?.startsWith("/workspace/")) || !/^mohen_k3_[a-z0-9_]*test$/.test(database ?? "")) throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
const args = ["-X", "-q", "-h", socket, "-p", process.env.MOHEN_TEST_PORT ?? "55432", "-U", "k3_admin", "-d", database, "-At", "-v", "ON_ERROR_STOP=1"];
const sql = (text) => execFileSync(psql, args, { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();

assert.equal(sql("select current_setting('mohen.test_instance',true)"), "codex-k3-isolated");

// Account and role shape: fixed reviewer account, dedicated NOINHERIT signer login.
assert.equal(sql("select user_id from public.users where email='machine-reviewer@mohen.local'"), "b0a11000-0000-4000-8000-0000000000a1");
assert.equal(sql("select status,roles @> array['reviewer']::text[] from public.users where user_id='b0a11000-0000-4000-8000-0000000000a1'"), "active|t");
assert.equal(sql("select rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole from pg_roles where rolname='mohen_gate_signer_m5_machine'"), "t|f|f|f|f|f");
assert.equal(sql("select string_agg(r.rolname,',' order by r.rolname) from pg_auth_members m join pg_roles r on r.oid=m.roleid where m.member='mohen_gate_signer_m5_machine'::regrole"), "mohen_gate_signer");

// No write path on Gate state — catalog facts plus live probes.
for (const table of ["gate_audits", "gate_candidates", "qualification_current", "invalidation_events", "gate_policy_versions", "gate_reviewer_bindings", "gate_service_credentials", "session_verification_keys"])
  assert.equal(sql(`select has_table_privilege('mohen_gate_signer_m5_machine','control.${table}','INSERT,UPDATE,DELETE')`), "f", table);
assert.throws(() => sql(`set role mohen_gate_signer_m5_machine; insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
 values('00000000-0000-0000-0000-000000000010','D00','G0','source','cccc0000-0000-4000-8000-000000000001','m5-rev','M5','fixture','1','{}','producer','[]','[{"id":"m5"}]','${"c".repeat(64)}')`), /permission denied/);
assert.throws(() => sql("set role mohen_gate_signer_m5_machine; update control.gate_audits set current_valid=false"), /permission denied/);
assert.throws(() => sql("set role mohen_gate_signer_m5_machine; delete from control.qualification_current"), /permission denied/);

// Read-only verification surface works end to end.
for (const table of ["control.gate_candidates", "control.gate_audits", "control.qualification_current", "control.gate_policy_versions", "control.gate_reviewer_bindings", "source.sources", "source.source_versions"])
  assert.match(sql(`set role mohen_gate_signer_m5_machine; select count(*) from ${table}`), /^\d+$/, table);

// Private originals stay scoped to the single isolated M5 project.
const policyQual = sql("select qual from pg_policies where schemaname='studio' and tablename='private_originals' and policyname='m5_machine_reviewer_read'");
assert.match(policyQual, /b0a11000-0000-4000-8000-000000000001/);
const inScope = sql("select count(*) from studio.private_originals where project_id='b0a11000-0000-4000-8000-000000000001'");
assert.equal(sql("set role mohen_gate_signer_m5_machine; select count(*) from studio.private_originals"), inScope);
assert.equal(sql("set role mohen_gate_signer_m5_machine; select count(*) from studio.private_originals where project_id<>'b0a11000-0000-4000-8000-000000000001'"), "0");

// The five execution entry points remain available to the machine identity.
assert.equal(sql(`select string_agg(v::text,',' order by v) from (values
 (has_function_privilege('mohen_gate_signer_m5_machine','control.sign_gate_candidate(uuid,uuid,text,text,timestamp with time zone,jsonb,uuid)','EXECUTE')),
 (has_function_privilege('mohen_gate_signer_m5_machine','control.revoke_gate_qualification(uuid,uuid,text)','EXECUTE')),
 (has_function_privilege('mohen_gate_signer_m5_machine','control.artifact_revision_for(text,uuid)','EXECUTE')),
 (has_function_privilege('mohen_gate_signer_m5_machine','control.current_qualification_is_valid(uuid)','EXECUTE')),
 (has_function_privilege('mohen_gate_signer_m5_machine','control.current_app_user_id()','EXECUTE'))) f(v)`), "true,true,true,true,true");

console.log("MAB_MACHINE_REVIEWER_BOUNDARY_PASS account-locked noinherit-signer-membership-only gate-write-closed read-surface-open originals-scoped-to-m5-project five-executes");
