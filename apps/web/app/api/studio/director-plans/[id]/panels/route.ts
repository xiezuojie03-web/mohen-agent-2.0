import { NextResponse } from "next/server";
import { getDirectorPlan, getWorkPanels } from "../../../../../../lib/studio-director";
import { grantForStudioLlm } from "../../../../../../lib/studio/dispatch-grant";
import { guardRoute } from "../../../../../../lib/guard";
import { getSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-X01 POST /api/studio/director-plans/:id/panels —— 生成作品四面板
// （故事结构 / 画面风格 / 配音旁白 / 背景音乐）
// M5 批次 G：带 delegation_id 时走受控 dispatcher 正道（grant，来源取 plan 行服务端绑定）。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.director_plans");
  if (denied) return denied;
  const { id } = await params;
  let delegationId: unknown;
  try {
    delegationId = ((await req.json()) as { delegation_id?: unknown }).delegation_id;
  } catch {
    delegationId = undefined;
  }
  let auth: unknown;
  if (typeof delegationId === "string" && delegationId) {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
    const row = await getDirectorPlan(id);
    if (!row || typeof row.project_id !== "string")
      return NextResponse.json({ok:false,state:"HOLD",reason:"director_plan_project_binding_missing"},
        {status:409,headers:{"Cache-Control":"no-store"}});
    const sids = typeof row.source_ids === "string" ? JSON.parse(row.source_ids) : row.source_ids;
    const sourceIds = Array.isArray(sids) ? sids.filter((s: unknown) => typeof s === "string") : [];
    const outcome = await grantForStudioLlm({
      delegationId, projectId: row.project_id, sessionToken: signDatabaseSessionToken(session),
      actions: ["llm_work_panels"], sourceIds, maxCalls: 1,
    });
    if (!("grant" in outcome))
      return NextResponse.json({ ok: false, state: "HOLD", reason: outcome.reason },
        { status: 409, headers: { "Cache-Control": "no-store" } });
    auth = outcome.grant;
  }
  const panels = await getWorkPanels(id, auth);
  if (!panels) {
    return NextResponse.json({ ok: false, reason: "plan_not_selected_or_no_beats" });
  }
  return NextResponse.json({ ok: true, panels });
}
