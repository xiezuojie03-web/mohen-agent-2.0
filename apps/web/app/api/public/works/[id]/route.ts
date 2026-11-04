import { NextResponse } from "next/server";
import { listWatchEligible } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-026 GET /api/public/works/:id —— 作品详情（对齐 FA-008-02 / FA-032-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const works = await listWatchEligible();
  const work = works.find((w) => w.work_id === id);
  if (!work) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json({ ok: true, work }, { headers: { "cache-control": "no-store" } });
}
