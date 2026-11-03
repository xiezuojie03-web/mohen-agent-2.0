// HP13: readonly, non-authoritative handoff readiness evidence.
// Never conflates file presence, target sha, or historical CI with semantic PASS.
// Works on any checkout; emits only path / status metadata, no secrets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export function parseCsv(data) {
  const lines=[];let row=[],field='',quoted=false;
  for(let i=0;i<data.length;i++) {
    const c=data[i];
    if(c==='"') {
      if(quoted && data[i+1]==='"') {field+='"';i++;}
      else quoted=!quoted;
    } else if(c===','&&!quoted) {row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted) {
      if(c==='\r'&&data[i+1]==='\n')i++;
      if(row.length||field)lines.push([...row,field]);
      row=[];field='';
    } else field+=c;
  }
  if(quoted)throw Error('HANDOFF_CSV_UNTERMINATED_QUOTE');
  if(row.length||field)lines.push([...row,field]);
  const header=lines.shift()??[];
  if(!header.includes('path')||!header.includes('original_action')||
     !header.includes('m0_target_validation'))throw Error('HANDOFF_CSV_INVALID_HEADER');
  return lines.map(values=>{
    if(values.length!==header.length)throw Error('HANDOFF_CSV_COLUMN_COUNT_MISMATCH');
    return Object.fromEntries(header.map((key,i)=>[key,values[i]]));
  });
}
const countBy=(rows,key)=>rows.reduce((acc,r)=>{
  const v=r[key]||'UNSET';acc[v]=(acc[v]??0)+1;return acc;
},{});
export function inspectHandoffTargets(root) {
  const plan=fs.readFileSync(path.join(root,'tasks/implementation/MAB/PLAN.md'),'utf8');
  const csv=fs.readFileSync(path.join(root,'tasks/implementation/MAB/target-diff.csv'),'utf8');
  const rows=parseCsv(csv);
  const files=rows.map(r=>{
    if(path.isAbsolute(r.path)||r.path.includes('..')||r.path.includes('\\'))
      throw Error('HANDOFF_UNSAFE_PATH');
    const full=path.join(root,r.path);
    const exists=fs.existsSync(full) && fs.statSync(full).isFile();
    const actual_sha256=exists?createHash('sha256').update(fs.readFileSync(full)).digest('hex'):null;
    const target_sha256=r.target_sha256||null;
    const target_byte_match=exists&&target_sha256!==null&&actual_sha256===target_sha256;
    return {
      path:r.path,action:r.original_action,exists,
      actual_sha256,target_sha256,target_byte_match,
      implementation_status:r.implementation_status,
      target_validation:r.m0_target_validation,
      hp13_target_match:r.hp13_target_match||'UNVERIFIED',
      hp13_semantic_scope:r.hp13_semantic_scope||'UNVERIFIED',
      hp13_activation:r.hp13_activation||'UNVERIFIED',
      responsible_batch:r.m0_primary_followup_batch||'UNASSIGNED',
    };
  });
  const hp=[...plan.matchAll(/^\| (HP\d{2}) \|/gm)].map(x=>x[1]);
  const responsibility=[...plan.matchAll(/^### (A\d{2})｜/gm)].map(x=>x[1]);
  const errors=[];
  if(new Set(files.map(f=>f.path)).size!==files.length)errors.push('TARGET_PATH_DUPLICATE');
  if(hp.length!==13||new Set(hp).size!==13)errors.push('HANDOFF_HP_TRACE_INCOMPLETE');
  if(responsibility.length!==20||new Set(responsibility).size!==20)errors.push('HANDOFF_A01_A20_TRACE_INCOMPLETE');
  if(files.length!==74)errors.push('HANDOFF_74_TARGET_BASELINE_MISMATCH');
  const absent=files.filter(x=>!x.exists);
  const exactBytes=files.filter(x=>x.target_byte_match);
  const mismatched=files.filter(x=>x.exists && !x.target_byte_match);
  if(files.some(x=>x.hp13_target_match==='SHA256_BYTES_MATCHED' && !x.target_byte_match))
    errors.push('HANDOFF_DECLARED_SHA256_MISMATCH');
  // M0 is an immutable historical audit. The current HP13 review result
  // must live in its own append-only column, not overwrite M0's old verdict.
  // Frozen byte-identical design text alone is not runtime semantic PASS.
  const unverified=files.filter(x=>![
    'VERIFIED_SEMANTIC_AND_RUNTIME',
    'VERIFIED_EQUIVALENT_AND_RUNTIME',
  ].includes(x.hp13_semantic_scope));
  return {
    schema:'mohen.mab.handoff-target-audit.v1',
    repo_sha:process.env.GITHUB_SHA||null,
    generated_at:new Date().toISOString(),
    status:errors.length?'INVALID_BASELINE':absent.length||unverified.length?'HANDOFF_NOT_READY':'TARGET_PATHS_RECONCILED_NOT_FULL_GATE',
    count:files.length,
    original_action:countBy(files,'action'),
    implementation_status:countBy(files,'implementation_status'),
    target_validation:countBy(files,'target_validation'),
    hp13_current_semantic:countBy(files,'hp13_semantic_scope'),
    hp_work_packages:hp,
    additional_responsibilities:responsibility,
    missing_target_count:absent.length,
    hp13_byte_exact_target_count:exactBytes.length,
    hp13_byte_exact_paths:exactBytes.map(x=>x.path),
    existing_target_byte_diff_count:mismatched.length,
    existing_target_byte_diffs:mismatched.map(x=>({
      path:x.path,actual_sha256:x.actual_sha256,target_sha256:x.target_sha256,
    })),
    missing_targets:absent.map(f=>f.path),
    unverified_semantics_count:unverified.length,
    errors,
    // The 53 existing files must still be checked semantically. A count of
    // zero missing files would not prove Gate/rights/consumer success.
  };
}
const entry=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(entry) {
  const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
  const report=inspectHandoffTargets(root);
  const outIndex=process.argv.indexOf('--out');
  if(outIndex>=0) {
    const target=process.argv[outIndex+1];
    if(!target)throw Error('HANDOFF_OUTPUT_REQUIRED');
    fs.mkdirSync(path.dirname(path.resolve(target)),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length||(process.argv.includes('--strict')&&report.status!=='TARGET_PATHS_RECONCILED_NOT_FULL_GATE'))
    process.exitCode=1;
}
