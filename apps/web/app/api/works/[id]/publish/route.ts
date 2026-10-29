import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../../lib/auth";
import { publishWork } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!isOperator(token)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const done = await publishWork(id, "operator");
  return NextResponse.json({ ok: done.ok, reason: done.reason });
}
