import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/explore/sessions/:id/return —— 返回 WATCH 原位置（有合法 OriginSnapshot 才返回）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.explore_sessions");
  if (denied) return denied;
  const { id } = await params;
  const rows = await queryRows(
    "select origin_snapshot::text as origin_snapshot from public.explore_sessions where session_id = :'id'",
    { id }
  );
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: "session_not_found" }, { status: 404 });
  }

  let origin: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(String(rows[0].origin_snapshot ?? "{}"));
    if (parsed && typeof parsed === "object" && parsed.work_id) origin = parsed;
  } catch {
    origin = null;
  }

  return NextResponse.json({
    ok: true,
    session_id: id,
    origin_available: !!origin,
    origin,
  });
}
