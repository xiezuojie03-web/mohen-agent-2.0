import { NextResponse } from "next/server";
import { createWork } from "../../../lib/publication";
import { findUserById } from "../../../lib/auth";
import { getSession } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// P0-1（2026-10-29）：创建作品必须登录，owner 由服务端会话决定，客户端不能伪造 creator。
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  let title: unknown;
  let content: unknown;
  try {
    const body = (await req.json()) as { title?: unknown; content?: unknown };
    title = body.title;
    content = body.content;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ ok: false, reason: "title_required" }, { status: 400 });
  }

  const user = await findUserById(session.uid);
  const creator = user?.email || session.uid;
  const workId = await createWork(title.trim().slice(0, 120), creator, session.uid, content);
  return NextResponse.json({ ok: true, work_id: workId });
}
