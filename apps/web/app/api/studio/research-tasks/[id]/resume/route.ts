import { NextResponse } from "next/server";
import { getTaskStatus, appendResearchMessage } from "../../../../../../lib/studio-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-069 POST /api/studio/research-tasks/:id/resume —— 恢复研究（对齐 FA-029-02 补充材料后续跑）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }
  const prompt = typeof task.prompt === "string" ? task.prompt : "";
  await appendResearchMessage(id, prompt || "继续研究");
  return NextResponse.json({ ok: true });
}
