// Probe local isolated PG for G5 work-publication prerequisites. Read-only; prints no secrets.
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
import crypto from "node:crypto";
function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const dataAccess = await import("../packages/data-access/src/index.mjs");
const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const token = makeToken(OWNER, secret);
const q = (sql, p = {}) => dataAccess.queryRows(
  sql.replaceAll("/*cfg*/", ", (select set_config('mohen.session_token', :'token', false)) cfg"), { ...p, token });

console.log("G5_CONTEXTS:", JSON.stringify(JSON.parse(process.env.MOHEN_G5_CONTEXTS ?? "{}").watch ?? null));

console.log("\n-- gate_policy_versions G5:");
for (const r of await q(`select gate_code, rule_version, required_checks::text as rc, max_validity::text as mv, enabled from control.gate_policy_versions /*cfg*/ where gate_code='G5'`)) console.log(JSON.stringify(r));

console.log("\n-- existing G5 audits (latest 5):");
for (const r of await q(`select gate_audit_id::text, object_type, object_id::text, result, consumer, purpose_namespace, purpose_code, purpose_version, allowed_scope::text, current_valid, reviewer_db_identity, left(details::text, 400) as details_head from control.gate_audits /*cfg*/ where gate_code='G5' order by signed_at desc limit 5`)) console.log(JSON.stringify(r));

console.log("\n-- reviewer bindings G5:");
for (const r of await q(`select reviewer_user_id::text, db_identity, gate_code, consumer, purpose_namespace, purpose_code, purpose_version, allowed_scope::text, active from control.gate_reviewer_bindings /*cfg*/ where gate_code='G5'`)) console.log(JSON.stringify(r));

console.log("\n-- qualification_current (batch D machine-signed chain):");
for (const r of await q(`select gate_code, object_type, object_id::text, artifact_revision::text, gate_audit_id::text, consumer, purpose_namespace, purpose_code, purpose_version, reviewer_user_id::text, valid_until::text from control.qualification_current /*cfg*/ order by gate_code, object_type limit 20`)) console.log(JSON.stringify(r));

console.log("\n-- batch D machine audits (G4/G5, story_seed):");
for (const r of await q(`select gate_code, object_type, object_id::text, artifact_revision::text, gate_audit_id::text, left(qualification_digest,16) as digest, consumer, current_valid from control.gate_audits /*cfg*/ where reviewer_user_id='b0a11000-0000-4000-8000-0000000000a1' and gate_code in ('G4','G5') order by signed_at desc limit 8`)) console.log(JSON.stringify(r));

console.log("\n-- gate_candidates G5 latest:");
for (const r of await q(`select candidate_id::text, gate_code, object_type, object_id::text, candidate_status, consumer, purpose_namespace, purpose_code, purpose_version, allowed_scope::text, artifact_revision::text, producer_identity from control.gate_candidates /*cfg*/ where gate_code='G5' limit 5`)) console.log(JSON.stringify(r));

console.log("\n-- published pointers / works / decisions:");
for (const r of await q(`select work_id::text, revision_id::text from publication.published_pointers /*cfg*/`)) console.log("pointer", JSON.stringify(r));
for (const r of await q(`select work_id::text, title, status from publication.works /*cfg*/ order by created_at desc limit 5`)) console.log("work", JSON.stringify(r));
for (const r of await q(`select revision_id::text, reviewer, approved, left(rationale,60) as rationale from control.work_publication_decisions /*cfg*/ order by created_at desc limit 5`)) console.log("decision", JSON.stringify(r));

console.log("\n-- machine reviewer user + D-chain G4/G5 current:");
for (const r of await q(`select user_id::text, email from public.users /*cfg*/ where user_id in ('b0a11000-0000-4000-8000-0000000000a1'::uuid, '270bcecf-9bfb-4865-9432-a0ac9db8df75'::uuid)`)) console.log("user", JSON.stringify(r));

console.log("\n-- gate_candidates columns:");
console.log((await dataAccess.queryRows(`select string_agg(column_name, ',') as cols from information_schema.columns where table_schema='control' and table_name='gate_candidates'`))[0]?.cols);
console.log("-- work_publication_decisions columns:");
console.log((await dataAccess.queryRows(`select string_agg(column_name, ',') as cols from information_schema.columns where table_schema='control' and table_name='work_publication_decisions'`))[0]?.cols);
await dataAccess.getNodePgPool?.().end?.();
process.exit(0);
