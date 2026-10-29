import { NextResponse } from "next/server";
import { listPublished } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-027 GET /api/public/works/:id/eligibility —— 发布资格核验（对齐 FA-030-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const works = await listPublished();
  const eligible = works.some((w) => w.work_id === id);
  return NextResponse.json({ ok: true, eligible, reason: eligible ? "published" : "not_published_or_revoked" });
}
