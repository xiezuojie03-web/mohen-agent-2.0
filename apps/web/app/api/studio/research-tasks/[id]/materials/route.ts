import { NextResponse } from "next/server";
import { getTaskStatus } from "../../../../../../lib/studio-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/research-tasks/:id/materials —— 研究筛选素材（对齐 FA-019-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskStatus(id);
  if (!task) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  let cp: Record<string, unknown> = {};
  try { cp = JSON.parse(String(task.checkpoint ?? "{}")); } catch { cp = {}; }
  return NextResponse.json({
    ok: true,
    materials: (cp.decision as { materials?: unknown } | undefined)?.materials ?? [],
    researchLeads: cp.researchLeads ?? [],
  });
}
