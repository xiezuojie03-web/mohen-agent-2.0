import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../../lib/auth";
import { getLatestRevision } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-010 GET /api/admin/submissions/:id —— 投稿审阅详情（对齐 FA-053-02）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const revision = await getLatestRevision(id);
  return NextResponse.json({ ok: true, revision: revision[0] ?? null });
}
