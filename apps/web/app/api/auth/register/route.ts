import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { queryValue, run } from "@mohen/data-access";
import {
  OPERATOR_COOKIE,
  findUserByEmail,
  hashPassword,
  isAuthConfigured,
  signSessionToken,
} from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * 注册（P0 安全止血 2026-10-29）：
 * - 默认关闭公开注册；必须持有效邀请码（MOHEN_INVITE_CODE）。
 * - Owner 首次开通：邮箱 = OWNER_EMAIL 且提供正确 OWNER_SETUP_TOKEN，才授予四角色。
 * - 不再"邮箱对上就自动提权"，避免他人抢注 Owner 邮箱即获得运营/审核权。
 */
export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ ok: false, reason: "auth_not_configured" }, { status: 503 });
  }

  let email: unknown;
  let username: unknown;
  let password: unknown;
  let inviteCode: unknown;
  let ownerSetupToken: unknown;
  try {
    const body = (await req.json()) as {
      email?: unknown;
      username?: unknown;
      password?: unknown;
      invite_code?: unknown;
      owner_setup_token?: unknown;
    };
    email = body.email;
    username = body.username;
    password = body.password;
    inviteCode = body.invite_code;
    ownerSetupToken = body.owner_setup_token;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  const u = typeof username === "string" ? username.trim() : "";
  const p = typeof password === "string" ? password : "";

  if (!EMAIL_RE.test(e)) return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  if (u.length < 2) return NextResponse.json({ ok: false, reason: "invalid_username" }, { status: 400 });
  if (p.length < 8) return NextResponse.json({ ok: false, reason: "weak_password" }, { status: 400 });

  const existing = await findUserByEmail(e);
  if (existing) return NextResponse.json({ ok: false, reason: "email_taken" }, { status: 409 });

  const ownerEmail = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  const ownerToken = process.env.OWNER_SETUP_TOKEN || "";
  const isOwnerSetup =
    !!ownerEmail &&
    !!ownerToken &&
    e === ownerEmail &&
    typeof ownerSetupToken === "string" &&
    ownerSetupToken.length > 0 &&
    safeEqual(ownerSetupToken, ownerToken);

  const invite = process.env.MOHEN_INVITE_CODE || "";
  const inviteOk =
    !!invite && typeof inviteCode === "string" && inviteCode.length > 0 && safeEqual(inviteCode, invite);

  // 注册模式（Owner 2026-10-30 裁决）：open=开放注册；invite=邀请制；closed=关闭。
  // 当前站点未公开，默认 open（Owner 明确不要邀请制）；公开前可改为 invite/closed。
  const mode = (process.env.MOHEN_REGISTRATION_MODE || "open").replace(/^\uFEFF/, "").trim().toLowerCase();
  if (mode === "closed") {
    return NextResponse.json({ ok: false, reason: "registration_disabled" }, { status: 403 });
  }
  if (!isOwnerSetup && mode !== "open" && !inviteOk) {
    return NextResponse.json(
      { ok: false, reason: invite ? "invalid_invite" : "registration_disabled" },
      { status: 403 }
    );
  }

  const roles = isOwnerSetup
    ? ["member", "creator", "operator", "reviewer"]
    : ["member"];

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
