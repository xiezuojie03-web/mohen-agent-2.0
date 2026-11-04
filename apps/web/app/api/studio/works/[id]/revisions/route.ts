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
  let expected_revision_no: unknown;
  try {
    const body = (await req.json()) as { plan_id?: unknown; expected_revision_no?: unknown };
    plan_id = body.plan_id;
    expected_revision_no = body.expected_revision_no;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof plan_id !== "string") {
    return NextResponse.json({ ok: false, reason: "plan_id_required" }, { status: 400 });
  }
  if (expected_revision_no !== undefined && (!Number.isInteger(expected_revision_no) || (expected_revision_no as number) < 0)) {
    return NextResponse.json({ ok: false, reason: "invalid_expected_revision_no" }, { status: 400 });
  }
  const rev = await commitWorkRevision(id, plan_id, expected_revision_no as number | undefined);
  if (!rev) {
    return NextResponse.json({ ok: false, reason: "no_selected_plan" }, { status: 400 });
  }
  if (rev.conflict) {
    return NextResponse.json({ ok: false, reason: "version_conflict", revision_no: rev.revisionNo }, { status: 409 });
  }
  return NextResponse.json({ ok: true, ...rev });
}
