import { NextResponse } from "next/server";
import { getTaskStatus, requestProduction } from "../../../../../../lib/studio-research";
import { canAccess } from "../../../../../../lib/ownership";
import { getSession, isOperatorSession } from "../../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API POST /api/studio/research-tasks/:id/production —— 触发该研究任务进入 D 链生产
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const result = await requestProduction(id);
  if (!result.ok) {
    const status = result.reason === "task_not_found" ? 404
      : result.reason === "task_not_ready" ? 409
      : result.reason === "forbidden" ? 403
      : 400;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, run_id: result.run_id });
}

// API GET /api/studio/research-tasks/:id/production —— 查询该任务对应的真实生产运行状态
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

  const checkpoint = (task as { checkpoint?: unknown }).checkpoint;
  const runId = checkpoint && typeof checkpoint === "object"
    ? (checkpoint as Record<string, unknown>).production_run_id as string | undefined
    : null;
  if (!runId) {
    return NextResponse.json({ ok: true, production: null, reason: "no_production" });
  }

  const { getProductionStatus } = await import("../../../../../../lib/studio-production");
  const production = await getProductionStatus(runId);
  return NextResponse.json({ ok: true, production });
}
