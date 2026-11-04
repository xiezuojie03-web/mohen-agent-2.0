import { NextResponse } from "next/server";
import { listWatchEligible } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-029 GET /api/public/works/:id/related —— 相关作品（同库其他已发布作品；无则诚实空）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const works = await listWatchEligible();
  const related = works
    .filter((w) => w.work_id !== id)
    .slice(0, 6)
    .map((w) => ({ work_id: w.work_id, title: w.title, revision_no: w.revision_no }));
  return NextResponse.json({ ok: true, related }, { headers: { "cache-control": "no-store" } });
}
