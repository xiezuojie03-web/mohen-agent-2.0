import { NextResponse } from "next/server";
import { getLatestRevision } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/preview —— 预览作品生成的真实结果（对齐 FA-023-01）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rev = await getLatestRevision(id);
  if (!rev.length) return NextResponse.json({ ok: false, reason: "no_revision" }, { status: 404 });
  let content: unknown = {};
  try { content = JSON.parse(String(rev[0].content ?? "{}")); } catch { content = {}; }
  return NextResponse.json({ ok: true, preview: content });
}
