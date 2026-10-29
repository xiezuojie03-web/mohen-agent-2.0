import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-012 GET /api/explore/entities/:id —— 实体详情（对齐 FA-043-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await queryRows("select * from world.entities where entity_id = :'id'", { id });
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, entity: rows[0] });
}
