// Type surface of tools/rule-gate-reviewer.mjs for web-side TS consumers only.
// The single implementation stays in the .mjs module; the deployment-internal
// gate-review entry calls runGateReview, the CLI keeps its own argv entry.
export interface GateReviewOutcome {
  status: "PASS" | "FAIL" | "DRY_RUN_PASS";
  gate: string;
  candidateId: string | null;
  auditId?: string;
  checks?: Record<string, unknown>;
  failed?: string[];
}
export declare function runGateReview(input: {
  gate: string;
  projectId?: string;
  candidateId?: string | null;
  attestStageBinding?: boolean;
  dryRun?: boolean;
}): Promise<GateReviewOutcome>;
