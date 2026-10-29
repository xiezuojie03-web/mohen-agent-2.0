import { NextResponse } from "next/server";
import { runResearch } from "../../../../../../lib/mohen-agent/research";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/explore/sessions/:id/query —— 探索会话内自然语言追问（对齐 FA-040-01/041-01/050-02）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.explore_sessions");
  if (denied) return denied;
  let question: unknown;
  try {
    const body = (await req.json()) as { question?: unknown };
    question = body.question;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ ok: false, reason: "question_required" }, { status: 400 });
  }
  const { decision, degraded, researchLeads } = await runResearch(question.trim());
  return NextResponse.json({ ok: true, decision, degraded, research_leads: researchLeads });
}
