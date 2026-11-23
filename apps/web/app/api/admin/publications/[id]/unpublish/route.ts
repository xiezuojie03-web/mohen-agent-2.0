import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator, getSessionUser } from "../../../../../../lib/auth";
import { unpublishWork } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-051 POST /api/admin/publications/:id/unpublish —— 下架（对齐 FA-055-03）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const operator = await getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value);
  const done = await unpublishWork(id, operator?.uid);
  return NextResponse.json({ ok: done });
}
