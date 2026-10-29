import { NextResponse } from "next/server";
import {
  OPERATOR_COOKIE,
  findUserCredentials,
  signSessionToken,
  verifyLogin,
  verifyPassword,
} from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 登录：优先真实用户（users 表），失败再回退旧环境变量 admin（仅本地开发兜底）。
export async function POST(req: Request) {
  let email: unknown;
  let password: unknown;
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    email = body.email;
    password = body.password;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  const p = typeof password === "string" ? password : "";

  // 1) 真实用户登录
  const cred = await findUserCredentials(e);
  if (cred) {
    if (cred.status !== "active") {
      return NextResponse.json({ ok: false, reason: "disabled" }, { status: 403 });
    }
    if (!verifyPassword(p, cred.password_hash)) {
      return NextResponse.json({ ok: false, reason: "invalid_credentials" }, { status: 401 });
    }
    const res = NextResponse.json({
      ok: true,
      user: { user_id: cred.user_id, email: cred.email, username: cred.username, roles: cred.roles },
    });
    res.cookies.set(OPERATOR_COOKIE, signSessionToken(cred.user_id, cred.roles), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return res;
  }

  // 2) 旧环境变量 admin 兜底（无 users 记录时，供本地开发进运营后台）
  if (verifyLogin(email, password)) {
    const roles = ["operator"];
    const res = NextResponse.json({ ok: true, user: { user_id: "env-admin", email: e, username: "admin", roles } });
    res.cookies.set(OPERATOR_COOKIE, signSessionToken("env-admin", roles), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return res;
  }

  return NextResponse.json({ ok: false, reason: "invalid_credentials" }, { status: 401 });
}
