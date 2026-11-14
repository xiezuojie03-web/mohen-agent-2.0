import { NextResponse } from "next/server";
import { getTaskStatus, requestProduction } from "../../../../../../lib/studio-research";
import { canAccess } from "../../../../../../lib/ownership";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";
import { createPrivateOriginalRepository, createPrivateSourceRegistrationRepository, getNodePgPool } from "@mohen/data-access";
import type { ProductionOriginal } from "../../../../../../lib/studio-production";
import { getSession, isOperatorSession } from "../../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API POST /api/studio/research-tasks/:id/production —— 触发该研究任务进入 D 链生产
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  // Operator may inspect authorized records but cannot spend another Creator's
  // research budget or start production in their Studio project.
  const allowed = await canAccess("public.research_tasks", id, session.uid, false);
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const task=await getTaskStatus(id);
  if(!task)return NextResponse.json({ok:false,reason:"task_not_found"},{status:404});
  if(task.status!=="done")return NextResponse.json({ok:false,reason:"task_not_ready"},{status:409});
  const checkpoint=typeof task.checkpoint==="string"
    ? (()=>{try{return JSON.parse(task.checkpoint);}catch{return null;}})()
    : task.checkpoint;
  const projectId=checkpoint&&typeof checkpoint==="object"&&!Array.isArray(checkpoint)
    ? (checkpoint as Record<string,unknown>).studio : null;
  const project=projectId&&typeof projectId==="object"&&!Array.isArray(projectId)
    ? (projectId as Record<string,unknown>).project_id : null;
  if(typeof project!=="string"||!UUID.test(project))
    return NextResponse.json({ok:false,reason:"production_project_binding_required"},{status:409});
  if(!(req.headers.get("content-type")??"").includes("application/json"))
    return NextResponse.json({ok:false,reason:"production_original_selection_required"},{status:409});
  let body:unknown;
  try{body=await req.json();}catch{return NextResponse.json({ok:false,reason:"bad_request"},{status:400});}
  const data=body&&typeof body==="object"&&!Array.isArray(body)?body as Record<string,unknown>:{};
  const originalId=data.original_id,page=data.page_number;
  if(typeof originalId!=="string"||!UUID.test(originalId)||!Number.isSafeInteger(page)||
     (page as number)<1||(page as number)>10000)
    return NextResponse.json({ok:false,reason:"production_original_selection_required"},{status:409});
  // Same short-lived Owner RLS identity as Studio's original inventory. Merely
  // passing an original_id from the browser never supplies production authority.
  let source:ProductionOriginal;
  try{
    const pool=getNodePgPool(),token=signDatabaseSessionToken(session);
    const original=await createPrivateOriginalRepository(pool).getStored(originalId,token);
    if(!original||original.project_id!==project||original.state!=="STORED_VERIFIED")
      return NextResponse.json({ok:false,reason:"production_original_forbidden"},{status:403});
    const registration=await createPrivateSourceRegistrationRepository(pool).lookup(originalId,token);
    if(registration.original_id!==originalId||registration.project_id!==project||
       registration.sha256!==original.sha256||registration.content_type!==original.content_type||
       registration.asset_revision_id!==original.asset_revision_id||
       Number(registration.byte_size)!==Number(original.byte_size))
      return NextResponse.json({ok:false,reason:"production_original_not_bound"},{status:409});
    source={originalId,pageNumber:page as number,sourceVersionId:registration.source_version_id,
      sha256:original.sha256,assetRevisionId:original.asset_revision_id,
      contentType:original.content_type,byteSize:Number(original.byte_size)};
  }catch(error){
    const code=error instanceof Error?error.message:"";
    if(code==="PRIVATE_SOURCE_REGISTRATION_INVALID")
      return NextResponse.json({ok:false,reason:"production_original_not_bound"},{status:409});
    return NextResponse.json({ok:false,reason:"production_original_check_unavailable"},{status:503});
  }

  const result = await requestProduction(id, session.uid, undefined, undefined, source);
  if (!result.ok) {
    const status = result.reason === "task_not_found" ? 404
      : result.reason === "task_not_ready" ? 409
      : result.reason === "forbidden" || result.reason === "production_project_forbidden" ? 403
      : result.reason === "production_project_binding_required" ? 409
      : result.reason?.startsWith("production_private_")||result.reason?.startsWith("production_acquisition_")?409
      : 400;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, run_id: result.run_id });
}

// API GET /api/studio/research-tasks/:id/production —— 查询该任务对应的真实生产运行状态
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }

  const checkpoint = (task as { checkpoint?: unknown }).checkpoint;
  const runId = checkpoint && typeof checkpoint === "object"
    ? (checkpoint as Record<string, unknown>).production_run_id as string | undefined
    : null;
  if (!runId) {
    return NextResponse.json({ ok: true, production: null, reason: "no_production" });
  }

  const { getProductionStatus } = await import("../../../../../../lib/studio-production");
  const production = await getProductionStatus(runId);
  return NextResponse.json({ ok: true, production });
}
