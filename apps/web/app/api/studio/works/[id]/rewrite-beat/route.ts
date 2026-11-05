import { NextResponse } from "next/server";
import { reviseBeat } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: unknown, init: {status?: number} = {}) {
  return NextResponse.json(body, {...init, headers: {"Cache-Control": "no-store"}});
}

// POST /api/studio/works/:id/rewrite-beat —— 自然语言局部改稿（对齐 FA-021-01，CAS 校验）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) { denied.headers.set("Cache-Control", "no-store"); return denied; }
  const { id } = await params;
  let expected_revision_no: unknown;
  let beat_diff: unknown;
  try {
    const body = (await req.json()) as { expected_revision_no?: unknown; beat_diff?: unknown };
    expected_revision_no = body.expected_revision_no;
    beat_diff = body.beat_diff;
  } catch {
    return privateJson({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const expected = expected_revision_no;
  if ((typeof expected !== "number" || !Number.isSafeInteger(expected) || expected < 0) || !Array.isArray(beat_diff)) {
    return privateJson({ ok: false, reason: "expected_revision_no_and_beat_diff_required" }, { status: 400 });
  }
  let result;
  try { result = await reviseBeat(
    id,
    expected,
    beat_diff as Array<{ index: number; patch: Record<string, unknown> }>
  ); } catch (error) {
    if (error instanceof Error && error.message === "invalid_beat_diff")
      return privateJson({ ok: false, reason: "invalid_beat_diff" }, { status: 400 });
    throw error;
  }
  if (!result) return privateJson({ ok: false, reason: "no_revision" }, { status: 404 });
  if (result.conflict) {
    return privateJson({ ok: false, reason: "version_conflict", revision_no: result.revisionNo }, { status: 409 });
  }
  return privateJson({ ok: true, revision_id: result.revisionId, revision_no: result.revisionNo });
}
