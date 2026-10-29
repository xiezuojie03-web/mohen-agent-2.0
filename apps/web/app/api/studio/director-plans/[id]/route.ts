import { NextResponse } from "next/server";
import { getDirectorPlan } from "../../../../../lib/studio-director";
import { guardRoute } from "../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-034 GET /api/studio/director-plans/:id —— 方案详情（对齐 FA-017-02）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.director_plans");
  if (denied) return denied;
  const { id } = await params;
  const plan = await getDirectorPlan(id);
  if (!plan) {
    return NextResponse.json({ ok: false, reason: "plan_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, plan });
}
