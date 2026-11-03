import { NextResponse } from "next/server";
import {
  OPERATOR_COOKIE,
  findUserCredentials,
  isAuthConfigured,
  signSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 登录：只认真实用户（public.users）。P0 安全止血（2026-10-29）已删除旧环境变量 admin 后门。
export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ ok: false, reason: "auth_not_configured" }, { status: 503 });
  }
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
  if (!e || !p) return NextResponse.json({ ok: false, reason: "invalid_credentials" }, { status: 401 });

  const cred = await findUserCredentials(e);
  if (!cred) {
    // 不在响应里区分"账号不存在/密码错误"，避免账号枚举。
    return NextResponse.json({ ok: false, reason: "invalid_credentials" }, { status: 401 });
  }
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
    ...sessionCookieOptions(60 * 60 * 24),
  });
  return res;
}
