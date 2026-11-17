import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planStudioKnowledgeRoute} from '../../apps/web/lib/mohen-agent/knowledge-routing.mjs';

const completeEmpty={layer_coverage:{L0:{private_originals:0},L1:{read_units:0},L2:{verified_links:0}},
 asset_refs:[],blocked_asset_refs:[],original_refs:[]};
const qualified={id:'qualified-l5',epistemic:'FACT_EVIDENCED'};

test('existing independently qualified L5 is reused without external search or D00',()=>{
 const r=planStudioKnowledgeRoute({qualifiedL5:[qualified],projectSnapshot:completeEmpty});
 assert.equal(r.disposition,'REUSE_QUALIFIED');
 assert.equal(r.may_reuse_l5,true);
 assert.equal(r.should_discover_sources,false);
 assert.equal(r.production_started,false);
 assert.equal(r.gate_signed,false);
});
test('unassessed L1/L2 and L3/L4 project assets never become qualified knowledge',()=>{
 const r=planStudioKnowledgeRoute({qualifiedL5:[{id:'lead',epistemic:'RESEARCH_LEAD'}],
  projectSnapshot:{...completeEmpty,layer_coverage:{L1:{read_units:2},L2:{verified_links:1}},
    asset_refs:[{asset_kind:'humanistic_insight',revision_id:'private-rev'}]}});
 assert.equal(r.disposition,'QUALIFICATION_REQUIRED');
 assert.equal(r.coverage.qualified_l5,0);
 assert.equal(r.may_use_project_candidates_as_facts,false);
 assert.equal(r.should_discover_sources,false);
});
test('stored original without current G0 takes admission review, not a fresh search',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:{...completeEmpty,original_refs:[{original_id:'a',rights_status:'DECLARED_UNVERIFIED'}]}});
 assert.equal(r.next_action,'CHECK_L0_SOURCE_RIGHTS_AND_G0');
 assert.equal(r.should_discover_sources,false);
});
test('blocked cross-owner or revoked candidates cannot be treated as missing source',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:{...completeEmpty,blocked_asset_refs:[{blockers:['ACL_DENIED']}]}});
 assert.equal(r.disposition,'HOLD');
 assert.equal(r.next_action,'REVIEW_BLOCKED_REFERENCES');
 assert.equal(r.should_discover_sources,false);
});
test('no current project read or degraded qualified service fails closed',()=>{
 for(const args of [{projectSnapshot:null},{projectSnapshot:completeEmpty,lookupDegraded:true}]){
  const r=planStudioKnowledgeRoute(args);
  assert.equal(r.disposition,'HOLD');
  assert.equal(r.should_discover_sources,false);
 }
});
test('truncated project inventories are not misread as complete absence',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:{...completeEmpty,originals_truncated:true}});
 assert.equal(r.disposition,'HOLD');
 assert.equal(r.next_action,'REVIEW_TRUNCATED_COVERAGE');
});
test('empty project with unverified legal shared L0-L4 remains an unconfirmed gap',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty});
 assert.equal(r.disposition,'SOURCE_GAP_UNCONFIRMED');
 assert.equal(r.should_discover_sources,false);
 assert.equal(r.coverage.shared_l0_l4_coverage,'NOT_VERIFIED');
});
test('only verified full-scope absence may route to D00 source discovery',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,sharedL0L4CoverageComplete:true});
 assert.equal(r.disposition,'SOURCE_GAP_CONFIRMED');
 assert.equal(r.should_discover_sources,true);
});
test('Studio wiring uses existing Owner-scoped project read and does not promote candidate text to fact',()=>{
 const research=readFileSync(new URL('../../apps/web/lib/mohen-agent/research.ts',import.meta.url),'utf8');
 const task=readFileSync(new URL('../../apps/web/lib/studio-research.ts',import.meta.url),'utf8');
 const pre=readFileSync(new URL('../../apps/web/lib/mohen-agent/research-prerequisites.ts',import.meta.url),'utf8');
 assert.match(research,/readStudioResearchProject\(studioContext\.projectId,studioContext\.sessionToken/);
 assert.match(research,/sharedL0L4CoverageComplete:false/);
 assert.match(research,/if \(!studioContext \|\| knowledgeRoute\?\.should_discover_sources\)/);
 assert.match(task,/\{projectId:binding\.projectId,sessionToken:binding\.sessionToken\}/);
 assert.match(task,/knowledgeRoute/);
 assert.doesNotMatch(pre,/missing\.push\('SOURCE_ACQUISITION_UNAVAILABLE'\)/);
});
