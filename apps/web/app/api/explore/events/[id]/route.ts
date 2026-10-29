import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-013 GET /api/explore/events/:id —— 事件详情（对齐 FA-046-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await queryRows("select * from world.events where event_id = :'id'", { id });
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, event: rows[0] });
}
