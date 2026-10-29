import { NextRequest, NextResponse } from "next/server";
import { queryValue, run } from "@mohen/data-access";
import { OPERATOR_COOKIE, isOperator } from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/users/:id/status —— 禁用/启用账户（对齐 FA-060-02）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let status: unknown;
  try {
    status = ((await req.json()) as { status?: unknown }).status;
  } catch {
    status = undefined;
  }
  const target = status === "active" ? "active" : "disabled";

  const exists = await queryValue("select user_id::text from public.users where user_id = :'id'", { id });
  if (!exists) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  await run("update public.users set status = :'status', updated_at = now() where user_id = :'id'", {
    id,
    status: target,
  });
  return NextResponse.json({ ok: true, user_id: id, status: target });
}
