import { NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-058 POST /api/explore/sessions —— 新建探索会话（零作品可探索，Origin 可选，对齐 FA-006-01）
export async function POST(req: Request) {
  let intent: unknown;
  let origin: unknown;
  try {
    const body = (await req.json()) as { intent?: unknown; origin?: unknown };
    intent = body.intent;
    origin = body.origin;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const sessionId = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.explore_sessions (session_id, intent, origin_snapshot) values (:'id', :'intent', :'origin'::jsonb)",
    {
      id: sessionId!,
      intent: typeof intent === "string" ? intent : null,
      origin: JSON.stringify(origin ?? {}),
    }
  );
  return NextResponse.json({ ok: true, session_id: sessionId });
}
