import { NextResponse } from "next/server";
import { queryValue } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/explore/sessions/:id/share —— 保存/分享探索结果（核验会话存在后生成链接）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exists = await queryValue(
    "select session_id::text from public.explore_sessions where session_id = :'id'",
    { id }
  );
  if (!exists) {
    return NextResponse.json({ ok: false, reason: "session_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, share_url: `/explore?session_id=${encodeURIComponent(id)}` });
}
