import { NextResponse } from "next/server";
import { reviseBeat } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: unknown, init: {status?: number} = {}) {
  return NextResponse.json(body, {...init, headers: {"Cache-Control": "no-store"}});
}

// POST /api/studio/works/:id/narration —— 编辑某段旁白脚本（对齐 FA-026-01）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) { denied.headers.set("Cache-Control", "no-store"); return denied; }
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
    return privateJson({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const idx = beat_index;
  if (typeof expected_revision_no !== "number" || !Number.isSafeInteger(expected_revision_no) || expected_revision_no <= 0
    || typeof idx !== "number" || !Number.isSafeInteger(idx) || idx < 0 || typeof narration !== "string" || !narration.trim()) {
    return privateJson({ ok: false, reason: "invalid_args" }, { status: 400 });
  }
  let result;
  try { result = await reviseBeat(id, expected_revision_no, [{ index: idx, patch: { narration } }]); }
  catch (error) {
    if (error instanceof Error && error.message === "invalid_beat_diff")
      return privateJson({ ok: false, reason: "invalid_beat_diff" }, { status: 400 });
    throw error;
  }
  if (!result) return privateJson({ ok: false, reason: "no_revision" }, { status: 404 });
  if (result.conflict) return privateJson({ ok: false, reason: "version_conflict", revision_no: result.revisionNo }, { status: 409 });
  return privateJson({ ok: true, revision_id: result.revisionId, revision_no: result.revisionNo });
}
