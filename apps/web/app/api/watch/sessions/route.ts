import { cookies } from "next/headers";
import { OPERATOR_COOKIE } from "../../../../lib/auth";
import { listPublished } from "../../../../lib/publication";
import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { getSession } from "../../../../lib/session";
import { validPlayhead } from "../../../../lib/kad1-policy.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-081 POST/GET /api/watch/sessions —— 观看进度（时码保存/恢复，对齐 FA-033-01）
// KAD1 生成代（交付包 20261102 目标，吸收②批）：会话按 (owner_user_id, work_id, revision_id)
// 隔离，逐请求核发布指针；行级安全要求 owner=当前会话验证身份，匿名/越权/未发布一律拒绝。
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  let b: { work_id?: unknown; revision_id?: unknown; playhead?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (typeof b.work_id !== "string" || typeof b.revision_id !== "string" || !validPlayhead(b.playhead)) {
    return NextResponse.json({ ok: false, reason: "work_revision_playhead_required" }, { status: 400 });
  }
  const eligible = (await listPublished()).some((w) => w.work_id === b.work_id && w.revision_id === b.revision_id);
  if (!eligible) return NextResponse.json({ ok: false, reason: "not_published" }, { status: 404 });
  const token = (await cookies()).get(OPERATOR_COOKIE)?.value;
  const rows = await queryRows(
    `with context as materialized(select set_config('mohen.session_token',:'token',true))
     insert into public.watch_sessions(owner_user_id,work_id,revision_id,playhead)
     select :'uid',p.work_id,p.revision_id,:'ph'::numeric from publication.published_pointers p cross join context
     where p.work_id=:'wid' and p.revision_id=:'rid'
     on conflict(owner_user_id,work_id,revision_id) where owner_user_id is not null and revision_id is not null
     do update set playhead=excluded.playhead,updated_at=now() returning work_id::text as work_id`,
    { token, uid: s.uid, wid: b.work_id, rid: b.revision_id, ph: String(b.playhead) }
  );
  if (!rows.length) return NextResponse.json({ ok: false, reason: "not_published" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const wid = q.get("work_id");
  const rid = q.get("revision_id");
  if (!wid || !rid) return NextResponse.json({ ok: false, reason: "work_revision_required" }, { status: 400 });
  const eligible = (await listPublished()).some((w) => w.work_id === wid && w.revision_id === rid);
  if (!eligible) return NextResponse.json({ ok: false, reason: "not_published" }, { status: 404 });
  const token = (await cookies()).get(OPERATOR_COOKIE)?.value;
  const rows = await queryRows(
    `with context as materialized(select set_config('mohen.session_token',:'token',true))
     select s.playhead from public.watch_sessions s join publication.published_pointers p on p.work_id=s.work_id and p.revision_id=s.revision_id
     cross join context where s.owner_user_id=:'uid' and s.work_id=:'wid' and s.revision_id=:'rid'`,
    { token, uid: s.uid, wid, rid }
  );
  return NextResponse.json({ ok: true, playhead: rows[0]?.playhead ?? null });
}
