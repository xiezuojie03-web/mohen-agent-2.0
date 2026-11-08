import { NextResponse } from "next/server";
import { getDirectorPlan, selectDirectorPlan } from "../../../../../../lib/studio-director";
import { grantForStudioLlm } from "../../../../../../lib/studio/dispatch-grant";
import { guardRoute } from "../../../../../../lib/guard";
import { getSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-066 POST /api/studio/director-plans/:id/select —— 采纳方案并生成节拍（对齐 FA-018-01）
// M5 批次 G：带 delegation_id 时走受控 dispatcher 正道（grant，来源取 plan 行服务端绑定）。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.director_plans");
  if (denied) return denied;
  const { id } = await params;
  let which: unknown;
  let delegationId: unknown;
  try {
    const body = (await req.json()) as { which?: unknown; delegation_id?: unknown };
    which = body.which;
    delegationId = body.delegation_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (which !== "A" && which !== "B") {
    return NextResponse.json({ ok: false, reason: "which_required" }, { status: 400 });
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
      actions: ["llm_director_h3"], sourceIds, maxCalls: 1,
    });
    if (!("grant" in outcome))
      return NextResponse.json({ ok: false, state: "HOLD", reason: outcome.reason },
        { status: 409, headers: { "Cache-Control": "no-store" } });
    auth = outcome.grant;
  }
  const result = await selectDirectorPlan(id, which, auth);
  if (!result) {
    return NextResponse.json({ ok: false, reason: "plan_not_found_or_llm" });
  }
  return NextResponse.json({ ok: true, beats: result.beats });
}
