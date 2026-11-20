// Terminal-state (long-term) independent Gate reader for the hosted /current path.
// Creates a persistent low-priv LOGIN + a long-lived consume credential bound to the
// exact-scope G0 binding. Writes raw token/URL to .secrets/ ONLY (gitignored), never
// to stdout, repo files, or logs. Idempotent on the LOGIN; credential insert is one-shot.
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
if (!m) { console.error('DB_URL_PARSE_FAIL'); process.exit(2); }
const [, adminUser, adminPass, host, port, db] = m;
const adminUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPass)}@${host}:${port}/${db}`;
const refSuffix = adminUser.includes('.') ? adminUser.slice(adminUser.indexOf('.') + 1) : '';
const poolerUser = name => refSuffix ? `${name}.${refSuffix}` : name;

const PROJECT = 'e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5';
const BINDING = 'd2307be3-8b77-4fb7-8537-c26ffbf7d2e0';
const PRINCIPAL = '270bcecf-9bfb-4865-9432-a0ac9db8df75';
const LOGIN = 'mohen_runner_reader_v2';
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

const SECRETS = path.join(REPO, '.secrets');
const tokenFile = path.join(SECRETS, 'gate-reader-bearer.txt');
const urlFile = path.join(SECRETS, 'gate-reader-database-url.txt');
const credIdFile = path.join(SECRETS, 'gate-reader-credential-id.txt');

const admin = new Client({ connectionString: adminUrl, ssl: { ca: CA, rejectUnauthorized: true }, connectionTimeoutMillis: 30000 });
await admin.connect();
try {
  // Revoke any orphaned credential from the earlier NOINHERIT attempt.
  await admin.query(`update control.gate_service_credentials set revoked_at=now()
    where db_identity='mohen_runner_reader' and capability='consume' and revoked_at is null`);
  await admin.query(`drop role if exists mohen_runner_reader`);

  const bindingCheck = await admin.query(`select 1 from control.gate_reviewer_bindings
    where binding_id=$1::uuid and active and gate_code='G0' and consumer='producer'
      and purpose_namespace='data-production' and purpose_code='m5-remediation' and purpose_version='v1'
      and allowed_scope @> $2::jsonb and valid_until>now()`, [BINDING, JSON.stringify({ project_id: PROJECT })]);
  if (bindingCheck.rowCount !== 1) throw Error('G0_BINDING_NOT_VALID_FOR_PROJECT');

  const principalCheck = await admin.query(`select 1 from public.users where user_id=$1::uuid and status='active'`, [PRINCIPAL]);
  if (principalCheck.rowCount !== 1) throw Error('PRINCIPAL_NOT_ACTIVE');

  const loginPw = crypto.randomBytes(24).toString('base64url');
  await admin.query(`drop role if exists ${LOGIN}`);
  await admin.query(`create role ${LOGIN} login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit password '${loginPw}'`);
  await admin.query(`grant mohen_gate_reader to ${LOGIN}`);

  const safety = await admin.query(`select r.rolcanlogin, r.rolsuper, r.rolbypassrls, r.rolcreaterole, r.rolcreatedb,
    pg_has_role($1, 'mohen_gate_reader', 'MEMBER') as reader_member,
    pg_has_role($1, 'mohen_gate_signer', 'MEMBER') as signer_member
    from pg_roles r where r.rolname=$1`, [LOGIN]);
  const s = safety.rows[0];
  if (!(s.rolcanlogin && !s.rolsuper && !s.rolbypassrls && !s.rolcreaterole && !s.rolcreatedb && s.reader_member && !s.signer_member))
    throw Error('READER_ROLE_UNSAFE');

  const active = await admin.query(`select credential_id::text from control.gate_service_credentials
    where db_identity=$1 and capability='consume' and revoked_at is null and valid_until>now()`, [LOGIN]);
  let credId, token;
  if (active.rowCount > 0) {
    credId = active.rows[0].credential_id;
    if (fs.existsSync(tokenFile)) token = fs.readFileSync(tokenFile, 'utf8').trim();
    else throw Error('ACTIVE_CREDENTIAL_WITHOUT_LOCAL_TOKEN_REUSE_IMPOSSIBLE');
  } else {
    token = 'g0-hosted-consumer-' + crypto.randomBytes(32).toString('base64url');
    const ins = await admin.query(`insert into control.gate_service_credentials
      (token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,
       gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref)
      values($1,'consume',$2,$3,$4,$5,$6,'G0','data-production','m5-remediation','v1','producer',$7::jsonb,
        now(), now() + interval '13 months', $8)
      returning credential_id::text`,
      [sha256(token), PRINCIPAL, LOGIN, BINDING, 'd00.source-intake', 'm5-owner-reviewer-g0g1-producer',
       JSON.stringify({ project_id: PROJECT }), 'OWNER-2026-11-20-TERMINAL-GATE-READER:' + crypto.randomUUID()]);
    credId = ins.rows[0].credential_id;
  }

  const readerUrl = `postgresql://${poolerUser(LOGIN)}:${encodeURIComponent(loginPw)}@${host}:${port}/${db}`;
  fs.writeFileSync(tokenFile, token + '\n', { mode: 0o600 });
  fs.writeFileSync(urlFile, readerUrl + '\n', { mode: 0o600 });
  fs.writeFileSync(credIdFile, credId + '\n', { mode: 0o600 });

  console.log('PROVISION_RESULT=' + JSON.stringify({
    login: LOGIN, safe: true, credential_id: credId,
    token_written: path.relative(REPO, tokenFile), url_written: path.relative(REPO, urlFile),
    valid_until_target: 'now()+13months', binding: BINDING, project: PROJECT,
  }));
} catch (e) {
  console.error('PROVISION_FAIL=' + e.message);
  process.exitCode = 1;
} finally {
  await admin.end();
}
