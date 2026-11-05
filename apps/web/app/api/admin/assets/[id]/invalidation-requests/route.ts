import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../../../lib/auth";
import { revokeGate } from "../../../../../../lib/gate-revoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/assets/:id/invalidation-requests —— 申请撤权（对齐 FA-058-02）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403, headers: { "cache-control": "no-store" } });
  }
  const { id } = await params;
  const result = await revokeGate({ objectType: "asset", objectId: id, reason: "asset_invalidation_request" });
  return NextResponse.json({ ok: result.ok, reason: result.reason, invalidatedGates: result.invalidatedGates }, { status: result.ok ? 200 : result.reason === "INDEPENDENT_GATE_REVOCATION_REQUIRED" ? 503 : 400, headers: { "cache-control": "no-store" } });
}
