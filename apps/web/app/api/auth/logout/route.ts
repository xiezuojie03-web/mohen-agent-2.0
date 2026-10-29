import { NextResponse } from "next/server";
import { OPERATOR_COOKIE } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
