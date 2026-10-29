import { NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-058 POST /api/explore/sessions —— 新建探索会话（零作品可探索，Origin 可选，对齐 FA-006-01）
// P0-1（2026-10-29）：必须登录；会话归属当前用户。
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

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
    "insert into public.explore_sessions (session_id, intent, origin_snapshot, owner_user_id) values (:'id', :'intent', :'origin'::jsonb, :'owner')",
    {
      id: sessionId!,
      intent: typeof intent === "string" ? intent.slice(0, 2000) : null,
      origin: JSON.stringify(origin ?? {}),
      owner: session.uid,
    }
  );
  return NextResponse.json({ ok: true, session_id: sessionId });
}
