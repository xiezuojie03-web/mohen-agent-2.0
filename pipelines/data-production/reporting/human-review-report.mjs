export function buildHumanReviewReport(run) {
  return {
    report_type: "human_review",
    run_id: run.run_id,
    status: run.status,
    stages: run.stage_results.map(r => ({
      stage: r.stage,
      data_layer: r.data_layer,
      gate: r.gate,
      disposition: r.disposition,
      content_stats: r.content_stats,
      narrative_relevant_records: r.review_records,
      gaps_and_counterexamples: [
        ...(r.hold ? [r.hold] : []),
        ...(r.reject ? [r.reject] : []),
      ],
      owner_decision: null,
    })),
  };
}
