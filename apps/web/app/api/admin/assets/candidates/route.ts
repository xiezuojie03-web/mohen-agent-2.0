import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../../lib/auth";
import { addAssetCandidate } from "../../../../../lib/admin-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-049 POST /api/admin/assets/candidates —— 登记候选图片资产（对齐 FA-058-01）
export async function POST(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim() || typeof body.kind !== "string") {
    return NextResponse.json({ ok: false, reason: "title_and_kind_required" }, { status: 400 });
  }
  const assetId = await addAssetCandidate({
    title: body.title.trim(),
    kind: body.kind,
    source_url: typeof body.source_url === "string" ? body.source_url : undefined,
    license: typeof body.license === "string" ? body.license : undefined,
    author: typeof body.author === "string" ? body.author : undefined,
    intended_use: typeof body.intended_use === "string" ? body.intended_use : undefined,
    ratio: typeof body.ratio === "string" ? body.ratio : undefined,
  });
  return NextResponse.json({ ok: true, asset_id: assetId });
}
