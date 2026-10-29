import { NextResponse } from "next/server";
import { readProductionRelationSummary } from "../../../../../lib/read-model-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/explore/spatial/compare —— 比较多时段地理关系（对齐 FA-045-02；诚实返回现有时间投影，无多时段则空）
export async function GET() {
  const summary = await readProductionRelationSummary();
  return NextResponse.json({
    ok: true,
    available: summary.available,
    timeline: summary.timeline,
    coverage: {
      timelineEventCount: summary.timeline?.events.length ?? 0,
      entityCount: summary.entities.length,
      relationCount: summary.relations.length,
    },
  });
}
