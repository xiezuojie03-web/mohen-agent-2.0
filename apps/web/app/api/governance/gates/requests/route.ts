import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { OPERATOR_COOKIE, hasRole } from "../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-020 GET /api/governance/gates/requests —— 待审/最近 Gate 请求（对齐 FA-062-01；reviewer 或 operator 可见）
export async function GET(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await hasRole(token, "reviewer")) && !(await hasRole(token, "operator"))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const requests = await queryRows(
    `select gate_audit_id::text as id, run_id::text as run_id, stage, gate_code,
            object_type, object_id, result, current_valid, checked_at::text as checked_at
     from control.gate_audits order by checked_at desc limit 50`
  );
  return NextResponse.json({ ok: true, requests: requests ?? [] });
}
