import { NextResponse } from "next/server";
import { queryRows, queryValue, run } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-016 GET /api/explore/sessions/:id —— 探索会话（对齐 FA-039-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await queryRows(
    "select session_id::text as session_id, intent, title, archived, origin_snapshot, created_at::text as created_at " +
      "from public.explore_sessions where session_id = :'id'",
    { id }
  );
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session: rows[0] });
}

// API-X03 PATCH /api/explore/sessions/:id —— 重命名/归档（对齐 FA-X-020）
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let title: unknown;
  let archived: unknown;
  try {
    const body = (await req.json()) as { title?: unknown; archived?: unknown };
    title = body.title;
    archived = body.archived;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const exists = await queryValue(
    "select session_id::text from public.explore_sessions where session_id = :'id'",
    { id }
  );
  if (!exists) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const hasTitle = typeof title === "string" && title.trim().length > 0;
  const hasArchived = typeof archived === "boolean";
  if (!hasTitle && !hasArchived) {
    return NextResponse.json({ ok: false, reason: "nothing_to_update" }, { status: 400 });
  }

  if (hasTitle) {
    await run("update public.explore_sessions set title = :'title' where session_id = :'id'", {
      id,
      title: String(title).trim(),
    });
  }
  if (hasArchived) {
    await run("update public.explore_sessions set archived = :'archived' where session_id = :'id'", {
      id,
      archived: archived ? "true" : "false",
    });
  }
  return NextResponse.json({
    ok: true,
    session_id: id,
    title: hasTitle ? String(title).trim() : undefined,
    archived: hasArchived ? archived : undefined,
  });
}
