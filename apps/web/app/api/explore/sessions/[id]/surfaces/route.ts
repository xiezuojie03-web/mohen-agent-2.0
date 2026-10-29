import { NextResponse } from "next/server";
import { readProductionRelationSummary } from "../../../../../../lib/read-model-bridge";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/explore/sessions/:id/surfaces —— 查看该模式所需资产资格（对齐 FA-042-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.explore_sessions");
  if (denied) return denied;
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
