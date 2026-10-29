import { NextResponse } from "next/server";
import { createConversation, type ConversationMessage } from "../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/conversations —— 创建新对话（对齐 FA-014-01，真实持久化）
export async function POST(req: Request) {
  let title: unknown;
  let messages: unknown;
  try {
    const body = (await req.json()) as { title?: unknown; messages?: unknown };
    title = body.title;
    messages = body.messages;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const msgs: ConversationMessage[] = Array.isArray(messages)
    ? messages
        .filter((m) => m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content }))
    : [];
  const conversationId = await createConversation(typeof title === "string" ? title : "", msgs);
  return NextResponse.json({ ok: true, conversation_id: conversationId });
}
