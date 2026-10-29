import { NextRequest, NextResponse } from "next/server";
import { retrieveMaterials } from "../../../../lib/mohen-agent/retrieve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-015 GET /api/explore/search —— 全库检索（对齐 FA-047-01）
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ ok: false, reason: "query_required" }, { status: 400 });
  }
  const { materials, degraded } = await retrieveMaterials(q.split(/\s+/).filter(Boolean).slice(0, 8), 20);
  return NextResponse.json({ ok: true, materials, degraded });
}
