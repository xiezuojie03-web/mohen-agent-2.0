import { NextResponse } from "next/server";
import { getConversation } from "../../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/conversations/:id —— 恢复历史对话（对齐 FA-014-02，真实读取）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, conversation });
}
