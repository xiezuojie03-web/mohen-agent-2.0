import { NextResponse } from "next/server";
import { getHelpArticle } from "../../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/help/articles/:id —— 帮助与产品说明（对齐 FA-011-01，真实文章库）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getHelpArticle(id);
  if (!article) return NextResponse.json({ ok: true, article_id: id, available: false, content: null });
  return NextResponse.json({ ok: true, article_id: article.article_id, available: true, title: article.title, content: article.content });
}
