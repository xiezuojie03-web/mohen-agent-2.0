import { NextResponse } from "next/server";
import { getLatestRevision } from "../../../../../../lib/publication";
import { guardRoute } from "../../../../../../lib/guard";
import { readJsonColumn } from "../../../../../../lib/db-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/preview —— 预览作品生成的真实结果（对齐 FA-023-01）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) { denied.headers.set("Cache-Control", "no-store"); return denied; }
  const { id } = await params;
  const rev = await getLatestRevision(id);
  if (!rev.length) return NextResponse.json({ ok: false, reason: "no_revision" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  let content: unknown = {};
  try { content = readJsonColumn(rev[0].content, {}); }
  catch { return NextResponse.json({ ok: false, reason: "preview_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  return NextResponse.json({ ok: true, preview: content }, { headers: { "Cache-Control": "no-store" } });
}
