import { NextResponse } from "next/server";
import { submitWork } from "../../../../../lib/publication";
import { canAccess } from "../../../../../lib/ownership";
import { getSession, isOperatorSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 投稿：仅作品 owner（或运营）可提交审核。P0-1（2026-10-29）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canAccess("publication.works", id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  await submitWork(id);
  return NextResponse.json({ ok: true });
}
