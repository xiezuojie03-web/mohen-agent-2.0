// apps/web/middleware.ts — P0-1 统一入口鉴权（2026-10-29）
//
// 作用：除白名单外，所有 /api/* 请求必须携带有效会话 Cookie，否则 401。
// 这样即使某个 route 忘了写鉴权，也不会"裸奔"；route 内部再做角色/归属校验（纵深防御）。
//
// 白名单原则：
// - 认证入口（login/register/logout/me）
// - 公开阅读（/api/public/*、已发布作品、帮助、政策、搜索）
// 其余（studio/works/explore/admin/governance/notifications/mohen）一律要求登录。
import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "./lib/auth";

const COOKIE = "mohen_role";

const PUBLIC_PREFIXES = ["/api/public/", "/api/help/"];
const PUBLIC_EXACT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/session/me",
  "/api/search",
  "/api/works/published",
  // 公开体验页（金泽/绿之丘）的即时问答；内部有限流与缓存，P1 再收紧。
  "/api/mohen/ask",
  "/api/mohen/materials",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    return NextResponse.json({ ok: false, reason: "auth_not_configured" }, { status: 503 });
  }

  const token = req.cookies.get(COOKIE)?.value;
  const resolution = await resolveSession(token);
  if (resolution.state === "unavailable") {
    return NextResponse.json({ ok: false, reason: "auth_dependency_unavailable" }, { status: 503 });
  }
  if (resolution.state !== "authenticated") {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  const session = resolution.session;
  const headers = new Headers(req.headers);
  headers.set("x-mohen-uid", session.uid);
  headers.set("x-mohen-roles", session.r.join(","));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
  // Next 15.5 起支持 Node.js middleware；必须用 Node runtime 才能读取服务端 AUTH_SECRET
  //（Edge runtime 下非 NEXT_PUBLIC_ 环境变量在构建期不可用，会导致误报 auth_not_configured）。
  runtime: "nodejs",
};
