import { NextResponse } from "next/server";
import { generateBeats } from "../../../../lib/studio-creation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let plan: { angle?: string; points?: string[] } | undefined;
  let facts: unknown;
  try {
    const body = (await req.json()) as {
      plan?: { angle?: string; points?: string[] };
      facts?: unknown;
    };
    plan = body.plan;
    facts = body.facts;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!plan?.angle) {
    return NextResponse.json({ ok: false, reason: "plan_required" }, { status: 400 });
  }
  const factList = Array.isArray(facts) ? facts.filter((f): f is string => typeof f === "string") : [];
  const beats = await generateBeats({ angle: plan.angle, points: plan.points ?? [], cover: "" }, factList);
  if (!beats) {
    return NextResponse.json({ ok: false, reason: "no_llm" });
  }
  return NextResponse.json({ ok: true, beats });
}
