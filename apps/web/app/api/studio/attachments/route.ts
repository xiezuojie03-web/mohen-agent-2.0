import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FA-015-02: legacy attachment endpoint, temporarily failed closed.
// Historical code wrote uploaded bytes to public/uploads (publicly reachable,
// not durable on serverless hosts) and then acknowledged a candidate asset.
// A material pointer must never imply that private original bytes were stored.
// Restore this endpoint only after private object persistence, owner-scope
// access, byte readback, SHA-256 and failure-atomic metadata tests pass.
export async function POST(_req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "login_required" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    {
      ok: false,
      reason: "private_original_storage_unavailable",
      message: "附件原件尚不能安全持久保存；请使用资料台中受权限保护的文本或PDF阅读导入，原件附件功能将在存储验证后开放。",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
