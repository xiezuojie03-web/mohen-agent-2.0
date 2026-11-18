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
test('complete empty Owner/Project formal coverage confirms only a project-scoped source gap',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  projectFormalCoverageComplete:true,sharedL0L4CoverageComplete:false});
 assert.equal(r.disposition,'PROJECT_SOURCE_GAP_CONFIRMED');
 assert.equal(r.next_action,'DISCOVER_D00_SOURCE_CANDIDATES');
 assert.equal(r.should_discover_sources,true);
 assert.equal(r.coverage.project_formal_l0_l4_coverage,'VERIFIED_COMPLETE');
 assert.equal(r.coverage.shared_l0_l4_coverage,'NOT_VERIFIED');
});

test('project-scoped source gap is not a global/shared source gap',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  projectFormalCoverageComplete:true,sharedL0L4CoverageComplete:false});
 assert.notEqual(r.disposition,'SOURCE_GAP_CONFIRMED');
 assert.equal(r.coverage.shared_l0_l4_coverage,'NOT_VERIFIED');
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


test('current project-qualified G3 knowledge reuses L3 without assuming G5 or redoing D00',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  projectFormalCoverageComplete:true,
  qualifiedFormalL0L4:[{layer:'L3',gate:'G3',objectId:'claim-1',revision:'rev-1'}]});
 assert.equal(r.disposition,'REUSE_FORMAL_QUALIFIED');
 assert.equal(r.may_reuse_formal,true);
 assert.equal(r.may_reuse_l5,false);
 assert.equal(r.should_discover_sources,false);
 assert.equal(r.coverage.project_formal_l0_l4_coverage,'VERIFIED_COMPLETE');
});
test('current G1/G0 only authorizes the earliest necessary downstream review, not production',()=>{
 const l1=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  qualifiedFormalL0L4:[{layer:'L1',gate:'G1',objectId:'read-1',revision:'r1'}]});
 assert.equal(l1.disposition,'QUALIFIED_INPUT_AVAILABLE');
 assert.equal(l1.next_action,'REUSE_CURRENT_L1_CHECK_D02_DEPENDENCIES');
 assert.equal(l1.production_started,false);
 const l0=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  qualifiedFormalL0L4:[{layer:'L0',gate:'G0',objectId:'source-1',revision:'v1'}]});
 assert.equal(l0.next_action,'REUSE_CURRENT_L0_CHECK_READ_RIGHTS_BEFORE_D01');
 assert.equal(l0.should_discover_sources,false);
});
test('inconsistent Gate/layer identity cannot be promoted by a route payload',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  qualifiedFormalL0L4:[{layer:'L3',gate:'G0',objectId:'claim',revision:'revision'}],
  projectFormalCoverageComplete:true});
 assert.equal(r.disposition,'SOURCE_GAP_UNCONFIRMED');
 assert.equal(r.may_reuse_formal,false);
});
test('project-scoped formal Gate index cannot authorize cross-project sharing by inference',()=>{
 const research=readFileSync(new URL('../../apps/web/lib/mohen-agent/research.ts',import.meta.url),'utf8');
 const formal=readFileSync(new URL('../../apps/web/lib/mohen-agent/retrieve-formal.ts',import.meta.url),'utf8');
 const bridge=readFileSync(new URL('../../supabase/migrations/20261118025600_m5_scoped_formal_project_gate_read.sql',import.meta.url),'utf8');
 assert.match(research,/retrieveQualifiedFormalProject\(studioContext\.projectId,effectiveTerms,qualification,studioContext\.sessionToken\)/);
 assert.match(research,/sharedL0L4CoverageComplete:false/);
 assert.match(formal,/project_id:projectId/);
 assert.match(formal,/studio\.search_qualified_project_layers/);
 assert.match(bridge,/control\.qualification_current/);
 assert.match(bridge,/control\.qualification_allows/);
 assert.match(bridge,/current_app_user_id\(\)/);
 assert.match(bridge,/owner_user_id=app_user/);
 assert.match(bridge,/REVOKE ALL ON FUNCTION studio\.search_qualified_project_layers/);
 assert.match(bridge,/FROM PUBLIC/);
 assert.match(bridge,/TO mohen_app_runtime/);
 assert.match(formal,/projectId:string/);
 assert.match(formal,/createAppTransaction\(getNodePgPool\(\)/);
 assert.match(formal,/owner_user_id=\$2::uuid/);
 assert.match(formal,/SET LOCAL mohen_app_runtime/);
 assert.match(formal,/projectQualifiedCoverage:truncated\?"PARTIAL":"COMPLETE"/);

 assert.doesNotMatch(formal,/queryRows\(/);

 assert.doesNotMatch(formal,/SECURITY DEFINER/i);
});
test('an empty verified project formal scan is not a verified shared/global source gap',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,
  projectFormalCoverageComplete:true,qualifiedFormalL0L4:[],
  sharedL0L4CoverageComplete:false});
 assert.equal(r.disposition,'SOURCE_GAP_UNCONFIRMED');
 assert.equal(r.should_discover_sources,false);
});


test('current qualified L5 survives independent formal lookup failure without D00',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,qualifiedL5:[qualified],
  formalLookupDegraded:true});
 assert.equal(r.disposition,'REUSE_QUALIFIED');
 assert.equal(r.may_reuse_l5,true);
 assert.equal(r.should_discover_sources,false);
});
test('current G3 survives unrelated G5 lookup degradation, but missing layers still hold',()=>{
 const r=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,lookupDegraded:true,
  projectFormalCoverageComplete:true,
  qualifiedFormalL0L4:[{layer:'L3',gate:'G3',objectId:'current-relation',revision:'current-rev'}]});
 assert.equal(r.disposition,'REUSE_FORMAL_QUALIFIED');
 assert.equal(r.should_discover_sources,false);
 const missing=planStudioKnowledgeRoute({projectSnapshot:completeEmpty,formalLookupDegraded:true});
 assert.equal(missing.disposition,'HOLD');
 assert.equal(missing.should_discover_sources,false);
});

test('M5 private read bridge must never grant raw formal tables',()=>{
 const bridge=readFileSync(new URL('../../supabase/migrations/20261118025600_m5_scoped_formal_project_gate_read.sql',import.meta.url),'utf8');
 const formal=readFileSync(new URL('../../apps/web/lib/mohen-agent/retrieve-formal.ts',import.meta.url),'utf8');
 assert.match(bridge,/SECURITY DEFINER/);
 assert.match(bridge,/SET search_path TO 'pg_catalog'/);
 assert.match(bridge,/current_setting\('role',true\)/);
 assert.match(bridge,/control\.current_app_user_id\(\)/);
 assert.match(bridge,/owner_user_id=app_user/);
 assert.match(bridge,/control\.qualification_allows/);
 assert.match(bridge,/p_scope->>'project_id'/);
 assert.match(bridge,/p_scope->>'requested_action'/);
 assert.match(bridge,/REVOKE ALL ON FUNCTION/);
 assert.match(bridge,/FROM PUBLIC/);
 assert.match(bridge,/GRANT EXECUTE ON FUNCTION/);
 assert.doesNotMatch(bridge,/GRANT\s+SELECT\s+ON\s+(?:ALL\s+)?TABLES/i);
 assert.match(formal,/createAppTransaction\(getNodePgPool\(\)/);
 assert.match(formal,/studio\.search_qualified_project_layers/);
 assert.doesNotMatch(formal,/from control\.qualification_current/i);
});
