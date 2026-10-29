import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { OPERATOR_COOKIE, isOperator } from "../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-002 GET /api/admin/gates/audits —— 门禁审计（对齐 FA-062 独立 Gate 工作流只读侧）
export async function GET(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const audits = await queryRows(
    "select gate_audit_id::text as id, run_id::text as run_id, stage, gate_code, result, reason_codes, checked_at::text as checked_at from control.gate_audits order by checked_at desc limit 50"
  );
  return NextResponse.json({ ok: true, audits: audits ?? [] });
}
