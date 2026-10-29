import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/materials/:id —— 展开素材证据与使用权（对齐 FA-019-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await queryRows(
    `select a.asset_id::text as id, a.title, a.kind, a.license, a.author, a.intended_use, a.status, a.created_at::text as created_at
     from public.assets a where a.asset_id = :'id'`,
    { id }
  );
  if (!rows.length) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, material: rows[0] });
}
