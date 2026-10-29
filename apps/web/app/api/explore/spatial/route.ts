import { NextRequest, NextResponse } from "next/server";
import { readProductionRelationSummary } from "../../../../lib/read-model-bridge";
import { guardRoute } from "../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-018 GET /api/explore/spatial —— 历史空间投影（对齐 FA-045-01）
// CR-06/CR-07：不预设单一主题，可选 topic 参数；无作品仍可查合格知识，数据稀疏诚实降级。
export async function GET(req: NextRequest) {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
  const topic = (req.nextUrl.searchParams.get("topic") ?? "").trim();
  const summary = await readProductionRelationSummary(topic || undefined);
  return NextResponse.json({
    ok: true,
    available: summary.available,
    // 覆盖描述（CR-07）：实体/关系/时间/证据的真实覆盖量，前端据此诚实呈现稀疏/空态，不捏造几何。
    coverage: {
      entityCount: summary.entities.length,
      relationCount: summary.relations.length,
      storyCount: summary.storyCount,
      timelineEventCount: summary.timeline?.events.length ?? 0,
      visualCount: summary.visuals.length,
      degraded: !summary.available,
    },
    entities: summary.entities,
    timeline: summary.timeline,
    relations: summary.relations,
    visuals: summary.visuals,
  });
}
