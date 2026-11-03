// MAB M2: candidate-only adapter for the ONE six-stage production Runner.
// No database, Storage, Reviewer, or model client is created at module import.
// Runtime must inject the Owner-scoped worker and session after trusted
// execution authorization. Registry is still disabled until independent gates.
import {PRIVATE_EVIDENCE_ADAPTER_PATH, assertNoUnboundPrivateEvidenceInput} from '../orchestrator/adapter-binding.mjs';

const SCHEMA='mohen.private-evidence-stage-request.v1';
const ACTIONS=Object.freeze({
  D01:'draftTextReading',
  D02:'linkReading',
  D03:'linkClaim',
});

function hold(reason, next) {
  return {disposition:'HOLD',hold:{
    reason_code:reason,
    missing_requirement:next,
    next_action:next,
    recheck_condition:'Trusted stage worker and Owner session are available under current independent authorization',
  }};
}

function privateCandidateAdapter(stage) {
  return async ({run,job,input,context={}})=>{
    // This is a separate check; the Runner must already have validated the
    // signed stage grant and consumed its nonce before loading adapters.
    if(job?.stage!==stage || input?.schema!==SCHEMA || input.stage!==stage) {
      return hold('PRIVATE_STAGE_REQUEST_REQUIRED','Provide a signed stage-specific private evidence request');
    }
    assertNoUnboundPrivateEvidenceInput(input,{job});
    if(job.implementation?.adapter_binding!==PRIVATE_EVIDENCE_ADAPTER_PATH) {
      throw Error('PRIVATE_STAGE_ADAPTER_NOT_BOUND');
    }
    let runtime=context;
    if(context.registry&&(!context.privateEvidenceWorker||!context.privateEvidenceOwnerSessionToken)&&
      typeof context.loadPrivateEvidenceRuntime==='function') {
      runtime=await context.loadPrivateEvidenceRuntime()??{};
    }
    const worker=runtime.privateEvidenceWorker;
    const token=runtime.privateEvidenceOwnerSessionToken;
    if(!context.registry || typeof worker?.[ACTIONS[stage]]!=='function' ||
        typeof token!=='string' || !token) {
      return hold('PRIVATE_STAGE_RUNTIME_NOT_BOUND','Bind a trusted Owner-scoped private worker and short-lived session');
    }
    const candidate=await worker[ACTIONS[stage]]({
      run,job,registry:context.registry,context,input,token,
    });
    if(candidate?.qualification!=='UNASSESSED' || candidate?.stage!==stage ||
       candidate?.gate_code!=='G'+stage.slice(-1)) {
      throw Error('PRIVATE_STAGE_CANDIDATE_INVALID');
    }
    // PASS here is *producer completion*, NEVER a signed G PASS.
    // The unmodified orchestrator must check independent G(n) current status
    // before stage handoff, otherwise it changes PASS to HOLD.
    return {disposition:'PASS',output:candidate,
      gate_evidence:{candidate_kind:candidate.candidate_kind,
        stage,gate_code:candidate.gate_code,qualification:'UNASSESSED'},
      content_stats:{candidates:1},review_records:[]};
  };
}
function inactiveStage(stage) {
  return async()=>hold('PRIVATE_ADAPTER_STAGE_NOT_IMPLEMENTED',
    'Use an independently qualified, Registry-bound source/meaning adapter for '+stage);
}
export const adapters=Object.freeze({
  D00:inactiveStage('D00'),
  D01:privateCandidateAdapter('D01'),
  D02:privateCandidateAdapter('D02'),
  D03:privateCandidateAdapter('D03'),
  D04:inactiveStage('D04'),
  D05:inactiveStage('D05'),
});
