import { NextResponse } from "next/server";
import { selectMediaCandidates } from "../../../../../../lib/studio-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/works/:id/media-candidates —— 媒体候选（E1-3，从资产台账取，缺的如实说明）
export async function GET() {
  const result = await selectMediaCandidates();
  return NextResponse.json({ ok: true, ...result });
}
