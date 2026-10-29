import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-023 GET /api/public/evidence/:id —— 公开证据（对齐 FA-036-02 查看作品资料来源）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await queryRows(
    "select evidence_pointer_id::text as id, display_locator, display_excerpt from read_model.evidence_pointers where evidence_pointer_id = :'id'",
    { id }
  );
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, evidence: rows[0] });
}
