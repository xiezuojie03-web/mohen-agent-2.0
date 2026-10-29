import { NextResponse } from "next/server";
import { listWorks } from "../../../../lib/publication";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/works —— 当前用户的作品列表（P0-1：按 owner 过滤，不再返回全站作品）
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const works = await listWorks(session.uid);
  return NextResponse.json({ ok: true, works });
}
