import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, getSessionUser, isOperator } from "../../../../lib/auth";
import { listPublished, processDueSchedules, publishWork } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-X04 GET /api/admin/publications —— 已发布列表（运营视角）
// API-050 POST /api/admin/publications —— 发布作品（对齐 FA-055-01）
// 交付包 20261102 目标（吸收②批）：GET 不再隐式触发到期定时发布；
// 到期任务改为操作员显式 POST { action: "run_due" }，执行时仍逐件重验发布资格。
export async function GET(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const works = await listPublished();
  return NextResponse.json({ ok: true, publications: works });
}

export async function POST(req: NextRequest) {
  const session = (await getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value));
  if (!session || !session.r.includes("operator")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let work_id: unknown;
  let action: unknown;
  try {
    const body = (await req.json()) as { work_id?: unknown; action?: unknown };
    action = body.action;
    work_id = body.work_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (action === "run_due") {
    const processed = await processDueSchedules();
    return NextResponse.json({ ok: true, processed });
  }
  if (typeof work_id !== "string") {
    return NextResponse.json({ ok: false, reason: "work_id_required" }, { status: 400 });
  }
  const done = await publishWork(work_id, session.uid);
  return NextResponse.json({ ok: done.ok, reason: done.reason });
}
