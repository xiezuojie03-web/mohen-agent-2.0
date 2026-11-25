// Formal publication chain adapter (M5 §0.2 E wiring).
//
// Bridges the existing Studio/Admin HTTP surface to the ST-08/ST-09 database
// functions that were verified on the isolated database in this M5 batch.
// The design contract (KALC §19.1) keeps ONE publication truth table
// (publication.published_pointers) and ONE authoritative work body
// (publication.work_revisions); studio.work_revisions is a review envelope
// referenced by formal_revision_id, never a second body.
//
// Dual-path discipline:
//   - A work revision that has a studio envelope (formal_revision_id → body)
//     is a FORMAL object and must travel the new chain (submission snapshot,
//     editorial decision, exact publish, withdrawal). All qualification and
//     rights are re-verified inside those SECURITY DEFINER functions.
//   - Everything else stays on the legacy path untouched, so existing works
//     and their history keep working.
//   - This module never signs a Gate and never fabricates a G5. A formal object
//     without a current independent G5 is refused by the DB function itself.

import { queryRows } from "@mohen/data-access";
import { createHash, randomUUID } from "node:crypto";

/** Deterministic UUID from a stable label (idempotency keys must survive retries). */
function stableUuid(label: string): string {
  const h = createHash("sha256").update(`m formal-chain:${label}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** queryRows may surface a jsonb column as an object or a JSON string depending
 *  on the psql/pg driver; normalise both to an object. */
function resultObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; }
  }
  return null;
}

export type FormalRevisionInfo = {
  revisionId: string;
  workId: string;
  projectId: string;
  revisionNo: number;
};

/** Return the formal-envelope binding for a revision, or null if it is a legacy object. */
export async function getFormalRevision(revisionId: string, workId?: string): Promise<FormalRevisionInfo | null> {
  const rows = await queryRows(
    `select e.revision_id::text as revision_id, e.work_id::text as work_id,
            e.project_id::text as project_id, e.revision_no
       from studio.work_revisions e
      where e.revision_id = :'rid' and e.formal_revision_id = e.revision_id
        and (:'wid' is null or e.work_id = :'wid'::uuid)`,
    { rid: revisionId, wid: workId ?? null }
  );
  const r = rows[0];
  if (!r) return null;
  return {
    revisionId: String(r.revision_id),
    workId: String(r.work_id),
    projectId: String(r.project_id),
    revisionNo: Number(r.revision_no),
  };
}

/** Latest formal-envelope revision of a work, or null if the work is legacy.
 *  Queries only studio.work_revisions (the envelope), never the legacy body. */
export async function getLatestFormalRevisionByWork(workId: string): Promise<FormalRevisionInfo | null> {
  const rows = await queryRows(
    `select e.revision_id::text as revision_id, e.work_id::text as work_id,
            e.project_id::text as project_id, e.revision_no
       from studio.work_revisions e
      where e.work_id = :'wid' and e.formal_revision_id = e.revision_id
      order by e.revision_no desc limit 1`,
    { wid: workId }
  );
  const r = rows[0];
  if (!r) return null;
  return {
    revisionId: String(r.revision_id),
    workId: String(r.work_id),
    projectId: String(r.project_id),
    revisionNo: Number(r.revision_no),
  };
}

/** True when a legacy work has at least one revision bound to a formal envelope. */
export async function workHasFormalRevision(workId: string): Promise<boolean> {
  const rows = await queryRows(
    `select 1 from studio.work_revisions
      where work_id = :'wid' and formal_revision_id = revision_id limit 1`,
    { wid: workId }
  );
  return rows.length > 0;
}

export type FormalSubmitResult =
  | { ok: true; snapshotId: string; workId: string; revisionId: string; formal: true }
  | { ok: false; reason: string };

/** ST-08: freeze an immutable submission snapshot bound to the formal revision. */
export async function formalSubmit(
  revisionId: string,
  projectId: string,
  submittedBy: string
): Promise<FormalSubmitResult> {
  const info = await getFormalRevision(revisionId);
  if (!info) return { ok: false, reason: "formal_envelope_required" };
  const snapshotId = stableUuid(`snapshot:${revisionId}`);
  try {
    const rows = await queryRows(
      `select studio.persist_private_submission_snapshot(
          :'sid'::uuid, :'rid'::uuid, :'pid'::uuid, :'by') as result`,
      { sid: snapshotId, rid: revisionId, pid: info.projectId, by: submittedBy }
    );
    const res = resultObject(rows[0]?.result);
    if (!res || !res.snapshot_id) return { ok: false, reason: "submission_unavailable" };
    return {
      ok: true,
      snapshotId: String(res.snapshot_id),
      workId: info.workId,
      revisionId,
      formal: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/KNOWLEDGE_NOT_QUALIFIED|artifact_revision_moved/.test(msg)) {
      return { ok: false, reason: "knowledge_not_qualified" };
    }
    if (/RIGHTS_NOT_ALLOWED|ORIGINAL_/.test(msg)) {
      return { ok: false, reason: "rights_not_allowed" };
    }
    if (/NOT_LATEST_REVISION/.test(msg)) {
      return { ok: false, reason: "not_latest_revision" };
    }
    if (/REVISION_NOT_FOUND/.test(msg)) {
      return { ok: false, reason: "formal_envelope_required" };
    }
    return { ok: false, reason: "submission_unavailable" };
  }
}

export type FormalDecisionResult =
  | { ok: true; decisionId: string; formal: true }
  | { ok: false; reason: string };

/** ST-09 editorial decision. APPROVED/CHANGES_REQUESTED/REJECTED only.
 *  The operator identity must differ from the work creator (no self-review). */
export async function formalDecide(
  workId: string,
  revisionId: string,
  decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
  operatorId: string,
  notes: string
): Promise<FormalDecisionResult> {
  if (!operatorId.trim()) return { ok: false, reason: "operator_required" };
  const decisionId = stableUuid(`decision:${revisionId}:${decision}`);
  const idem = `web-decide:${revisionId}:${decision}:${operatorId}`;
  try {
    const rows = await queryRows(
      `select publication.decide_editorial(
          :'did'::uuid, :'wid'::uuid, :'rid'::uuid, :'dec', :'op', :'notes', :'idem') as result`,
      { did: decisionId, wid: workId, rid: revisionId, dec: decision, op: operatorId, notes, idem }
    );
    const res = resultObject(rows[0]?.result);
    if (!res || !res.decision_id) return { ok: false, reason: "decision_unavailable" };
    return { ok: true, decisionId: String(res.decision_id), formal: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/OPERATOR_CONFLICT/.test(msg)) return { ok: false, reason: "operator_conflict_self_review" };
    if (/SUBMISSION_REQUIRED|SUBMISSION_STALE/.test(msg)) return { ok: false, reason: "submission_required" };
    if (/KNOWLEDGE_NOT_CURRENT|artifact_revision_moved/.test(msg)) return { ok: false, reason: "knowledge_not_current" };
    if (/REVISION_NOT_FOUND/.test(msg)) return { ok: false, reason: "revision_not_found" };
    return { ok: false, reason: "decision_unavailable" };
  }
}

export type FormalPublishResult =
  | { ok: true; publicationId: string; workId: string; revisionId: string; formal: true }
  | { ok: false; reason: string };

/** ST-09 publish: CAS pointer to the exact approved revision. Idempotent by
 *  work+revision+operator. The DB function re-verifies current G5 + rights. */
export async function formalPublish(
  workId: string,
  revisionId: string,
  operatorId: string
): Promise<FormalPublishResult> {
  if (!operatorId.trim()) return { ok: false, reason: "operator_required" };
  // Fresh IDs per publish attempt: a withdrawal removes the pointer but keeps
  // the historical snapshot, so re-publishing the same revision after a
  // withdrawal MUST create a new publication and re-install the pointer.
  // Reusing a stable idempotency key across withdrawals would make the DB
  // return the old (withdrawn) publication and leave WATCH empty.
  // The pointer's ON CONFLICT (work_id) update still gives CAS correctness on
  // the truth table; snapshots are append-only history.
  const publicationId = randomUUID();
  const idem = `web-publish:${publicationId}`;
  try {
    const rows = await queryRows(
      `select publication.publish_exact_revision(
          :'pid'::uuid, :'wid'::uuid, :'rid'::uuid, :'op', :'idem') as result`,
      { pid: publicationId, wid: workId, rid: revisionId, op: operatorId, idem }
    );
    const res = resultObject(rows[0]?.result);
    if (!res || !res.publication_id) return { ok: false, reason: "publish_unavailable" };
    return {
      ok: true,
      publicationId: String(res.publication_id),
      workId,
      revisionId,
      formal: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/ELIGIBILITY_HOLD/.test(msg)) return { ok: false, reason: "publish_eligibility_hold" };
    if (/DECISION_REQUIRED/.test(msg)) return { ok: false, reason: "decision_required" };
    if (/OPERATOR_REQUIRED/.test(msg)) return { ok: false, reason: "operator_conflict_self_review" };
    if (/SUBMISSION_REQUIRED/.test(msg)) return { ok: false, reason: "submission_required" };
    if (/REVISION_NOT_FOUND/.test(msg)) return { ok: false, reason: "revision_not_found" };
    return { ok: false, reason: "publish_unavailable" };
  }
}

export type FormalWithdrawResult = { ok: boolean; reason?: string; formal?: true };

/** ST-09 P08 withdrawal: append-only record + same-transaction pointer removal. */
export async function formalWithdraw(
  workId: string,
  operatorId: string,
  reason: string
): Promise<FormalWithdrawResult> {
  if (!operatorId.trim()) return { ok: false, reason: "operator_required" };
  // Resolve the active studio pointer's publication_id (never guess it).
  const ptr = await queryRows(
    `select publication_id::text as publication_id, studio_revision_id::text as revision_id
       from publication.published_pointers
      where work_id = :'wid' and source_schema = 'studio' and publication_id is not null`,
    { wid: workId }
  );
  const publicationId = ptr[0]?.publication_id;
  if (!publicationId) return { ok: false, reason: "not_published" };
  const withdrawalId = randomUUID();
  const idem = `web-withdraw:${publicationId}`;
  try {
    const rows = await queryRows(
      `select publication.withdraw_publication(
          :'widraw'::uuid, :'wid'::uuid, :'pid'::uuid, :'op', :'reason', :'idem') as result`,
      { widraw: withdrawalId, wid: workId, pid: publicationId, op: operatorId, reason, idem }
    );
    if (!resultObject(rows[0]?.result)?.withdrawal_id) return { ok: false, reason: "withdraw_unavailable" };
    return { ok: true, formal: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/NOT_PUBLISHED/.test(msg)) return { ok: false, reason: "not_published" };
    if (/OPERATOR_REQUIRED/.test(msg)) return { ok: false, reason: "operator_required" };
    return { ok: false, reason: "withdraw_unavailable" };
  }
}

/** ST-09 待签核队列：已冻结投稿快照、尚无编辑裁决的正式作品（Admin 资格审核）。 */
export async function listFormalPendingReview(): Promise<Array<{
  work_id: string; revision_id: string; title: string;
  revision_no: string; created_at: string; content: string; formal: true;
}>> {
  const rows = await queryRows(
    `select ss.work_id::text as work_id, ss.revision_id::text as revision_id,
            coalesce(w.title, r.title) as title, ss.revision_no::text as revision_no,
            ss.created_at::text as created_at, r.content::text as content
       from studio.submission_snapshots ss
       join studio.work_revisions r on r.revision_id = ss.revision_id
       left join publication.works w on w.work_id = ss.work_id
      where ss.revision_id not in (
              select revision_id from publication.editorial_decisions
             )
      order by ss.created_at asc`
  );
  return rows.map((r) => ({
    work_id: String(r.work_id),
    revision_id: String(r.revision_id),
    title: String(r.title ?? ""),
    revision_no: String(r.revision_no),
    created_at: String(r.created_at),
    content: String(r.content ?? "{}"),
    formal: true,
  }));
}

/** List formal submissions still awaiting an editorial decision (Admin queue). */
export async function listFormalSubmitted(): Promise<Array<{
  work_id: string; revision_id: string; title: string;
  revision_no: string; created_at: string; content: string; formal: true;
}>> {
  const rows = await queryRows(
    `select ss.work_id::text as work_id, ss.revision_id::text as revision_id,
            coalesce(w.title, r.title) as title, ss.revision_no::text as revision_no,
            ss.created_at::text as created_at, r.content::text as content
       from studio.submission_snapshots ss
       join studio.work_revisions r on r.revision_id = ss.revision_id
       left join publication.works w on w.work_id = ss.work_id
      where ss.revision_id not in (
              select revision_id from publication.editorial_decisions
             )
      order by ss.created_at asc`
  );
  return rows.map((r) => ({
    work_id: String(r.work_id),
    revision_id: String(r.revision_id),
    title: String(r.title ?? ""),
    revision_no: String(r.revision_no),
    created_at: String(r.created_at),
    content: String(r.content ?? "{}"),
    formal: true as const,
  }));
}
