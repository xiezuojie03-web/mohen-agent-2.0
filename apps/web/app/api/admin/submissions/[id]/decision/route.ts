import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../../../lib/auth";
import { publishWork, rejectWork } from "../../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-055 POST /api/admin/submissions/:id/decision —— 审核通过/拒绝（对齐 FA-054-01）
// approve = 发布（写入 published_pointers）；reject = 退回（status=rejected）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value);
  if (!session || !session.r.includes("operator")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let decision: unknown;
  try {
    const body = (await req.json()) as { decision?: unknown };
    decision = body.decision;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (decision === "approve") {
    const done = await publishWork(id, session.uid);
    return NextResponse.json({ ok: done.ok, reason: done.reason });
  }
  if (decision === "reject") {
    const done = await rejectWork(id);
    return NextResponse.json({ ok: done });
  }
  return NextResponse.json({ ok: false, reason: "invalid_decision" }, { status: 400 });
}
