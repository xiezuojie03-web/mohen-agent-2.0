import { NextResponse } from "next/server";
import { listPublished } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-028 GET /api/public/works/:id/program —— 作品节目单（章节/旁白，对齐 FA-031-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const works = await listPublished();
  const work = works.find((w) => w.work_id === id);
  if (!work) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, program: work.content });
}
