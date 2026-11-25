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

export interface GateDecideInput {
  candidateId: string;
  requestId: string;
  result: string;
  ruleVersion: string;
  validUntil: string;
  receipt: Record<string, unknown>;
  expectedAuditId: string | null;
}
export interface GateReviewRequest {
  gate: string;
  dryRun?: boolean;
  candidateId?: string | null;
  stageRequest?: unknown;
}
export interface RuleGateReviewer {
  review(input: GateReviewRequest): Promise<GateReviewOutcome>;
}
export declare function createRuleGateReviewer(deps: {
  query: (sql: string, params?: Record<string, unknown>) => Promise<unknown[]>;
  decide: (d: GateDecideInput) => Promise<string>;
  projectId?: string;
  consumer?: string;
  attestStageOutput?: unknown;
  log?: (line: string) => void;
}): RuleGateReviewer;
