import { NextResponse } from "next/server";
import { readProductionRelationSummary } from "../../../../../../lib/read-model-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/explore/sessions/:id/surfaces —— 查看该模式所需资产资格（对齐 FA-042-02）
export async function GET() {
  const summary = await readProductionRelationSummary();
  return NextResponse.json({
    ok: true,
    available: summary.available,
    surfaces: {
      entities: summary.entities,
      relations: summary.relations,
      timeline: summary.timeline,
      visuals: summary.visuals,
      evidence: summary.evidence,
    },
  });
}
