// One job-scoped independent Gate read credential for the hosted /current path.
//
// A consume credential is bound to exactly one job and gate
// (control.gate_service_credentials.job_id/gate_code), so a run that crosses
// stages needs one read credential per job. This tool reads the job's stage,
// exit gate and reviewer binding ref from the production registry (single
// source of truth), ensures the machine-reviewer binding exists for the target
// project, inserts the credential and writes the raw token to .secrets/ ONLY
// (gitignored) — never to stdout, repo files or logs.
//
// Usage:
//   node tools/provision-stage-gate-reader.mjs --job-id d01.carrier-reading \
//     --project-id d9d48901-3aa3-4424-b50f-965d6749ee8e [--days 30] [--secret-name gate-reader-bearer-d9d48901-g1]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const REPO = process.cwd();
const require = createRequire(path.join(REPO, 'packages', 'data-access', 'package.json'));
const { Client } = require('pg');

const MACHINE_REVIEWER = 'b0a11000-0000-4000-8000-0000000000a1';
const PURPOSE = { namespace: 'data-production', code: 'm5-remediation', version: 'v1' };
const CONSUMER = 'producer';

function parseArgs(argv) {
  const out = { days: 30 };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (!value) throw Error('ARG_VALUE_REQUIRED:' + key);
    out[key] = value;
  }
  if (!out['job-id'] || !out['project-id']) throw Error('JOB_ID_AND_PROJECT_ID_REQUIRED');
  out.days = Number(out.days);
  if (!Number.isInteger(out.days) || out.days < 1 || out.days > 400) throw Error('DAYS_INVALID');
  return out;
}

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const args = parseArgs(process.argv.slice(2));
const jobId = args['job-id'];
const projectId = args['project-id'];

const registry = JSON.parse(fs.readFileSync(path.join(REPO, 'specs', 'data-production', 'production-registry.json'), 'utf8'));
const job = (registry.jobs ?? []).find(entry => entry.job_id === jobId);
if (!job) throw Error('JOB_NOT_IN_REGISTRY:' + jobId);
const gateCode = job.exit_gate;
const reviewerBindingRef = job.implementation?.gate_reviewer_binding;
if (typeof gateCode !== 'string' || !/^G[0-5]$/.test(gateCode) || typeof reviewerBindingRef !== 'string' || !reviewerBindingRef)
  throw Error('JOB_GATE_BINDING_INVALID:' + jobId);
if (gateCode !== 'G' + String(job.stage).slice(-1)) throw Error('JOB_STAGE_GATE_MISMATCH:' + jobId);

const CA = fs.readFileSync(path.join(REPO, '.secrets', 'supabase-ca', 'prod-ca-2021.crt'), 'utf8');
const rawUrl = fs.readFileSync(path.join(REPO, '.secrets', 'supabase-db-url.txt'), 'utf8').trim();
if (!rawUrl.match(/^postgresql:\/\//)) throw Error('DB_URL_PARSE_FAIL');
const readerIdentity = 'mohen_runner_reader_v2';
const secretName = args['secret-name'] || `gate-reader-bearer-${projectId.slice(0, 8)}-${gateCode.toLowerCase()}`;
const tokenFile = path.join(REPO, '.secrets', secretName + '.txt');
const credIdFile = path.join(REPO, '.secrets', secretName + '-credential-id.txt');
const scope = { project_id: projectId };
const sourceRef = `plan-3.5C-2026-11-22:${gateCode.toLowerCase()}-machine-exact-project-scope:${projectId.slice(0, 8)}`;

const admin = new Client({ connectionString: rawUrl, ssl: { ca: CA, rejectUnauthorized: true }, connectionTimeoutMillis: 30000 });
await admin.connect();
try {
  const reviewer = await admin.query(
    `select 1 from public.users where user_id=$1::uuid and status='active' and roles @> array['reviewer']::text[]`,
    [MACHINE_REVIEWER]);
  if (reviewer.rowCount !== 1) throw Error('MACHINE_REVIEWER_USER_INVALID');

  let binding = await admin.query(
    `select binding_id::text from control.gate_reviewer_bindings
      where reviewer_user_id=$1::uuid and db_identity='mohen_gate_signer_m5_machine'::name
        and gate_code=$2 and purpose_namespace=$3 and purpose_code=$4 and purpose_version=$5
        and consumer=$6 and allowed_scope @> $7::jsonb
        and active and now()>=valid_from and now()<valid_until
      order by valid_until desc limit 1`,
    [MACHINE_REVIEWER, gateCode, PURPOSE.namespace, PURPOSE.code, PURPOSE.version, CONSUMER, JSON.stringify(scope)]);
  let bindingId = binding.rows[0]?.binding_id;
  let bindingCreated = false;
  if (!bindingId) {
    binding = await admin.query(
      `insert into control.gate_reviewer_bindings(
         reviewer_user_id, db_identity, gate_code, purpose_namespace, purpose_code, purpose_version,
         consumer, allowed_scope, valid_from, valid_until, source_ref, active)
       values($1::uuid,'mohen_gate_signer_m5_machine',$2,$3,$4,$5,$6,$7::jsonb,now(),now()+($8||' days')::interval,$9,true)
       returning binding_id::text`,
      [MACHINE_REVIEWER, gateCode, PURPOSE.namespace, PURPOSE.code, PURPOSE.version, CONSUMER,
        JSON.stringify(scope), String(args.days), sourceRef]);
    bindingId = binding.rows[0].binding_id;
    bindingCreated = true;
  }

  const existing = await admin.query(
    `select credential_id::text from control.gate_service_credentials
      where capability='consume' and db_identity=$1 and job_id=$2 and gate_code=$3
        and reviewer_binding_id=$4::uuid and revoked_at is null and valid_until>now()`,
    [readerIdentity, jobId, gateCode, bindingId]);
  let credentialId = existing.rows[0]?.credential_id;
  let token;
  let credentialCreated = false;
  if (credentialId) {
    if (!fs.existsSync(tokenFile)) throw Error('ACTIVE_CREDENTIAL_WITHOUT_LOCAL_TOKEN_REUSE_IMPOSSIBLE');
    token = fs.readFileSync(tokenFile, 'utf8').trim();
  } else {
    token = `${gateCode.toLowerCase()}-consumer-` + crypto.randomBytes(32).toString('base64url');
    const inserted = await admin.query(
      `insert into control.gate_service_credentials(
         token_hash, capability, principal_user_id, db_identity, reviewer_binding_id, job_id, reviewer_binding_ref,
         gate_code, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
         valid_from, valid_until, source_ref)
       values($1,'consume',$2::uuid,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,now(),now()+($13||' days')::interval,$14)
       returning credential_id::text`,
      [sha256(token), MACHINE_REVIEWER, readerIdentity, bindingId, jobId, reviewerBindingRef,
        gateCode, PURPOSE.namespace, PURPOSE.code, PURPOSE.version, CONSUMER, JSON.stringify(scope),
        String(args.days), sourceRef]);
    credentialId = inserted.rows[0].credential_id;
    credentialCreated = true;
  }

  fs.writeFileSync(tokenFile, token + '\n', { mode: 0o600 });
  fs.writeFileSync(credIdFile, credentialId + '\n', { mode: 0o600 });

  const post = await admin.query(
    `select (select count(*) from control.gate_reviewer_bindings where binding_id=$1::uuid and active) as bindings,
            (select count(*) from control.gate_service_credentials
              where credential_id=$2::uuid and revoked_at is null and valid_until>now()) as credentials`,
    [bindingId, credentialId]);
  if (Number(post.rows[0].bindings) !== 1 || Number(post.rows[0].credentials) !== 1)
    throw Error('POSTCONDITION_FAILED');

  console.log('PROVISION_RESULT=' + JSON.stringify({
    job_id: jobId, stage: job.stage, gate_code: gateCode, reviewer_binding_ref: reviewerBindingRef,
    binding_id: bindingId, binding_created: bindingCreated,
    credential_id: credentialId, credential_created: credentialCreated,
    db_identity: readerIdentity, allowed_scope: scope, days: args.days,
    token_written: path.relative(REPO, tokenFile),
  }));
} catch (error) {
  console.error('PROVISION_FAIL=' + error.message);
  process.exitCode = 1;
} finally {
  await admin.end();
}
