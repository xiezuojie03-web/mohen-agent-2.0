// Verify the terminal-state Gate reader by connecting AS the low-priv LOGIN
// and calling the real read_gate_stage_qualification RPC + negative controls.
// Prints only pass/fail metadata; never prints token/password/receipt secrets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const REPO = process.cwd();
const require = createRequire(path.join(REPO, 'packages', 'data-access', 'package.json'));
const { Client } = require('pg');

const CA = fs.readFileSync(path.join(REPO, '.secrets', 'supabase-ca', 'prod-ca-2021.crt'), 'utf8');
const rawUrl = fs.readFileSync(path.join(REPO, '.secrets', 'supabase-db-url.txt'), 'utf8').trim();
const m = rawUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/(.+)$/);
const adminUrl = `postgresql://${m[1]}:${encodeURIComponent(m[2])}@${m[3]}:${m[4]}/${m[5]}`;
const readerUrl = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-database-url.txt'), 'utf8').trim();
const rawToken = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-bearer.txt'), 'utf8').trim();
const token = crypto.createHash('sha256').update(rawToken).digest('hex');
const credId = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-credential-id.txt'), 'utf8').trim();

const RUN = 'bfcdfad6-bbcb-4b68-946a-82e1302eeb80';
const AUDIT = '888db9e6-87bd-42b5-a932-4489e0270a5b';
const admin = new Client({ connectionString: adminUrl, ssl: { ca: CA, rejectUnauthorized: true }, connectionTimeoutMillis: 30000 });
const reader = new Client({ connectionString: readerUrl, ssl: { ca: CA, rejectUnauthorized: true }, connectionTimeoutMillis: 30000 });
await admin.connect();
await reader.connect();
try {
  const who = await reader.query(`select current_user::text cu, session_user::text su,
    pg_has_role(session_user,'mohen_gate_reader','MEMBER') member,
    (select rolsuper from pg_roles where rolname=session_user) super,
    (select rolbypassrls from pg_roles where rolname=session_user) bypassrls`);
  const id = who.rows[0];
  const identityOk = id.cu === id.su && id.member === true && id.super === false && id.bypassrls === false;

  const a = (await admin.query(`select input_fingerprint, details->'stage_binding'->>'output_digest' od,
    details->>'result' result, details->>'current' cur from control.gate_audits where gate_audit_id=$1::uuid`, [AUDIT])).rows[0];
  const request = { schema: 'mohen.independent-gate-current-check.v1', run_id: RUN, job_id: 'd00.source-intake',
    reviewer_binding_ref: 'm5-owner-reviewer-g0g1-producer', consumer: 'producer', gate_code: 'G0', stage: 'D00',
    input_digest: a.input_fingerprint, output_digest: a.od };

  const ok = await reader.query(`select control.read_gate_stage_qualification($1,$2::jsonb) receipt`, [token, JSON.stringify(request)]);
  const receipt = ok.rows[0].receipt;
  const pass = Boolean(receipt && receipt.qualification_current === true && receipt.result === 'PASS' &&
    receipt.gate_audit_id === AUDIT && receipt.input_digest === request.input_digest && receipt.output_digest === request.output_digest);

  const badOut = await reader.query(`select control.read_gate_stage_qualification($1,$2::jsonb) receipt`,
    [token, JSON.stringify({ ...request, output_digest: 'f'.repeat(64) })]);
  const badRun = await reader.query(`select control.read_gate_stage_qualification($1,$2::jsonb) receipt`,
    [token, JSON.stringify({ ...request, run_id: '11111111-1111-4111-8111-111111111111' })]);
  const negativesOk = badOut.rows[0].receipt === null && badRun.rows[0].receipt === null;

  const cred = await admin.query(`select valid_until::text, revoked_at::text, db_identity, capability from control.gate_service_credentials where credential_id=$1::uuid`, [credId]);
  console.log('VERIFY_TERMINAL_READER=' + JSON.stringify({
    identity_ok: identityOk, login: id.su, positive_pass: pass, negatives_ok: negativesOk,
    credential_capability: cred.rows[0].capability, credential_db_identity: cred.rows[0].db_identity,
    credential_valid_until: cred.rows[0].valid_until, credential_revoked: cred.rows[0].revoked_at !== null,
  }));
  if (!(identityOk && pass && negativesOk && cred.rows[0].capability === 'consume' && cred.rows[0].revoked_at === null)) process.exitCode = 1;
} catch (e) {
  console.error('VERIFY_FAIL=' + e.message);
  process.exitCode = 1;
} finally {
  try { await reader.end(); } catch {}
  await admin.end();
}
