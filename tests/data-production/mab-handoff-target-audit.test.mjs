import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseCsv,inspectHandoffTargets} from '../../scripts/audit-mab-handoff-targets.mjs';

test('HP13 target-diff CSV parser handles quoted commas and accurate column count',()=>{
  const csv='path,original_action,m0_target_validation\r\n'+
    '"a,b.ts",REVISE,DESIGN_TARGET_SEMANTICS_NOT_VERIFIED\r\n';
  assert.deepEqual(parseCsv(csv),[{
    path:'a,b.ts',original_action:'REVISE',
    m0_target_validation:'DESIGN_TARGET_SEMANTICS_NOT_VERIFIED',
  }]);
  assert.throws(()=>parseCsv('path,original_action,m0_target_validation\nabc,CREATE'),
    /HANDOFF_CSV_COLUMN_COUNT_MISMATCH/);
});
test('HP13 handoff report refuses to declare READY when a target path exists but semantics are unverified',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-audit-'));
  try{
    fs.mkdirSync(path.join(root,'tasks/implementation/MAB'),{recursive:true});
    fs.mkdirSync(path.join(root,'apps/web'),{recursive:true});
    fs.writeFileSync(path.join(root,'apps/web/example.ts'),'// synthetically present\n');
    const ids=Array.from({length:13},(_,i)=>'| HP'+String(i+1).padStart(2,'0')+' | MAB |');
    const refs=Array.from({length:20},(_,i)=>'### A'+String(i+1).padStart(2,'0')+'｜sample');
    fs.writeFileSync(path.join(root,'tasks/implementation/MAB/PLAN.md'),
      [...ids,...refs].join('\n'));
    fs.writeFileSync(path.join(root,'tasks/implementation/MAB/target-diff.csv'),
      'path,original_action,m0_target_validation,implementation_status\n'+
      'apps/web/example.ts,REVISE,DESIGN_TARGET_SEMANTICS_NOT_VERIFIED,CODE_PRESENT\n');
    const digest=createHash('sha256').update(fs.readFileSync(path.join(root,'apps/web/example.ts'))).digest('hex');
    fs.writeFileSync(path.join(root,'tasks/implementation/MAB/target-diff.csv'),
      'path,original_action,m0_target_validation,implementation_status,target_sha256\n'+
      'apps/web/example.ts,REVISE,DESIGN_TARGET_SEMANTICS_NOT_VERIFIED,CODE_PRESENT,'+digest+'\n');
    const report=inspectHandoffTargets(root);
    assert.equal(report.missing_target_count,0);
    assert.equal(report.hp13_byte_exact_target_count,1);
    assert.equal(report.existing_target_byte_diff_count,0);
    assert.equal(report.unverified_semantics_count,1);
    assert.equal(report.status,'INVALID_BASELINE');
    assert.ok(report.errors.includes('HANDOFF_74_TARGET_BASELINE_MISMATCH'));
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('HP13 target audit rejects traversal paths',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-audit-'));
  try{
    fs.mkdirSync(path.join(root,'tasks/implementation/MAB'),{recursive:true});
    fs.writeFileSync(path.join(root,'tasks/implementation/MAB/PLAN.md'),'');
    fs.writeFileSync(path.join(root,'tasks/implementation/MAB/target-diff.csv'),
      'path,original_action,m0_target_validation\n../../private,REVISE,UNVERIFIED\n');
    assert.throws(()=>inspectHandoffTargets(root),/HANDOFF_UNSAFE_PATH/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
