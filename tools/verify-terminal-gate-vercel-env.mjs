import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const REPO = process.cwd();
const token = fs.readFileSync(path.join(REPO, '.secrets', 'vercel-token.txt'), 'utf8').trim();
const proj = JSON.parse(fs.readFileSync(path.join(REPO, '.vercel', 'project.json'), 'utf8'));
const H = { Authorization: `Bearer ${token}` };
const bearer = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-bearer.txt'), 'utf8').trim();
const readerUrl = fs.readFileSync(path.join(REPO, '.secrets', 'gate-reader-database-url.txt'), 'utf8').trim();
const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);

const r = await fetch(`https://api.vercel.com/v10/projects/${proj.projectId}/env?teamId=${proj.orgId}&limit=100`, { headers: H, signal: AbortSignal.timeout(20000) });
const envs = (await r.json()).envs || [];
const want = {
  MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL: h(bearer),
  MOHEN_D00_GATE_READER_ENABLED: h('true'),
  MOHEN_D00_GATE_READER_DATABASE_URL: h(readerUrl),
  MOHEN_D00_GATE_APPROVED_RUN_ID: h('bfcdfad6-bbcb-4b68-946a-82e1302eeb80'),
};
const out = [];
for (const [key, expectedPrefix] of Object.entries(want)) {
  const e = envs.filter(x => x.key === key && (x.target || []).includes('preview')).slice(-1)[0];
  // Vercel masks values in list; verify key presence + target only, never claim value equality.
  out.push({ key, present: Boolean(e), target_preview: Boolean(e && (e.target || []).includes('preview')), type: e?.type || null });
}
console.log('VERIFY_VERCEL_ENV=' + JSON.stringify(out));
