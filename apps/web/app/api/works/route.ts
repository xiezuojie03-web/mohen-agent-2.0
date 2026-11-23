import { NextResponse } from "next/server";
import { createWorkDraft } from "../../../lib/publication";
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
  let creationId: unknown;
  let projectId: unknown;
  try {
    const body = (await req.json()) as { title?: unknown; content?: unknown; creation_id?: unknown; project_id?: unknown };
    title = body.title;
    content = body.content;
    creationId = body.creation_id;
    projectId = body.project_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ ok: false, reason: "title_required" }, { status: 400 });
  }
  if (creationId !== undefined && typeof creationId !== "string") {
    return NextResponse.json({ ok: false, reason: "creation_id_invalid" }, { status: 400 });
  }
  if (typeof projectId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId)) {
    return NextResponse.json({ ok: false, reason: "project_binding_required" }, { status: 400 });
  }

  const user = await findUserById(session.uid);
  const creator = user?.email || session.uid;
  try {
    const result = await createWorkDraft(title.trim().slice(0, 120), creator, session.uid, content, creationId as string | undefined, projectId);
    return NextResponse.json(result, { status: result.ok ? 200 : result.reason === "creation_id_invalid" ? 400 : 409 });
  } catch {
    return NextResponse.json({ ok: false, reason: "creation_unavailable" }, { status: 503 });
  }
}
