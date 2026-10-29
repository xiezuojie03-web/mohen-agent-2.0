import { NextResponse } from "next/server";
import { getTaskEvents } from "../../../../../../lib/studio-research";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-036 GET /api/studio/research-tasks/:id/events —— 研究事件（对齐 FA-016-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.research_tasks");
  if (denied) return denied;
  const { id } = await params;
  const events = await getTaskEvents(id);
  return NextResponse.json({ ok: true, events });
}
