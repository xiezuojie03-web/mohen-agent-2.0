import { NextResponse } from "next/server";
import { reviseBeat } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/rewrite-beat —— 自然语言局部改稿（对齐 FA-021-01，CAS 校验）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  let expected_revision_no: unknown;
  let beat_diff: unknown;
  try {
    const body = (await req.json()) as { expected_revision_no?: unknown; beat_diff?: unknown };
    expected_revision_no = body.expected_revision_no;
    beat_diff = body.beat_diff;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const expected = Number(expected_revision_no);
  if (!Number.isInteger(expected) || !Array.isArray(beat_diff)) {
    return NextResponse.json({ ok: false, reason: "expected_revision_no_and_beat_diff_required" }, { status: 400 });
  }
  const result = await reviseBeat(
    id,
    expected,
    beat_diff as Array<{ index: number; patch: Record<string, unknown> }>
  );
  if (!result) return NextResponse.json({ ok: false, reason: "no_revision" }, { status: 404 });
  if (result.conflict) {
    return NextResponse.json({ ok: false, reason: "version_conflict", revision_no: result.revisionNo }, { status: 409 });
  }
  return NextResponse.json({ ok: true, revision_id: result.revisionId, revision_no: result.revisionNo });
}
