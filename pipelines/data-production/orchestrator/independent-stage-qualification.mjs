import { executionDigest } from "./execution-authority.mjs";
import { STAGE_CONTRACTS } from "./contracts.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Producer output and a signed execution grant are not an independent G Pass.
 * The verification callback, when configured by the trusted production entry,
 * must read current independent qualification in a separate security context.
 * This validator binds its reply to this exact run, stage and immutable output.
 */
export async function requireIndependentStageQualification({context,run,stage,job,input,result}) {
  const contract=STAGE_CONTRACTS[stage];
  if(!contract||result?.disposition!=='PASS')throw Error('GATE_CANDIDATE_RESULT_REQUIRED');
  if(typeof context?.verifyStageQualification!=='function')throw Error('INDEPENDENT_STAGE_QUALIFICATION_REQUIRED');
  const output=result.outputs?.[contract.output];
  const inputDigest=executionDigest(input),outputDigest=executionDigest(output);
  const receipt=await context.verifyStageQualification({run,job,stage,gate:contract.gate,input,
    output,output_digest:outputDigest,input_digest:inputDigest});
  if(!receipt||receipt.qualification_current!==true||
      receipt.decision_origin!=='independent_gate'||receipt.result!=='PASS'||
      receipt.run_id!==run.run_id||receipt.stage!==stage||
      receipt.gate_code!==contract.gate||receipt.input_digest!==inputDigest||
      receipt.output_digest!==outputDigest||
      typeof receipt.gate_audit_id!=='string'||!UUID.test(receipt.gate_audit_id)||
      typeof receipt.artifact_revision!=='string'||!receipt.artifact_revision||
      typeof receipt.object_type!=='string'||!receipt.object_type||
      typeof receipt.object_id!=='string'||!UUID.test(receipt.object_id)||
      !Number.isFinite(Date.parse(receipt.valid_until))||
      Date.parse(receipt.valid_until)<=Date.now())throw Error('INDEPENDENT_STAGE_QUALIFICATION_INVALID');
  return {gate_audit_id:receipt.gate_audit_id,artifact_revision:receipt.artifact_revision,
    object_type:receipt.object_type,object_id:receipt.object_id,valid_until:receipt.valid_until,
    input_digest:inputDigest,output_digest:outputDigest};
}
