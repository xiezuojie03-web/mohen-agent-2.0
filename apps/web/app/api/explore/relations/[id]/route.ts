import { NextResponse } from "next/server";
import { guardRoute } from "../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-014 GET /api/explore/relations/:id —— 关系详情（对齐 FA-043-02）
// 交付包 20261102 目标（吸收②批）：EXP 关系详情只允许消费资格投影（qualified projection），
// 不得把 world 原始行直接当作对外详情返回。投影生产方就绪前失败关闭（423），不降级为裸读。
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, null);
  if (denied) return denied;
  return NextResponse.json({ ok: false, reason: "qualified_projection_required" }, { status: 423 });
}
