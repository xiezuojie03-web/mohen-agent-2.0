// Server-side check that a resumed D03 input is gated by a CURRENT independent
// G2 PASS for the exact material evidence it quotes. Used only inside the
// independent authority that owns the resume signing key; never in the Producer
// or web. G2 is the independent observation gate for D02 (L2 material evidence).
//
// The D03 typed input deliberately carries only `evidenceId` (plus the derived
// claim) — unlike D02 it does not embed an observation/revision snapshot. The
// authority therefore binds the exact current independent G2 by reading it from
// its own low-privilege reader: the receipt's object_id must be THIS evidence,
// and its gate audit/revision are folded into the deterministic input rebuild
// inside d03-resume-input.mjs. No Producer-supplied digest is ever trusted.
import {isTypedD03WorldClaimRequest} from './adapter-binding.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{64}$/;

/**
 * @param readG2 async ({run_id}) => receipt|null
 *   Low-privilege reader over control.qualification_current joined to the
 *   current independent G2 audit of THIS run, returning
 *   {evidence_id,gate_audit_id,artifact_revision,job_id,reviewer_binding_ref,
 *    consumer,stage,gate_code,result,decision_origin,current_valid,valid_until}.
 * @param d02JobId the registry D02 job_id whose G2 receipt must match.
 * @param gateReviewerBinding expected D02 reviewer_binding_ref (from registry).
 */
export function createG2ResumeQualificationChecker({readG2,d02JobId,gateReviewerBinding}={}){
 if(typeof readG2!=='function'||typeof d02JobId!=='string'||!d02JobId||
    typeof gateReviewerBinding!=='string'||!gateReviewerBinding)throw Error('G2_RESUME_CHECKER_CONFIG_INVALID');
 return async ({run_id,input,stage})=>{
  if(stage!=='D03'||!UUID.test(run_id??'')||!isTypedD03WorldClaimRequest(input))return false;
  let receipt;
  try{receipt=await readG2({run_id});}catch{return false;}
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return false;
  // Every binding that makes this a current, independent, producer-consumable
  // G2 for THIS run and THIS material evidence. The exact evidence object is
  // the binding anchor; gate audit + revision are independently reconstructed
  // by the input builder and checked against this receipt there.
  if(receipt.qualification_current!==true||receipt.decision_origin!=='independent_gate'||
     receipt.result!=='PASS'||receipt.stage!=='D02'||receipt.gate_code!=='G2'||
     receipt.job_id!==d02JobId||receipt.reviewer_binding_ref!==gateReviewerBinding||
     receipt.consumer!=='producer'||receipt.evidence_id!==input.evidenceId||
     !UUID.test(receipt.gate_audit_id??'')||!UUID.test(receipt.evidence_id??'')||
     !SHA.test(receipt.artifact_revision??'')||
     !Number.isFinite(Date.parse(receipt.valid_until))||Date.parse(receipt.valid_until)<=Date.now())
    return false;
  return true;
 };
}
