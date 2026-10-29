import { NextResponse } from "next/server";
import { selectMediaCandidates } from "../../../../../../lib/studio-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/media-selection —— 替换镜头素材（对齐 FA-027-02；返回已登记资产候选）
export async function POST() {
  const result = await selectMediaCandidates();
  return NextResponse.json({ ok: true, ...result });
}
