import { NextResponse } from "next/server";
import { reviseBeat } from "../../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../../lib/guard";
import { revisionNumber } from "../../../../../../../lib/kad1-policy.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: unknown, init: {status?: number} = {}) {
  return NextResponse.json(body, {...init, headers: {"Cache-Control": "no-store"}});
}

// POST /api/studio/works/:id/revisions/:rev —— 局部改稿（CAS 校验 expected revision no）
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; rev: string }> }
) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) { denied.headers.set("Cache-Control", "no-store"); return denied; }
  const { id, rev } = await params;
  let beat_diff: unknown;
  try {
    const body = (await req.json()) as { beat_diff?: unknown };
    beat_diff = body.beat_diff;
  } catch {
    return privateJson({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(beat_diff)) {
    return privateJson({ ok: false, reason: "beat_diff_required" }, { status: 400 });
  }
  const expected = revisionNumber(rev);
  if (expected === null) {
    return privateJson({ ok: false, reason: "invalid_revision" }, { status: 400 });
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
