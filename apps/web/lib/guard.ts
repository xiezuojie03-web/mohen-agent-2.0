// apps/web/lib/guard.ts — 路由级统一守卫（P0-1 收口，2026-10-29）
//
// 与 middleware 分工：
// - middleware 负责"有没有登录"（全局兜底）；
// - 本 helper 负责"这个资源是不是你的/你有没有这个角色"（逐路由，纵深防御）。
//
// 用法（由 codemod/人工插入到 handler 开头）：
//   const denied = await guardRoute(params, "publication.works");
//   if (denied) return denied;
// params 为 Next 15 的 Promise<{id}>；无路由参数的 handler 传 null。
import { NextResponse } from "next/server";
import { getSession, isOperatorSession } from "./session";
import { canAccess, type OwnedTable } from "./ownership";

export async function guardRoute(
  params: Promise<{ id?: string }> | null,
  table: OwnedTable | null
): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }
  if (!table) return null;

  if (!params) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const p = await params;
  const id = p?.id;
  if (!id) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const allowed = await canAccess(table, id, session.uid, isOperatorSession(session));
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  return null;
}
