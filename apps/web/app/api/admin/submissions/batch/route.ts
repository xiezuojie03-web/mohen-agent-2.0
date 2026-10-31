import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../../lib/auth";
import { publishWork, rejectWork } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/submissions/batch —— 批量处理同类别审核（对齐 FA-054-02）
export async function POST(req: NextRequest) {
  const session = (await getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value));
  if (!session || !session.r.includes("operator")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let decision: unknown;
  let work_ids: unknown;
  try {
    const body = (await req.json()) as { decision?: unknown; work_ids?: unknown };
    decision = body.decision;
    work_ids = body.work_ids;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(work_ids) || (decision !== "approve" && decision !== "reject")) {
    return NextResponse.json({ ok: false, reason: "decision_and_work_ids_required" }, { status: 400 });
  }
  const results: Array<{ work_id: string; ok: boolean; reason?: string }> = [];
  for (const wid of work_ids) {
    if (typeof wid !== "string") continue;
    const r = decision === "approve" ? await publishWork(wid, session.uid) : (await rejectWork(wid), { ok: true });
    results.push({ work_id: wid, ok: r.ok, reason: r.reason });
  }
  return NextResponse.json({ ok: true, results });
}
