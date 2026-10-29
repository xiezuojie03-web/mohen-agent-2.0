import { NextResponse } from "next/server";
import { getTaskStatus } from "../../../../../../lib/studio-research";
import { getProductionStatus } from "../../../../../../lib/studio-production";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractRunId(checkpoint: unknown): string | null {
  if (!checkpoint) return null;
  const obj = typeof checkpoint === "string" ? safeParse(checkpoint) : checkpoint;
  if (!obj || typeof obj !== "object") return null;
  const runId = (obj as Record<string, unknown>).production_run_id;
  return typeof runId === "string" ? runId : null;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// API GET /api/studio/research-tasks/:id/production —— 查询该任务对应的真实生产运行状态
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }

  const runId = extractRunId((task as { checkpoint?: unknown }).checkpoint);
  if (!runId) {
    return NextResponse.json({ ok: true, production: null, reason: "no_production" });
  }

  const production = await getProductionStatus(runId);
  return NextResponse.json({ ok: true, production });
}
