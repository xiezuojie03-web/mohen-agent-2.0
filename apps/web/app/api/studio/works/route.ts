import { NextResponse } from "next/server";
import { listWorks } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/works —— 作品列表（对齐 FA-004-01）
export async function GET() {
  const works = await listWorks();
  return NextResponse.json({ ok: true, works });
}
