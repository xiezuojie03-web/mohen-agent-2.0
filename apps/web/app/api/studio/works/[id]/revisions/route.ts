import { NextResponse } from "next/server";
import { commitWorkRevision } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/revisions —— 保存不可变 WorkRevision（E1-3，对齐候选 works/:id/revisions）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  let plan_id: unknown;
  try {
    const body = (await req.json()) as { plan_id?: unknown };
    plan_id = body.plan_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof plan_id !== "string") {
    return NextResponse.json({ ok: false, reason: "plan_id_required" }, { status: 400 });
  }
  const rev = await commitWorkRevision(id, plan_id);
  if (!rev) {
    return NextResponse.json({ ok: false, reason: "no_selected_plan" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...rev });
}
