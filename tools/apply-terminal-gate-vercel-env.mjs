// Write the terminal-state Gate reader variables to Vercel Preview via REST.
// Values come only from local .secrets/ (gitignored); nothing printed.
// Idempotent: removes existing preview values for each key, then creates.
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const token = fs.readFileSync(path.join(REPO, '.secrets', 'vercel-token.txt'), 'utf8').trim();
const proj = JSON.parse(fs.readFileSync(path.join(REPO, '.vercel', 'project.json'), 'utf8'));
const bearer = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-bearer.txt'), 'utf8').trim();
const readerUrl = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-database-url.txt'), 'utf8').trim();
const ca = fs.readFileSync(path.join(REPO, '.secrets', 'supabase-ca', 'prod-ca-2021.crt'), 'utf8').trim();
const RUN = 'bfcdfad6-bbcb-4b68-946a-82e1302eeb80';

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = `https://api.vercel.com`;

// MOHEN_INDEPENDENT_GATE_VERIFY_URL already exists on Preview and is validated
// by runner_ready; it is intentionally NOT touched here (values are masked).
const desired = {
  MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL: bearer,
  MOHEN_D00_GATE_READER_ENABLED: 'true',
  MOHEN_D00_GATE_READER_DATABASE_URL: readerUrl,
  MOHEN_D00_GATE_APPROVED_RUN_ID: RUN,
  MOHEN_D00_AUTHORITY_DATABASE_CA: ca,
};

const listR = await fetch(`${base}/v10/projects/${proj.projectId}/env?teamId=${proj.orgId}&limit=100`, { headers: H, signal: AbortSignal.timeout(20000) });
const existing = (await listR.json()).envs || [];
const results = [];
for (const [key, value] of Object.entries(desired)) {
  const matches = existing.filter(e => e.key === key && (e.target || []).includes('preview'));
  for (const e of matches) {
    await fetch(`${base}/v10/projects/${proj.projectId}/env/${e.id}?teamId=${proj.orgId}`, { method: 'DELETE', headers: H, signal: AbortSignal.timeout(20000) });
  }
  const body = { key, value, type: 'encrypted', target: ['preview'] };
  const r = await fetch(`${base}/v10/projects/${proj.projectId}/env?teamId=${proj.orgId}`, { method: 'POST', headers: H, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  results.push({ key, status: r.status, replaced: matches.length, ok: r.ok });
  if (!r.ok) results[results.length - 1].error = (await r.text()).slice(0, 200);
}
console.log('APPLY_VERCEL_ENV=' + JSON.stringify(results));
