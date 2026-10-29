import { NextResponse } from "next/server";
import { getEngagement } from "../../../../../lib/fine-capabilities";
import { getSession, isOperatorSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/metrics/engagement —— 观看收藏评论指标（对齐 FA-056-01，真实计数）
export async function GET() {
  const session = await getSession();
  if (!isOperatorSession(session)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const e = await getEngagement();
  return NextResponse.json({ ok: true, engagement: { ...e, available: true } });
}
