import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE } from "../../../../../lib/auth";
import { verifyReviewer } from "../../../../../lib/gate-review";
import { listPendingReview } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/governance/gates/pending —— 待独立 Reviewer 签核的作品（资格把关队列）
export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await verifyReviewer(token))) {
    return NextResponse.json({ ok: false, reason: "reviewer_forbidden" }, { status: 403 });
  }
  const works = await listPendingReview();
  return NextResponse.json({ ok: true, works });
}
