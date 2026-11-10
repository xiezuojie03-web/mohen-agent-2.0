// MAB 5 (20261109120000): artifact identity is content-based, pinned by the
// control.artifact_content_columns registry, and signing a candidate for superseded content
// fails closed. These assertions pin the registry boundary, the tamper-evident hash, and the
// new sign_gate_candidate semantics: ARTIFACT_REVISION_NOT_CURRENT, retirement of every stale
// qualification row by object key, and DEPENDENCY_NOT_CURRENT for stale upstream snapshots.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";

const psql = process.env.MOHEN_TEST_PSQL;
const localTcpHost = ["127.0.0.1", "localhost"].includes(process.env.MOHEN_TEST_HOST ?? "") ? process.env.MOHEN_TEST_HOST : undefined;
const socket = localTcpHost ?? process.env.MOHEN_TEST_SOCKET;
const database = process.env.MOHEN_TEST_DATABASE;
if (!psql || !(localTcpHost || socket?.startsWith("/workspace/")) || !/^mohen_k3_[a-z0-9_]*test$/.test(database ?? "")) throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
const args = ["-X", "-q", "-h", socket, "-p", process.env.MOHEN_TEST_PORT ?? "55432", "-U", "k3_admin", "-d", database, "-At", "-v", "ON_ERROR_STOP=1"];
const sql = (text) => execFileSync(psql, args, { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();

assert.equal(sql("select current_setting('mohen.test_instance',true)"), "codex-k3-isolated");

// A. Registry shape: 23 kinds, RLS enabled, only the Gate authority may read it.
assert.equal(sql("select count(distinct kind) from control.artifact_content_columns"), "23");
assert.equal(sql("select relrowsecurity from pg_class where oid='control.artifact_content_columns'::regclass"), "t");
assert.equal(sql("select has_table_privilege('mohen_gate_authority','control.artifact_content_columns','SELECT')"), "t");
for (const role of ["mohen_producer", "mohen_gate_signer", "mohen_app_runtime", "mohen_private_worker", "mohen_gate_signer_m5_machine"])
  assert.equal(sql(`select has_table_privilege('${role}','control.artifact_content_columns','SELECT')`), "f", role);
assert.throws(() => sql("set role mohen_producer; select count(*) from control.artifact_content_columns"), /permission denied/);

// B. Content-based revision semantics on a real source object.
const sourceId = createHash("md5").update("TEST_ONLY:CR:revision-source").digest("hex");
sql(`insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)
 values('${sourceId}','TEST_ONLY','TEST_ONLY content revision fixture','fixture','text','full_content')`);
const rev1 = sql(`select control.artifact_revision_for('source','${sourceId}')`);
assert.match(rev1, /^[a-f0-9]{64}$/);
assert.equal(sql(`select control.artifact_revision_for('source','${sourceId}')`), rev1, "revision is deterministic");
sql(`update source.sources set title='TEST_ONLY content revision fixture v2' where source_id='${sourceId}'`);
const rev2 = sql(`select control.artifact_revision_for('source','${sourceId}')`);
assert.match(rev2, /^[a-f0-9]{64}$/);
assert.notEqual(rev2, rev1, "a content edit moves the revision (tamper evidence)");

// Registry decoupling: a column removed from the registry no longer moves the revision.
const decoupled = sql(`begin;
 delete from control.artifact_content_columns where kind='source' and column_name='rights_evidence';
 select control.artifact_revision_for('source','${sourceId}');
 update source.sources set rights_evidence='{"basis":"owner-decision"}' where source_id='${sourceId}';
 select control.artifact_revision_for('source','${sourceId}');
 rollback;`);
const pair = decoupled.split(/\r?\n/).filter(Boolean);
assert.equal(pair.length, 2);
assert.equal(pair[0], pair[1], "editing a column outside the registry does not move the revision");

// Fail closed: a registered kind whose registry rows are gone must refuse to hash.
assert.throws(() => sql(`begin; delete from control.artifact_content_columns where kind='source'; select control.artifact_revision_for('source','${sourceId}'); rollback;`), /ARTIFACT_CONTENT_COLUMNS_NOT_REGISTERED/);

// Unknown kinds still return null (never an error, never a hash).
assert.equal(sql(`select coalesce(control.artifact_revision_for('unknown_kind','${sourceId}'),'NULL')`), "NULL");

// C. Signing semantics against the 20261109120000 sign_gate_candidate. Independent fixtures
//    (reviewer, session key, policies, bindings) under purpose_namespace 'CR'.
const reviewer = "22222222-2222-4222-8222-222222222222";
const secret = "cr-fixture-session-secret-at-least-32-characters";
const payload = Buffer.from(JSON.stringify({ uid: reviewer, r: ["operator"], exp: Date.now() + 300000 })).toString("base64url");
const token = payload + "." + createHmac("sha256", secret).update(payload).digest("base64url");
const asSigner = (query) => `begin; set local role mohen_gate_signer; set local mohen.session_token='${token}'; ${query}; commit;`;
sql(`insert into public.users(user_id,email,username,password_hash) values('${reviewer}','cr-reviewer@example.invalid','CR fixture reviewer','not-a-password');
 insert into control.session_verification_keys(verification_key) values('${secret}') on conflict(key_slot) do update set verification_key=excluded.verification_key;
 insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)
 values('G0','content-revision-rule',array['identity_version'],interval '1 hour','TEST_ONLY:cr-policy',true),
       ('G1','content-revision-g1-rule',array['identity_version'],interval '1 hour','TEST_ONLY:cr-policy',true);
 insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
 values('${reviewer}','mohen_gate_signer','G0','CR','fixture','1','producer','{"project":"cr"}',now()+interval '1 day','TEST_ONLY:cr-reviewer'),
       ('${reviewer}','mohen_gate_signer','G1','CR','fixture','1','producer','{"project":"cr"}',now()+interval '1 day','TEST_ONLY:cr-reviewer');`);
const until = sql("select (now()+interval '30 minutes')::text");
const receipt = JSON.stringify({ checks: { identity_version: true }, rationale: "TEST_ONLY content revision fixture", evidence_refs: [{ id: "cr-evidence" }] });
const fp = "d".repeat(64);

function candidate({ label, gate = "G0", stage = "D00", revision = null, deps = [] }) {
  const objectId = createHash("md5").update("TEST_ONLY:CR:" + label).digest("hex");
  sql(`insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)
   values('${objectId}','TEST_ONLY','TEST_ONLY ${label}','fixture','text','full_content') on conflict do nothing`);
  const physical = revision ?? sql(`select control.artifact_revision_for('source','${objectId}')`);
  const candidateId = sql(`set role mohen_producer; insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
   values('00000000-0000-0000-0000-000000000010','${stage}','${gate}','source','${objectId}','${physical}','CR','fixture','1','{"project":"cr"}','producer','${JSON.stringify(deps)}','[{"id":"cr-evidence"}]','${fp}') returning candidate_id;`);
  return { candidateId, objectId, revision: physical };
}
function sign(candidateId, { request = randomUUID(), expected = null, rule = "content-revision-rule", result = "PASS" } = {}) {
  return `select control.sign_gate_candidate('${candidateId}','${request}','${result}','${rule}','${until}','${receipt}',${expected ? `'${expected}'` : "null"})`;
}

// C1. Signing current content succeeds; the projection holds exactly one current row.
const cA = candidate({ label: "cA" });
const auditA = sql(asSigner(sign(cA.candidateId)));
assert.match(auditA, /^[a-f0-9-]{36}$/);
assert.equal(sql(`select count(*) from control.qualification_current where gate_audit_id='${auditA}'`), "1");

// C2. After a content edit, re-signing with the new revision physically retires every stale
//     qualification row for the object key — the signed audit history itself is never deleted.
sql(`update source.sources set title='TEST_ONLY cA edited' where source_id='${cA.objectId}'`);
const revA2 = sql(`select control.artifact_revision_for('source','${cA.objectId}')`);
assert.notEqual(revA2, cA.revision);
const cB = candidate({ label: "cA" });
const auditB = sql(asSigner(sign(cB.candidateId, { expected: auditA })));
assert.notEqual(auditB, auditA);
assert.equal(sql(`select count(*) from control.qualification_current where gate_audit_id='${auditA}'`), "0", "stale qualification row physically retired by object key");
assert.equal(sql(`select count(*) from control.qualification_current where gate_audit_id='${auditB}'`), "1");
assert.equal(sql(`select count(*) from control.gate_audits where gate_audit_id='${auditA}'`), "1", "signed audit history is append-only");

// C3. A candidate bound to superseded content fails closed.
const cC = candidate({ label: "cA", revision: cA.revision });
assert.throws(() => sql(asSigner(sign(cC.candidateId, { expected: auditB }))), /ARTIFACT_REVISION_NOT_CURRENT/);

// C4. Dependency freshness: a G1 over a current G0 signs; the same snapshot is rejected once
//     the upstream content has moved.
const g0obj = candidate({ label: "g1-parent" });
const auditG0 = sql(asSigner(sign(g0obj.candidateId)));
const [digest0, rev0] = sql(`select qualification_digest,artifact_revision from control.gate_audits where gate_audit_id='${auditG0}'`).split("|");
const deps = [{ gate_audit_id: auditG0, qualification_digest: digest0, artifact_revision: rev0 }];
const g1a = candidate({ label: "g1-child-ok", gate: "G1", stage: "D01", deps });
const auditG1 = sql(asSigner(sign(g1a.candidateId, { rule: "content-revision-g1-rule" })));
assert.match(auditG1, /^[a-f0-9-]{36}$/);
assert.equal(sql(`select count(*) from control.qualification_current where gate_audit_id='${auditG1}'`), "1");

sql(`update source.sources set title='TEST_ONLY g1-parent edited' where source_id='${g0obj.objectId}'`);
assert.equal(sql(`select control.current_qualification_is_valid('${auditG0}')`), "f", "a content edit voids the upstream qualification");
const g1b = candidate({ label: "g1-child-stale", gate: "G1", stage: "D01", deps });
assert.throws(() => sql(asSigner(sign(g1b.candidateId, { rule: "content-revision-g1-rule" }))), /DEPENDENCY_NOT_CURRENT/);

console.log("MAB_ARTIFACT_CONTENT_REVISION_PASS registry-23-kinds-authority-only content-hash-tamper-evident registry-decoupled fail-closed-unregistered stale-revision-rejected retirement-by-object-key dependency-freshness-enforced");
