import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, findUserById, getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/session/me —— 当前会话身份（供前端导航判断角色/登录态）。
export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  const s = (await getSessionUser(token));
  if (!s) return NextResponse.json({ authenticated: false, user: null, roles: [] });

  if (s.uid === "env-admin") {
    return NextResponse.json({
      authenticated: true,
      user: { user_id: "env-admin", email: "admin", username: "admin", roles: s.r },
      roles: s.r,
    });
  }

  const user = await findUserById(s.uid);
  if (!user || user.status !== "active") {
    return NextResponse.json({ authenticated: false, user: null, roles: [] });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      roles: user.roles,
    },
    roles: user.roles,
  });
}
