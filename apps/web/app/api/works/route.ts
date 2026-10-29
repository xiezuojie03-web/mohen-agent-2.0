import { NextResponse } from "next/server";
import { createWork } from "../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let title: unknown;
  let creator: unknown;
  let content: unknown;
  try {
    const body = (await req.json()) as { title?: unknown; creator?: unknown; content?: unknown };
    title = body.title;
    creator = body.creator;
    content = body.content;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ ok: false, reason: "title_required" }, { status: 400 });
  }
  const workId = await createWork(
    title.trim(),
    typeof creator === "string" ? creator.trim() : "访客",
    content
  );
  return NextResponse.json({ ok: true, work_id: workId });
}
