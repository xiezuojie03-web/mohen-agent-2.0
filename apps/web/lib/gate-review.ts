// apps/web/lib/gate-review.ts — 独立 Reviewer 作品发布签核（E1-GATE-ACTIVATE）。
//
// 独立 Reviewer 是独立于 Operator / Producer 的签核身份：只有它签署「知识引用 + 媒体权利」
// 通过后，Operator 才能发布作品（CR-04：Operator 不得代签知识 Gate）。
//
// 作品发布 Reviewer 使用当前有效的登录角色身份，绝不因为注册邮箱匹配而自动提权。
// 作品发布审核不是独立专业知识 G5 签发，任何 approval 都不能替代当前知识资格。
import { queryRows, queryValue } from "@mohen/data-access";
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
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(workId)) return { ok: false, reason: "invalid_work_id" };
  if (!revisionId || !uuid.test(revisionId)) return { ok: false, reason: "revision_id_required" };
  if (decision !== "approved" && decision !== "rejected")
    return { ok: false, reason: "invalid_decision" };
  if (!reviewer || reviewer === "unknown-reviewer")
    return { ok: false, reason: "reviewer_identity_required" };

  // Atomic INSERT ... SELECT pins the decision to a currently submitted
  // revision owned by THIS work. Never store a null or unrelated revision.
  // This is a work-level Reviewer decision, NOT professional independent G5.
  const decisionRows = await queryRows(
    `insert into control.work_publication_decisions
       (work_id, revision_id, decision, reviewer, note)
     select r.work_id, r.revision_id, :'dec', :'reviewer', :'note'
       from publication.work_revisions r
      where r.work_id = :'wid' and r.revision_id = :'rid'
        and r.status = 'submitted'
     returning revision_id::text as revision_id`,
    { wid: workId, rid: revisionId, dec: decision, reviewer, note: note ?? null }
  );
  if (!decisionRows.length) {
    const existing = await queryValue(
      "select work_id::text from publication.works where work_id = :'wid'",
      { wid: workId }
    );
    return { ok: false, reason: existing ? "revision_not_submitted" : "work_not_found" };
  }
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
