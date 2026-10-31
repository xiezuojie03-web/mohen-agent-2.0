import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-008 GET /api/admin/session —— 运营会话/权限范围（对齐 152 动作账 FA-051-02）
// 未登录运营身份时明确拒绝（ROLE_FORBIDDEN 语义），不静默返回空。
export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await isOperator(token))) {
    return NextResponse.json({ authenticated: false, role: null, reason: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ authenticated: true, role: "operator" });
}
