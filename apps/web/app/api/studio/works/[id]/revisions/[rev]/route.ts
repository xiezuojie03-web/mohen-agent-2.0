import { NextResponse } from "next/server";
import { reviseBeat } from "../../../../../../../lib/studio-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/revisions/:rev —— 局部改稿（CAS 校验 expected revision no）
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; rev: string }> }
) {
  const { id, rev } = await params;
  let beat_diff: unknown;
  try {
    const body = (await req.json()) as { beat_diff?: unknown };
    beat_diff = body.beat_diff;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(beat_diff)) {
    return NextResponse.json({ ok: false, reason: "beat_diff_required" }, { status: 400 });
  }
  const expected = Number(rev);
  if (!Number.isInteger(expected)) {
    return NextResponse.json({ ok: false, reason: "invalid_revision" }, { status: 400 });
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
