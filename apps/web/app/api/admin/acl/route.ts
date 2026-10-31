import { NextRequest, NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["member", "creator", "operator", "reviewer"];

/**
 * POST /api/admin/acl —— 设置指定用户的角色（对齐 FA-059-01）
 * P0 安全止血（2026-10-29）：
 * - 仅 operator/reviewer 可操作；角色必须落在白名单；
 * - 禁止修改自己的角色（防自升权）；
 * - 只有 reviewer 才能授予/撤销 reviewer（两把钥匙）；
 * - 保留至少一名 active operator / reviewer。
 */
export async function POST(req: NextRequest) {
  const session = (await getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value));
  if (!session || (!session.r.includes("operator") && !session.r.includes("reviewer"))) {
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
  if (id === session.uid) {
    return NextResponse.json({ ok: false, reason: "self_role_change_forbidden" }, { status: 403 });
  }

  const exists = await queryValue("select user_id::text from public.users where user_id = :'id'", { id });
  if (!exists) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const cur = await queryValue(
    "select array_to_string(roles, ',') as roles from public.users where user_id = :'id'",
    { id }
  );
  const curRoles = String(cur || "").split(",").filter(Boolean);
  const touchesReviewer = curRoles.includes("reviewer") !== r.includes("reviewer");
  if (touchesReviewer && !session.r.includes("reviewer")) {
    return NextResponse.json({ ok: false, reason: "reviewer_change_requires_reviewer" }, { status: 403 });
  }

  // 保护：如果本次操作会移除该用户的 operator/reviewer 且其为最后一名 active，则拒绝。
  for (const role of ["operator", "reviewer"] as const) {
    if (curRoles.includes(role) && !r.includes(role)) {
      const cnt = await queryValue(
        `select count(*)::int from public.users where '${role}' = any(roles) and status = 'active'`
      );
      if (Number(cnt) <= 1) {
        return NextResponse.json({ ok: false, reason: `last_${role}` }, { status: 409 });
      }
    }
  }

  await run("update public.users set roles = :'roles'::text[], updated_at = now() where user_id = :'id'", {
    id,
    roles: `{${r.join(",")}}`,
  });
  return NextResponse.json({ ok: true, user_id: id, roles: r });
}
