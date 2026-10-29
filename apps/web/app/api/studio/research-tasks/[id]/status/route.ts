import { NextResponse } from "next/server";
import { getTaskStatus } from "../../../../../../lib/studio-research";
import { canAccess } from "../../../../../../lib/ownership";
import { getSession, isOperatorSession } from "../../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-039 GET /api/studio/research-tasks/:id/status —— 研究任务状态（对齐 FA-016-01 五节点进展）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, task });
}
