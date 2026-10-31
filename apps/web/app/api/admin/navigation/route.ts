import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/studio", label: "创作 Studio" },
  { href: "/watch", label: "观看 WATCH" },
  { href: "/explore", label: "探索 EXP" },
  { href: "/admin", label: "运营管理 Admin" },
];

// API-007 GET /api/admin/navigation —— 运营导航（对齐 FA-051-01）
export async function GET(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, navigation: NAV });
}
