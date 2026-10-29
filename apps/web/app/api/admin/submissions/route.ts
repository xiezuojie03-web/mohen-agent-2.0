import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import { listSubmitted } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-009 GET /api/admin/submissions —— 待审投稿队列（对齐 FA-053-01）
export async function GET(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const works = await listSubmitted();
  return NextResponse.json({ ok: true, submissions: works });
}
