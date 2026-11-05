import { NextResponse } from "next/server";
import { assertQualificationContext, createReadModelRepository, getNodePgPool } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };
const failure = (reason: string, status: number) =>
  NextResponse.json({ ok: false, reason }, { status, headers: NO_STORE });

/**
 * The public viewer must never choose its own qualification purpose or scope.
 * Until an operator configures a matching live independent G5 policy this
 * endpoint fails closed, instead of exposing an unqualified evidence pointer.
 */
function publicEvidenceContext() {
  let raw: unknown;
  try { raw = JSON.parse(process.env.MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT || ""); }
  catch { return null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const purpose = value.purpose;
  const scope = value.scope;
  if (!purpose || typeof purpose !== "object" || Array.isArray(purpose) ||
      !scope || typeof scope !== "object" || Array.isArray(scope)) return null;
  const fields = purpose as Record<string, unknown>;
  if ((scope as Record<string, unknown>).requested_action !== 'quote') return null;
  if (!["namespace", "code", "version"].every(k =>
      typeof fields[k] === "string" && (fields[k] as string).length > 0 && (fields[k] as string).length <= 128)) return null;
  // Evidence on Demand has its own independent consumer; visual-stage and private research contexts
  // must never be selectable from query parameters.
  if (value.consumer !== "evidence_on_demand") return null;
  const context = { consumer: "evidence_on_demand" as const, purpose: {
    namespace: fields.namespace as string, code: fields.code as string, version: fields.version as string,
  }, scope: scope as Record<string, unknown> };
  try { return assertQualificationContext(context); } catch { return null; }
}

// API-023: output wire remains {ok:true,evidence:{id,display_locator,display_excerpt}}.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (typeof id !== "string" || !UUID.test(id)) return failure("bad_request", 400);
  const qualification = publicEvidenceContext();
  if (!qualification) return failure("qualification_unavailable", 503);
  try {
    const repository = createReadModelRepository(getNodePgPool());
    const item = await repository.getRuntimeEligible("evidence_pointer", id, qualification);
    if (!item) return failure("not_found", 404);
    return NextResponse.json({
      ok: true,
      evidence: {
        id: String(item.evidence_pointer_id),
        display_locator: item.display_locator,
        display_excerpt: item.display_excerpt,
      },
    }, { headers: NO_STORE });
  } catch {
    // Never disclose internal SQL, evidence or qualification policy on error.
    return failure("qualification_unavailable", 503);
  }
}
