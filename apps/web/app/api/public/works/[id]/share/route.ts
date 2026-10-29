import { NextResponse } from "next/server";
import { listPublished } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-030 GET /api/public/works/:id/share —— 分享链接（核验公开资格后生成）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const works = await listPublished();
  const found = works.find((w) => w.work_id === id);
  if (!found) {
    return NextResponse.json({ ok: false, shareable: false, reason: "not_published" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    shareable: true,
    share_url: `/watch?work_id=${encodeURIComponent(id)}`,
    revision_no: found.revision_no,
    title: found.title,
  });
}
