import { NextResponse } from "next/server";
import { queryRows, queryValue, run } from "@mohen/data-access";
import { guardRoute } from "../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-081 POST /api/watch/sessions —— 观看进度（时码保存/恢复，对齐 FA-033-01）
// 轻量：无账号系统，按 work_id 存最近 playhead（本地开发语义，不冒充多用户持久化）。
export async function POST(req: Request) {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
  let work_id: unknown;
  let playhead: unknown;
  try {
    const body = (await req.json()) as { work_id?: unknown; playhead?: unknown };
    work_id = body.work_id;
    playhead = body.playhead;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof work_id !== "string" || typeof playhead !== "number") {
    return NextResponse.json({ ok: false, reason: "work_id_and_playhead_required" }, { status: 400 });
  }
  const existing = await queryRows(
    "select 1 from public.watch_sessions where work_id = :'wid'",
    { wid: work_id }
  );
  if (existing.length) {
    await run(
      "update public.watch_sessions set playhead = :'ph', updated_at = now() where work_id = :'wid'",
      { ph: String(playhead), wid: work_id }
    );
  } else {
    await run(
      "insert into public.watch_sessions (work_id, playhead) values (:'wid', :'ph')",
      { wid: work_id, ph: String(playhead) }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
  const url = new URL(req.url);
  const work_id = url.searchParams.get("work_id");
  if (!work_id) {
    return NextResponse.json({ ok: false, reason: "work_id_required" }, { status: 400 });
  }
  const rows = await queryRows(
    "select playhead from public.watch_sessions where work_id = :'wid'",
    { wid: work_id }
  );
  return NextResponse.json({ ok: true, playhead: rows[0]?.playhead ?? null });
}
