import { readJsonColumn } from "./db-json";
// apps/web/lib/publication.ts — 作品出版线数据访问（只经 @mohen/data-access）
//
// 作品与知识资产分离：作品走 publication.* 三表；知识资产走 read_model。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { reflowWorkToAssets } from "./asset-reflow";
import { requireIndependentWorkPublicationG5, requireCurrentWorkConsumerQualification } from "./work-publish-qualification";
import { createHash, randomUUID } from "node:crypto";

const canonicalUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id.toLowerCase() : null;

export interface PublishedWork {
  work_id: string;
  revision_id: string;
  title: string;
  description: string;
  revision_no: string;
  published_at: string;
  content: string;
}

export interface SubmittedWork {
  work_id: string;
  revision_id: string;
  title: string;
  revision_no: string;
  created_at: string;
  content: string;
}

export type CreationResult =
  | { ok: true; work_id: string; revision_id: string }
  | { ok: false; reason: "creation_conflict" | "creation_id_invalid" };

/** Atomic initial revision plus owned, content-bound creation retry. */
export async function createWorkDraft(
  title: string,
  creator: string,
  ownerUserId: string,
  content?: unknown,
  creationId?: string
): Promise<CreationResult> {
  const wid = creationId === undefined ? randomUUID() : canonicalUuid(creationId);
  if (!wid) return { ok: false, reason: "creation_id_invalid" };
  const params = { wid, title, creator, owner: ownerUserId, content: content ? JSON.stringify(content) : "{}" };
  const inserted = await queryRows(
    `with created_work as (
       insert into publication.works (work_id,title,creator,owner_user_id)
       values (:'wid',:'title',:'creator',:'owner') on conflict (work_id) do nothing returning work_id
     ) insert into publication.work_revisions (work_id,revision_no,title,content)
       select work_id,1,:'title',:'content'::jsonb from created_work
       returning work_id::text as work_id,revision_id::text as revision_id`,
    params
  );
  const acknowledged = inserted.length ? inserted : await queryRows(
    `select w.work_id::text as work_id,r.revision_id::text as revision_id
     from publication.works w join publication.work_revisions r on r.work_id=w.work_id
     where w.work_id=:'wid' and w.owner_user_id=:'owner' and r.revision_no=1
       and r.title=:'title' and r.content=:'content'::jsonb`,
    params
  );
  const row = acknowledged[0];
  if (!row || String(row.work_id) !== wid || typeof row.revision_id !== "string" || !row.revision_id) {
    return { ok: false, reason: "creation_conflict" };
  }
  return { ok: true, work_id: wid, revision_id: row.revision_id };
}

/** Compatibility for callers expecting only the saved work identity. */
export async function createWork(title: string, creator: string, ownerUserId: string, content?: unknown, creationId?: string): Promise<string> {
  const result = await createWorkDraft(title, creator, ownerUserId, content, creationId);
  if (!result.ok) throw new Error(result.reason);
  return result.work_id;
}

export type SubmissionResult =
  | { ok: true; work_id: string; revision_id: string; status: "submitted" }
  | { ok: false; reason: "revision_required" | "revision_not_submittable" };

/** Submit a specific saved revision; legacy callers resolve the latest revision once. */
export async function submitWork(workId: string, revisionId?: string): Promise<SubmissionResult> {
  const wid = workId.toLowerCase();
  const requested = revisionId === undefined
    ? await queryValue("select revision_id::text from publication.work_revisions where work_id = :'wid' order by revision_no desc limit 1", { wid: workId })
    : revisionId;
  const rid = requested ? canonicalUuid(requested) : null;
  if (!rid) {
    return { ok: false, reason: "revision_required" };
  }
  const params = { wid, rid };
  const updated = await queryRows(
    "update publication.work_revisions set status = 'submitted' " +
      "where work_id = :'wid' and revision_id = :'rid' and status = 'draft' " +
      "returning work_id::text as work_id, revision_id::text as revision_id, status",
    params
  );
  const acknowledged = updated.length ? updated : await queryRows(
    "select work_id::text as work_id, revision_id::text as revision_id, status " +
      "from publication.work_revisions where work_id = :'wid' and revision_id = :'rid' and status = 'submitted'",
    params
  );
  const row = acknowledged[0];
  if (!row || String(row.work_id) !== wid || String(row.revision_id) !== rid || row.status !== "submitted") {
    return { ok: false, reason: "revision_not_submittable" };
  }
  return { ok: true, work_id: wid, revision_id: rid, status: "submitted" };
}

/**
 * CR-04：发布前核「知识 G5 独立签核 + 媒体 rights」。
 * P0-4（2026-10-29）四道门：
 * 1) 存在 submitted 修订；
 * 2) 至少一条 provenanceRef（知识可追溯）；
 * 3) 最新独立 Reviewer 决策 approved，且绑定同一 revision；
 * 4) 媒体权利：content.media 每项有 license 或 rights_status=cleared；无媒体时必须 rights_acknowledged=true；
 * 5) Reviewer 不能是发布者本人（除非显式 MOHEN_ALLOW_SELF_REVIEW=1，仅限受控环境）。
 */
export async function checkPublishEligibility(
  workId: string,
  publisherId?: string
): Promise<{ ok: boolean; reason?: string; revisionId?: string }> {
  const rows = await queryRows(
    "select revision_id::text as revision_id, content from publication.work_revisions where work_id = :'wid' and status = 'submitted' order by revision_no desc limit 1",
    { wid: workId }
  );
  if (!rows.length) return { ok: false, reason: "no_submitted_revision" };
  const revisionId = String(rows[0].revision_id);

  // 从作品内容取出处引用，兼容 node-pg 原生 JSONB 与 psql JSON 文本。
  let content: Record<string, unknown> = {};
  try {
    content = readJsonColumn<Record<string, unknown>>(rows[0].content, {});
  } catch {
    content = {};
  }
  const beats = Array.isArray(content.beats) ? (content.beats as Array<{ provenanceRefs?: unknown }>) : [];
  const refs = beats.flatMap((b) => (Array.isArray(b.provenanceRefs) ? b.provenanceRefs.map(String) : []));
  if (!refs.length) return { ok: false, reason: "no_provenance_refs" };

  // 3. 独立 Reviewer 已签核 approved，且必须绑定当前 revision。
  const decRows = await queryRows(
    "select decision, reviewer, revision_id::text as revision_id " +
      "from control.work_publication_decisions where work_id = :'wid' order by reviewed_at desc limit 1",
    { wid: workId }
  );
  const dec = decRows[0];
  if (!dec || String(dec.decision) !== "approved") {
    return { ok: false, reason: "reviewer_not_approved" };
  }
  if (!dec.revision_id || String(dec.revision_id) !== revisionId) {
    return { ok: false, reason: "reviewer_revision_mismatch" };
  }

  // 5. 两把钥匙：签核人不能同时是发布人（scheduler 为系统任务，不适用）。
  if (publisherId && publisherId !== "scheduler") {
    const publisherEmail = await queryValue(
      "select email from public.users where user_id = :'id'",
      { id: publisherId }
    );
    const reviewer = String(dec.reviewer ?? "");
    if (reviewer === publisherId || (publisherEmail && reviewer === String(publisherEmail))) {
      if (process.env.MOHEN_ALLOW_SELF_REVIEW !== "1") {
        return { ok: false, reason: "reviewer_is_publisher" };
      }
    }
  }

  // 4. 媒体权利：有媒体逐项核；没媒体必须显式确认"本作不含第三方媒体"。
  const media = Array.isArray(content.media) ? (content.media as unknown[]) : [];
  if (media.length) {
    for (const m of media) {
      if (!m || typeof m !== "object") return { ok: false, reason: "media_rights_unclear" };
      const item = m as Record<string, unknown>;
      const license = String(item.license ?? "").trim();
      const status = String(item.rights_status ?? "").trim();
      if (!license && status !== "cleared") return { ok: false, reason: "media_rights_unclear" };
    }
  } else if (content.rights_acknowledged !== true) {
    return { ok: false, reason: "no_rights_ack" };
  }

  // Only a signed, current *professional* G5 qualification may open a new
  // public release. The work Reviewer decision and provenance strings above
  // cannot confer that qualification. Absent the precise L5 facet mapping,
  // remain HOLD without changing a submitted revision or publication pointer.
  const professionalGate = await requireIndependentWorkPublicationG5(workId, revisionId, content);
  if (!professionalGate.ok) return professionalGate;
  return { ok: true, revisionId };
}

/** 发布：先核独立 Gate/权利（CR-04），再置 published + 写发布指针（operator 专属，不代签 G）。 */
export async function publishWork(workId: string, by: string): Promise<{ ok: boolean; reason?: string }> {
  const elig = await checkPublishEligibility(workId, by);
  if (!elig.ok) return elig;

  // Publish exactly the revision checked above. Re-reading the "latest"
  // submitted revision here creates a TOCTOU gap and can publish a different
  // revision than the independent Reviewer approved.
  const rid = elig.revisionId;
  if (!rid) return { ok: false, reason: "revision_required" };
  // One SQL statement makes the revision transition and public pointer
  // indivisible. If a concurrent rejection/revision changed the submitted
  // status, no pointer is installed and the publisher receives a refusal.
  const installed = await queryRows(
    `with promoted as (
       update publication.work_revisions
          set status = 'published'
        where revision_id = :'rid' and work_id = :'wid' and status = 'submitted'
          and exists (
            select 1 from (
              select d.decision, d.revision_id
                from control.work_publication_decisions d
               where d.work_id = :'wid'
               order by d.reviewed_at desc
               limit 1
            ) latest_decision
            where latest_decision.decision = 'approved'
              and latest_decision.revision_id = :'rid'
          )
        returning work_id, revision_id
     )
     insert into publication.published_pointers (work_id, revision_id, published_by)
     select work_id, revision_id, :'by' from promoted
     on conflict (work_id) do update
       set revision_id = excluded.revision_id,
           published_at = now(),
           published_by = excluded.published_by
     returning work_id::text as work_id, revision_id::text as revision_id`,
    { wid: workId, rid, by }
  );
  if (installed.length !== 1 || String(installed[0].revision_id) !== rid) {
    return { ok: false, reason: "revision_not_submittable" };
  }

  // 资产回流：发布后把作品叙事回流成 read_model 知识资产（EXP 可消费），失败不阻断发布。
  try {
    await reflowWorkToAssets(workId, rid);
  } catch (e) {
    console.warn("[publication] 作品回流失败（不影响发布）：", e instanceof Error ? e.message : String(e));
  }

  return { ok: true };
}

/** 拒绝：最新 submitted → rejected */
export async function rejectWork(workId: string): Promise<boolean> {
  await run(
    "update publication.work_revisions set status = 'rejected' where work_id = :'wid' and status = 'submitted'",
    { wid: workId }
  );
  return true;
}

/** 下架：清除发布指针，作品退回（不再公开可见） */
export async function unpublishWork(workId: string): Promise<boolean> {
  await run("delete from publication.published_pointers where work_id = :'wid'", { wid: workId });
  return true;
}

/** 惰性触发到期的定时发布任务（执行时重验发布资格，不通过则保持 pending）。返回本次成功数。 */
export async function processDueSchedules(): Promise<number> {
  const rows = await queryRows(
    "select schedule_id::text as schedule_id, work_id::text as work_id " +
      "from publication.publication_schedules where status = 'pending' and publish_at <= now() order by publish_at"
  );
  let done = 0;
  for (const r of rows) {
    const res = await publishWork(r.work_id, "scheduler");
    await run("update publication.publication_schedules set status = :'s' where schedule_id = :'id'", {
      id: r.schedule_id,
      s: res.ok ? "done" : "pending",
    });
    if (res.ok) done += 1;
  }
  return done;
}

/** 安排/取消定时发布（供 admin/publications/schedules 调用）。 */
export async function schedulePublish(workId: string, publishAt: string): Promise<{ ok: boolean; schedule_id?: string; reason?: string }> {
  const exists = await queryValue("select work_id::text from publication.works where work_id = :'wid'", { wid: workId });
  if (!exists) return { ok: false, reason: "work_not_found" };
  const sid = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into publication.publication_schedules (schedule_id, work_id, publish_at) values (:'sid', :'wid', :'at')",
    { sid: sid!, wid: workId, at: publishAt }
  );
  return { ok: true, schedule_id: sid! };
}

export async function cancelSchedule(scheduleId: string): Promise<boolean> {
  await run(
    "update publication.publication_schedules set status = 'cancelled' where schedule_id = :'id' and status = 'pending'",
    { id: scheduleId }
  );
  return true;
}

/** 读已发布作品（WATCH 消费） */
export function listPublished(): Promise<PublishedWork[]> {
  return queryRows(
    `select w.work_id::text as work_id, r.revision_id::text as revision_id,
            r.title as title, r.description as description, r.revision_no::text as revision_no,
            r.content::text as content, p.published_at::text as published_at
     from publication.published_pointers p
     join publication.works w on w.work_id = p.work_id
     join publication.work_revisions r on r.revision_id = p.revision_id
     where r.status = 'published'
     order by p.published_at desc`
  ) as unknown as Promise<PublishedWork[]>;
}

/**
 * WATCH public read facade. The Admin publication list retains raw editorial
 * status for authorized inspection; public WATCH must not reuse that list as
 * authorization. Every response rechecks each exact work revision and its
 * own consumer qualification. A failed/absent G5 only removes that work.
 */
export async function listWatchEligible(): Promise<PublishedWork[]> {
  const published = await listPublished();
  const allowed: PublishedWork[] = [];
  for (const work of published) {
    let content: Record<string, unknown> = {};
    try { content = readJsonColumn<Record<string, unknown>>(work.content, {}); }
    catch { continue; }
    try {
      const check = await requireCurrentWorkConsumerQualification(
        work.work_id, work.revision_id, "watch", content
      );
      if (check.ok) allowed.push(work);
    } catch {
      // Unknown current qualification is a refusal, not eligibility.
    }
  }
  return allowed;
}

/** 读待作品 Reviewer 审核的submitted修订；已作approved/rejected决定的精确修订不得重复在待审队列展示。 */
export function listPendingReview() {
  return queryRows(
    `select w.work_id::text as work_id, r.revision_id::text as revision_id,
            r.title as title, r.revision_no::text as revision_no, r.content::text as content,
            r.created_at::text as created_at
     from publication.work_revisions r
     join publication.works w on w.work_id = r.work_id
     where r.status = 'submitted'
       and not exists (
         select 1 from control.work_publication_decisions d
         where d.work_id = w.work_id
           and d.revision_id = r.revision_id
           and d.decision in ('approved','rejected')
       )
     order by r.created_at asc`
  );
}

/** 读待审作品（Admin 审核队列） */
export function listSubmitted(): Promise<SubmittedWork[]> {
  return queryRows(
    `select w.work_id::text as work_id, r.revision_id::text as revision_id,
            r.title as title, r.revision_no::text as revision_no,
            r.content::text as content, r.created_at::text as created_at
     from publication.work_revisions r
     join publication.works w on w.work_id = r.work_id
     where r.status = 'submitted'
     order by r.created_at asc`
  ) as unknown as Promise<SubmittedWork[]>;
}

/** 读某作品最新修订（用于审核详情） */
export function getLatestRevision(workId: string) {
  return queryRows(
    `select revision_id::text as revision_id, title, description, status, content,
            revision_no::text as revision_no, created_at::text as created_at
     from publication.work_revisions where work_id = :'wid'
     order by revision_no desc limit 1`,
    { wid: workId }
  );
}

/** 列出当前用户的作品（含最新修订号/状态），供 Studio 作品列表。ownerUserId 为空时仅返回无主数据（兼容旧数据）。 */
export function listWorks(ownerUserId: string) {
  return queryRows(
    `select w.work_id::text as work_id, w.title as title, w.creator as creator,
            coalesce(max(r.revision_no), 0)::text as revision_no,
            (select r2.status from publication.work_revisions r2
              where r2.work_id = w.work_id order by r2.revision_no desc limit 1) as status
     from publication.works w
     left join publication.work_revisions r on r.work_id = w.work_id
     where w.owner_user_id = :'owner'
     group by w.work_id, w.title, w.creator
     order by w.created_at desc`,
    { owner: ownerUserId }
  );
}

/** 作品四步创作状态轴：委托→研究→编导→版本（基于 research_tasks / director_plans / work_revisions 的真实存在）。 */
export async function getWorkStageStatus(workId: string) {
  // Never turn a missing task or a QUEUED/HOLD research task into DONE.
  // director_plans has no work_id association in the current schema, so a
  // detached plan is NOT proof that this particular work was directed.
  // Directed is evidenced only by this work's persisted plan AND beats in a
  // revision; no content is synthesized for the status screen.
  const rows = await queryRows(
    `select
       exists(select 1 from public.research_tasks t
              where t.work_id = :'wid') as delegated,
       exists(select 1 from public.research_tasks t
              where t.work_id = :'wid' and t.status = 'done') as researched,
       exists(select 1 from publication.work_revisions r
              where r.work_id = :'wid'
                and jsonb_typeof(r.content->'plan')='object'
                and case when jsonb_typeof(r.content->'beats')='array'
                         then jsonb_array_length(r.content->'beats') > 0
                         else false end) as directed,
       exists(select 1 from publication.work_revisions r
              where r.work_id = :'wid') as revisioned`,
    { wid: workId }
  );
  // node-pg returns booleans, and psql wrapper may return strings.
  const b = (value: unknown) => value === true || value === 't' || value === 'true';
  const row = rows[0];
  return {
    delegated: b(row?.delegated),
    researched: b(row?.researched),
    directed: b(row?.directed),
    revisioned: b(row?.revisioned),
  };
}

/** A fork/restore creates a new private draft. It never reuses the source's
 * publication qualification or mutates the historical revision. The optional
 * operation_id is a stable retry key, not a second knowledge identity. */
export type ForkRevisionResult =
  | { ok: true; revisionId: string; revisionNo: number }
  | { ok: false; reason: "no_revision" | "invalid_source" | "version_conflict" | "idempotency_conflict" | "source_unavailable"; revisionNo?: number };

export async function forkWorkRevision(
  workId: string,
  options: { sourceRevisionId?: string; expectedRevisionNo?: number; operationId?: string } = {}
): Promise<ForkRevisionResult> {
  const { sourceRevisionId, expectedRevisionNo, operationId } = options;
  if (sourceRevisionId && !canonicalUuid(sourceRevisionId)) return { ok: false, reason: "invalid_source" };
  if (operationId && !canonicalUuid(operationId)) return { ok: false, reason: "invalid_source" };
  if (expectedRevisionNo !== undefined && (!Number.isInteger(expectedRevisionNo) || expectedRevisionNo < 0)) {
    return { ok: false, reason: "invalid_source" };
  }
  const sourceSql = sourceRevisionId
    ? `select revision_id::text as revision_id, revision_no, title, description, content
         from publication.work_revisions where work_id=:'wid' and revision_id=:'src'`
    : `select revision_id::text as revision_id, revision_no, title, description, content
         from publication.work_revisions where work_id=:'wid' order by revision_no desc limit 1`;
  const sourceRows = await queryRows(sourceSql, sourceRevisionId ? { wid: workId, src: sourceRevisionId } : { wid: workId });
  const source = sourceRows[0];
  if (!source) return { ok: false, reason: "no_revision" };
  const headRows = sourceRevisionId
    ? await queryRows("select revision_no from publication.work_revisions where work_id=:'wid' order by revision_no desc limit 1", { wid: workId })
    : sourceRows;
  const currentNo = headRows.length ? Number(headRows[0].revision_no) : 0;
  let content: Record<string, unknown>;
  try { content = readJsonColumn<Record<string, unknown>>(source.content, {}); }
  catch { return { ok: false, reason: "source_unavailable" }; }
  // Never carry a previous content hash as if it identifies the new draft.
  const nextContent = { ...content };
  delete nextContent.content_hash;
  nextContent.fork_source = { work_id: workId, revision_id: String(source.revision_id), revision_no: Number(source.revision_no) };
  const hash = createHash("sha256").update(JSON.stringify(nextContent)).digest("hex");
  const savedContent = { ...nextContent, content_hash: hash };
  const isSame = (row: Record<string, unknown> | undefined) => {
    if (!row) return false;
    try {
      const prior = readJsonColumn<Record<string, unknown>>(row.content, {});
      const bound = prior.fork_source as {revision_id?: string;work_id?:string}|undefined;
      return prior.content_hash === hash && bound?.revision_id === String(source.revision_id) && bound?.work_id === workId;
    } catch { return false; }
  };

  // A retry can return its own previously committed immutable revision, even
  // when later independent edits have advanced the current head.
  if (operationId) {
    const old = await queryRows(
      "select revision_id::text as revision_id, revision_no, content from publication.work_revisions where work_id=:'wid' and revision_id=:'rid'",
      { wid: workId, rid: operationId }
    );
    if (old.length) {
      return isSame(old[0])
        ? { ok: true, revisionId: String(old[0].revision_id), revisionNo: Number(old[0].revision_no) }
        : { ok: false, reason: "idempotency_conflict" };
    }
  }
  if (expectedRevisionNo !== undefined && expectedRevisionNo !== currentNo) {
    return { ok: false, reason: "version_conflict", revisionNo: currentNo };
  }
  const revisionId = operationId || randomUUID();
  const added = await queryRows(
    `insert into publication.work_revisions
        (revision_id, work_id, revision_no, title, description, content, status)
     select :'rid', :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft'
      where exists (select 1 from publication.work_revisions
                     where work_id=:'wid' and revision_id=:'src')
        and (select coalesce(max(revision_no),0) from publication.work_revisions
             where work_id=:'wid')=:'expected'
     on conflict do nothing returning revision_id::text as revision_id`,
    {
      rid: revisionId, wid: workId, no: currentNo + 1, expected: currentNo,
      src: String(source.revision_id), title: String(source.title ?? ""), desc: String(source.description ?? ""),
      content: JSON.stringify(savedContent),
    }
  );
  if (added.length === 1 && added[0].revision_id) {
    return { ok: true, revisionId: String(added[0].revision_id), revisionNo: currentNo + 1 };
  }
  // No acknowledged insertion: distinguish a verified retry from a competing
  // writer. Never report success based on a preliminary read.
  if (operationId) {
    const retry = await queryRows(
      "select revision_id::text as revision_id, revision_no, content from publication.work_revisions where work_id=:'wid' and revision_id=:'rid'",
      { wid: workId, rid: operationId }
    );
    if (retry.length) return isSame(retry[0])
      ? { ok: true, revisionId: String(retry[0].revision_id), revisionNo: Number(retry[0].revision_no) }
      : { ok: false, reason: "idempotency_conflict" };
  }
  const now = await queryValue("select coalesce(max(revision_no),0) from publication.work_revisions where work_id=:'wid'", { wid: workId });
  return { ok: false, reason: "version_conflict", revisionNo: Number(now ?? currentNo) };
}
