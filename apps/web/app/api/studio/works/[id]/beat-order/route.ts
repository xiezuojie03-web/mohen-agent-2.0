import { NextResponse } from "next/server";
import { reorderBeats } from "../../../../../../lib/studio-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/beat-order —— 管理分镜章节顺序（对齐 FA-025-02，重排即新修订 CAS）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let expected_revision_no: unknown;
  let order: unknown;
  try {
    const body = (await req.json()) as { expected_revision_no?: unknown; order?: unknown };
    expected_revision_no = body.expected_revision_no;
    order = body.order;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!Number.isInteger(Number(expected_revision_no)) || !Array.isArray(order)) {
    return NextResponse.json({ ok: false, reason: "expected_revision_no_and_order_required" }, { status: 400 });
  }
  const result = await reorderBeats(id, Number(expected_revision_no), order.map(Number));
  if (!result) return NextResponse.json({ ok: false, reason: "no_revision_or_invalid_order" }, { status: 400 });
  if (result.conflict) return NextResponse.json({ ok: false, reason: "version_conflict", revision_no: result.revisionNo }, { status: 409 });
  return NextResponse.json({ ok: true, revision_id: result.revisionId, revision_no: result.revisionNo });
}
