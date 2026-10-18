export function requireStageAdapter(adapters, stage) {
  const fn = adapters?.[stage];
  if (typeof fn !== "function") throw new Error(`STAGE_ADAPTER_REQUIRED:${stage}`);
  return fn;
}

/**
 * Stage adapter signature:
 * async ({ run, job, input, context }) => ({
 *   disposition: "PASS"|"HOLD"|"REJECT"|"REVOKED"|"UNASSESSED",
 *   output,                       // required on PASS
 *   gate_evidence: {...},         // machine evidence for gate enforcement
 *   content_stats: {...},         // owner-facing aggregate, no engineering noise
 *   review_records: [...],        // narrative-relevant real content
 *   hold?: {reason_code, missing_requirement, next_action, recheck_condition},
 *   reject?: {reason_code, detail}
 * })
 *
 * Adapter computes stage work. Executor owns persistence boundary, gate decision,
 * result contract and handoff.
 *
 * INVARIANT (six-gate V3.0): producer_may_self_qualify === false. The adapter is a
 * producer and MUST NOT emit a final qualification on its own authority; it submits
 * candidate output + gate_evidence. Independent gate qualification is written to
 * control.gate_audits as an append-only audit (current_valid/supersedes_id), never
 * by trusting raw.disposition as a self-signed PASS.
 */
