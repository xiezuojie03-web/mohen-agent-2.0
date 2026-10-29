import { NextResponse } from "next/server";
import { reviseBeat } from "../../../../../../lib/studio-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/narration —— 编辑某段旁白脚本（对齐 FA-026-01）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let expected_revision_no: unknown;
  let beat_index: unknown;
  let narration: unknown;
  try {
    const body = (await req.json()) as { expected_revision_no?: unknown; beat_index?: unknown; narration?: unknown };
    expected_revision_no = body.expected_revision_no;
    beat_index = body.beat_index;
    narration = body.narration;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const idx = Number(beat_index);
  if (!Number.isInteger(Number(expected_revision_no)) || !Number.isInteger(idx) || typeof narration !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid_args" }, { status: 400 });
  }
  const result = await reviseBeat(id, Number(expected_revision_no), [{ index: idx, patch: { narration } }]);
  if (!result) return NextResponse.json({ ok: false, reason: "no_revision" }, { status: 404 });
  if (result.conflict) return NextResponse.json({ ok: false, reason: "version_conflict", revision_no: result.revisionNo }, { status: 409 });
  return NextResponse.json({ ok: true, revision_id: result.revisionId, revision_no: result.revisionNo });
}
