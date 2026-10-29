import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-003 GET /api/admin/jobs —— 生产任务（对齐 FA-061-01 异常任务及执行回执）
export async function GET(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const jobs = await queryRows(
    "select run_id::text as run_id, status, current_stage, started_at::text as started_at from control.production_runs order by started_at desc limit 50"
  );
  return NextResponse.json({ ok: true, jobs: jobs ?? [] });
}
