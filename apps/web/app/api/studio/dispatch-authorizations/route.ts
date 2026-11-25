import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../lib/auth";
import { studioAssetStore } from "../../../../lib/studio-assets";
import { createStudioDelegationRepository, getNodePgPool } from "@mohen/data-access";
import { STUDIO_LLM_ACTION_MAX_TOKENS } from "../../../../lib/studio/provider-dispatcher";
import { listProjectSourceIds, ensureExternalProcessingRights } from "../../../../lib/studio/dispatch-grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_BUDGET_USD = 5;
const MAX_TTL_MINUTES = 120;

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

// ST-04 POST /api/studio/dispatch-authorizations —— Creator 显式外发授权决定。
// 只登记一份 GRANTED/USD 受控委托（动作白名单 + 预算 + 短时效 + 服务端推导的项目来源），
// 不发起任何 Provider 调用；执行仍须 dispatcher 逐次校验。幂等键防重复扣费额度登记。
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return privateJson({ ok: false, reason: "login_required" }, 401);
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return privateJson({ ok: false, reason: "bad_request" }, 400);
  }
  const projectId = body.project_id;
  const idempotencyKey = body.idempotency_key;
  const actions = body.actions;
  const budgetUsd = body.budget_usd;
  const ttlMinutes = body.ttl_minutes === undefined ? 60 : body.ttl_minutes;
  // QR-06: optional same-root binding to the caller's Agent research task. Omitted keeps
  // the legacy behaviour; supplied must be a UUID and is verified server-side against
  // task ownership + same project before any delegation row is written.
  const taskId = typeof body.task_id === "string" && body.task_id ? body.task_id : undefined;
  if (typeof projectId !== "string" || !uuid.test(projectId))
    return privateJson({ ok: false, reason: "project_id_required" }, 400);
  if (typeof idempotencyKey !== "string" || !uuid.test(idempotencyKey))
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 400);
  if (taskId !== undefined && !uuid.test(taskId))
    return privateJson({ ok: false, reason: "task_id_invalid" }, 400);
  if (!Array.isArray(actions) || !actions.length || actions.length > 6
    || !actions.every((a) => typeof a === "string" && Object.hasOwn(STUDIO_LLM_ACTION_MAX_TOKENS, a)))
    return privateJson({ ok: false, reason: "actions_not_whitelisted" }, 400);
  if (typeof budgetUsd !== "number" || !Number.isFinite(budgetUsd) || budgetUsd <= 0 || budgetUsd > MAX_BUDGET_USD)
    return privateJson({ ok: false, reason: "budget_out_of_range" }, 400);
  if (typeof ttlMinutes !== "number" || !Number.isFinite(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > MAX_TTL_MINUTES)
    return privateJson({ ok: false, reason: "ttl_out_of_range" }, 400);

  const sessionToken = signDatabaseSessionToken(session);
  const projects = await studioAssetStore().listProjects(sessionToken);
  const project = projects.find((p) => p.project_id === projectId && p.lifecycle_status === "ACTIVE");
  if (!project) return privateJson({ ok: false, reason: "project_not_found" }, 404);

  // 来源集合服务端推导（私有原件 ↔ L0 链），客户端无权指定；无来源 = 不能授权外发。
  const sourceIds = await listProjectSourceIds(projectId, sessionToken);
  if (!sourceIds.length) return privateJson({ ok: false, reason: "project_source_unbound" }, 409);

  // ST-04 同意即落权：外发确认的服务端效果包含把 Owner 常设外发授权（2026-11-25）
  // 落到项目来源上（幂等、带同意回执与许可证据）。仅当来源许可已允许 machine_read
  // 才扩展 external_processing；其余保持 unknown，仍由 dispatcher 失败关闭。
  let rightsApplied: { recorded: string[]; blocked: Array<{ sourceId: string; title: string }> };
  try {
    rightsApplied = await ensureExternalProcessingRights(sourceIds, {
      projectTitle: String(project.project_title ?? projectId),
      actions: actions as string[],
      idempotencyKey,
      consentedBy: session.uid,
    });
  } catch {
    return privateJson({ ok: false, reason: "rights_recording_unavailable" }, 409);
  }
  if (rightsApplied.blocked.length) {
    return privateJson({
      ok: false,
      reason: "transfer_rights_not_available",
      blocked_sources: rightsApplied.blocked,
    }, 409);
  }

  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  // QR-06: rootTaskRef follows the caller's Agent research task when supplied,
  // so that Studio research and external Provider dispatch form the same root DAG.
  // Legacy behaviour (hardcoded "studio-llm-dispatch") is preserved when task_id is absent,
  // allowing direct external dispatch without a prior research step.
  const rootTaskRef = taskId ? `studio-research:${taskId}` : "studio-llm-dispatch";
  let delegation;
  try {
    delegation = await createStudioDelegationRepository(getNodePgPool()).saveDelegation({
      projectId,
      seriesId: randomUUID(),
      revisionNo: 1,
      rootTaskRef,
      rootTaskId: taskId ?? null,
      rootTaskSnapshot: { purpose: "studio_llm_dispatch", actions, source_ids: sourceIds, research_task_id: taskId ?? null },
      subtaskRef: "studio-director-llm",
      executor: "mohen-studio",
      provider: "deepseek",
      engineVersion: "deepseek/2026-11-07",
      inputManifest: { actions, source_ids: sourceIds },
      allowedActions: actions,
      transferRightsDecision: { external_processing: "GRANTED" },
      policyVersion: "m5.g",
      expiresAt,
      budgetLimit: budgetUsd.toFixed(6),
      currency: "USD",
      outputSchema: "mohen.studio-llm-dispatch.v1",
      idempotencyKey,
    }, sessionToken);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    // Binding verification failed: nothing was written; the caller may retry or proceed unbound.
    if (reason === "STUDIO_TASK_BINDING_INVALID")
      return privateJson({ ok: false, reason: "task_binding_invalid" }, 403);
    if (reason === "STUDIO_IDENTITY_REQUIRED")
      return privateJson({ ok: false, reason: "login_required" }, 401);
    throw error;
  }
  return privateJson({
    ok: true,
    delegation_id: delegation.delegation_id,
    expires_at: delegation.expires_at,
    allowed_actions: delegation.allowed_actions,
    source_ids: sourceIds,
    budget_usd: budgetUsd,
    rights_recorded: rightsApplied.recorded,
  });
}
