import { NextResponse } from "next/server";
import { V1_SOURCES } from "../../../../lib/mohen-agent/sources";
import { getSession, isOperatorSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "MoHenSourceHealth/0.1 (owner console)";

async function probe(url: string): Promise<{ status: number; ms: number; ok: boolean }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
    });
    return { status: res.status, ms: Date.now() - t0, ok: res.status >= 200 && res.status < 400 };
  } catch {
    return { status: 0, ms: Date.now() - t0, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/admin/sources —— 运营来源健康（实时探测 V1 API 来源；manual 标记 manual）
export async function GET() {
  const session = await getSession();
  if (!isOperatorSession(session)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const results = await Promise.all(
    V1_SOURCES.map(async (s) => {
      if (s.access !== "api" || !s.healthUrl) {
        return { id: s.id, name: s.name, access: s.access, status: "manual", ms: null as number | null, ok: true };
      }
      const r = await probe(s.healthUrl);
      return { id: s.id, name: s.name, access: s.access, status: String(r.status), ms: r.ms, ok: r.ok };
    })
  );

  return NextResponse.json({ ok: true, checked_at: new Date().toISOString(), sources: results });
}
