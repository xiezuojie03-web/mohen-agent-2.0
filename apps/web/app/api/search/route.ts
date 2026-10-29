import { NextRequest, NextResponse } from "next/server";
import { retrieveMaterials } from "../../../lib/mohen-agent/retrieve";
import { listPublished } from "../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-031 GET /api/search —— 全站搜索（已发布作品 + 合格知识入口），对齐 FA-001-03
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ ok: false, reason: "query_required" }, { status: 400 });
  }
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 8);
  const [{ materials, degraded }, published] = await Promise.all([
    retrieveMaterials(terms, 12),
    listPublished(),
  ]);
  const works = published.filter((w) => w.title.includes(q)).slice(0, 12);
  return NextResponse.json({ ok: true, query: q, works, knowledge: materials, degraded });
}
