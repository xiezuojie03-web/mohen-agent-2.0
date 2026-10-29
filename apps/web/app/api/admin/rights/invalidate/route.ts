import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../../lib/auth";
import { revokeGate } from "../../../../../lib/gate-revoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/rights/invalidate —— 定向撤权（对齐 FA-059-02，P08 精准失效）
export async function POST(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let object_type: unknown;
  let object_id: unknown;
  let reason: unknown;
  try {
    const body = (await req.json()) as { object_type?: unknown; object_id?: unknown; reason?: unknown };
    object_type = body.object_type;
    object_id = body.object_id;
    reason = body.reason;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof object_type !== "string" || typeof object_id !== "string") {
    return NextResponse.json({ ok: false, reason: "object_type_and_id_required" }, { status: 400 });
  }
  const result = await revokeGate({
    objectType: object_type,
    objectId: object_id,
    reason: typeof reason === "string" ? reason : "",
  });
  return NextResponse.json({ ok: result.ok, reason: result.reason, invalidatedGates: result.invalidatedGates });
}
