// apps/web/lib/studio/dispatch-grant.ts — M5 批次 G：路由级 LLM 授权 Grant 的装配
//
// 职责：从委托 + 会话 + 服务端推导的来源集合签发 dispatcher grant。
// 安全语义全部在 provider-dispatcher 内（委托/权利/预算失败关闭）；这里只做装配与错误码翻译。
import { queryRows } from "@mohen/data-access";
import {
  authorizeStudioDispatchGrant,
  createStudioDispatcherDeps,
  DispatchError,
  type DispatchGrant,
} from "./provider-dispatcher";

/** 项目 L0 来源集合（服务端权威推导）：私有原件 SHA ↔ raw_items ↔ source_versions ↔ sources。 */
export async function listProjectSourceIds(projectId: string, sessionToken: string): Promise<string[]> {
  const rows = await queryRows(
    `with session_context as materialized (
       select set_config('mohen.session_token', :'token', true)
     )
     select distinct s.source_id::text as source_id
       from session_context
       cross join studio.private_originals o
       join source.raw_items r on r.checksum_sha256 = o.sha256
       join source.source_versions v on v.source_version_id = r.source_version_id
       join source.sources s on s.source_id = v.source_id
      where o.project_id = :'pid'`,
    { token: sessionToken, pid: projectId }
  );
  return rows.map((r) => String(r.source_id)).filter(Boolean).sort();
}

/** 作品已绑定来源（不可变修订 → 导演方案行）：旁白润色等后续动作的逐来源权利核验用。 */
export async function sourceBindingForWork(workId: string): Promise<{ projectId: string | null; sourceIds: string[] }> {
  const rows = await queryRows(
    `select to_jsonb(p)->>'project_id' as project_id, p.source_ids as sids
       from publication.work_revisions r
       join public.director_plans p on p.plan_id = nullif(r.content->'director_source'->>'plan_id','')::uuid
      where r.work_id = :'wid'
      order by r.revision_no desc limit 1`,
    { wid: workId }
  );
  const raw = rows[0]?.sids;
  const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    projectId: typeof rows[0]?.project_id === "string" ? rows[0].project_id : null,
    sourceIds: Array.isArray(arr) ? arr.filter((s) => typeof s === "string").sort() : [],
  };
}

export type GrantOutcome = { grant: DispatchGrant } | { reason: string; detail?: string };

/** 签发 grant；DispatchError 翻译为简短 reason + 可选 detail（路由据此回 409/403）。 */
export async function grantForStudioLlm(input: {
  delegationId: string;
  projectId: string;
  sessionToken: string;
  actions: string[];
  sourceIds: string[];
  maxCalls: number;
}): Promise<GrantOutcome> {
  if (!input.sourceIds.length) return { reason: "project_source_unbound" };
  try {
    const deps = await createStudioDispatcherDeps();
    const grant = await authorizeStudioDispatchGrant(deps, {
      delegationId: input.delegationId,
      projectId: input.projectId,
      actions: input.actions,
      model: "deepseek-flash",
      sourceIds: input.sourceIds,
      sessionToken: input.sessionToken,
      maxCalls: input.maxCalls,
    });
    return { grant };
  } catch (error) {
    if (error instanceof DispatchError)
      return { reason: error.code, detail: error.message !== error.code ? error.message : undefined };
    return { reason: "DISPATCH_UNCERTAIN" };
  }
}

/** Creator 在 Studio 外发确认（ST-04）时把既有 Owner 常设授权落到项目来源上。
 *  语义边界（与 scripts/approve-m5-*-external-processing.mjs 的批26先例一致）：
 *  - 只动 external_processing 一项；display/download/adapt/redistribute 保持原状。
 *  - 仅当来源许可已允许 machine_read（许可本就允许机器处理）才扩展；其余保持
 *    unknown，由 dispatcher 失败关闭——用户同意不能替代来源许可。
 *  - 幂等：已 allowed 的来源不重复写；证据追加式，不覆盖历史。
 */
export async function ensureExternalProcessingRights(
  sourceIds: string[],
  consent: { projectTitle: string; actions: string[]; idempotencyKey: string; consentedBy: string }
): Promise<{ recorded: string[]; blocked: Array<{ sourceId: string; title: string }> }> {
  if (!sourceIds.length) return { recorded: [], blocked: [] };
  const list = sourceIds.map((id) => `'${id}'::uuid`).join(",");
  const rows = (await queryRows(
    `select source_id::text as source_id, title, rights_by_action, rights_evidence
       from source.sources where source_id = any(array[${list}])`
  )) as unknown as Array<{
    source_id: string; title: string;
    rights_by_action: Record<string, unknown> | string | null;
    rights_evidence: Record<string, unknown> | string | null;
  }>;
  const normalize = (v: unknown): Record<string, unknown> => {
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
    if (typeof v === "string" && v.trim()) { try { return JSON.parse(v) as Record<string, unknown>; } catch { return {}; } }
    return {};
  };
  const decisionAt = new Date().toISOString().slice(0, 10);
  const recorded: string[] = [];
  const blocked: Array<{ sourceId: string; title: string }> = [];
  for (const row of rows) {
    const rights = normalize(row.rights_by_action);
    const evidence = normalize(row.rights_evidence);
    const title = String(row.title ?? row.source_id);
    if (rights.external_processing === "allowed") { recorded.push(title); continue; }
    if (rights.machine_read !== "allowed") { blocked.push({ sourceId: row.source_id, title }); continue; }
    const nextRights = { ...rights, external_processing: "allowed" };
    const auth = Array.isArray(evidence.external_processing_authorizations)
      ? (evidence.external_processing_authorizations as unknown[])
      : [];
    const nextEvidence = {
      ...evidence,
      granted_actions: Array.from(new Set([...(Array.isArray(evidence.granted_actions) ? evidence.granted_actions as unknown[] : []), "external_processing"])),
      external_processing_authorizations: [
        ...auth,
        {
          decision_at: decisionAt,
          decision_by: `Owner standing authorization 2026-11-25 (M5 director generation), applied via Creator Studio consent by ${consent.consentedBy}`,
          actions: ["external_processing"],
          scope: `studio director generation (${consent.actions.join(", ")}) for project「${consent.projectTitle}」; source license already permits machine_read`,
          note: "Recorded from the Creator's explicit ST-04 dispatch consent (idempotency key recorded below). download/adapt/redistribute remain untouched.",
          recorded_by: "apps/web/lib/studio/dispatch-grant.ts (Studio consent flow)",
          consent_idempotency_key: consent.idempotencyKey,
        },
      ],
    };
    await queryRows(
      `update source.sources
          set rights_by_action = :'rights'::jsonb, rights_evidence = :'evidence'::jsonb
        where source_id = :'sid'::uuid and rights_by_action->>'machine_read' = 'allowed'`,
      { rights: JSON.stringify(nextRights), evidence: JSON.stringify(nextEvidence), sid: row.source_id }
    );
    recorded.push(title);
  }
  return { recorded, blocked };
}
