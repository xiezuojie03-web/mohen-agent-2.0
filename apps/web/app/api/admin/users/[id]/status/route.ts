import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/users/:id/status —— 禁用/启用账户（对齐 FA-060-02）
 * KAD1 生成代（交付包 20261102 目标，吸收②批落地）：与 /api/admin/acl 同一库内事务
 * control.kad1_change_account（roles 为空、status 生效），禁自改/末位保护/会话绑定由 DB 统一执行；
 * kad1 迁移未应用的生产环境失败关闭，不静默降级。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, reason: "invalid_id" }, { status: 400 });
  }
  if (body.status !== "active" && body.status !== "disabled") {
    return NextResponse.json({ ok: false, reason: "invalid_status" }, { status: 400 });
  }
  const rows = await queryRows(
    `with context as materialized(select set_config('mohen.session_token',:'token',true))
     select control.kad1_change_account(:'actor'::uuid,:'id'::uuid,:'roles'::text[],:'status') as reason from context`,
    { token, actor: session.uid, id, roles: null, status: String(body.status) }
  );
  const reason = String(rows[0]?.reason || "unavailable");
  if (reason !== "ok") {
    return NextResponse.json(
      { ok: false, reason },
      { status: reason === "not_found" ? 404 : reason.startsWith("last_") ? 409 : reason.startsWith("invalid_") ? 400 : 403 }
    );
  }
  return NextResponse.json({ ok: true, user_id: id, status: body.status });
}
