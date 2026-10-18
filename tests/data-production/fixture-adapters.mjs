function pass(stage, output) {
  return {
    disposition: "PASS",
    output,
    gate_evidence: { fixture: true, stage },
    content_stats: { fixture_rows: 1 },
    review_records: [{ id: `${stage}-fixture`, summary: `fixture ${stage}` }],
  };
}
export const adapters = {
  D00: async ({ input }) => pass("D00", [{ source_id: "s1", intent: input.research_intent }]),
  D01: async ({ input }) => pass("D01", [{ reading_unit_id: "r1", sources: input }]),
  D02: async ({ input }) => pass("D02", [{ evidence_id: "e1", readings: input }]),
  D03: async ({ input }) => pass("D03", [{ world_id: "w1", evidence: input }]),
  D04: async ({ input }) => pass("D04", [{ finding_id: "f1", world: input, understanding_delta: "fixture delta" }]),
  D05: async ({ input }) => pass("D05", [{ projection_id: "p1", findings: input }]),
};
