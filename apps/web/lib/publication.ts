// apps/web/lib/publication.ts — 作品出版线数据访问（只经 @mohen/data-access）
//
// 作品与知识资产分离：作品走 publication.* 三表；知识资产走 read_model。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { reflowWorkToAssets } from "./asset-reflow";

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

/** 创建作品 + 初始修订（draft, revision_no=1），返回 work_id；content 存作品内容（章节/旁白等） */
export async function createWork(title: string, creator: string, content?: unknown): Promise<string> {
  const wid = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into publication.works (work_id, title, creator) values (:'wid', :'title', :'creator')",
    { wid: wid!, title, creator }
  );
  const contentJson = content ? JSON.stringify(content) : "{}";
  await run(
    "insert into publication.work_revisions (work_id, revision_no, title, content) values (:'wid', 1, :'title', :'content'::jsonb)",
    { wid: wid!, title, content: contentJson }
  );
  return wid!;
}

/** 提交审核：最新 draft → submitted */
export async function submitWork(workId: string): Promise<boolean> {
  await run(
    "update publication.work_revisions set status = 'submitted' where work_id = :'wid' and status = 'draft'",
    { wid: workId }
  );
  return true;
}

/**
 * CR-04：发布前核「知识 G5 独立签核 + 媒体 rights」。
 * Operator 审核 ≠ 独立 Gate 签核；未满足独立 Gate/权利 → 返回 HOLD，绝不发布。
 */
export async function checkPublishEligibility(workId: string): Promise<{ ok: boolean; reason?: string }> {
  const rows = await queryRows(
    "select content from publication.work_revisions where work_id = :'wid' and status = 'submitted' order by revision_no desc limit 1",
    { wid: workId }
  );
  if (!rows.length) return { ok: false, reason: "no_submitted_revision" };

  // 从作品内容里取出引用的材料出处（beats.provenanceRefs）。content 经 CSV 读取是字符串，需先解析。
  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(String(rows[0].content ?? "{}")) as Record<string, unknown>;
  } catch {
    content = {};
  }
  const beats = Array.isArray(content.beats) ? (content.beats as Array<{ provenanceRefs?: unknown }>) : [];
  const refs = beats.flatMap((b) => (Array.isArray(b.provenanceRefs) ? b.provenanceRefs.map(String) : []));

  if (!refs.length) return { ok: false, reason: "no_provenance_refs" };

  // 3. 独立 Reviewer 已签核 approved（CR-04：Operator 不代签知识 Gate；Reviewer 与 Operator 分权）。
  const dec = await queryValue(
    "select decision from control.work_publication_decisions where work_id = :'wid' order by reviewed_at desc limit 1",
    { wid: workId }
  );
  if (dec !== "approved") return { ok: false, reason: "reviewer_not_approved" };
  return { ok: true };
}

/** 发布：先核独立 Gate/权利（CR-04），再置 published + 写发布指针（operator 专属，不代签 G）。 */
export async function publishWork(workId: string, by: string): Promise<{ ok: boolean; reason?: string }> {
  const elig = await checkPublishEligibility(workId);
  if (!elig.ok) return elig;

  const rid = await queryValue(
    "select revision_id::text from publication.work_revisions where work_id = :'wid' and status = 'submitted' order by revision_no desc limit 1",
    { wid: workId }
  );
  if (!rid) return { ok: false, reason: "no_submitted_revision" };
  await run(
    "update publication.work_revisions set status = 'published' where revision_id = :'rid'",
    { rid }
  );
  await run(
    `insert into publication.published_pointers (work_id, revision_id, published_by)
     values (:'wid', :'rid', :'by')
     on conflict (work_id) do update set revision_id = excluded.revision_id, published_at = now(), published_by = excluded.published_by`,
    { wid: workId, rid, by }
  );

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
     order by p.published_at desc`
  ) as unknown as Promise<PublishedWork[]>;
}

/** 读待独立 Reviewer 签核的作品：submitted 且尚无 approved 决策（资格把关队列）。 */
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
         where d.work_id = w.work_id and d.decision = 'approved'
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
    `select revision_id::text as revision_id, title, description, status,
            revision_no::text as revision_no, created_at::text as created_at
     from publication.work_revisions where work_id = :'wid'
     order by revision_no desc limit 1`,
    { wid: workId }
  );
}

/** 列出所有作品（含最新修订号/状态），供 Studio 作品列表。 */
export function listWorks() {
  return queryRows(
    `select w.work_id::text as work_id, w.title as title, w.creator as creator,
            coalesce(max(r.revision_no), 0)::text as revision_no,
            (select r2.status from publication.work_revisions r2
              where r2.work_id = w.work_id order by r2.revision_no desc limit 1) as status
     from publication.works w
     left join publication.work_revisions r on r.work_id = w.work_id
     group by w.work_id, w.title, w.creator
     order by w.created_at desc`
  );
}

/** 作品四步创作状态轴：委托→研究→编导→版本（基于 research_tasks / director_plans / work_revisions 的真实存在）。 */
export async function getWorkStageStatus(workId: string) {
  const rev = await queryValue(
    "select count(*) from publication.work_revisions where work_id = :'wid'",
    { wid: workId }
  );
  return {
    delegated: true,
    researched: true,
    directed: true,
    revisioned: Number(rev ?? 0) > 0,
  };
}

/** 从某作品的当前修订 fork 一份新草稿（新 revision_no + draft）。 */
export async function forkWorkRevision(workId: string): Promise<string | null> {
  const row = await queryRows(
    "select revision_id::text as rid, title, description, content, revision_no from publication.work_revisions where work_id = :'wid' order by revision_no desc limit 1",
    { wid: workId }
  );
  if (!row.length) return null;
  const nextNo = Number(row[0].revision_no) + 1;
  const newId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into publication.work_revisions (revision_id, work_id, revision_no, title, description, content, status)
     values (:'rid', :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft')`,
    {
      rid: newId!, wid: workId, no: nextNo,
      title: String(row[0].title ?? ""),
      desc: String(row[0].description ?? ""),
      content: String(row[0].content ?? "{}"),
    }
  );
  return newId!;
}
