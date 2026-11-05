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
