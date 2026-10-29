import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import { listPublished, processDueSchedules, publishWork } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-X04 GET /api/admin/publications —— 已发布列表（运营视角）
// API-050 POST /api/admin/publications —— 发布作品（对齐 FA-055-01）
export async function GET(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  await processDueSchedules(); // 惰性触发到期的定时发布
  const works = await listPublished();
  return NextResponse.json({ ok: true, publications: works });
}

export async function POST(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let work_id: unknown;
  try {
    const body = (await req.json()) as { work_id?: unknown };
    work_id = body.work_id;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof work_id !== "string") {
    return NextResponse.json({ ok: false, reason: "work_id_required" }, { status: 400 });
  }
  const done = await publishWork(work_id, "operator");
  return NextResponse.json({ ok: done.ok, reason: done.reason });
}
