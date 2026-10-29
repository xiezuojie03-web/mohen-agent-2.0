// apps/web/lib/session.ts — 请求级会话读取（Next 15 cookies()）+ 角色判断。
// 与 lib/auth.ts 分工：auth.ts 只管"令牌怎么签/怎么验/用户怎么查"；本文件只管"当前请求是谁"。
import { cookies } from "next/headers";
import { OPERATOR_COOKIE, parseSessionToken } from "./auth";

export type Session = { uid: string; r: string[] };

/** 读取当前请求的登录会话；未登录返回 null（不抛异常，路由自行决定 401/403）。 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return parseSessionToken(store.get(OPERATOR_COOKIE)?.value);
}

export function hasRole(session: Session | null, role: string): boolean {
  return !!session && session.r.includes(role);
}

export function isOperatorSession(session: Session | null): boolean {
  return hasRole(session, "operator");
}

export function isReviewerSession(session: Session | null): boolean {
  return hasRole(session, "reviewer");
}
