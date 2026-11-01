import { NextResponse } from "next/server";
import { submitWork } from "../../../../../../lib/publication";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/submissions —— 提交审核（对齐 FA-022-01）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  let revisionId: string | undefined;
  try {
    const body = await req.text();
    if (body.trim()) {
      const parsed = JSON.parse(body);
      if (!parsed || typeof parsed.revision_id !== "string" || !parsed.revision_id) {
        return NextResponse.json({ ok: false, reason: "revision_required" }, { status: 400 });
      }
      revisionId = parsed.revision_id;
    }
  } catch { return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  try {
    const result = await submitWork(id, revisionId);
    return NextResponse.json(result, { status: result.ok ? 200 : result.reason === "revision_required" ? 400 : 409 });
  } catch {
    return NextResponse.json({ ok: false, reason: "submission_unavailable" }, { status: 503 });
  }
}
