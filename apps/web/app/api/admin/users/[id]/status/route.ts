import { NextRequest, NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/users/:id/status —— 禁用/启用账户（对齐 FA-060-02）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getSessionUser(req.cookies.get(OPERATOR_COOKIE)?.value));
  if (!session || !session.r.includes("operator")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.uid) {
    return NextResponse.json({ ok: false, reason: "self_disable_forbidden" }, { status: 403 });
  }

  let status: unknown;
  try {
    status = ((await req.json()) as { status?: unknown }).status;
  } catch {
    status = undefined;
  }
  if (status !== "active" && status !== "disabled") {
    return NextResponse.json({ ok: false, reason: "invalid_status" }, { status: 400 });
  }
  const target = status;

  const exists = await queryValue("select user_id::text from public.users where user_id = :'id'", { id });
  if (!exists) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  if (target === "disabled") {
    const rolesRaw = await queryValue(
      "select array_to_string(roles, ',') as roles from public.users where user_id = :'id'",
      { id }
    );
    const roles = String(rolesRaw || "").split(",").filter(Boolean);
    for (const role of ["operator", "reviewer"]) {
      if (!roles.includes(role)) continue;
      const opCount = await queryValue(
        "select count(*)::int from public.users where :'role' = any(roles) and status = 'active'",
        { role }
      );
      if (Number(opCount) <= 1) {
        return NextResponse.json({ ok: false, reason: `last_${role}` }, { status: 409 });
      }
    }
  }

  await run("update public.users set status = :'status', updated_at = now() where user_id = :'id'", {
    id,
    status: target,
  });
  return NextResponse.json({ ok: true, user_id: id, status: target });
}
