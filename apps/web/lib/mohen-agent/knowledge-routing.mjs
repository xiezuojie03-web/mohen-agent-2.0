/**
 * Studio read-only knowledge-routing decision (M5, first bounded integration).
 * Distinguishes genuinely qualified G5 read-model results from private project
 * candidates. It NEVER issues production, signs a Gate, exports private bytes,
 * or infers qualification from an asset being present.
 */
const qualifiedTags=new Set(['FACT_EVIDENCED','SUPPORTED_CANDIDATE','CONFLICTED']);
const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const entries=x=>Array.isArray(x)?x:[];
const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};

export function planStudioKnowledgeRoute({
  qualifiedL5=[], projectSnapshot=null, lookupDegraded=false,
  sharedL0L4CoverageComplete=false,
}={}){
  const snapshot=object(projectSnapshot);
  const coverage=object(snapshot.layer_coverage);
  const l0=object(coverage.L0),l1=object(coverage.L1),l2=object(coverage.L2);
  const refs=entries(snapshot.asset_refs);
  const blocked=entries(snapshot.blocked_asset_refs);
  const originals=entries(snapshot.original_refs);
  const eligibleL5=entries(qualifiedL5).filter(m=>m&&qualifiedTags.has(m.epistemic)&&
    typeof m.id==='string'&&m.id.length>0);
  const readingCount=integer(l1.read_units);
  const evidenceCount=integer(l2.verified_links);
  const hasCandidates=readingCount>0||evidenceCount>0||refs.length>0;
  const incomplete=Boolean(snapshot.assets_truncated||snapshot.originals_truncated||
    snapshot.readings_truncated||snapshot.materials_truncated);
  const summary={
    qualified_l5:eligibleL5.length,project_l0:originals.length,
    project_l1_read_units:readingCount,project_l2_links:evidenceCount,
    project_asset_candidates:refs.length,blocked_asset_candidates:blocked.length,
    shared_l0_l4_coverage:sharedL0L4CoverageComplete?'VERIFIED_COMPLETE':'NOT_VERIFIED',
  };
  let disposition, nextAction, reason;
  if(lookupDegraded||!projectSnapshot) {
    disposition='HOLD'; nextAction='RETRY_AUTHORIZED_READ';
    reason='PROJECT_OR_QUALIFIED_READ_UNAVAILABLE';
  } else if(eligibleL5.length) {
    disposition='REUSE_QUALIFIED';nextAction='REUSE_L5';
    reason='MATCHED_CURRENT_G5_READ_MODEL';
  } else if(incomplete) {
    disposition='HOLD';nextAction='REVIEW_TRUNCATED_COVERAGE';
    reason='PROJECT_ASSET_COVERAGE_TRUNCATED';
  } else if(hasCandidates) {
    disposition='QUALIFICATION_REQUIRED';nextAction='REVIEW_PROJECT_CANDIDATES';
    reason='PROJECT_L1_L4_CANDIDATES_ARE_NOT_INDEPENDENT_GATE_PASS';
  } else if(originals.length) {
    disposition='QUALIFICATION_REQUIRED';nextAction='CHECK_L0_SOURCE_RIGHTS_AND_G0';
    reason='ORIGINAL_STORED_BUT_CURRENT_G0_NOT_ESTABLISHED';
  } else if(blocked.length) {
    disposition='HOLD';nextAction='REVIEW_BLOCKED_REFERENCES';
    reason='CANDIDATES_EXIST_BUT_CANNOT_BE_CONSUMED';
  } else if(sharedL0L4CoverageComplete) {
    disposition='SOURCE_GAP_CONFIRMED';nextAction='DISCOVER_D00_SOURCE_CANDIDATES';
    reason='NO_ELIGIBLE_ASSET_IN_VERIFIED_COMPLETE_SCOPE';
  } else {
    disposition='SOURCE_GAP_UNCONFIRMED';nextAction='COMPLETE_AUTHORIZED_SHARED_ASSET_SEARCH';
    reason='SHARED_L0_L4_HAS_NOT_BEEN_SEARCHED_WITH_CURRENT_QUALIFICATION';
  }
  return {
    schema:'mohen.studio-knowledge-routing.v1',
    disposition,next_action:nextAction,reason,coverage:summary,
    should_discover_sources:disposition==='SOURCE_GAP_CONFIRMED',
    may_reuse_l5:disposition==='REUSE_QUALIFIED',
    may_use_project_candidates_as_facts:false,
    production_started:false,
    gate_signed:false,
    external_processing_allowed:false,
  };
}
