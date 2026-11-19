import { NextResponse } from "next/server";
import { getSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";
import { acquireSelectedCommonsOriginal, diagnoseSelectedCommonsOriginal } from "../../../../../../lib/studio-commons-acquisition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "cache-control": "no-store" };
const blocked = new Set([
  "COMMONS_LOCATOR_UNSUPPORTED", "COMMONS_LICENSE_NOT_VERIFIED", "COMMONS_ORIGINAL_NOT_VERIFIED",
  "COMMONS_SOURCE_TOO_LARGE", "STUDIO_SOURCE_SELECTION_REQUIRED", "STUDIO_SOURCE_SELECTION_CHANGED",
  "STUDIO_SOURCE_READBACK_MISMATCH", "ORIGINAL_IDEMPOTENCY_CONFLICT",
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: noStore });
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return NextResponse.json({ ok: false, reason: "json_required" }, { status: 415, headers: noStore });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400, headers: noStore });
  try {
    const receipt = await acquireSelectedCommonsOriginal(id, session.uid, signDatabaseSessionToken(session));
    return NextResponse.json({ ok: true, receipt }, { headers: noStore });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known = /^(COMMONS_|STUDIO_SOURCE_|ORIGINAL_|PRIVATE_SOURCE_)[A-Z_]+$/.test(code);
    console.warn("[studio/source-acquisition] failed", known ? code : "UNCLASSIFIED");
    const reason = blocked.has(code) ? code : "source_acquisition_unavailable";
    return NextResponse.json({ ok: false, reason }, { status: blocked.has(code) ? 409 : 503, headers: noStore });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400, headers: noStore });
  try {
    return NextResponse.json({ ok: true, ...await diagnoseSelectedCommonsOriginal(id, session.uid) }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, reason: "task_or_candidate_unavailable" }, { status: 404, headers: noStore });
  }
}
