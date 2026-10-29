import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator, getSessionUser } from "../../../../../../lib/auth";
import { promoteAsset } from "../../../../../../lib/admin-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API POST /api/admin/assets/:id/promote —— 资产晋级（candidate/demo → verified，写 G5 门禁记录）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!isOperator(token)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const operator = getSessionUser(token)?.uid || "operator";
  const result = await promoteAsset(id, operator);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
