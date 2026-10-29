import { NextResponse } from "next/server";
import { createResearchTask, requestProduction } from "../../../../lib/studio-research";
import { resolveTopic } from "../../../../lib/mohen-agent/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-067 POST /api/studio/research-tasks —— 创建研究任务并受托研究（对齐 FA-013-01）
export async function POST(req: Request) {
  let prompt: unknown;
  let topic: unknown;
  let work_id: unknown;
  try {
    const body = (await req.json()) as { prompt?: unknown; topic?: unknown; work_id?: unknown };
    prompt = body.prompt;
    topic = body.topic;
    work_id = body.work_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ ok: false, reason: "prompt_required" }, { status: 400 });
  }
  const created = await createResearchTask(
    prompt.trim(),
    resolveTopic(topic),
    typeof work_id === "string" ? work_id : undefined
  );
  // 委托成功后异步触发真实生产（D00–D05）。budget hold 时不触发（研究未完成）。
  let production: { ok: boolean; reason?: string; run_id?: string } | null = null;
  if (created.taskId && created.status !== "hold") {
    production = await requestProduction(created.taskId);
  }
  return NextResponse.json({
    ok: true,
    task_id: created.taskId,
    degraded: created.degraded,
    decision: created.decision,
    research_leads: created.researchLeads,
    production,
  });
}
