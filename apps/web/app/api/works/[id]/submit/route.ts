import { NextResponse } from "next/server";
import { submitWork } from "../../../../../lib/publication";
import { canAccess } from "../../../../../lib/ownership";
import { getSession, isOperatorSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 投稿：仅作品 owner（或运营）可提交审核。P0-1（2026-10-29）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canAccess("publication.works", id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
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
    const result = await submitWork(id, revisionId, session.uid);
    return NextResponse.json(result, { status: result.ok ? 200 : result.reason === "revision_required" ? 400 : 409 });
  } catch {
    return NextResponse.json({ ok: false, reason: "submission_unavailable" }, { status: 503 });
  }
}
