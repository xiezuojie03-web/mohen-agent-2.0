import {signDatabaseSessionToken} from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import { getTaskStatus } from "../../../../../../lib/studio-research";
import { canAccess } from "../../../../../../lib/ownership";
import { getSession, isOperatorSession } from "../../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-039 GET /api/studio/research-tasks/:id/status —— 研究任务状态（对齐 FA-016-01 五节点进展）
const privateJson=(body:unknown,options:{status?:number}={})=>NextResponse.json(body,{...options,headers:{"cache-control":"no-store"}});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return privateJson({ ok: false, reason: "login_required" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return privateJson({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const task = await getTaskStatus(id,signDatabaseSessionToken(session));
  if (!task) {
    return privateJson({ ok: false, reason: "task_not_found" }, { status: 404 });
  }
  return privateJson({ ok: true, task });
}
