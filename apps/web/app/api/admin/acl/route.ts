import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/acl —— 设置指定用户的角色（对齐 FA-059-01）
 * KAD1 生成代（交付包 20261102 目标，吸收②批落地）：
 * - 角色变更收敛为库内事务 control.kad1_change_account（advisory lock 串行化），
 *   由 DB 侧统一执行 operator 身份、禁自改、reviewer 两把钥匙、末位保护；
 * - 动者身份经 mohen.session_token 会话上下文绑定，不由请求参数自述；
 * - kad1 迁移为设计目标，生产库未应用时本路由失败关闭（函数缺失即错误，不静默降级）。
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  const session = await getSessionUser(token);
  if (!session || !(session.r.includes("operator"))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const id = body.user_id;
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, reason: "invalid_id" }, { status: 400 });
  }
  const roles = body.roles;
  if (
    !Array.isArray(roles) ||
    !roles.length ||
    roles.some((r) => typeof r !== "string" || !["member", "creator", "operator", "reviewer"].includes(r))
  ) {
    return NextResponse.json({ ok: false, reason: "invalid_roles" }, { status: 400 });
  }
  const rows = await queryRows(
    `with context as materialized(select set_config('mohen.session_token',:'token',true))
     select control.kad1_change_account(:'actor'::uuid,:'id'::uuid,:'roles'::text[],:'status') as reason from context`,
    { token, actor: session.uid, id, roles: `{${roles.join(",")}}`, status: null }
  );
  const reason = String(rows[0]?.reason || "unavailable");
  if (reason !== "ok") {
    return NextResponse.json(
      { ok: false, reason },
      { status: reason === "not_found" ? 404 : reason.startsWith("last_") ? 409 : reason.startsWith("invalid_") ? 400 : 403 }
    );
  }
  return NextResponse.json({ ok: true, user_id: id, roles });
}
