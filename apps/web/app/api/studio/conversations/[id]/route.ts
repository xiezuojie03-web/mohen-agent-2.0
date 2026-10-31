import { NextResponse } from "next/server";
import { getConversation } from "../../../../../lib/fine-capabilities";
import { getSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/conversations/:id —— 恢复历史对话（对齐 FA-014-02，真实读取）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const conversation = await getConversation(id, session.uid);
  if (!conversation) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, conversation });
}
