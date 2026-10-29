import { NextResponse } from "next/server";
import { getTaskStageEvents } from "../../../../../../../lib/studio-research";
import { guardRoute } from "../../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-038 GET /api/studio/research-tasks/:id/stages/:stage —— 某节点中间结果（对齐 FA-016-02）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  const denied = await guardRoute(params, "public.research_tasks");
  if (denied) return denied;
  const { id, stage } = await params;
  const events = await getTaskStageEvents(id, stage);
  return NextResponse.json({ ok: true, stage, events });
}
