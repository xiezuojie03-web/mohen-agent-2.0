// Server-side check that a resumed D01 input is gated by a CURRENT independent
// G0 PASS for the exact upstream D00 output. Used only inside the independent
// authority that owns the D01 signing key; never in the Producer or web process.
import { STAGE_CONTRACTS } from './contracts.mjs';

const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/**
 * @param readG0 async ({run_id,input_digest,output_digest}) => receipt|null
 *   Low-privilege reader that calls control.read_gate_stage_qualification for
 *   stage D00 / gate G0, returning the raw receipt (or null when denied).
 * @param d00JobId the registry D00 job_id whose G0 receipt must match.
 * @param gateReviewerBinding expected reviewer_binding_ref (from registry D00 job).
 */
export function createG0ResumeQualificationChecker({readG0,d00JobId,gateReviewerBinding}={}){
 if(typeof readG0!=='function'||typeof d00JobId!=='string'||!d00JobId||
    typeof gateReviewerBinding!=='string'||!gateReviewerBinding)throw Error('G0_RESUME_CHECKER_CONFIG_INVALID');
 return async ({run_id,d01_input_digest})=>{
  if(!UUID.test(run_id??'')||!SHA.test(d01_input_digest??''))return false;
  let receipt;
  try{receipt=await readG0({run_id});}catch{return false;}
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return false;
  // Validate every binding that makes this receipt a current, independent,
  // producer-consumable G0 for THIS run whose OUTPUT is the D01 input.
  if(receipt.qualification_current!==true||receipt.decision_origin!=='independent_gate'||
     receipt.result!=='PASS'||receipt.run_id!==run_id||receipt.stage!=='D00'||
     receipt.gate_code!==STAGE_CONTRACTS.D00.gate||receipt.job_id!==d00JobId||
     receipt.reviewer_binding_ref!==gateReviewerBinding||receipt.consumer!=='producer'||
     !SHA.test(receipt.input_digest??'')||
     !SHA.test(receipt.output_digest??'')||receipt.output_digest!==d01_input_digest||
     typeof receipt.gate_audit_id!=='string'||!UUID.test(receipt.gate_audit_id)||
     typeof receipt.artifact_revision!=='string'||!receipt.artifact_revision||
     typeof receipt.object_id!=='string'||!UUID.test(receipt.object_id)||
     !Number.isFinite(Date.parse(receipt.valid_until))||Date.parse(receipt.valid_until)<=Date.now())
    return false;
  return true;
 };
}
