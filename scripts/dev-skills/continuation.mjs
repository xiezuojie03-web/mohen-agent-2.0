#!/usr/bin/env node
// DS-02: bounded CTX-ENG developer Skill doctor and local verification runner.
// NO shell, DB connection, network, production migration, deploy or paid model call.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const mapFile = path.resolve(repo,'.agents/skills/mohen-dev-continuation/references/task-tool-environment-map.json');
const safe = Object.freeze({
  'mhka-route': { bin: 'node', args: ['scripts/guards/check-authority-routing.mjs'], timeout: 15000 },
  'dev-skill-layout': { bin: 'node', args: ['scripts/guards/check-dev-skill-layout.mjs'], timeout: 15000 },
  'typescript-check': { bin: 'pnpm', args: ['-r','typecheck'], timeout: 180000 },
  'unit-suite': { bin: 'pnpm', args: ['test:unit'], timeout: 240000 }
});
const profiles = Object.freeze({
  static: ['mhka-route','dev-skill-layout'],
  typecheck: ['typescript-check'],
  unit: ['unit-suite']
});
const allowedHosts = new Set(['codex','codebuddy','chatgpt','unknown']);
const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function usage() {
  process.stdout.write([
    'mohen-dev-continuation v0.2.1 (CTX-ENG only)',
    'node scripts/dev-skills/continuation.mjs doctor --host codex|codebuddy|chatgpt|unknown --json',
    'node scripts/dev-skills/continuation.mjs verify --profile static|typecheck|unit [--dry-run] [--host ...] --json',
    'No DB, deploy, external paid calls, arbitrary commands or shell invocation.'
  ].join('\n') + '\n');
}
function parse(argv) {
  let cmd = argv.shift() || 'help', host = 'unknown', profile = 'static', json = false, dryRun = false;
  while (argv.length) {
    const tok=argv.shift();
    if (tok==='--host' && argv.length) host=argv.shift();
    else if (tok==='--profile' && argv.length) profile=argv.shift();
    else if (tok==='--json') json=true;
    else if (tok==='--dry-run') dryRun=true;
    else throw new Error('UNSUPPORTED_OPTION:' + tok);
  }
  if (!['help','doctor','verify'].includes(cmd)) throw new Error('UNSUPPORTED_ACTION:' + cmd);
  if (!allowedHosts.has(host)) throw new Error('UNSUPPORTED_HOST_LABEL:' + host);
  if (cmd==='verify' && !Object.hasOwn(profiles,profile)) throw new Error('PROFILE_NOT_ALLOWED:' + profile);
  if (cmd!=='verify' && dryRun) throw new Error('DRY_RUN_ONLY_FOR_VERIFY');
  return {cmd,host,profile,json,dryRun};
}
function execFixed(id) {
  const item=safe[id];
  if (!item) throw new Error('UNSAFE_STEP:' + id);
  const bin = item.bin === 'node' ? process.execPath : pnpmCmd;
  const start=Date.now();
  const r=spawnSync(bin,item.args,{cwd:repo,shell:false,encoding:'utf8',timeout:item.timeout,maxBuffer:2*1024*1024,env:process.env});
  let status = r.error?.code==='ENOENT' ? 'DEFERRED_ENV' : (r.status === 0 ? 'PASS' : 'FAIL');
  if (r.error && r.error.code!=='ENOENT') status='FAIL';
  // Only command metadata and exit state; do not reproduce potentially sensitive test logs.
  return {id,command:[item.bin,...item.args].join(' '),status,exitCode:r.status,signal:r.signal || null,elapsedMs:Date.now()-start,errorCode:r.error?.code || null};
}
function toolVersion(bin,args) {
  const r=spawnSync(bin,args,{cwd:repo,shell:false,encoding:'utf8',timeout:6000});
  return r.status===0 ? (r.stdout || '').trim().slice(0,60) : null;
}
function getHead() {
  const r=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,shell:false,encoding:'utf8',timeout:6000});
  return r.status===0 ? r.stdout.trim() : null;
}
function output(data,json) {
  if (json) process.stdout.write(JSON.stringify(data,null,2) + '\n');
  else process.stdout.write(JSON.stringify(data) + '\n');
}
try {
  const args=parse(process.argv.slice(2));
  if (args.cmd==='help') {usage();process.exit(0);}
  const map=JSON.parse(fs.readFileSync(mapFile,'utf8'));
  if (map.schema!=='mohen-dev-tool-map/v1' || map.skillVersion!=='0.2.1') throw new Error('MATRIX_VERSION_MISMATCH');
  for (const [profile, steps] of Object.entries(profiles)) {
    if (JSON.stringify(map.localProfiles[profile])!==JSON.stringify(steps)) throw new Error('MATRIX_EXECUTION_DRIFT:' + profile);
  }
  const metadata={
    schema:'mohen-dev-verification/v1',
    skill:'mohen-dev-continuation',
    version:map.skillVersion,
    claimedHost:args.host,
    hostSkillLoaded:false,
    checkoutHead:getHead(),
    mode:args.cmd
  };
  if (args.cmd==='doctor') {
    const data={
      ...metadata,
      status:'ENVIRONMENT_OBSERVED_ONLY',
      environment:{
        repoPackagePresent:fs.existsSync(path.join(repo,'package.json')),
        canonicalPresent:fs.existsSync(path.join(repo,'.agents/skills/mohen-dev-continuation/SKILL.md')),
        git:toolVersion('git',['--version']),
        node:process.version,
        pnpm:toolVersion(pnpmCmd,['--version'])
      },
      tasks:map.taskToolEnvironmentVerification.map(x=>({id:x.id,cliProfile:x.cliProfile,authority:x.authority})),
      note:'Host is a caller-supplied label; this CLI cannot prove Codex/CodeBuddy Skill discovery, local access rights or paid/provider authorization.'
    };
    output(data,args.json);
  } else {
    const steps=[];
    const ids=profiles[args.profile];
    for(const id of ids){
      if(args.dryRun) {
        const item=safe[id];
        steps.push({id,command:[item.bin,...item.args].join(' '),status:'NOT_RUN_DRY_RUN'});
        continue;
      }
      const r=execFixed(id);
      steps.push(r);
      if(r.status!=='PASS') break; // fail closed, never continue unrelated checks
    }
    const status=args.dryRun?'NOT_RUN_DRY_RUN':steps.every(x=>x.status==='PASS')?'PASS':steps.some(x=>x.status==='DEFERRED_ENV')?'DEFERRED_ENV':'FAIL';
    output({...metadata,profile:args.profile,dryRun:args.dryRun,steps,status,scope:'LOCAL_CHECK_ONLY_NOT_M5_GATE_OR_HOST_ACTIVATION'},args.json);
    process.exitCode=status==='FAIL'?1:status==='DEFERRED_ENV'?2:0;
  }
}catch(error){
  process.stderr.write('MOHEN_DEV_SKILL_ERROR ' + (error instanceof Error ? error.message : String(error)) + '\n');
  process.exitCode=64;
}
