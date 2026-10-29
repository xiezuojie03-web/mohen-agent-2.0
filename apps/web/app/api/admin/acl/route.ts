import { NextRequest, NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["member", "creator", "operator", "reviewer"];

// POST /api/admin/acl —— 设置指定用户的角色（对齐 FA-059-01）
// 约束：仅 operator/reviewer 可操作；角色必须落在白名单；禁止清空 operator（保留至少一名运营）。
export async function POST(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let userId: unknown;
  let roles: unknown;
  try {
    const body = (await req.json()) as { user_id?: unknown; roles?: unknown };
    userId = body.user_id;
    roles = body.roles;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const id = typeof userId === "string" ? userId : "";
  const r = Array.isArray(roles) ? roles.filter((x): x is string => typeof x === "string") : [];
  if (!id) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  if (!r.length || r.some((x) => !VALID_ROLES.includes(x))) {
    return NextResponse.json({ ok: false, reason: "invalid_roles" }, { status: 400 });
  }

  const exists = await queryValue("select user_id::text from public.users where user_id = :'id'", { id });
  if (!exists) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  // 保护：如果本次操作会移除该用户的 operator 且其为最后一名 operator，则拒绝。
  const cur = await queryValue(
    "select array_to_string(roles, ',') as roles from public.users where user_id = :'id'",
    { id }
  );
  const curRoles = String(cur || "").split(",").filter(Boolean);
  if (curRoles.includes("operator") && !r.includes("operator")) {
    const opCount = await queryValue(
      "select count(*)::int from public.users where 'operator' = any(roles) and status = 'active'"
    );
    if (Number(opCount) <= 1) {
      return NextResponse.json({ ok: false, reason: "last_operator" }, { status: 409 });
    }
  }

  await run("update public.users set roles = :'roles'::text[], updated_at = now() where user_id = :'id'", {
    id,
    roles: `{${r.join(",")}}`,
  });
  return NextResponse.json({ ok: true, user_id: id, roles: r });
}
