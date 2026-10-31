import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import { listAssets } from "../../../../lib/admin-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-001 GET /api/admin/assets —— 图片资产台账（对齐 FA-057-01 知识资产资格状态）
// 支持检索：?kind=&status=&q=（按类别/状态/关键词过滤）
export async function GET(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const kind = req.nextUrl.searchParams.get("kind") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const q = req.nextUrl.searchParams.get("q") || undefined;
  const assets = await listAssets({ kind, status, q });
  return NextResponse.json({ ok: true, assets });
}
