import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../../lib/auth";
import { cancelSchedule, schedulePublish } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/publications/schedules —— 安排/取消定时发布（对齐 FA-055-02）
// body: { work_id, publish_at } 安排；{ schedule_id, cancel: true } 取消。
export async function POST(req: NextRequest) {
  if (!isOperator(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let work_id: unknown;
  let publish_at: unknown;
  let schedule_id: unknown;
  let cancel: unknown;
  try {
    const body = (await req.json()) as {
      work_id?: unknown;
      publish_at?: unknown;
      schedule_id?: unknown;
      cancel?: unknown;
    };
    work_id = body.work_id;
    publish_at = body.publish_at;
    schedule_id = body.schedule_id;
    cancel = body.cancel;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  if (typeof schedule_id === "string" && cancel) {
    await cancelSchedule(schedule_id);
    return NextResponse.json({ ok: true, schedule_id, status: "cancelled" });
  }

  if (typeof work_id !== "string" || typeof publish_at !== "string") {
    return NextResponse.json({ ok: false, reason: "work_id_and_publish_at_required" }, { status: 400 });
  }

  const res = await schedulePublish(work_id, publish_at);
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: res.reason }, { status: 404 });
  }
  return NextResponse.json({ ok: true, schedule_id: res.schedule_id });
}
