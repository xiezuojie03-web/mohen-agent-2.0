import { NextResponse } from "next/server";
import { getEngagement } from "../../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/metrics/engagement —— 观看收藏评论指标（对齐 FA-056-01，真实计数）
export async function GET() {
  const e = await getEngagement();
  return NextResponse.json({ ok: true, engagement: { ...e, available: true } });
}
