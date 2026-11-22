// Server-side check that a resumed D02 input is gated by a CURRENT independent
// G1 PASS for the exact read unit it quotes. Used only inside the independent
// authority that owns the resume signing key; never in the Producer or web.
import {isTypedD02ReadingRequest} from './adapter-binding.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{64}$/;

/**
 * @param readG1 async ({run_id}) => receipt|null
 *   Low-privilege reader over control.qualification_current joined to the
 *   current independent G1 audit of THIS run, returning
 *   {read_unit_id,gate_audit_id,artifact_revision,job_id,reviewer_binding_ref,
 *    consumer,stage,gate_code,result,decision_origin,current_valid,valid_until}.
 * @param d01JobId the registry D01 job_id whose G1 receipt must match.
 * @param gateReviewerBinding expected D01 reviewer_binding_ref (from registry).
 */
export function createG1ResumeQualificationChecker({readG1,d01JobId,gateReviewerBinding}={}){
 if(typeof readG1!=='function'||typeof d01JobId!=='string'||!d01JobId||
    typeof gateReviewerBinding!=='string'||!gateReviewerBinding)throw Error('G1_RESUME_CHECKER_CONFIG_INVALID');
 return async ({run_id,input,stage})=>{
  if(stage!=='D02'||!UUID.test(run_id??'')||!isTypedD02ReadingRequest(input))return false;
  let receipt;
  try{receipt=await readG1({run_id});}catch{return false;}
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return false;
  // Every binding that makes this a current, independent, producer-consumable
  // G1 for THIS run and THIS read unit, matching the input's reading reference.
  if(receipt.qualification_current!==true||receipt.decision_origin!=='independent_gate'||
     receipt.result!=='PASS'||receipt.stage!=='D01'||receipt.gate_code!=='G1'||
     receipt.job_id!==d01JobId||receipt.reviewer_binding_ref!==gateReviewerBinding||
     receipt.consumer!=='producer'||receipt.read_unit_id!==input.readUnitId||
     receipt.gate_audit_id!==input.reading.gate_audit_id||
     receipt.artifact_revision!==input.reading.artifact_revision||
     !UUID.test(receipt.gate_audit_id??'')||!UUID.test(receipt.read_unit_id??'')||
     !SHA.test(receipt.artifact_revision??'')||
     !Number.isFinite(Date.parse(receipt.valid_until))||Date.parse(receipt.valid_until)<=Date.now())
    return false;
  return true;
 };
}
