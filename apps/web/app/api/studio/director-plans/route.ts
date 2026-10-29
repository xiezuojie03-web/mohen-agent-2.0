import { NextResponse } from "next/server";
import { createDirectorPlan } from "../../../../lib/studio-director";
import { guardRoute } from "../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-065 POST /api/studio/director-plans —— 生成 A/B 导演方案（对齐 FA-017-01）
export async function POST(req: Request) {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
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
  const created = await createDirectorPlan(brief.trim(), typeof topic === "string" ? topic : "jinze");
  if (!created) {
    return NextResponse.json({ ok: false, reason: "no_material_or_llm" });
  }
  return NextResponse.json({
    ok: true,
    plan_id: created.planId,
    planA: created.planA,
    planB: created.planB,
    facts: created.facts,
    finding: created.finding,
  });
}
