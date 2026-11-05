// DS-01/DS-02 static packaging check; not evidence of host activation or M5 Gate.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const canonical = '.agents/skills/mohen-dev-continuation/SKILL.md';
const adapter = '.codebuddy/skills/mohen-dev-continuation/SKILL.md';
const routes = ['AGENTS.md','OWNERSHIP_MAP.md','tasks/implementation/MAB/PLAN.md'];
const errors = [];
function read(path) {
  try { return fs.readFileSync(path,'utf8'); }
  catch { errors.push('MISSING:' + path); return ''; }
}
function meta(content) {
  const x = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!x) return null;
  const name = x[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = x[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  return { name, description };
}
const skill = read(canonical), wrapper = read(adapter);
for (const [p,body] of [[canonical,skill],[adapter,wrapper]]) {
  const m = meta(body);
  if (!m || m.name !== 'mohen-dev-continuation' || !m.description || m.description.length < 30) errors.push('BAD_SKILL_META:' + p);
  if (!body.includes('canonical v0.1.0')) errors.push('UNPINNED_SKILL_VERSION:' + p);
}
for (const needle of ['CTX-ENG','AGENTS.md','MHKA','BUILD','MAINTAIN','progress.md','VERIFIED_ISOLATED','DEFERRED_ENV','Owner authorization']) {
  if (!skill.includes(needle)) errors.push('CANONICAL_RULE_MISSING:' + needle);
}
if (!wrapper.includes(canonical)) errors.push('ADAPTER_MUST_READ_CANONICAL');
if (wrapper.includes('## Execute one bounded work group')) errors.push('ADAPTER_DUPLICATES_METHOD');
for (const p of routes) {
  const content=read(p);
  if (!content.includes(canonical)) errors.push('UNROUTED_CANONICAL:' + p);
}
if (!read('.gitignore').includes('!.codebuddy/skills/mohen-dev-continuation/SKILL.md')) errors.push('CODEBUDDY_NOT_ALLOWLISTED');
const registry = read('specs/data-production/production-registry.json');
if (registry.includes('mohen-dev-continuation')) errors.push('DEV_SKILL_LEAKED_INTO_PRODUCT_REGISTRY');
const ignored=spawnSync('git',['check-ignore','-q','--no-index',adapter],{encoding:'utf8'});
if (ignored.error) errors.push('GIT_IGNORE_CHECK_UNAVAILABLE:' + ignored.error.message);
else if (ignored.status !== 1) errors.push('CODEBUDDY_ADAPTER_IGNORED_OR_UNVERIFIED:' + ignored.status);
if (errors.length) { for (const e of errors) console.error('DS_SKILL_LAYOUT_ERROR '+e); process.exitCode=1; }
else console.log('DS_DEV_SKILL_LAYOUT_PASS canonical='+canonical+' codebuddy_adapter='+adapter+' v0.1.0; NOT_HOST_ACTIVATED');
