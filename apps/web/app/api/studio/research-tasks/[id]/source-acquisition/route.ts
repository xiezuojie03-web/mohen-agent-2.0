import { NextResponse } from "next/server";
import { getSession, isOperatorSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";
import { acquireSelectedCommonsOriginal, diagnoseSelectedCommonsOriginal } from "../../../../../../lib/studio-commons-acquisition";
import { acquireSelectedShlTextOriginal, diagnoseSelectedShlTextOriginal } from "../../../../../../lib/studio-shl-acquisition";
import { canAccess } from "../../../../../../lib/ownership";
import { getNodePgPool } from "@mohen/data-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "cache-control": "no-store" };
const blocked = new Set([
  "COMMONS_LOCATOR_UNSUPPORTED", "COMMONS_LICENSE_NOT_VERIFIED", "COMMONS_ORIGINAL_NOT_VERIFIED",
  "COMMONS_ORIGINAL_TOO_LARGE", "COMMONS_SOURCE_TOO_LARGE",
  "STUDIO_SOURCE_SELECTION_REQUIRED", "STUDIO_SOURCE_SELECTION_CHANGED",
  "STUDIO_SOURCE_READBACK_MISMATCH", "ORIGINAL_IDEMPOTENCY_CONFLICT",
  "SHL_LOCATOR_UNSUPPORTED", "SHL_KEY_MISSING", "SHL_SOURCE_TOO_LARGE", "SHL_RECORD_NOT_RESOLVED",
  "SHL_BODY_CORRUPTED", "SHL_BODY_TRUNCATED", "SHL_BODY_NOT_JSON", "SHL_RESULT_NOT_OK",
]);

// 按线索声明的来源提供方分派到对应获取适配器；不匹配任何适配器的定位一律失败关闭。
async function selectedProvider(taskId: string, ownerId: string): Promise<string | null> {
  const pool = getNodePgPool();
  const row = (await pool.query(
    `select t.checkpoint->'sourceAcquisitionSelection'->>'candidate_id' as candidate_id
       from public.research_tasks t
       join studio.projects p on p.project_id::text=t.checkpoint->'studio'->>'project_id'
      where t.task_id=$1 and t.owner_user_id=$2 and p.owner_user_id=t.owner_user_id
        and p.lifecycle_status='ACTIVE' and t.status='done'`, [taskId, ownerId])).rows[0] as
    { candidate_id?: string } | undefined;
  const candidateId = row?.candidate_id;
  if (!candidateId) return null;
  const lead = (await pool.query(
    `select lead->'acquisition_candidate'->>'provider' as provider
       from public.research_tasks t,
            jsonb_array_elements(t.checkpoint->'researchLeads') lead
      where t.task_id=$1 and lead->>'id'=$2
        and lead->>'epistemic'='RESEARCH_LEAD'`, [taskId, candidateId])).rows[0] as
    { provider?: string } | undefined;
  return lead?.provider ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: noStore });
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return NextResponse.json({ ok: false, reason: "json_required" }, { status: 415, headers: noStore });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400, headers: noStore });
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403, headers: noStore });
  const sessionToken = signDatabaseSessionToken(session);
  try {
    const providerKind = await selectedProvider(id, session.uid);
    const receipt = providerKind === "shanghai-library"
      ? await acquireSelectedShlTextOriginal(id, session.uid, sessionToken)
      : await acquireSelectedCommonsOriginal(id, session.uid, sessionToken);
    return NextResponse.json({ ok: true, receipt }, { headers: noStore });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known = /^(COMMONS_|SHL_|STUDIO_SOURCE_|ORIGINAL_|PRIVATE_SOURCE_)[A-Z_0-9]+$/.test(code);
    // 原始错误必须留痕：UNCLASSIFIED 只说"未分类"，定位要靠这里的具体 message。
    console.warn("[studio/source-acquisition] failed", known ? code : "UNCLASSIFIED",
      error instanceof Error ? `: ${error.message}` : error);
    const reason = blocked.has(code) ? code : "source_acquisition_unavailable";
    return NextResponse.json({ ok: false, reason }, { status: blocked.has(code) ? 409 : 503, headers: noStore });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400, headers: noStore });
  const allowed = await canAccess("public.research_tasks", id, session.uid, isOperatorSession(session));
  if (!allowed) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403, headers: noStore });
  try {
    const providerKind = await selectedProvider(id, session.uid);
    const body = providerKind === "shanghai-library"
      ? await diagnoseSelectedShlTextOriginal(id, session.uid)
      : await diagnoseSelectedCommonsOriginal(id, session.uid);
    return NextResponse.json({ ok: true, ...body }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, reason: "task_or_candidate_unavailable" }, { status: 404, headers: noStore });
  }
}
