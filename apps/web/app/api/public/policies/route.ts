import { NextResponse } from "next/server";
import { listPolicies } from "../../../../lib/fine-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/policies —— 权利与联系页面（对齐 FA-011-02，真实政策库）
export async function GET() {
  const policies = await listPolicies();
  return NextResponse.json({ ok: true, policies, available: policies.length > 0 });
}
