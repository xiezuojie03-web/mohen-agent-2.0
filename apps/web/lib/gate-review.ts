// apps/web/lib/gate-review.ts — 独立 Reviewer 作品发布签核（E1-GATE-ACTIVATE）。
//
// 独立 Reviewer 是独立于 Operator / Producer 的签核身份：只有它签署「知识引用 + 媒体权利」
// 通过后，Operator 才能发布作品（CR-04：Operator 不得代签知识 Gate）。
//
// 补缺施工第四步：Reviewer 身份从「静态 REVIEWER_KEY 密钥」升级为「登录用户中 roles 含 reviewer 的账号」
// （Owner 兼任，20195689@qq.com 注册即获 reviewer 角色）。签核记录真实 reviewer 邮箱。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { hasRole } from "./auth";

export function isReviewerConfigured(): boolean {
  // Reviewer 来自用户角色，无需外部密钥；始终可用。
  return true;
}

/** 校验 token 是否为独立 Reviewer（roles 含 reviewer）。 */
export async function verifyReviewer(token: string | undefined | null): Promise<boolean> {
  return hasRole(token, "reviewer");
}

/** 独立 Reviewer 签核作品发布（approved / rejected），reviewer 传真实标识（邮箱/user_id）。 */
export async function signWorkPublication(
  workId: string,
  revisionId: string | null,
  decision: "approved" | "rejected",
  reviewer: string,
  note?: string
): Promise<{ ok: boolean; reason?: string }> {
  const work = await queryValue(
    "select work_id::text from publication.works where work_id = :'id'",
    { id: workId }
  );
  if (!work) return { ok: false, reason: "work_not_found" };

  await run(
    `insert into control.work_publication_decisions (work_id, revision_id, decision, reviewer, note)
     values (:'wid', :'rid', :'dec', :'reviewer', :'note')`,
    { wid: workId, rid: revisionId ?? null, dec: decision, reviewer, note: note ?? null }
  );
  return { ok: true };
}

/** 读某作品最新的独立 Reviewer 决策（无决策返回 null）。 */
export async function getLatestWorkDecision(workId: string): Promise<string | null> {
  const rows = await queryRows(
    "select decision from control.work_publication_decisions where work_id = :'id' order by reviewed_at desc limit 1",
    { id: workId }
  );
  return rows.length ? String(rows[0].decision) : null;
}
