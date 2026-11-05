import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeExperience} from '../../scripts/dev-skills/experience.mjs';
const receipt=(id='r1',changes={})=>({id,task:'M5-ST02',signature:'typescript-material-contract',host:'codex',
 baseline_sha:'5efd0085edc979f99dec51df159a68f88fa8eee4',result_sha:'5efd0085edc979f99dec51df159a68f88fa8eee4',
 outcome:'PASS',reuse_target:'existing_method',checks:['typecheck','unit'],
 evidence_refs:['tasks/implementation/MAB/progress.md'],redacted:true,
 context:'CTX-ENG',production:false,paid:false,restricted_data:false,...changes});
test('one verified experience can propose an inert upgrade without a frequency gate',()=>{
 const result=analyzeExperience([receipt()]);assert.equal(result.candidates.length,1);
 assert.equal(result.candidates[0].route,'UPGRADE_EXISTING');assert.equal(result.candidates[0].state,'DRAFT_PENDING_EVALUATION');
 assert.equal(result.candidates[0].auto_activate,false);assert.deepEqual(result.candidates[0].source_receipts,['r1']);
});
test('repeated failures remain lessons even with optimistic reuse metadata',()=>{
 const result=analyzeExperience([receipt('r1',{outcome:'FAIL'}),receipt('r2',{outcome:'FAIL'})]);
 assert.equal(result.candidates[0].route,'LESSON_ONLY');assert.equal(result.candidates[0].success_count,0);
});
test('same receipt cannot inflate repeat or success counts',()=>{
 const result=analyzeExperience([receipt(),receipt()]);assert.equal(result.receipt_count,1);
 assert.equal(result.candidates[0].sample_count,1);
 assert.throws(()=>analyzeExperience([receipt(),receipt('r1',{outcome:'FAIL'})]),/CONFLICT/);
});
test('all four routes are suggestions, with unverified or mixed signals held as lessons',()=>{
 for(const [target,route] of [['existing_method','UPGRADE_EXISTING'],['shared_tool','SHARED_SCRIPT'],['independent_method','NEW_SKILL_CANDIDATE']]){
  const c=analyzeExperience([receipt('r1',{reuse_target:target})]).candidates[0];assert.equal(c.route,route);assert.equal(c.auto_activate,false);
 }
 assert.equal(analyzeExperience([receipt('r1',{outcome:'DEFERRED_ENV'})]).candidates[0].route,'LESSON_ONLY');
 assert.equal(analyzeExperience([receipt(),receipt('r2',{reuse_target:'shared_tool'})]).candidates[0].route,'LESSON_ONLY');
});
test('rejects raw logs, credentials, unsafe rights and arbitrary check execution',()=>{
 for(const change of [{raw_log:'private'}, {token:'secret'}, {production:true},{paid:true},{restricted_data:true},
  {redacted:false},{checks:['rm -rf /']},{evidence_refs:['/etc/passwd']},{result_sha:'unknown'}])
  assert.throws(()=>analyzeExperience([receipt('r1',change)]),/INVALID/);
});
test('stable output preserves actual host and exact SHA, not inferred host telemetry',()=>{
 const x=analyzeExperience([receipt('b'),receipt('a')]);
 assert.deepEqual(x,analyzeExperience([receipt('a'),receipt('b')]));
 assert.equal(x.host_telemetry_available,false);assert.equal(x.candidates[0].permission,'NO_EXECUTION_AUTHORITY');
});

test('work triage keeps independent READY tasks after data and repeated-failure blockers',async()=>{
 const {triageWork}=await import('../../scripts/dev-skills/experience.mjs');
 const task=(id,changes={})=>({id,depends_on:[],completed:false,classification:'READY',signature:id,evidence_revision:'a'.repeat(40),attempts:[],...changes});
 const result=triageWork([
  task('ST02',{classification:'DATA_BLOCKED'}),task('ST03',{depends_on:['ST02']}),
  task('admin'),task('consumer',{attempts:[{outcome:'FAIL',evidence_revision:'a'.repeat(40)},{outcome:'FAIL',evidence_revision:'a'.repeat(40)}]}),
  task('dev-skill'),task('done',{completed:true}),
 ]);
 assert.deepEqual(result.ready,['admin','dev-skill']);
 assert.equal(result.tasks.find(t=>t.id==='ST03').effective_classification,'DATA_BLOCKED');
 assert.equal(result.tasks.find(t=>t.id==='consumer').execution,'STOP_REPEATED_FAILURE');
 assert.equal(result.complete,false);assert.equal(result.auto_execute,false);
});
test('work triage retries only with new evidence and orders dependencies without inventing authorization',async()=>{
 const {triageWork}=await import('../../scripts/dev-skills/experience.mjs');
 const task=(id,changes={})=>({id,depends_on:[],completed:false,classification:'READY',signature:id,evidence_revision:'b'.repeat(40),attempts:[],...changes});
 const r=triageWork([task('second',{depends_on:['first']}),task('first',{attempts:[{outcome:'FAIL',evidence_revision:'a'.repeat(40)},{outcome:'FAIL',evidence_revision:'a'.repeat(40)}]}),task('publish',{classification:'GATE_BLOCKED'}),task('production',{classification:'OWNER_BLOCKED'})]);
 assert.deepEqual(r.ready,['first','second']);
 assert.equal(r.tasks.find(t=>t.id==='publish').effective_classification,'GATE_BLOCKED');
 assert.equal(r.tasks.find(t=>t.id==='production').effective_classification,'OWNER_BLOCKED');
 assert.equal(r.permission,'NO_EXECUTION_AUTHORITY');
});
test('work triage rejects missing dependencies, cycles and raw execution metadata',async()=>{
 const {triageWork}=await import('../../scripts/dev-skills/experience.mjs');
 const t={id:'a',depends_on:[],completed:false,classification:'READY',signature:'x',evidence_revision:'a'.repeat(40),attempts:[]};
 for(const input of [[{...t,depends_on:['missing']}],[{...t,depends_on:['a']}],[t,t],[{...t,command:'secret'}],[{...t,evidence_revision:['a'.repeat(40)]}],[{...t,attempts:[{outcome:'FAIL',evidence_revision:'unknown'}]}]])
  assert.throws(()=>triageWork(input),/WORKLIST_INVALID/);
});
