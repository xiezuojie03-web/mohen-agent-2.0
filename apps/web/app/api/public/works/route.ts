import { NextResponse } from "next/server";
import { listWatchEligible } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-025 GET /api/public/works —— 已发布作品目录（对齐 FA-005-01 / FA-008-01）
export async function GET() {
  const works = await listWatchEligible();
  return NextResponse.json({ ok: true, works }, { headers: { "cache-control": "no-store" } });
}
