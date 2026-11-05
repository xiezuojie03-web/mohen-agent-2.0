import { NextResponse } from "next/server";
import { createDirectorPlan, prepareProjectDirectorInput } from "../../../../lib/studio-director";
import { guardRoute } from "../../../../lib/guard";
import { getSession } from "../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../lib/auth";
import { studioAssetFailure } from "../../../../lib/studio-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-065 POST /api/studio/director-plans —— 生成 A/B 导演方案（对齐 FA-017-01）
export async function POST(req: Request) {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  let brief: unknown;
  let topic: unknown;
  let projectId: unknown;
  try {
    const body = (await req.json()) as { brief?: unknown; topic?: unknown; project_id?: unknown };
    brief = body.brief;
    topic = body.topic;
    projectId = body.project_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof brief !== "string" || !brief.trim()) {
    return NextResponse.json({ ok: false, reason: "brief_required" }, { status: 400 });
  }
  if (projectId !== undefined) {
    if (typeof projectId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))
      return NextResponse.json({ok:false,reason:"project_id_invalid"},{status:400,headers:{"Cache-Control":"no-store"}});
    try {
      const binding = await prepareProjectDirectorInput(projectId, signDatabaseSessionToken(session));
      return NextResponse.json({ok:false,...binding},{status:409,headers:{"Cache-Control":"no-store"}});
    } catch (error) {
      const response = studioAssetFailure(error); response.headers.set("Cache-Control", "no-store"); return response;
    }
  }
  const created = await createDirectorPlan(
    brief.trim(),
    typeof topic === "string" ? topic : "jinze",
    session.uid
  );
  if (!created) {
    return NextResponse.json({ ok: false, state: "HOLD", reason: "external_processing_not_authorized", missing_requirements: ["PROJECT_SOURCE_SNAPSHOT", "CURRENT_EXTERNAL_PROCESSING_RIGHTS", "CONTROLLED_PROVIDER_PURPOSE_INPUT_CONTEXT", "AUTHORIZED_SPEND"] }, {status:409,headers:{"Cache-Control":"no-store"}});
  }
  return NextResponse.json({
    ok: true,
    plan_id: created.planId,
    planA: created.planA,
    planB: created.planB,
    facts: created.facts,
    finding: created.finding,
  });
}
