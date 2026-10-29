import { NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";
import {
  OPERATOR_COOKIE,
  OWNER_EMAIL,
  findUserByEmail,
  hashPassword,
  signSessionToken,
} from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 注册（补缺施工第一步）：全员注册。默认 member；Owner 邮箱自动授予全部角色。
export async function POST(req: Request) {
  let email: unknown;
  let username: unknown;
  let password: unknown;
  try {
    const body = (await req.json()) as { email?: unknown; username?: unknown; password?: unknown };
    email = body.email;
    username = body.username;
    password = body.password;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  const u = typeof username === "string" ? username.trim() : "";
  const p = typeof password === "string" ? password : "";

  if (!EMAIL_RE.test(e)) return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  if (u.length < 2) return NextResponse.json({ ok: false, reason: "invalid_username" }, { status: 400 });
  if (p.length < 6) return NextResponse.json({ ok: false, reason: "weak_password" }, { status: 400 });

  const existing = await findUserByEmail(e);
  if (existing) return NextResponse.json({ ok: false, reason: "email_taken" }, { status: 409 });

  const isOwner = e === OWNER_EMAIL.toLowerCase();
  const roles = isOwner ? ["member", "creator", "operator", "reviewer"] : ["member"];

  const userId = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.users (user_id, email, username, password_hash, roles) " +
      "values (:'id', :'email', :'username', :'hash', :'roles'::text[])",
    {
      id: userId!,
      email: e,
      username: u,
      hash: hashPassword(p),
      roles: `{${roles.join(",")}}`,
    }
  );

  const res = NextResponse.json({ ok: true, user: { user_id: userId, email: e, username: u, roles } });
  res.cookies.set(OPERATOR_COOKIE, signSessionToken(userId!, roles), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
