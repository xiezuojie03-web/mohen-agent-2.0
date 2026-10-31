import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-011 GET /api/admin/users —— 用户列表（对齐 FA-060-01）
export async function GET(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const rows = await queryRows(
    "select user_id::text as user_id, email, username, array_to_string(roles, ',') as roles, " +
      "status, created_at::text as created_at " +
      "from public.users order by created_at desc limit 200"
  );
  const users = rows.map((r) => ({
    user_id: String(r.user_id),
    email: String(r.email),
    username: String(r.username),
    roles: String(r.roles || "").split(",").filter(Boolean),
    status: String(r.status),
    created_at: r.created_at,
  }));
  return NextResponse.json({ ok: true, users });
}
