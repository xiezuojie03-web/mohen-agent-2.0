// MAB step 3 (M5): verify the LOCAL ISOLATED Owner-signed G0..G5 chain.
// Read-only by default. `--negative` adds two explicit denial proofs and a
// before/after audit count so a denial can never be mistaken for a signature.
// This tool never signs, never writes control.gate_audits and never accepts a
// session token: the author only checks the chain the Owner signs.
import { execFileSync } from "node:child_process";
import { PSQL_PATH, getConnection, getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const SIGNER_LOGIN = "mohen_gate_signer_m5_owner";
const PRIVATE_WORKER = "mohen_private_worker";
const RULE_VERSION = "m5-local-v1";
const G5_RULE_VERSION = "v1";
const PURPOSE = { namespace: "data-production", code: "m5-remediation", version: "v1" };
const CONSUMER = "producer";
const GATES = ["G0", "G1", "G2", "G3", "G4", "G5"];
const RULE_BY_GATE = { G0: RULE_VERSION, G1: RULE_VERSION, G2: RULE_VERSION, G3: RULE_VERSION, G4: RULE_VERSION, G5: G5_RULE_VERSION };
const SCOPE = JSON.stringify({ project_id: PROJECT });
const negative = process.argv.includes("--negative");
const lines = [];
const record = (label, ok, detail = "") => { lines.push({ label, ok: !!ok, detail }); return !!ok; };
const num = value => Number(value ?? 0);
const flag = value => value === true || value === "t" || value === "true";

function psql(sql, { expectFailure = false } = {}) {
  const connection = getConnection();
  const args = ["-h", connection.host, "-p", connection.port, "-U", connection.user, "-d", connection.db,
    "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "--csv", "-P", "footer=off", "-c", sql];
  try {
    const stdout = execFileSync(PSQL_PATH, args, { env: { ...process.env, PGPASSWORD: connection.password }, encoding: "utf8" });
    return { failed: false, stdout };
  } catch (error) {
    if (!expectFailure) throw error;
    return { failed: true, stdout: String(error.stdout ?? ""), stderr: String(error.stderr ?? "") };
  }
}

async function main() {
  // 1) Role isolation: the Producer may submit and read, never decide.
  const roleState = await queryRows(`select
    has_table_privilege(:'worker','control.gate_candidates','INSERT') as worker_insert,
    has_table_privilege(:'worker','control.gate_candidates','UPDATE') as worker_update,
    has_table_privilege(:'worker','control.gate_candidates','DELETE') as worker_delete,
    has_table_privilege(:'worker','control.gate_audits','SELECT') as worker_audit_read,
    has_table_privilege(:'worker','control.gate_audits','INSERT') as worker_audit_write,
    has_function_privilege(:'worker','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE') as worker_sign,
    has_table_privilege(:'signer','control.gate_audits','INSERT') as signer_audit_write,
    has_table_privilege(:'signer','control.gate_audits','UPDATE') as signer_audit_update,
    has_function_privilege(:'signer','control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid)','EXECUTE') as signer_sign,
    pg_has_role(:'signer','mohen_gate_signer','MEMBER') as signer_member,
    pg_has_role(:'signer','mohen_producer','MEMBER') as signer_producer,
    pg_has_role(:'signer','mohen_app_runtime','MEMBER') as signer_runtime,
    pg_has_role(:'signer','mohen_gate_authority','MEMBER') as signer_authority`,
  { worker: PRIVATE_WORKER, signer: SIGNER_LOGIN });
  const roles = roleState[0] ?? {};
  record("VERIFY_3_ROLE_PRIVATE_WORKER", flag(roles.worker_insert) && flag(roles.worker_audit_read) &&
    !flag(roles.worker_update) && !flag(roles.worker_delete) && !flag(roles.worker_audit_write) && !flag(roles.worker_sign),
    `insert=${roles.worker_insert} audit_read=${roles.worker_audit_read} no_update=${!flag(roles.worker_update)} no_audit_write=${!flag(roles.worker_audit_write)} no_sign=${!flag(roles.worker_sign)}`);
  record("VERIFY_3_ROLE_OWNER_SIGNER", flag(roles.signer_sign) && flag(roles.signer_member) &&
    !flag(roles.signer_audit_write) && !flag(roles.signer_audit_update) &&
    !flag(roles.signer_producer) && !flag(roles.signer_runtime) && !flag(roles.signer_authority),
    `sign=${roles.signer_sign} member=${roles.signer_member} no_direct_audit_write=${!flag(roles.signer_audit_write)} isolated=${!flag(roles.signer_producer)}`);

  // 2) Per-gate policy, binding, candidates, audits and current qualification.
  let candidateTotal = 0, independentTotal = 0, qualificationTotal = 0, invalidTotal = 0;
  for (const gate of GATES) {
    const [row = {}] = await queryRows(`select
      (select count(*)::int from control.gate_policy_versions p where p.gate_code=:'gate' and p.enabled) as policies_enabled,
      (select count(*)::int from control.gate_policy_versions p where p.gate_code=:'gate' and p.enabled and p.rule_version=:'rule') as expected_rule,
      (select count(*)::int from control.gate_reviewer_bindings b where b.gate_code=:'gate'
        and b.reviewer_user_id=:'owner'::uuid and b.db_identity=:'signer' and b.active and b.valid_until>now()
        and b.purpose_namespace=:'ns' and b.purpose_code=:'code' and b.purpose_version=:'version'
        and b.consumer=:'consumer' and b.allowed_scope @> :'scope'::jsonb) as bindings,
      (select count(*)::int from control.gate_candidates c where c.gate_code=:'gate') as candidates,
      (select count(*)::int from control.gate_candidates c where c.gate_code=:'gate' and c.candidate_status='SUBMITTED') as candidates_submitted,
      (select count(*)::int from control.gate_audits a where a.gate_code=:'gate') as audits,
      (select count(*)::int from control.gate_audits a where a.gate_code=:'gate' and a.result='PASS') as audits_pass,
      (select count(*)::int from control.gate_audits a where a.gate_code=:'gate'
        and a.decision_origin='independent_gate' and a.result='PASS') as audits_independent,
      (select count(*)::int from control.qualification_current q where q.gate_code=:'gate') as qualification,
      (select count(*)::int from control.qualification_current q join control.gate_audits a on a.gate_audit_id=q.gate_audit_id
        where q.gate_code=:'gate' and (a.decision_origin<>'independent_gate' or a.result<>'PASS')) as qualification_orphans,
      (select count(*)::int from control.qualification_current q where q.gate_code=:'gate'
        and not control.current_qualification_is_valid(q.gate_audit_id)) as qualification_invalid`,
    { gate, rule: RULE_BY_GATE[gate], owner: OWNER, signer: SIGNER_LOGIN,
      ns: PURPOSE.namespace, code: PURPOSE.code, version: PURPOSE.version, consumer: CONSUMER, scope: SCOPE });
    const policyOk = num(row.policies_enabled) >= 1 && num(row.expected_rule) >= 1;
    const bindingOk = num(row.bindings) >= 1;
    // Every current qualification must come from a PASS signed by the independent
    // Gate and must still be valid; superseded audits stay as history only.
    const qualificationOk = num(row.qualification_orphans) === 0 && num(row.qualification_invalid) === 0;
    candidateTotal += num(row.candidates);
    independentTotal += num(row.audits_independent);
    qualificationTotal += num(row.qualification);
    invalidTotal += num(row.qualification_invalid);
    record(`VERIFY_3_GATE ${gate}`, policyOk && bindingOk && qualificationOk,
      `rule=${RULE_BY_GATE[gate]} policies=${row.policies_enabled} enabled_expected=${row.expected_rule} bindings=${row.bindings}` +
      ` candidates=${row.candidates}(submitted ${row.candidates_submitted}) audits=${row.audits}(pass ${row.audits_pass})` +
      ` independent=${row.audits_independent} qualification=${row.qualification}(invalid ${row.qualification_invalid})`);
  }
  record("VERIFY_3_CHAIN_TOTALS", invalidTotal === 0,
    `candidates=${candidateTotal} independent_pass=${independentTotal} qualification=${qualificationTotal} invalid=${invalidTotal}`);

  // 3) Negative proofs (opt-in): denials only, nothing is signed here.
  if (negative) {
    const before = (await queryRows(`select count(*)::int as n from control.gate_audits`))[0];
    const denied = psql(`begin; set role mohen_producer; select control.sign_gate_candidate(
      '00000000-0000-4000-8000-0000000000aa'::uuid,'00000000-0000-4000-8000-0000000000ab'::uuid,
      'PASS','${RULE_VERSION}',now()+interval '1 day','{}'::jsonb,null); commit;`, { expectFailure: true });
    const after = (await queryRows(`select count(*)::int as n from control.gate_audits`))[0];
    const sqlstate = String(denied.stderr ?? "").match(/42501/)?.[0] ?? "";
    record("VERIFY_3_NEGATIVE producer_cannot_sign",
      denied.failed === true && sqlstate === "42501" && String(denied.stderr).includes("sign_gate_candidate") &&
        num(before.n) === num(after.n),
      `denied=${denied.failed} sqlstate=${sqlstate || "none"} audits_unchanged=${num(before.n)}==${num(after.n)}`);

    const allows = await queryRows(`select control.qualification_allows(
      '00000000-0000-4000-8000-0000000000ac'::uuid,'${CONSUMER}','${PURPOSE.namespace}','${PURPOSE.code}',
      '${PURPOSE.version}','${SCOPE}'::jsonb) as allowed`);
    record("VERIFY_3_NEGATIVE unsigned_qualification_denied",
      allows.length === 1 && allows[0].allowed === "f", `allowed=${allows[0]?.allowed ?? "none"}`);
  }

  await getNodePgPool().end();
  for (const line of lines) console.log(`${line.label} ${line.ok ? "PASS" : "FAIL"}${line.detail ? " " + line.detail : ""}`);
  const failed = lines.filter(line => !line.ok);
  console.log(`VERIFY_3_SUMMARY lines=${lines.length} failed=${failed.length} negative=${negative ? "on" : "off"}`);
  console.log(failed.length === 0 ? "VERIFY_3_ALL_PASS" : `VERIFY_3_FAILED:${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.log(`VERIFY_3_ABORTED ${String(error?.message ?? error).split("\n")[0]}`);
  console.log("VERIFY_3_FAILED:1");
  process.exitCode = 1;
}
