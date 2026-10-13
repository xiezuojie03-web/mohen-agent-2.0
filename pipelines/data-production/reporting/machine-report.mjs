export function buildMachineReport(run) {
  return {
    report_type: "machine_execution",
    run_id: run.run_id,
    execution_mode: run.execution_mode,
    status: run.status,
    started_at: run.started_at,
    finished_at: run.finished_at,
    stages: run.stage_results.map(r => ({
      stage: r.stage,
      data_layer: r.data_layer,
      gate: r.gate,
      disposition: r.disposition,
      gate_evidence: r.gate_evidence,
      hold: r.hold || null,
      reject: r.reject || null,
    })),
  };
}
