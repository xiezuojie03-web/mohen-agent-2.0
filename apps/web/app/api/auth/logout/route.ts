import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, sessionCookieOptions, revocableSessionsEnabled, revokeSessionToken } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (revocableSessionsEnabled()) {
    try { await revokeSessionToken(request.cookies.get(OPERATOR_COOKIE)?.value); }
    catch { return NextResponse.json({ok:false,reason:"session_revocation_unavailable"},
      {status:503,headers:{"cache-control":"no-store"}}); }
  }
  const res = NextResponse.json({ ok: true }, {headers:{"cache-control":"no-store"}});
  res.cookies.set(OPERATOR_COOKIE, "", sessionCookieOptions(0));
  return res;
}
