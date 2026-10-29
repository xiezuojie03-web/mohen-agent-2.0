import { NextResponse } from "next/server";
import { getEngagement } from "../../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/metrics/:id —— 切换指标范围（对齐 FA-052-02；诚实：返回全局互动计数，无单对象维度时如实说明）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEngagement();
  return NextResponse.json({ ok: true, metric_id: id, engagement: e, granular: false, note: "暂无单对象维度，返回全局计数" });
}
