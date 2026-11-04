import { NextResponse } from "next/server";
import { forkWorkRevision } from "../../../../../../lib/publication";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/restore —— 撤销到历史修订的新草稿（对齐 FA-028-02；默认兼容原最新修订行为）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  let input: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (raw.length > 4096) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw Error("invalid_body");
      input = parsed as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (Object.keys(input).some(k => !["source_revision_id", "expected_revision_no", "operation_id"].includes(k)) ||
    (input.source_revision_id !== undefined && typeof input.source_revision_id !== "string") ||
    (input.operation_id !== undefined && typeof input.operation_id !== "string") ||
    (input.expected_revision_no !== undefined &&
      (typeof input.expected_revision_no !== "number" || !Number.isInteger(input.expected_revision_no) || input.expected_revision_no < 0))) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const result = await forkWorkRevision(id, {
    sourceRevisionId: input.source_revision_id as string | undefined,
    expectedRevisionNo: input.expected_revision_no as number | undefined,
    operationId: input.operation_id as string | undefined,
  });
  if (!result.ok) {
    const status = result.reason === "no_revision" ? 404 :
      result.reason === "version_conflict" || result.reason === "idempotency_conflict" ? 409 :
      result.reason === "source_unavailable" ? 503 : 400;
    return NextResponse.json({ ok: false, reason: result.reason, revision_no: result.revisionNo }, { status });
  }
  return NextResponse.json({ ok: true, revision_id: result.revisionId, revision_no: result.revisionNo });
}
