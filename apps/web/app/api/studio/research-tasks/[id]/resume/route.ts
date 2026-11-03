import { NextResponse } from "next/server";
import { getTaskStatus, resumeResearchTask } from "../../../../../../lib/studio-research";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Explicit budget resumption is NOT an invitation to replay charged steps.
// Unknown provider costs / settlement receipts require reconciliation first.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.research_tasks");
  if (denied) return denied;
  const { id } = await params;
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }
  if (task.status !== "hold") {
    return NextResponse.json({ ok: false, reason: "not_hold" }, { status: 409 });
  }

  let additionalCeiling: unknown;
  try {
    const raw = await req.text();
    additionalCeiling = raw.trim()
      ? (JSON.parse(raw) as { additionalCeiling?: unknown }).additionalCeiling
      : undefined;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof additionalCeiling !== "number" || !Number.isFinite(additionalCeiling) ||
      additionalCeiling <= 0) {
    return NextResponse.json({ ok: false, reason: "additional_budget_required" }, { status: 400 });
  }
  const result = await resumeResearchTask(id, additionalCeiling);
  if (result.status !== "done") {
    return NextResponse.json(
      { ok: false, reason: result.holdReason || "resume_hold" },
      { status: 409, headers: { "cache-control": "no-store" } }
    );
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
