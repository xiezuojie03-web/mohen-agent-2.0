import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import { listSubmitted } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await isOperator(token))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const works = await listSubmitted();
  return NextResponse.json({ works });
}
