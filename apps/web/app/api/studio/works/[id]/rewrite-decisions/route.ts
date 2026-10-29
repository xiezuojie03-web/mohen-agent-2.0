import { NextResponse } from "next/server";
import { forkWorkRevision } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/rewrite-decisions —— 采纳或放弃局部改稿（对齐 FA-021-02）
// 采纳 = 保留当前修订；放弃 = fork 回退到上一版（不可变修订不回改，只能开新草稿）。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let action: unknown;
  try {
    const body = (await req.json()) as { action?: unknown };
    action = body.action;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (action === "accept") return NextResponse.json({ ok: true, kept: true });
  if (action === "reject") {
    const revisionId = await forkWorkRevision(id);
    if (!revisionId) return NextResponse.json({ ok: false, reason: "no_revision" }, { status: 404 });
    return NextResponse.json({ ok: true, revision_id: revisionId });
  }
  return NextResponse.json({ ok: false, reason: "invalid_action" }, { status: 400 });
}
