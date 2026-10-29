import { NextResponse } from "next/server";
import { listResearchTasks } from "../../../../lib/studio-research";
import { guardRoute } from "../../../../lib/guard";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/tasks —— 我的研究任务进度（对齐 FA-009-01；P0-1 按 owner 过滤）
export async function GET() {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  const tasks = await listResearchTasks(session.uid);
  return NextResponse.json({ ok: true, tasks });
}
