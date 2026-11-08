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
    `select distinct s.source_id::text as source_id
       from studio.private_originals o
       join source.raw_items r on r.checksum_sha256 = o.sha256
       join source.source_versions v on v.source_version_id = r.source_version_id
       join source.sources s on s.source_id = v.source_id,
       (select set_config('mohen.session_token', :'token', true)) cfg
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

export type GrantOutcome = { grant: DispatchGrant } | { reason: string };

/** 签发 grant；DispatchError 翻译为简短 reason（路由据此回 409/403）。 */
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
    return { reason: error instanceof DispatchError ? error.code : "DISPATCH_UNCERTAIN" };
  }
}
