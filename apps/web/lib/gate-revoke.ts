// MAB M3/M5: legacy application-role revocation is DISABLED.
// The independent Gate authority in the current K3 contract is the only
// writer allowed to revoke signed/current professional qualifications.
// Operator is not Reviewer; never UPDATE signed gate_audits/current_valid,
// directly DELETE qualification_current, or fabricate a successful audit here.
//
// This compatibility wrapper intentionally returns HOLD until the exact
// independent Reviewer-bound service is deployed and verified.

export interface RevokeInput {
  objectType: string;
  objectId: string;
  reason?: string;
}

export interface RevokeResult {
  ok: boolean;
  reason?: string;
  invalidatedGates: number;
  invalidationEventId?: string;
}

export async function revokeGate(input: RevokeInput): Promise<RevokeResult> {
  if (!input.objectType || !input.objectId) {
    return {ok:false,reason:"object_required",invalidatedGates:0};
  }
  // A legacy objectType/objectId is not the signed gate_audit_id and must
  // not be guessed; current service requires exact audit ID + idempotent
  // request ID + independent Reviewer identity and recorded reason.
  return {
    ok:false,
    reason:"INDEPENDENT_GATE_REVOCATION_REQUIRED",
    invalidatedGates:0,
  };
}
