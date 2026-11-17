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

import {createCloudProductionAuthenticator} from "../../pipelines/data-production/orchestrator/cloud-production-dispatch.mjs";

const COOKIE = "mohen_role";
// Fail-closed auth responses must not be cached by the browser or Vercel edge.
const DENIED_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" };

const PUBLIC_PREFIXES = [
  "/api/public/",
  "/api/help/",
  // 已发布作品的原件扫描页：route 内部每次请求都复核 WATCH 资格，不含未发布/未授权内容。
  "/api/works/media/",
];
const PUBLIC_EXACT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/password-setup",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
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
  // Only this machine endpoint uses HMAC instead of a browser cookie.
  // The receiver repeats auth and verifies Owner/original scope before claiming.
  if (pathname === "/api/internal/production-execute") {
    if (process.env.MOHEN_CLOUD_EXECUTION_ENABLED !== "true")
      return NextResponse.json({ok:false,reason:"cloud_executor_not_configured"},{status:503,headers:DENIED_HEADERS});
    const result=await createCloudProductionAuthenticator({credential:process.env.MOHEN_CLOUD_EXECUTOR_CREDENTIAL})(req.clone());
    return result instanceof Response ? result : NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    return NextResponse.json({ ok: false, reason: "auth_not_configured" }, { status: 503, headers: DENIED_HEADERS });
  }

  const token = req.cookies.get(COOKIE)?.value;
  const resolution = await resolveSession(token);
  if (resolution.state === "unavailable") {
    return NextResponse.json({ ok: false, reason: "auth_dependency_unavailable" }, { status: 503, headers: DENIED_HEADERS });
  }
  if (resolution.state !== "authenticated") {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: DENIED_HEADERS });
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
