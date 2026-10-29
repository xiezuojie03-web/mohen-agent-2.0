import { NextResponse } from "next/server";
import { getWorkStageStatus, getLatestRevision } from "../../../../../../lib/publication";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/works/:id/status —— 四步创作状态轴（对齐 FA-012-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  const stages = await getWorkStageStatus(id);
  const rev = await getLatestRevision(id);
  const latest = rev.length ? rev[0] : null;
  return NextResponse.json({ ok: true, stages, revision: latest ? { revision_id: latest.revision_id, revision_no: latest.revision_no, status: latest.status } : null });
}
