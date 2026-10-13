export const STAGE_ORDER = ["D01","D02","D03","D04","D05"];

export const STAGE_CONTRACTS = Object.freeze({
  D01: { layer:"L0", gate:"G0", input:"research_intent", output:"qualified_source" },
  D02: { layer:"L1", gate:"G1", input:"qualified_source", output:"qualified_evidence_unit" },
  D03: { layer:"L2", gate:"G2", input:"qualified_evidence_unit", output:"adjudicated_world_object" },
  D04: { layer:"L3", gate:"G3", input:"adjudicated_world_object", output:"qualified_humanistic_finding" },
  D05: { layer:"L4", gate:"G4", input:"qualified_humanistic_finding", output:"runtime_eligible_read_model" },
});

export function assertStageAlignment(job) {
  const c = STAGE_CONTRACTS[job.stage];
  if (!c) throw new Error(`UNKNOWN_STAGE:${job.stage}`);
  if (job.data_layer !== c.layer) throw new Error(`LAYER_MISMATCH:${job.job_id}`);
  if (job.exit_gate !== c.gate) throw new Error(`GATE_MISMATCH:${job.job_id}`);
  if (!Array.isArray(job.write_scope) || job.write_scope.length !== 1 || job.write_scope[0] !== c.layer) {
    throw new Error(`WRITE_SCOPE_MISMATCH:${job.job_id}`);
  }
  return true;
}

export function normalizeDisposition(v) {
  const x = String(v || "").toUpperCase();
  if (!["PASS","HOLD","REJECT"].includes(x)) throw new Error(`INVALID_DISPOSITION:${v}`);
  return x;
}

export function assertHandoff(stage, result) {
  const c = STAGE_CONTRACTS[stage];
  if (!result || typeof result !== "object") throw new Error(`RESULT_REQUIRED:${stage}`);
  const disposition = normalizeDisposition(result.disposition);
  if (!result.run_id) throw new Error(`RUN_ID_REQUIRED:${stage}`);
  if (!result.gate || result.gate !== c.gate) throw new Error(`RESULT_GATE_MISMATCH:${stage}`);
  if (disposition === "PASS" && !(c.output in result.outputs)) {
    throw new Error(`PASS_OUTPUT_REQUIRED:${stage}:${c.output}`);
  }
  if (disposition === "HOLD" && !result.hold?.missing_requirement) {
    throw new Error(`HOLD_REQUIREMENT_REQUIRED:${stage}`);
  }
  if (disposition === "REJECT" && !result.reject?.reason_code) {
    throw new Error(`REJECT_REASON_REQUIRED:${stage}`);
  }
  return true;
}
