import { NextResponse } from "next/server";
import { getTaskStatus, resumeResearchTask } from "../../../../../../lib/studio-research";
import {getSession} from "../../../../../../lib/session";
import {signDatabaseSessionToken} from "../../../../../../lib/auth";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resume stays within the persisted ceiling; client numbers cannot grant credit.
// Unknown provider costs / settlement receipts require reconciliation first.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "public.research_tasks");
  if (denied) return denied;
  const { id } = await params;
  const task = await getTaskStatus(id);
  if (!task) {
    return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  }
  if (task.status !== "hold") {
    return NextResponse.json({ ok: false, reason: "not_hold" }, { status: 409 });
  }

  let additionalCeiling: unknown;
  let recoverUnderstanding = false;
  try {
    const raw = await req.text();
    const body: unknown = raw.trim() ? JSON.parse(raw) : {};
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("BAD_REQUEST");
    const options = body as {additionalCeiling?: unknown; recover_understanding?: unknown};
    additionalCeiling = options.additionalCeiling;
    if (options.recover_understanding !== undefined && options.recover_understanding !== true) throw new Error("BAD_REQUEST");
    recoverUnderstanding = options.recover_understanding === true;
    if (recoverUnderstanding && req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      throw new Error("BAD_REQUEST");
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (additionalCeiling !== undefined && (typeof additionalCeiling !== "number" || !Number.isFinite(additionalCeiling) ||
      additionalCeiling <= 0)) {
    return NextResponse.json({ ok: false, reason: "additional_budget_required" }, { status: 400 });
  }
  if (additionalCeiling !== undefined) {
    return NextResponse.json({ok:false,reason:"additional_budget_requires_authorization"},
      {status:409,headers:{"cache-control":"no-store"}});
  }
  const session=await getSession();
  if(!session)return NextResponse.json({ok:false,reason:"login_required"},{status:401});
  const result = await resumeResearchTask(id,undefined,signDatabaseSessionToken(session),recoverUnderstanding?session.uid:undefined);
  if (result.holdReason === "understanding_recovered")
    return NextResponse.json({ok:true,recovered:true},{headers:{"cache-control":"no-store"}});
  if (result.status !== "done") {
    return NextResponse.json(
      { ok: false, reason: result.holdReason || "resume_hold" },
      { status: 409, headers: { "cache-control": "no-store" } }
    );
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
