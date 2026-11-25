import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import { listDecidedWorks } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/works/decided —— 已有编辑裁决的作品（运营视角：已通过待发布 / 待修改 / 已拒绝）
export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await isOperator(token))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const works = await listDecidedWorks();
  return NextResponse.json({ works });
}
