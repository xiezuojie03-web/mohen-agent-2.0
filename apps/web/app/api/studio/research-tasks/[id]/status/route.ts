import { NextResponse } from "next/server";
import { getTaskStatus } from "../../../../../../lib/studio-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-039 GET /api/studio/research-tasks/:id/status —— 研究任务状态（对齐 FA-016-01 五节点进展）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, task });
}
