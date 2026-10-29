import { NextResponse } from "next/server";
import { forkWorkRevision } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/fork —— 从已发布/当前修订开新草稿（对齐 FA-038-01）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const revisionId = await forkWorkRevision(id);
  if (!revisionId) return NextResponse.json({ ok: false, reason: "no_revision" }, { status: 404 });
  return NextResponse.json({ ok: true, revision_id: revisionId });
}
