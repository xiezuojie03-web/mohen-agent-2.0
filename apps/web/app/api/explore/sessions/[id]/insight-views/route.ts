import { NextResponse } from "next/server";
import { generateInsightView } from "../../../../../../lib/studio-creation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-X02 POST /api/explore/sessions/:id/insight-views —— 生成图见（关系图候选，可溯源）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const graph = await generateInsightView(question.trim());
  if (!graph) {
    return NextResponse.json({ ok: false, reason: "no_material_or_llm" });
  }
  return NextResponse.json({ ok: true, session_id: id, graph });
}
