import { NextResponse } from "next/server";
import { suggestNarration } from "../../../../../../lib/studio-creation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/narration-suggestions —— 请求 AI 优化旁白（对齐 FA-026-02，事实护栏内润色）
export async function POST(req: Request) {
  let narration: unknown;
  try {
    const body = (await req.json()) as { narration?: unknown };
    narration = body.narration;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof narration !== "string" || !narration.trim()) {
    return NextResponse.json({ ok: false, reason: "narration_required" }, { status: 400 });
  }
  const suggestion = await suggestNarration(narration.trim());
  if (!suggestion) return NextResponse.json({ ok: false, reason: "llm_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, suggestion });
}
