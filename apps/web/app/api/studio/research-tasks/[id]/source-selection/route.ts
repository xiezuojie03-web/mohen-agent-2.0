import { NextResponse } from "next/server";
import { getSession, isOperatorSession } from "../../../../../../lib/session";
import { readResearchSourceSelection, selectResearchAcquisitionCandidate } from "../../../../../../lib/studio-research";
import { canAccess } from "../../../../../../lib/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "cache-control": "no-store" };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: noStore });
  const { id } = await params;
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ ok: false, reason: "json_required" }, { status: 415, headers: noStore });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400, headers: noStore });
  }
  const candidateId = (body as { candidate_id?: unknown } | null)?.candidate_id;
  if (!uuid.test(id) || typeof candidateId !== "string" || !candidateId.trim() || candidateId.length > 4096) {
    return NextResponse.json({ ok: false, reason: "candidate_selection_invalid" }, { status: 400, headers: noStore });
  }
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403, headers: noStore });
  try {
    const result = await selectResearchAcquisitionCandidate(id, session.uid, candidateId);
    return NextResponse.json(result, { status: result.ok ? 200 : 409, headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, reason: "candidate_selection_unavailable" }, { status: 503, headers: noStore });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ ok: false, reason: "candidate_selection_invalid" }, { status: 400, headers: noStore });
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403, headers: noStore });
  try {
    const result = await readResearchSourceSelection(id, session.uid);
    if (!result) return NextResponse.json({ ok: false, reason: "task_not_ready_or_unavailable" }, { status: 404, headers: noStore });
    return NextResponse.json({ ok: true, ...result }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, reason: "candidate_selection_unavailable" }, { status: 503, headers: noStore });
  }
}
