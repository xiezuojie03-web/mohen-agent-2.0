import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-014 GET /api/explore/relations/:id —— 关系详情（对齐 FA-043-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await queryRows("select * from world.relation_claims where relation_claim_id = :'id'", { id });
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, relation: rows[0] });
}
