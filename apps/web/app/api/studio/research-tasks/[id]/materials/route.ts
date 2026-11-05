import {getSession} from "../../../../../../lib/session";
import {signDatabaseSessionToken} from "../../../../../../lib/auth";
import {readJsonColumn} from "../../../../../../lib/db-json";
import { NextResponse } from "next/server";
import { getTaskStatus } from "../../../../../../lib/studio-research";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/research-tasks/:id/materials —— 研究筛选素材（对齐 FA-019-01）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.research_tasks");
  if (denied) {denied.headers.set("cache-control","no-store");return denied;}
  const session=await getSession();
  if(!session)return NextResponse.json({ok:false,reason:"login_required"},{status:401,headers:{"cache-control":"no-store"}});
  const { id } = await params;
  const task = await getTaskStatus(id,signDatabaseSessionToken(session));
  if (!task) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404,headers:{"cache-control":"no-store"} });
  const cp=readJsonColumn<Record<string,unknown>>(task.checkpoint,{});
  const read=cp.materialRead as {state?:string;reason?:string}|undefined;
  if(read?.state==="HOLD")return NextResponse.json({ok:false,reason:read.reason,materials:[],researchLeads:[]},{status:503,headers:{"cache-control":"no-store"}});
  return NextResponse.json({
    ok: true,
    materials: (cp.decision as { materials?: unknown } | undefined)?.materials ?? [],
    researchLeads: cp.researchLeads ?? [],
  },{headers:{"cache-control":"no-store"}});
}
