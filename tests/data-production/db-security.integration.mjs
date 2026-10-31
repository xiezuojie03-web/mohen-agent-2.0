import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";

const psql = process.env.MOHEN_TEST_PSQL;
const socket = process.env.MOHEN_TEST_SOCKET;
const database = process.env.MOHEN_TEST_DATABASE;
if (!psql || !socket?.startsWith("/workspace/") || !/^mohen_k3_[a-z0-9_]*test$/.test(database ?? "")) {
  throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
}
export function sql(text) {
  return execFileSync(psql, ["-X", "-h", socket, "-p", process.env.MOHEN_TEST_PORT ?? "55432", "-U", "k3_admin", "-d", database, "-At", "-v", "ON_ERROR_STOP=1"], { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
assert.equal(sql("select current_setting('mohen.test_instance',true)"), "codex-k3-isolated", "refuse an unmarked database server");
assert.equal(sql("select relrowsecurity from pg_class where oid='public.imported_materials'::regclass"), "t", "SEC-01: RLS must be enabled");
assert.equal(sql("select count(*) from pg_roles where rolname in ('mohen_producer','mohen_gate_signer','mohen_app_runtime') and not rolbypassrls and not rolsuper"), "3", "separate low-privilege database roles required");
assert.equal(sql("select has_table_privilege('mohen_producer','control.gate_audits','INSERT')"), "f");
assert.equal(sql("select has_table_privilege('mohen_producer','control.gate_audits','UPDATE')"), "f");
assert.equal(sql("select has_table_privilege('anon','public.imported_materials','SELECT')"), "f");
assert.equal(sql("select has_table_privilege('authenticated','public.imported_materials','INSERT')"), "f");
for (const role of ["mohen_producer", "mohen_gate_signer", "mohen_app_runtime"]) {
  assert.throws(() => sql(`set role ${role}; update control.gate_audits set current_valid=true`), /permission denied/);
  assert.throws(() => sql(`set role ${role}; insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result)
    values('00000000-0000-0000-0000-000000000010','D05','G5','fixture','00000000-0000-0000-0000-000000000020','PASS')`), /permission denied/);
}
assert.match(sql(`begin; set local role mohen_producer;
  insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
    allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
  values('00000000-0000-0000-0000-000000000010','D00','G0','source','00000000-0000-0000-0000-000000000020','fixture-rev','G0','fixture','1','{}','producer','[]','[{"id":"evidence-fixture"}]','${"a".repeat(64)}') returning candidate_status;
  rollback;`), /SUBMITTED/, "Producer can submit evidence, never PASS");

const a = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7", b = "4790013f-43ed-422e-b047-d3f8ddbf22c3";
const secret = "isolated-fixture-session-key-only-at-least-32-characters";
function token(uid, expires = Date.now() + 60000) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["operator"], exp: expires })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
sql(`insert into public.users(user_id,email,username,password_hash) values
  ('${a}','k3-a@example.invalid','A','test-not-a-real-password'),('${b}','k3-b@example.invalid','B','test-not-a-real-password') on conflict do nothing;
  insert into control.session_verification_keys(verification_key) values('${secret}') on conflict(key_slot) do update set verification_key=excluded.verification_key;
  insert into public.imported_materials(material_id,owner_user_id,title,text_content) values
  ('00000000-0000-0000-0000-000000000001','${a}','A private','A'),('00000000-0000-0000-0000-000000000002','${b}','B private','B') on conflict do nothing;`);
function asRuntime(text, sessionToken = token(a)) {
  return sql(`begin; set local role mohen_app_runtime; set local mohen.session_token='${sessionToken}'; ${text}; rollback;`).split("\n").filter(s => !/^(BEGIN|SET|ROLLBACK)$/.test(s)).join("\n");
}
assert.equal(asRuntime("select count(*) from public.imported_materials"), "1", "only authenticated owner rows are visible");
sql("create policy k3_fixture_old_public_policy on public.imported_materials for select using(true)");
try {
  assert.equal(asRuntime("select count(*) from public.imported_materials"), "1", "an old permissive policy cannot bypass the owner boundary");
} finally { sql("drop policy k3_fixture_old_public_policy on public.imported_materials"); }
assert.throws(() => asRuntime("select verification_key from control.session_verification_keys"), /permission denied/);
assert.equal(asRuntime(`select count(*) from public.imported_materials where owner_user_id='${b}'`), "0", "cross-user read denied");
assert.equal(asRuntime("select count(*) from public.imported_materials", token(a, 1)), "0", "expired session denied");
assert.equal(asRuntime("select count(*) from public.imported_materials", "unsigned.claim"), "0", "unsigned session denied");
const noExpiryPayload = Buffer.from(JSON.stringify({ uid: a, r: ["operator"] })).toString("base64url");
const noExpiryToken = `${noExpiryPayload}.${createHmac("sha256", secret).update(noExpiryPayload).digest("base64url")}`;
assert.equal(asRuntime("select count(*) from public.imported_materials", noExpiryToken), "0", "a signed token with missing expiry is still invalid");
assert.equal(asRuntime(`set local mohen.user_id='${b}'; select count(*) from public.imported_materials where owner_user_id='${b}'`), "0", "forged UUID GUC cannot change identity");
assert.match(asRuntime(`insert into public.imported_materials(owner_user_id,title,text_content) values('${a}','allowed','fixture') returning title`), /allowed/, "owner import remains available");
assert.throws(() => asRuntime(`insert into public.imported_materials(owner_user_id,title,text_content) values('${b}','forged','fixture')`), /row-level security/);
assert.match(asRuntime(`update public.imported_materials set text_content='forged' where owner_user_id='${b}'`), /UPDATE 0/);
assert.equal(asRuntime("select count(*) from public.imported_materials", `${token(a).split('.')[0]}.wrongSignature`), "0");
sql(`update public.users set status='disabled' where user_id='${a}'`);
assert.equal(asRuntime("select count(*) from public.imported_materials"), "0", "account disable takes effect with existing signed token");
sql(`update public.users set status='active' where user_id='${a}'`);
console.log("K3_DB_SECURITY_PRECHECK_PASS");
