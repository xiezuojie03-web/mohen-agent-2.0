import { NextRequest, NextResponse } from "next/server";
import { verifyReviewer, signWorkPublication } from "../../../../../lib/gate-review";
import { OPERATOR_COOKIE, getSessionUser, findUserById } from "../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-062 POST /api/governance/gates/decisions —— 独立 Reviewer 作品发布裁决（E1-GATE-ACTIVATE）
// 独立 Reviewer 用登录身份（roles 含 reviewer）签核「知识引用 + 媒体权利」；Operator 不得代签（CR-04）。
export async function POST(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await verifyReviewer(token))) {
    return NextResponse.json({ ok: false, reason: "reviewer_forbidden" }, { status: 403 });
  }
  const session = (await getSessionUser(token));

  let work_id: unknown;
  let revision_id: unknown;
  let decision: unknown;
  let note: unknown;
  try {
    const body = (await req.json()) as {
      work_id?: unknown;
      revision_id?: unknown;
      decision?: unknown;
      note?: unknown;
    };
    work_id = body.work_id;
    revision_id = body.revision_id;
    decision = body.decision;
    note = body.note;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  if (typeof work_id !== "string") {
    return NextResponse.json({ ok: false, reason: "work_id_required" }, { status: 400 });
  }
  const validUuid = (id: unknown) =>
    typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!validUuid(work_id)) {
    return NextResponse.json({ ok: false, reason: "invalid_work_id" }, { status: 400 });
  }
  if (!validUuid(revision_id)) {
    return NextResponse.json({ ok: false, reason: "revision_id_required" }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ ok: false, reason: "invalid_decision" }, { status: 400 });
  }

  // 记录真实 reviewer 标识（邮箱优先，退化到 user_id）。
  const reviewerUser = session ? await findUserById(session.uid) : null;
  const reviewer = reviewerUser?.email || session?.uid;
  if (!reviewer) return NextResponse.json({ ok: false, reason: "reviewer_identity_required" }, { status: 403 });

  const result = await signWorkPublication(
    work_id,
    revision_id as string,
    decision,
    reviewer,
    typeof note === "string" ? note : undefined
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, decision, reviewer }, { headers: { "cache-control": "no-store" } });
}
