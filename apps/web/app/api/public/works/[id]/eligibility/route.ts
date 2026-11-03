import { NextResponse } from "next/server";
import { listWatchEligible } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-027 GET /api/public/works/:id/eligibility —— 发布资格核验（对齐 FA-030-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const works = await listWatchEligible();
  const eligible = works.some((w) => w.work_id === id);
  // Do not reveal whether a missing work is unpublished, unqualified,
  // revoked or withheld for rights reasons.
  return NextResponse.json(
    { ok: true, eligible, reason: eligible ? "qualified_for_watch" : "not_published_or_unqualified" },
    { headers: { "cache-control": "no-store" } }
  );
}
