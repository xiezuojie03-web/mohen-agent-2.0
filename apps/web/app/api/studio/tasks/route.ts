import { NextResponse } from "next/server";
import { listResearchTasks } from "../../../../lib/studio-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/tasks —— 我的研究任务进度（对齐 FA-009-01）
export async function GET() {
  const tasks = await listResearchTasks();
  return NextResponse.json({ ok: true, tasks });
}
