import { NextResponse } from "next/server";
import { selectDirectorPlan } from "../../../../../../lib/studio-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-066 POST /api/studio/director-plans/:id/select —— 采纳方案并生成节拍（对齐 FA-018-01）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let which: unknown;
  try {
    const body = (await req.json()) as { which?: unknown };
    which = body.which;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (which !== "A" && which !== "B") {
    return NextResponse.json({ ok: false, reason: "which_required" }, { status: 400 });
  }
  const result = await selectDirectorPlan(id, which);
  if (!result) {
    return NextResponse.json({ ok: false, reason: "plan_not_found_or_llm" });
  }
  return NextResponse.json({ ok: true, beats: result.beats });
}
