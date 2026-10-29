import { NextResponse } from "next/server";
import { submitWork } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/submissions —— 提交审核（对齐 FA-022-01）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await submitWork(id);
  return NextResponse.json({ ok: true });
}
