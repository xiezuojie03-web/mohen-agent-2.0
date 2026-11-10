// MAB 3 (20261107210000): the dedicated private producer worker may SUBMIT Gate candidates
// as itself and read producer-facing qualification — nothing more. These assertions pin the
// least-privilege boundary: no other identity, no pre-decided status, no writes, no extra
// columns, no Gate internals, and no signing power.
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

// Role shape: dedicated non-login worker without any privileged attribute.
assert.equal(sql("select rolinherit,rolsuper,rolbypassrls,rolcanlogin from pg_roles where rolname='mohen_private_worker'"), "t|f|f|f");

const fp = "b".repeat(64);
const cols = "run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint";
const values = (objectId, revision) =>
  `'00000000-0000-0000-0000-000000000010','D00','G0','source','${objectId}','${revision}','PW','fixture','1','{}','producer','[]','[{"id":"pw-evidence"}]','${fp}'`;

// Positive: submission works exactly as the worker identity, status forced to SUBMITTED.
// RETURNING may only project the two columns the worker is granted SELECT on
// (candidate_id, producer_identity); candidate_status is read back by the admin connection.
const submitted = sql(`begin; set local role mohen_private_worker;
 insert into control.gate_candidates(${cols}) values(${values("bbbb0000-0000-4000-8000-000000000001", "pw-rev-1")})
 returning producer_identity; commit;`);
assert.equal(submitted, "mohen_private_worker");
assert.equal(sql("select candidate_status from control.gate_candidates where object_id='bbbb0000-0000-4000-8000-000000000001'"), "SUBMITTED");

// Negative: it cannot speak for the Producer, nor submit an already-decided candidate.
assert.throws(() => sql(`begin; set local role mohen_private_worker;
 insert into control.gate_candidates(${cols},producer_identity) values(${values("bbbb0000-0000-4000-8000-000000000002", "pw-rev-2")},'mohen_producer'); commit;`), /row-level security/);
assert.throws(() => sql(`begin; set local role mohen_private_worker;
 insert into control.gate_candidates(${cols},candidate_status) values(${values("bbbb0000-0000-4000-8000-000000000003", "pw-rev-3")},'CONSUMED'); commit;`), /row-level security/);

// Negative: no UPDATE/DELETE, and no columns beyond (candidate_id, producer_identity).
assert.throws(() => sql("set role mohen_private_worker; update control.gate_candidates set candidate_status='CONSUMED'"), /permission denied/);
assert.throws(() => sql("set role mohen_private_worker; delete from control.gate_candidates"), /permission denied/);
assert.throws(() => sql("set role mohen_private_worker; select evidence_refs from control.gate_candidates limit 1"), /permission denied/);

// Positive: row visibility is limited to its own submissions. The worker may project only
// producer_identity, so the check reads every row it can see and asserts none is the control row.
sql(`insert into control.gate_candidates(${cols},producer_identity) values(${values("bbbb0000-0000-4000-8000-000000000004", "pw-rev-4")},'mohen_producer')`);
assert.equal(sql("set role mohen_private_worker; select string_agg(producer_identity,',' order by producer_identity) from control.gate_candidates"), "mohen_private_worker");
assert.equal(sql("select count(*) from control.gate_candidates where purpose_namespace='PW'"), "2", "control row and worker row both exist for the admin");

// Positive: the worker re-reads independent producer-facing decisions.
sql(`insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result,consumer,decision_origin)
 values('00000000-0000-0000-0000-000000000010','D00','G0','pw_fixture_audit','bbbb0000-0000-4000-8000-000000000009','PASS','producer','independent_gate')`);
assert.equal(sql("set role mohen_private_worker; select count(*) from control.gate_audits where object_type='pw_fixture_audit'"), "1");
// The absolute legacy fixture count depends on earlier suites in the chain, so the gap is pinned
// as "what the worker sees equals what the admin sees", not against a hard-coded number.
const adminLegacy = sql("select count(*) from control.gate_audits where decision_origin='legacy_untrusted'");
assert.ok(Number(adminLegacy) > 0, "legacy rows exist");

// Known gap GAP_GATE_AUDITS_RLS (tracked in progress.md, fixed by a separate batch): no migration
// ever ran "alter table control.gate_audits enable row level security", so the least-privilege
// read policy below is inert and this worker sees every audit row, legacy fixtures included.
// Enabling RLS must be done together with policies for mohen_gate_authority and the machine
// reviewer, otherwise their read surface (which today also depends on RLS being off) closes.
assert.equal(sql("select count(*) from pg_policies where schemaname='control' and tablename='gate_audits' and policyname='k3_private_worker_gate_audit_read'"), "1", "policy exists but is inert");
assert.equal(sql("select relrowsecurity from pg_class where oid='control.gate_audits'::regclass"), "f", "GAP_GATE_AUDITS_RLS");
assert.equal(sql("set role mohen_private_worker; select count(*) from control.gate_audits where decision_origin='legacy_untrusted'"), adminLegacy, "GAP_GATE_AUDITS_RLS rls-off-leaks-legacy-audits");

// Positive: the qualification projection is readable exactly for producer-facing rows.
const producerRows = sql("select count(*) from control.qualification_current where consumer='producer'");
assert.equal(sql("set role mohen_private_worker; select count(*) from control.qualification_current"), producerRows);

// Negative: Gate internals stay closed.
for (const table of ["invalidation_events", "gate_policy_versions", "gate_reviewer_bindings", "gate_service_credentials"])
  assert.throws(() => sql(`set role mohen_private_worker; select count(*) from control.${table}`), /permission denied/, table);

// Negative: signing and revocation are never granted to a producer-side identity.
assert.throws(() => sql("set role mohen_private_worker; select control.sign_gate_candidate(gen_random_uuid(),gen_random_uuid(),'PASS','fixture-rule',now()+interval '1 hour','{}')"), /permission denied/);
assert.throws(() => sql("set role mohen_private_worker; select control.revoke_gate_qualification(gen_random_uuid(),gen_random_uuid(),'attempt')"), /permission denied/);

// Positive: the two read-only functions stay callable.
assert.equal(sql("set role mohen_private_worker; select control.current_qualification_is_valid(gen_random_uuid())"), "f");
assert.equal(sql("set role mohen_private_worker; select control.qualification_allows(gen_random_uuid(),'producer','PW','fixture','1','{}')"), "f");

console.log("MAB_PRIVATE_WORKER_ACL_PASS role-shape self-submission-only no-predecided-status row-column-least-privilege independent-audit-read qualification-read gate-internals-closed signer-execute-denied known-gap-GAP_GATE_AUDITS_RLS");
