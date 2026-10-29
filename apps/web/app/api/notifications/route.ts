import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-022 GET /api/notifications —— 当前会话的通知（对齐 FA-001-04）
// 当前无产生源，诚实返回空列表，不编造通知。
export async function GET(_req: NextRequest) {
  const rows = await queryRows(
    `select id::text as id, type, title, body, read, created_at::text as created_at
     from public.notifications order by created_at desc limit 50`
  );
  return NextResponse.json({ notifications: rows ?? [] });
}
