// DS-02: deterministic, DB-free evidence for CLI contract; not a platform Skill invocation test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const cli=path.join(root,'scripts/dev-skills/continuation.mjs');
const jsonfile=path.join(root,'.agents/skills/mohen-dev-continuation/references/task-tool-environment-map.json');
function run(args) { return spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',timeout:30000}); }
test('matrix is versioned and does not grant production execution profile',()=>{
 const x=JSON.parse(fs.readFileSync(jsonfile,'utf8'));
 assert.equal(x.skillVersion,'0.2.1');
 assert.deepEqual(Object.keys(x.localProfiles).sort(),['static','typecheck','unit']);
 assert.equal(x.taskToolEnvironmentVerification.find(t=>t.id==='database').cliProfile,null);
 assert.equal(x.taskToolEnvironmentVerification.find(t=>t.id==='deploy').cliProfile,null);
 assert.equal(x.limits.noShell,true);
});
test('doctor exposes observed environment but never claims host-loaded',()=>{
 const r=run(['doctor','--host','codebuddy','--json']);
 assert.equal(r.status,0,r.stderr);
 const j=JSON.parse(r.stdout);
 assert.equal(j.claimedHost,'codebuddy');
 assert.equal(j.hostSkillLoaded,false);
 assert.equal(j.status,'ENVIRONMENT_OBSERVED_ONLY');
 assert.equal(j.environment.repoPackagePresent,true);
});
test('dry run reports exact allowlisted checks without executing',()=>{
 const r=run(['verify','--profile','static','--dry-run','--json']);
 assert.equal(r.status,0,r.stderr);
 const j=JSON.parse(r.stdout);
 assert.equal(j.status,'NOT_RUN_DRY_RUN');
 assert.deepEqual(j.steps.map(s=>s.id),['mhka-route','dev-skill-layout']);
 assert(j.steps.every(s=>s.status==='NOT_RUN_DRY_RUN'));
});
test('an unapproved profile is rejected without running commands',()=>{
 const r=run(['verify','--profile','production','--json']);
 assert.equal(r.status,64);
 assert.match(r.stderr,/PROFILE_NOT_ALLOWED/);
});
test('real static profile runs the existing source-of-truth guards',()=>{
 const r=run(['verify','--profile','static','--json']);
 assert.equal(r.status,0,r.stderr);
 const j=JSON.parse(r.stdout);
 assert.equal(j.status,'PASS');
 assert(j.steps.every(s=>s.status==='PASS'));
 assert.equal(j.hostSkillLoaded,false);
});
