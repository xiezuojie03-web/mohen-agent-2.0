// Server-side check that a resumed D05 fact-branch input is gated by a CURRENT
// independent G4 PASS for the exact finding it quotes (and that finding's clear
// G4 job/reviewer binding). Used only inside the independent authority that owns
// the resume signing key; never in the Producer or web. G4 is the independent
// humanistic gate for D04 (L4 finding); the G3 binding for the claim is checked
// separately by rebuildD05ResumeInput inside the authority's own reader.
import { isTypedD05FactRequest } from './adapter-binding.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;

/**
 * @param readG4 async ({run_id}) => receipt|null, low-privilege reader over
 *   control.qualification_current joined to the current independent G4 audit of
 *   THIS run, returning {finding_id,gate_audit_id,artifact_revision,job_id,
 *   reviewer_binding_ref,consumer,stage,gate_code,result,decision_origin,
 *   qualification_current,valid_until}.
 * @param d04JobId the registry D04 job_id whose G4 receipt must match.
 * @param gateReviewerBinding expected D04 reviewer_binding_ref (from registry).
 */
export function createG4ResumeQualificationChecker({ readG4, d04JobId, gateReviewerBinding } = {}) {
  if (typeof readG4 !== 'function' || typeof d04JobId !== 'string' || !d04JobId ||
      typeof gateReviewerBinding !== 'string' || !gateReviewerBinding)
    throw Error('G4_RESUME_CHECKER_CONFIG_INVALID');
  return async ({ run_id, input, stage }) => {
    if (stage !== 'D05' || !UUID.test(run_id ?? '') || !isTypedD05FactRequest(input)) return false;
    let receipt;
    try { receipt = await readG4({ run_id }); } catch { return false; }
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
    if (receipt.qualification_current !== true || receipt.decision_origin !== 'independent_gate' ||
        receipt.result !== 'PASS' || receipt.stage !== 'D04' || receipt.gate_code !== 'G4' ||
        receipt.job_id !== d04JobId || receipt.reviewer_binding_ref !== gateReviewerBinding ||
        receipt.consumer !== 'producer' || receipt.finding_id !== input.findingId ||
        !UUID.test(receipt.gate_audit_id ?? '') || !UUID.test(receipt.finding_id ?? '') ||
        !SHA.test(receipt.artifact_revision ?? '') ||
        !Number.isFinite(Date.parse(receipt.valid_until)) || Date.parse(receipt.valid_until) <= Date.now())
      return false;
    return true;
  };
}
