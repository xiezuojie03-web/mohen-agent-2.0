// packages/data-access/src/rights-actions.d.mts
// 为 ESM 运行时 rights-actions.mjs（CP2-A 唯一权利动作词典）补类型声明。
// 目的：让 TS 侧（Provider 派发器 / Next route handler）直接复用同一份判定实现，
// 不产生第二套权利逻辑。

export type RightsAction =
  | "access_view"
  | "machine_read"
  | "retain"
  | "download"
  | "quote"
  | "display"
  | "adapt"
  | "redistribute"
  | "external_processing";

export type RightsValue = "allowed" | "denied" | "unknown" | "restricted";

export declare const RIGHTS_ACTIONS: ReadonlyArray<RightsAction>;
export declare const RIGHTS_VALUES: ReadonlyArray<RightsValue>;
export declare const RIGHTS_ACTION_ALIASES: Readonly<Record<string, RightsAction>>;
export declare const G0_REQUIRED_ACTIONS: ReadonlyArray<RightsAction>;
export declare const G0_RETAIN_ACTION: "retain";
export declare const CONSUMER_ACTIONS: Readonly<Record<string, RightsAction>>;

export interface RightsIssue {
  code: string;
  detail: string;
}

export interface NormalizedRights {
  schema: string;
  actions: Record<RightsAction, RightsValue>;
  issues: RightsIssue[];
}

export interface RightsDecision {
  schema: string;
  action: string;
  canonical: RightsAction | null;
  value: RightsValue;
  allowed: boolean;
  reason: string | null;
  issues: RightsIssue[];
}

export interface RightsDecisionSet {
  schema: string;
  ok: boolean;
  decisions: RightsDecision[];
  reasons: string[];
  issues: RightsIssue[];
}

export interface G0RightsDecision extends RightsDecisionSet {
  gate: "G0";
  required: RightsAction[];
}

export type RightsSnapshotInput =
  | Record<string, unknown>
  | string
  | null
  | undefined;

export declare function canonicalRightsAction(action: unknown): RightsAction | null;
export declare function canonicalRightsValue(value: unknown): RightsValue | null;
export declare function normalizeRightsSnapshot(raw: RightsSnapshotInput): NormalizedRights;
export declare function decideRightsAction(raw: RightsSnapshotInput, action: string): RightsDecision;
export declare function decideRightsActions(raw: RightsSnapshotInput, actions: ReadonlyArray<string>): RightsDecisionSet;
export declare function evaluateG0Rights(
  raw: RightsSnapshotInput,
  options?: { retain?: boolean }
): G0RightsDecision;
export declare function assertRightsActionsAllowed(
  raw: RightsSnapshotInput,
  actions: ReadonlyArray<string>,
  label?: string
): RightsDecisionSet;

declare const _default: {
  RIGHTS_ACTIONS: typeof RIGHTS_ACTIONS;
  RIGHTS_VALUES: typeof RIGHTS_VALUES;
  RIGHTS_ACTION_ALIASES: typeof RIGHTS_ACTION_ALIASES;
  G0_REQUIRED_ACTIONS: typeof G0_REQUIRED_ACTIONS;
  G0_RETAIN_ACTION: typeof G0_RETAIN_ACTION;
  CONSUMER_ACTIONS: typeof CONSUMER_ACTIONS;
  canonicalRightsAction: typeof canonicalRightsAction;
  canonicalRightsValue: typeof canonicalRightsValue;
  normalizeRightsSnapshot: typeof normalizeRightsSnapshot;
  decideRightsAction: typeof decideRightsAction;
  decideRightsActions: typeof decideRightsActions;
  evaluateG0Rights: typeof evaluateG0Rights;
  assertRightsActionsAllowed: typeof assertRightsActionsAllowed;
};
export default _default;
