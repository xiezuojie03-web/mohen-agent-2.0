// Server-side check that a resumed D04 input is gated by a CURRENT independent
// G3 PASS for the exact claim revision it quotes. Used only inside the
// independent authority that owns the resume signing key; never in the Producer
// or web. G3 is the independent world gate for D03 (L3 claim_revision).
//
// The D04 typed input deliberately carries only `claimRevisionId` (plus the
// derived finding) — unlike D02/D03 it does not embed a snapshot of the upstream
// object. The authority therefore binds the exact current independent G3 by
// reading it from its own low-privilege reader: the receipt's object_id must be
// THIS claim_revision, and its gate audit/revision are folded into the
// deterministic input rebuild inside d04-resume-input.mjs. No Producer-supplied
// digest is ever trusted.
import {isTypedD04FindingRequest} from './adapter-binding.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{64}$/;

/**
 * @param readG3 async ({run_id}) => receipt|null
 *   Low-privilege reader over control.qualification_current joined to the
 *   current independent G3 audit of THIS run, returning
 *   {claim_revision_id,gate_audit_id,artifact_revision,job_id,reviewer_binding_ref,
 *    consumer,stage,gate_code,result,decision_origin,qualification_current,valid_until}.
 * @param d03JobId the registry D03 job_id whose G3 receipt must match.
 * @param gateReviewerBinding expected D03 reviewer_binding_ref (from registry).
 */
export function createG3ResumeQualificationChecker({readG3,d03JobId,gateReviewerBinding}={}){
 if(typeof readG3!=='function'||typeof d03JobId!=='string'||!d03JobId||
    typeof gateReviewerBinding!=='string'||!gateReviewerBinding)throw Error('G3_RESUME_CHECKER_CONFIG_INVALID');
 return async ({run_id,input,stage})=>{
  if(stage!=='D04'||!UUID.test(run_id??'')||!isTypedD04FindingRequest(input))return false;
  let receipt;
  try{receipt=await readG3({run_id});}catch{return false;}
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return false;
  // Every binding that makes this a current, independent, producer-consumable
  // G3 for THIS run and THIS claim revision. The exact object is the binding
  // anchor; gate audit + revision are independently reconstructed by the input
  // builder and checked against this receipt there.
  if(receipt.qualification_current!==true||receipt.decision_origin!=='independent_gate'||
     receipt.result!=='PASS'||receipt.stage!=='D03'||receipt.gate_code!=='G3'||
     receipt.job_id!==d03JobId||receipt.reviewer_binding_ref!==gateReviewerBinding||
     receipt.consumer!=='producer'||receipt.claim_revision_id!==input.claimRevisionId||
     !UUID.test(receipt.gate_audit_id??'')||!UUID.test(receipt.claim_revision_id??'')||
     !SHA.test(receipt.artifact_revision??'')||
     !Number.isFinite(Date.parse(receipt.valid_until))||Date.parse(receipt.valid_until)<=Date.now())
    return false;
  return true;
 };
}
