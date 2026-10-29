import { NextResponse } from "next/server";
import { generateDirectorPlans } from "../../../../lib/studio-creation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let brief: unknown;
  let topic: unknown;
  try {
    const body = (await req.json()) as { brief?: unknown; topic?: unknown };
    brief = body.brief;
    topic = body.topic;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof brief !== "string" || !brief.trim()) {
    return NextResponse.json({ ok: false, reason: "brief_required" }, { status: 400 });
  }
  const result = await generateDirectorPlans(brief.trim(), topic === "a001" ? "a001" : "jinze");
  if (!result) {
    return NextResponse.json({ ok: false, reason: "no_material_or_llm" });
  }
  return NextResponse.json({ ok: true, ...result });
}
