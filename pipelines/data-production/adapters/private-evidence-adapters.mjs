// MAB M2: candidate-only adapter for the ONE six-stage production Runner.
// No database, Storage, Reviewer, or model client is created at module import.
// Runtime must inject the Owner-scoped worker and session after trusted
// execution authorization. Registry is still disabled until independent gates.
import {PRIVATE_EVIDENCE_ADAPTER_PATH, assertNoUnboundPrivateEvidenceInput, hasReviewedPrivateStageBinding} from '../orchestrator/adapter-binding.mjs';
import {executionDigest} from '../orchestrator/execution-authority.mjs';

const SCHEMA='mohen.private-evidence-stage-request.v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const ACTIONS=Object.freeze({
  D01:'draftTextReading',
  D02:'linkReading',
  D03:'linkClaim',
  D04:'recordHumanisticFinding',
  D05:'projectWorld',
});
// Per-action candidate reference contract. Null entries are the legacy text
// bridge paths, which still emit only their link candidate without persisted
// cross-layer refs.
const CANDIDATE_REF_SPECS=Object.freeze({
  draftTextReading:{object_type:'read_unit',object_id:'read_unit_id',extras:['read_run_id']},
  readScannedPage:{object_type:'read_unit',object_id:'read_unit_id',extras:['read_run_id']},
  observeMaterial:{object_type:'material_evidence',object_id:'evidence_id',
    extras:['reading_unit_id','link_id','read_unit_id','read_run_id']},
  assertWorldClaim:{object_type:'claim_revision',object_id:'claim_revision_id',
    extras:['change_id','claim_evidence_link_id','evidence_id']},
  recordHumanisticFinding:{object_type:'finding',object_id:'finding_id',extras:['claim_revision_id']},
  projectWorld:{object_type:'world_projection',object_id:'projection_id',extras:['finding_id']},
  linkReading:null,
  linkClaim:null,
});

function hold(reason, next) {
  return {disposition:'HOLD',hold:{
    reason_code:reason,
    missing_requirement:next,
    next_action:next,
    recheck_condition:'Trusted stage worker and Owner session are available under current independent authorization',
  }};
}

async function loadRuntime(context) {
  if(context.registry&&(!context.privateEvidenceWorker||!context.privateEvidenceOwnerSessionToken)&&
    typeof context.loadPrivateEvidenceRuntime==='function') {
    return await context.loadPrivateEvidenceRuntime()??{};
  }
  return context;
}

// D00 source intake: verify the immutable private original against its exact L0
// registration (source/version/raw item/rights), then hand D01 a typed private
// stage request. The output is the only stage-to-stage carrier of private refs.
function privateSourceIntakeAdapter() {
  return async ({run,job,input,context={}})=>{
    if(job?.stage!=='D00'||typeof input?.research_intent!=='string'||
       !input.research_intent.trim()||typeof input?.scope?.original_id!=='string'||
       !UUID.test(input.scope.original_id)) {
      return hold('PRIVATE_SOURCE_INTAKE_SCOPE_REQUIRED',
        'Provide research_intent and scope {project_id,original_id,page_number} for the registered private original');
    }
    if(!hasReviewedPrivateStageBinding(job)) {
      throw Error('PRIVATE_STAGE_ADAPTER_NOT_BOUND');
    }
    const runtime=await loadRuntime(context);
    const worker=runtime.privateEvidenceWorker;
    const token=runtime.privateEvidenceOwnerSessionToken;
    if(!context.registry || typeof worker?.verifySourceIntake!=='function' ||
        typeof token!=='string' || !token) {
      return hold('PRIVATE_STAGE_RUNTIME_NOT_BOUND','Bind a trusted Owner-scoped private worker and short-lived session');
    }
    const candidate=await worker.verifySourceIntake({
      run,job,registry:context.registry,context,input,token,
    });
    if(candidate?.qualification!=='UNASSESSED'||candidate?.stage!=='D00'||
       candidate?.gate_code!=='G0') {
      throw Error('PRIVATE_STAGE_CANDIDATE_INVALID');
    }
    if(!UUID.test(candidate.raw_item_id??'')||!UUID.test(candidate.source_version_id??'')||
       !UUID.test(candidate.asset_revision_id??'')||!HASH.test(candidate.artifact_revision??'')||
       !HASH.test(candidate.request_digest??'')||!HASH.test(candidate.sha256??''))
      throw Error('PRIVATE_STAGE_CANDIDATE_NOT_PERSISTED');
    // D00-B: carry the approved C01/C02 plan and exact immutable source identity.
    // The previous unconditional scanned_page request routed text/plain through
    // C02 despite Studio explicitly preselecting C01, making D01 unreachable.
    // Never attach private bytes or a caller-manufactured quote to a Runner output.
    const locator={source_version_id:candidate.source_version_id,raw_item_id:candidate.raw_item_id,
      raw_sha256:candidate.sha256};
    const readingLocator=candidate.content_type==='text/plain'
      ? {text:{kind:'verified_utf8_full/v1',...locator}}
      : ['image/jpeg','image/png','image/webp'].includes(candidate.content_type)
        ? {page:{kind:'scanned_page/v1',page_number:candidate.page_number,...locator,
            page_sha256:candidate.sha256}}
        : null;
    if(!readingLocator)throw Error('PRIVATE_D01_CARRIER_NOT_SUPPORTED');
    const request={schema:SCHEMA,stage:'D01',originalId:candidate.original_id,
      ...(Array.isArray(candidate.method_plan)&&candidate.method_plan.length
        ? {method_plan:candidate.method_plan}:{}),...readingLocator};
    const control_outputs={candidate_refs:[{object_type:'raw_item',object_id:candidate.raw_item_id,
      artifact_revision:candidate.artifact_revision,source_version_id:candidate.source_version_id,
      run_id:run.run_id,stage:'D00',gate_code:'G0',job_id:job.job_id,
      reviewer_binding_ref:job.implementation.gate_reviewer_binding,consumer:'producer',
      input_digest:executionDigest(input),output_digest:executionDigest(candidate),
      request_digest:candidate.request_digest,qualification:'UNASSESSED'}]};
    // PASS here is *producer completion*, NEVER a signed G0 PASS.
    return {disposition:'PASS',output:request,control_outputs,
      gate_evidence:{candidate_kind:candidate.candidate_kind,stage:'D00',gate_code:'G0',
        qualification:'UNASSESSED',rights:candidate.rights,provider:candidate.provider,
        title:candidate.title,source_type:candidate.source_type,carrier_type:candidate.carrier_type,
        sha256:candidate.sha256,byte_size:candidate.byte_size,content_type:candidate.content_type,
        candidate_refs:control_outputs.candidate_refs},
      content_stats:{sources:1},review_records:[]};
  };
}

function privateCandidateAdapter(stage) {
  return async ({run,job,input,context={}})=>{
    // This is a separate check; the Runner must already have validated the
    // signed stage grant and consumed its nonce before loading adapters.
    if(job?.stage!==stage || input?.schema!==SCHEMA || input.stage!==stage) {
      return hold('PRIVATE_STAGE_REQUEST_REQUIRED','Provide a signed stage-specific private evidence request');
    }
    assertNoUnboundPrivateEvidenceInput(input,{job});
    if(!hasReviewedPrivateStageBinding(job)) {
      throw Error('PRIVATE_STAGE_ADAPTER_NOT_BOUND');
    }
    const action=stage==='D01'&&input?.page?.kind==='scanned_page/v1'?'readScannedPage'
      :stage==='D02'&&(input?.observation||input?.reading)?'observeMaterial'
      :stage==='D03'&&input?.claim?'assertWorldClaim'
      :ACTIONS[stage];
    const runtime=await loadRuntime(context);
    const worker=runtime.privateEvidenceWorker;
    const token=runtime.privateEvidenceOwnerSessionToken;
    if(!context.registry || typeof worker?.[action]!=='function' ||
        typeof token!=='string' || !token) {
      return hold('PRIVATE_STAGE_RUNTIME_NOT_BOUND','Bind a trusted Owner-scoped private worker and short-lived session');
    }
    let candidate;
    try{
      candidate=await worker[action]({run,job,registry:context.registry,context,input,token});
    }catch(error){
      const code=String(error?.code??error?.message??'');
      // Only known generation refusals become a recoverable stage HOLD; raw
      // Provider/SQL text (which may contain private bytes) never enters it.
      if(stage!=='D02'||!input.reading||
        !/^(PRIVATE_D02_[A-Z_]+|DISPATCH_[A-Z_]+|TRANSFER_DENIED|HOLD_BUDGET)$/.test(code))throw error;
      const blocked=hold('PRIVATE_D02_GENERATION_NOT_READY',
        'Restore exact current G1, Owner-readable C01 bytes, supported professional classification and same-root authorized Provider delegation/rights/budget; reconcile uncertain receipts before resuming');
      blocked.hold.verification_error=code;
      return blocked;
    }
    if(candidate?.qualification!=='UNASSESSED' || candidate?.stage!==stage ||
       candidate?.gate_code!=='G'+stage.slice(-1)) {
      throw Error('PRIVATE_STAGE_CANDIDATE_INVALID');
    }
    let control_outputs;
    const spec=CANDIDATE_REF_SPECS[action];
    if(spec){
      if(!UUID.test(candidate[spec.object_id]??'')||
         spec.extras.some(field=>!UUID.test(candidate[field]??''))||
         !HASH.test(candidate.artifact_revision??'')||!HASH.test(candidate.request_digest??''))
        throw Error('PRIVATE_STAGE_CANDIDATE_NOT_PERSISTED');
      // The Runner clears qualified outputs on WAITING_GATE/HOLD. Preserve
      // exact persisted references, without private text or credentials, for
      // the independent review service to consume. References grant no access.
      const ref={object_type:spec.object_type,object_id:candidate[spec.object_id],
        artifact_revision:candidate.artifact_revision};
      for(const field of spec.extras)ref[field]=candidate[field];
      ref.run_id=run.run_id;ref.stage=stage;ref.gate_code=candidate.gate_code;ref.job_id=job.job_id;
      ref.reviewer_binding_ref=job.implementation.gate_reviewer_binding;ref.consumer='producer';
      ref.input_digest=executionDigest(input);ref.output_digest=executionDigest(candidate);
      ref.request_digest=candidate.request_digest;ref.qualification='UNASSESSED';
      control_outputs={candidate_refs:[ref]};
    }
    // PASS here is *producer completion*, NEVER a signed G PASS.
    // The unmodified orchestrator must check independent G(n) current status
    // before stage handoff, otherwise it changes PASS to HOLD.
    return {disposition:'PASS',output:candidate,...(control_outputs?{control_outputs}:{}),
      gate_evidence:{candidate_kind:candidate.candidate_kind,
        stage,gate_code:candidate.gate_code,qualification:'UNASSESSED',
        ...(control_outputs?{candidate_refs:control_outputs.candidate_refs}:{})},
      content_stats:{candidates:1},review_records:[]};
  };
}
export const adapters=Object.freeze({
  D00:privateSourceIntakeAdapter(),
  D01:privateCandidateAdapter('D01'),
  D02:privateCandidateAdapter('D02'),
  D03:privateCandidateAdapter('D03'),
  D04:privateCandidateAdapter('D04'),
  D05:privateCandidateAdapter('D05'),
});
