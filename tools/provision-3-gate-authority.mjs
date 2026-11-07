// MAB step 3 (M5): provision the LOCAL ISOLATED gate chain for Owner-signed G0..G5.
// Applies the two M5 privilege migrations, declares local gate policies and the
// Owner reviewer bindings, and sets the Owner's dedicated signer login password.
// Never prints a password, a session token or a connection string.
// The Producer/worker authoring this tool must never sign anything: this tool
// only prepares the Owner-signed path.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PSQL_PATH, getConnection, getNodePgPool, queryRows, run } from "../packages/data-access/src/index.mjs";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const SIGNER_LOGIN = "mohen_gate_signer_m5_owner";
const RULE_VERSION = "m5-local-v1";
const G5_RULE_VERSION = "v1";
const MAX_VALIDITY = "7 days";
const POLICY_SOURCE_REF = "LOCAL_ISOLATED:m5-gate-policy-v1";
const BINDING_SOURCE_REF = "LOCAL_ISOLATED:m5-owner-reviewer";
const PURPOSE = { namespace: "data-production", code: "m5-remediation", version: "v1" };
const CONSUMER = "producer";
const PASSWORD_FILE = "D:/MoHen/keys/gate-authority/owner-signer-password.txt";
const MIGRATIONS = [
  "supabase/migrations/20261107210000_mab_m3_private_gate_candidate_submission.sql",
  "supabase/migrations/20261107211000_mab_m3_local_owner_gate_signer.sql",
];
// Required checks per gate; G5 already has a local policy and is only verified.
const POLICIES = {
  G0: ["identity_version", "rights_by_operation"],
  G1: ["identity_version", "read_unit_binding"],
  G2: ["identity_version", "evidence_binding"],
  G3: ["identity_version", "claim_support"],
  G4: ["identity_version", "finding_grounding"],
};
const OWNED_OBJECT_TYPES = {
  G0: "source_version",
  G1: "read_unit",
  G2: "material_evidence",
  G3: "claim_revision",
  G4: "finding",
  G5: "world_projection",
};
const GATES = ["G0", "G1", "G2", "G3", "G4", "G5"];
const RULE_BY_GATE = { G0: RULE_VERSION, G1: RULE_VERSION, G2: RULE_VERSION, G3: RULE_VERSION, G4: RULE_VERSION, G5: G5_RULE_VERSION };
const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: !!ok, detail });
const flag = value => value === true || value === "t" || value === "true";

async function main() {
  const connection = getConnection();

  // 1) Apply the two M5 privilege migrations (both are idempotent).
  for (const migration of MIGRATIONS) {
    execFileSync(PSQL_PATH, ["-h", connection.host, "-p", connection.port, "-U", connection.user,
      "-d", connection.db, "-v", "ON_ERROR_STOP=1", "-f", migration],
    { env: { ...process.env, PGPASSWORD: connection.password }, stdio: ["ignore", "inherit", "inherit"] });
    check(`migration applied ${path.basename(migration)}`, true);
  }

  // 2) Preconditions: Owner identity, signer login shape, G5 policy presence.
  const owner = await queryRows(`select count(*)::int as n from public.users where user_id=:'owner'::uuid and status='active'`, { owner: OWNER });
  if (Number(owner[0]?.n) !== 1) throw Error("OWNER_USER_REQUIRED");
  check("owner user active", true);

  const signerRole = await queryRows(`select rolcanlogin, rolinherit, rolsuper, rolbypassrls,
    pg_has_role(:'login','mohen_gate_signer','MEMBER') as signer,
    pg_has_role(:'login','mohen_producer','MEMBER') as producer,
    pg_has_role(:'login','mohen_app_runtime','MEMBER') as runtime,
    pg_has_role(:'login','mohen_gate_authority','MEMBER') as authority
    from pg_roles where rolname=:'login'`, { login: SIGNER_LOGIN });
  const role = signerRole[0] ?? {};
  if (!flag(role.rolcanlogin) || flag(role.rolsuper) || flag(role.rolbypassrls) || !flag(role.signer) ||
      flag(role.producer) || flag(role.runtime) || flag(role.authority)) throw Error("OWNER_SIGNER_ROLE_INVALID");
  check("owner signer login isolated", true, SIGNER_LOGIN);

  const g5 = await queryRows(`select enabled from control.gate_policy_versions where gate_code='G5' and rule_version=:'rule'`, { rule: G5_RULE_VERSION });
  if (!g5.length) throw Error("G5_POLICY_MISSING");
  if (!flag(g5[0].enabled)) throw Error("G5_POLICY_DISABLED");
  check("G5 policy present and enabled", true, G5_RULE_VERSION);

  // 3) Missing Owner bindings, decided before any write so provisioning stays all-or-nothing.
  const missingBindings = [];
  for (const gate of GATES) {
    const existing = await queryRows(`select count(*)::int as n from control.gate_reviewer_bindings
      where reviewer_user_id=:'owner'::uuid and db_identity=:'db' and gate_code=:'gate'
        and purpose_namespace=:'ns' and purpose_code=:'code' and purpose_version=:'version'
        and consumer=:'consumer' and active`, { owner: OWNER, db: SIGNER_LOGIN, gate,
      ns: PURPOSE.namespace, code: PURPOSE.code, version: PURPOSE.version, consumer: CONSUMER });
    if (Number(existing[0]?.n) === 0) missingBindings.push(gate);
  }

  // 4) All writes in one transaction: gate policies, then Owner reviewer bindings.
  const statements = [];
  for (const [gate, requiredChecks] of Object.entries(POLICIES)) {
    statements.push(`insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)
      values (:'gate_${gate}',:'rule',array['${requiredChecks.join("','")}']::text[],interval '${MAX_VALIDITY}',
      :'source_ref',true) on conflict (gate_code,rule_version) do nothing`);
  }
  for (const gate of missingBindings) {
    statements.push(`insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,
      purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref,active)
      values (:'owner'::uuid,:'db',:'gate_${gate}',:'ns',:'code',:'version',:'consumer',:'scope'::jsonb,
      now(),now()+interval '30 days',:'binding_ref',true)`);
  }
  const params = { rule: RULE_VERSION, source_ref: POLICY_SOURCE_REF, owner: OWNER, db: SIGNER_LOGIN,
    ns: PURPOSE.namespace, code: PURPOSE.code, version: PURPOSE.version, consumer: CONSUMER,
    scope: JSON.stringify({ project_id: PROJECT }), binding_ref: BINDING_SOURCE_REF };
  for (const gate of Object.keys(POLICIES)) params[`gate_${gate}`] = gate;
  for (const gate of missingBindings) params[`gate_${gate}`] = gate;
  await run(`begin; ${statements.join(";\n")}; commit;`, params);
  check("gate policies declared G0..G4", true, RULE_VERSION);
  check("owner reviewer bindings declared", true, missingBindings.length ? missingBindings.join(",") : "already present");

  // 5) Read back the exact objects the Owner signing path will rely on.
  for (const gate of GATES) {
    const policy = await queryRows(`select enabled, required_checks::text as checks, max_validity::text as max_validity
      from control.gate_policy_versions where gate_code=:'gate' and rule_version=:'rule'`,
      { gate, rule: RULE_BY_GATE[gate] });
    if (Number(policy.length) !== 1 || !flag(policy[0].enabled)) throw Error(`GATE_POLICY_NOT_ACTIVE:${gate}`);
    const binding = await queryRows(`select count(*)::int as n from control.gate_reviewer_bindings
      where reviewer_user_id=:'owner'::uuid and db_identity=:'db' and gate_code=:'gate'
        and purpose_namespace=:'ns' and purpose_code=:'code' and purpose_version=:'version'
        and consumer=:'consumer' and active and valid_until>now() and allowed_scope @> :'scope'::jsonb`,
      { owner: OWNER, db: SIGNER_LOGIN, gate, ns: PURPOSE.namespace, code: PURPOSE.code,
        version: PURPOSE.version, consumer: CONSUMER, scope: JSON.stringify({ project_id: PROJECT }) });
    if (Number(binding[0]?.n) < 1) throw Error(`REVIEWER_BINDING_MISSING:${gate}`);
    check(`policy+binding active ${gate}`, true, `${RULE_BY_GATE[gate]} ${policy[0].checks}`);
  }

  // 6) Owner signer password: environment value, else generated into an owner-only file.
  const provided = process.env.MOHEN_GATE_SIGNER_PASSWORD;
  const password = provided && provided.trim().length ? provided : crypto.randomBytes(24).toString("hex");
  if (!(provided && provided.trim().length)) {
    fs.mkdirSync(path.dirname(PASSWORD_FILE), { recursive: true });
    fs.writeFileSync(PASSWORD_FILE, `${password}\n`, { mode: 0o600 });
  }
  // ALTER ROLE takes an identifier, not a string literal, so the login is inlined (a constant).
  await run(`alter role ${SIGNER_LOGIN} login password :'pw'`, { pw: password });
  check("owner signer password set", true, provided && provided.trim().length ? "env MOHEN_GATE_SIGNER_PASSWORD" : "file");

  await getNodePgPool().end();

  for (const item of results) console.log(`${item.ok ? "PASS" : "FAIL"} | ${item.label}${item.detail ? " | " + item.detail : ""}`);
  if (!results.every(item => item.ok)) throw Error("PROVISION_3_STEP_FAILED");

  console.log(`password file: ${provided && provided.trim().length ? "(not written)" : PASSWORD_FILE}`);
  console.log("sign order: " + GATES.join(" -> ") + " (submit the next candidate only after the previous Gate is signed)");
  for (const gate of GATES) console.log(`  ${gate} | ${OWNED_OBJECT_TYPES[gate]} | rule ${RULE_BY_GATE[gate]} | required_checks ${(POLICIES[gate] ?? ["work_revision_binding", "rights_by_operation"]).join(",")}`);
  console.log("owner self-service command (password never printed):");
  console.log(`  $env:MOHEN_GATE_DATABASE_URL="postgresql://${SIGNER_LOGIN}:<YOUR_PASSWORD>@127.0.0.1:5432/<DB_NAME>"`);
  console.log("  @'{\"decision\":{\"candidateId\":\"<candidate-uuid>\",\"requestId\":\"<new-request-uuid>\",\"result\":\"PASS\",\"ruleVersion\":\"" + RULE_VERSION + "\",\"validUntil\":\"<iso-8601-within-7-days>\",\"receipt\":{\"rationale\":\"<why>\",\"evidence_refs\":[<same refs as the candidate>],\"checks\":{<required checks all true>}}},\"sessionToken\":\"<OWNER_SESSION_TOKEN>\"}'@ | node packages/data-access/scripts/gate-authority.mjs decide");
  console.log("PROVISION_3_ALL_PASS");
}

try {
  await main();
} catch (error) {
  const message = String(error?.message ?? error).split("\n")[0];
  // psql detail is shown for diagnosis, but never a statement that may quote a password.
  const detail = String(error?.stderr ?? "").trim().split("\n")[0] ?? "";
  console.log(`FAIL | provisioning aborted | ${message}${detail ? " | " + (/password/i.test(detail) ? "(psql error redacted)" : detail) : ""}`);
  console.log("PROVISION_3_FAILED");
  process.exitCode = 1;
}
