// apps/web/app/api/mohen/materials/route.ts
//
// ADR-003 第 ② 层：运行期检索入口（只读）
//
// 此前体验页运行期**零 DB**：全部内容来自 5 个冻结 JSON，Agent 无从"从材料里选下一步"。
// 本 route 让墨痕在运行期真正读库——但只读已审核材料。
//
// 纪律：只读 SELECT、零写库、零迁移；浏览器不直连 DB；
// 库不可用 → degraded=true + 空材料（上层明确告知，绝不静默编造）。

import { NextResponse } from "next/server";
import { retrieveMaterials, MAX_LIMIT } from "../../../../lib/mohen-agent/retrieve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let terms: string[] = [];
  let limit = 12;
  try {
    const body = (await req.json()) as { terms?: unknown; limit?: unknown };
    if (Array.isArray(body.terms)) {
      terms = body.terms.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    }
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.max(1, Math.min(MAX_LIMIT, Math.trunc(body.limit)));
    }
  } catch {
    return NextResponse.json({ ok: false, degraded: true, materials: [], reason: "bad_request" }, { status: 400 });
  }

  const { materials, degraded } = await retrieveMaterials(terms, limit);
  return NextResponse.json({ ok: !degraded, degraded, materials });
}
