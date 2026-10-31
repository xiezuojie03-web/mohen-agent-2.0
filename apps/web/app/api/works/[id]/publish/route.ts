import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../../lib/auth";
import { publishWork } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 发布：仅 operator；P0-4 起必须通过「独立签核 + 媒体权利 + 两把钥匙」四道门。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value));
  if (!session || !session.r.includes("operator")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const done = await publishWork(id, session.uid);
  return NextResponse.json({ ok: done.ok, reason: done.reason });
}
