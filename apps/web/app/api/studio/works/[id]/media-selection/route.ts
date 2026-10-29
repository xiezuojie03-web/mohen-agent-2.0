import { NextResponse } from "next/server";
import { selectMediaCandidates } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/media-selection —— 替换镜头素材（对齐 FA-027-02；返回已登记资产候选）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const result = await selectMediaCandidates();
  return NextResponse.json({ ok: true, ...result });
}
