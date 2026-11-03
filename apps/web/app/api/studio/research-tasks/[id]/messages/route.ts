import { NextResponse } from "next/server";
import { appendResearchMessage } from "../../../../../../lib/studio-research";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-068 POST /api/studio/research-tasks/:id/messages —— 追加追问（对齐 FA-013-02）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.research_tasks");
  if (denied) return denied;
  const { id } = await params;
  let message: unknown;
  try {
    const body = (await req.json()) as { message?: unknown };
    message = body.message;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ ok: false, reason: "message_required" }, { status: 400 });
  }
  const result = await appendResearchMessage(id, message.trim());
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: result.reason === "task_not_found" ? 404 : 409, headers: { "cache-control": "no-store" } }
    );
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
