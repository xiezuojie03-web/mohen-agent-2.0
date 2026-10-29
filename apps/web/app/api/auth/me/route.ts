import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, findUserById, getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/me —— 当前登录用户身份 + 角色。
export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  const s = getSessionUser(token);
  if (!s) return NextResponse.json({ authenticated: false, user: null });

  // 环境变量兜底的虚拟 admin：不查库，直接返回运营身份。
  if (s.uid === "env-admin") {
    return NextResponse.json({
      authenticated: true,
      user: { user_id: "env-admin", email: "admin", username: "admin", roles: s.r },
    });
  }

  const user = await findUserById(s.uid);
  if (!user || user.status !== "active") {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      roles: user.roles,
    },
  });
}
