import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import { setSetting, getSettings } from "../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/settings —— 调整可授权系统设置（对齐 FA-061-02，真实持久化）
export async function POST(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let key: unknown;
  let value: unknown;
  try {
    const body = (await req.json()) as { key?: unknown; value?: unknown };
    key = body.key;
    value = body.value;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ ok: false, reason: "key_required" }, { status: 400 });
  }
  await setSetting(key.trim(), value);
  return NextResponse.json({ ok: true });
}

// GET /api/admin/settings —— 读取系统设置
export async function GET(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json({ ok: true, settings });
}
