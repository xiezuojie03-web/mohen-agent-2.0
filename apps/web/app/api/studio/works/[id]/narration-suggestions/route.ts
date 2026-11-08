import { NextResponse } from "next/server";
import { suggestNarration } from "../../../../../../lib/studio-creation";
import { grantForStudioLlm, sourceBindingForWork } from "../../../../../../lib/studio/dispatch-grant";
import { guardRoute } from "../../../../../../lib/guard";
import { getSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/studio/works/:id/narration-suggestions —— 请求 AI 优化旁白（对齐 FA-026-02，事实护栏内润色）
// M5 批次 G：带 delegation_id 时走受控 dispatcher 正道（来源取作品最新修订绑定的 plan.source_ids）。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  let narration: unknown;
  let delegationId: unknown;
  try {
    const body = (await req.json()) as { narration?: unknown; delegation_id?: unknown };
    narration = body.narration;
    delegationId = body.delegation_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof narration !== "string" || !narration.trim()) {
    return NextResponse.json({ ok: false, reason: "narration_required" }, { status: 400 });
  }
  let auth: unknown;
  if (typeof delegationId === "string" && delegationId) {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
    const binding = await sourceBindingForWork(id);
    if (!binding.projectId || !binding.sourceIds.length)
      return NextResponse.json({ok:false,state:"HOLD",reason:"work_project_binding_missing"},
        {status:409,headers:{"Cache-Control":"no-store"}});
    const outcome = await grantForStudioLlm({
      delegationId, projectId: binding.projectId, sessionToken: signDatabaseSessionToken(session),
      actions: ["llm_narration_suggest"], sourceIds: binding.sourceIds, maxCalls: 1,
    });
    if (!("grant" in outcome))
      return NextResponse.json({ ok: false, state: "HOLD", reason: outcome.reason },
        { status: 409, headers: { "Cache-Control": "no-store" } });
    auth = outcome.grant;
  }
  const suggestion = await suggestNarration(narration.trim(), auth);
  if (!suggestion) return NextResponse.json({ ok: false, reason: "llm_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, suggestion });
}
