import { NextResponse } from "next/server";
import { createDirectorPlan, isDirectorPlanProjectBindingReady, prepareProjectDirectorInput } from "../../../../lib/studio-director";
import { readStudioResearchProject } from "../../../../lib/studio-research-read";
import { grantForStudioLlm, listProjectSourceIds } from "../../../../lib/studio/dispatch-grant";
import { guardRoute } from "../../../../lib/guard";
import { getSession } from "../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../lib/auth";
import { studioAssetFailure } from "../../../../lib/studio-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-065 POST /api/studio/director-plans —— 生成 A/B 导演方案（对齐 FA-017-01）
// M5 批次 G：project_id + delegation_id → 受控 dispatcher 正道（grant + 项目真实材料）；
// 仅 project_id → 维持只读绑定 409 HOLD（行为不变）。
export async function POST(req: Request) {
  const denied = await guardRoute(null, null);
  if (denied) return denied;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  let brief: unknown;
  let topic: unknown;
  let projectId: unknown;
  let delegationId: unknown;
  try {
    const body = (await req.json()) as { brief?: unknown; topic?: unknown; project_id?: unknown; delegation_id?: unknown };
    brief = body.brief;
    topic = body.topic;
    projectId = body.project_id;
    delegationId = body.delegation_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof brief !== "string" || !brief.trim()) {
    return NextResponse.json({ ok: false, reason: "brief_required" }, { status: 400 });
  }
  if (projectId !== undefined) {
    if (typeof projectId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))
      return NextResponse.json({ok:false,reason:"project_id_invalid"},{status:400,headers:{"Cache-Control":"no-store"}});
    const sessionToken = signDatabaseSessionToken(session);
    if (typeof delegationId === "string" && delegationId) {
      if (!(await isDirectorPlanProjectBindingReady()))
        return NextResponse.json({ok:false,state:"HOLD",reason:"project_binding_migration_required"},
          {status:409,headers:{"Cache-Control":"no-store"}});
      try {
        const sourceIds = await listProjectSourceIds(projectId, sessionToken);
        const outcome = await grantForStudioLlm({
          delegationId, projectId, sessionToken,
          actions: ["llm_director_h1", "llm_director_h2"],
          sourceIds, maxCalls: 2,
        });
        if (!("grant" in outcome))
          return NextResponse.json({ ok: false, state: "HOLD", reason: outcome.reason, detail: outcome.detail },
            { status: 409, headers: { "Cache-Control": "no-store" } });
        const read = await readStudioResearchProject(projectId, sessionToken, { persistReadingNotes: false });
        const facts = read.materials.map((m) => `${m.snippet}（出处：${m.sourceRef}）`).filter(Boolean);
        if (!facts.length)
          return NextResponse.json({ ok: false, state: "HOLD", reason: "no_project_materials" },
            { status: 409, headers: { "Cache-Control": "no-store" } });
        if (typeof read.snapshot?.snapshot_hash !== "string" || !read.snapshot.snapshot_hash
          || !Array.isArray(read.snapshot.private_material_ids))
          return NextResponse.json({ ok: false, state: "HOLD", reason: "research_snapshot_unavailable" },
            { status: 409, headers: { "Cache-Control": "no-store" } });
        const created = await createDirectorPlan(brief.trim(), "jinze", session.uid, {
          auth: outcome.grant, facts, sourceIds, projectId, delegationId,
          researchSnapshotHash: read.snapshot.snapshot_hash,
          researchSourceRefs: facts,
        });
        if (!created)
          return NextResponse.json({ ok: false, state: "HOLD", reason: "llm_dispatch_failed" },
            { status: 409, headers: { "Cache-Control": "no-store" } });
        return NextResponse.json({
          ok: true, plan_id: created.planId, planA: created.planA, planB: created.planB,
          facts: created.facts, finding: created.finding,
        }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const response = studioAssetFailure(error); response.headers.set("Cache-Control", "no-store"); return response;
      }
    }
    try {
      const binding = await prepareProjectDirectorInput(projectId, sessionToken);
      return NextResponse.json({ok:false,...binding},{status:409,headers:{"Cache-Control":"no-store"}});
    } catch (error) {
      const response = studioAssetFailure(error); response.headers.set("Cache-Control", "no-store"); return response;
    }
  }
  // Legacy unscoped requests cannot create or dispatch a DirectorPlan.
  // Require an Owner project before any external processing or persistence.
  return NextResponse.json({ok:false,state:"HOLD",reason:"project_scope_required"},
    {status:409,headers:{"Cache-Control":"no-store"}});
}
