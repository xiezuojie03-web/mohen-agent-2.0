export function requireStageAdapter(adapters, stage) {
  const fn = adapters?.[stage];
  if (typeof fn !== "function") throw new Error(`STAGE_ADAPTER_REQUIRED:${stage}`);
  return fn;
}

/**
 * Stage adapter signature:
 * async ({ run, job, input, context }) => ({
 *   disposition: "PASS"|"HOLD"|"REJECT",
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
 */
