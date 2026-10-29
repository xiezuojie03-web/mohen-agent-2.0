import { NextResponse } from "next/server";
import { getWorkPanels } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-X01 POST /api/studio/director-plans/:id/panels —— 生成作品四面板
// （故事结构 / 画面风格 / 配音旁白 / 背景音乐）
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.director_plans");
  if (denied) return denied;
  const { id } = await params;
  const panels = await getWorkPanels(id);
  if (!panels) {
    return NextResponse.json({ ok: false, reason: "plan_not_selected_or_no_beats" });
  }
  return NextResponse.json({ ok: true, panels });
}
