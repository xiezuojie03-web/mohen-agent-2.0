// apps/web/lib/studio-director.ts — 创作编导（E1-3）数据访问与编排
//
// 复用 studio-creation 的 LLM 编导能力；持久化 A/B 方案与选定节拍到 director_plans。
import crypto from "node:crypto";
import { queryRows, queryValue, run } from "@mohen/data-access";
import {
  generateDirectorPlans,
  generateBeats,
  generateWorkPanels,
  type DirectorPlan,
  type Beat,
  type H1Finding,
  type WorkPanels,
} from "./studio-creation";

export interface CreatedPlan {
  planId: string;
  planA: DirectorPlan;
  planB: DirectorPlan;
  facts: string[];
  finding: H1Finding;
}

/** 生成 A/B 导演方案（H1→H2）并持久化，返回 plan_id */
export async function createDirectorPlan(brief: string, topic = "jinze"): Promise<CreatedPlan | null> {
  const result = await generateDirectorPlans(brief, topic);
  if (!result) return null;
  const planId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into public.director_plans (plan_id, brief, topic, plan_a, plan_b, facts, finding)
     values (:'id', :'brief', :'topic', :'a'::jsonb, :'b'::jsonb, :'facts'::jsonb, :'finding'::jsonb)`,
    {
      id: planId!,
      brief,
      topic,
      a: JSON.stringify(result.planA),
      b: JSON.stringify(result.planB),
      facts: JSON.stringify(result.facts),
      finding: JSON.stringify(result.finding),
    }
  );
  return { planId: planId!, planA: result.planA, planB: result.planB, facts: result.facts, finding: result.finding };
}

export async function getDirectorPlan(planId: string) {
  const rows = await queryRows(
    "select plan_id::text as plan_id, brief, topic, plan_a, plan_b, facts, finding, selected, beats, created_at::text as created_at from public.director_plans where plan_id = :'id'",
    { id: planId }
  );
  return rows[0] ?? null;
}

/** 选定方案 A/B，生成节拍，更新持久化 */
export async function selectDirectorPlan(
  planId: string,
  which: "A" | "B"
): Promise<{ beats: Beat[] } | null> {
  const row = await getDirectorPlan(planId);
  if (!row) return null;
  const plan = which === "A" ? (JSON.parse(row.plan_a) as DirectorPlan) : (JSON.parse(row.plan_b) as DirectorPlan);
  const facts = JSON.parse(row.facts) as string[];
  const beats = await generateBeats(plan, facts);
  if (!beats) return null;
  await run(
    `update public.director_plans
     set selected = :'which', beats = :'beats'::jsonb, updated_at = now()
     where plan_id = :'id'`,
    { which, beats: JSON.stringify(beats), id: planId }
  );
  return { beats };
}

/** 生成作品四面板（API-X01）：需先选定方案并生成分镜。 */
export async function getWorkPanels(planId: string): Promise<WorkPanels | null> {
  const row = await getDirectorPlan(planId);
  if (!row || !row.selected) return null;
  const which = row.selected === "B" ? "B" : "A";
  const plan = JSON.parse(String(which === "B" ? row.plan_b : row.plan_a)) as DirectorPlan;
  const facts = JSON.parse(String(row.facts ?? "[]")) as string[];
  const beats = JSON.parse(String(row.beats ?? "[]")) as Beat[];
  if (!beats.length) return null;
  return generateWorkPanels(plan, facts, beats);
}

/** E1-3 WorkRevision：把选定方案 + H3 节拍存为不可变修订（content hash = CAS）。 */
export async function commitWorkRevision(
  workId: string,
  planId: string
): Promise<{ revisionId: string; revisionNo: number; contentHash: string } | null> {
  const row = await getDirectorPlan(planId);
  if (!row || !row.selected) return null;
  const which = row.selected === "B" ? "B" : "A";
  const plan = JSON.parse(String(which === "B" ? row.plan_b : row.plan_a)) as DirectorPlan;
  const beats = JSON.parse(String(row.beats ?? "[]")) as Beat[];
  const finding = JSON.parse(String(row.finding ?? "{}")) as Partial<H1Finding>;

  const content = {
    motif: finding.motifCodes ?? [],
    historicalQuestion: finding.historicalQuestion ?? "",
    understandingDelta: finding.understandingDelta ?? "",
    plan: { angle: plan.angle ?? "", points: plan.points ?? [], cover: plan.cover ?? "", directorDecisions: plan.directorDecisions ?? [] },
    beats,
  };
  const contentHash = crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");

  const nextNo = Number(
    (await queryValue(
      "select coalesce(max(revision_no), 0) + 1 from publication.work_revisions where work_id = :'id'",
      { id: workId }
    )) ?? 1
  );
  const revisionId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into publication.work_revisions (revision_id, work_id, revision_no, title, description, content, status)
     values (:'rid', :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft')`,
    {
      rid: revisionId!,
      wid: workId,
      no: nextNo,
      title: (plan.angle ?? "").slice(0, 80) || "未命名作品",
      desc: finding.understandingDelta ?? "",
      content: JSON.stringify({ ...content, content_hash: contentHash }),
    }
  );
  return { revisionId: revisionId!, revisionNo: nextNo, contentHash };
}

/** 媒体候选：从资产台账选已登记素材；缺的槽位如实说明，不伪造。 */
export async function selectMediaCandidates(): Promise<{
  assets: Array<{ title: string; license: string; author: string; intendedUse: string }>;
  note: string;
}> {
  const rows = await queryRows(
    "select title, license, author, intended_use from public.assets where status = 'verified' order by created_at asc limit 12"
  );
  return {
    assets: rows.map((r) => ({
      title: String(r.title ?? ""),
      license: String(r.license ?? ""),
      author: String(r.author ?? ""),
      intendedUse: String(r.intended_use ?? ""),
    })),
    note: "仅返回已登记资产；其余素材槽位缺，E1-8 核权利后补齐",
  };
}

/** 局部改稿：CAS 校验 expected_revision_no，改动即新不可变修订；版本冲突如实返回。 */
export async function reviseBeat(
  workId: string,
  expectedRevisionNo: number,
  beatDiff: Array<{ index: number; patch: Partial<Beat> }>
): Promise<{ revisionId: string; revisionNo: number; conflict: boolean } | null> {
  const latest = await queryRows(
    "select revision_id::text as rid, revision_no, title, description, content from publication.work_revisions where work_id = :'id' order by revision_no desc limit 1",
    { id: workId }
  );
  if (!latest.length) return null;
  const curNo = Number(latest[0].revision_no);
  if (curNo !== expectedRevisionNo) return { revisionId: "", revisionNo: curNo, conflict: true };

  const content = JSON.parse(String(latest[0].content ?? "{}")) as { beats?: Beat[]; [k: string]: unknown };
  const beats = [...(content.beats ?? [])];
  for (const d of beatDiff) {
    if (d.index < 0 || d.index >= beats.length) continue;
    beats[d.index] = { ...beats[d.index], ...d.patch };
  }
  const newContent = { ...content, beats };
  const contentHash = crypto.createHash("sha256").update(JSON.stringify(newContent)).digest("hex");

  const revisionId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into publication.work_revisions (revision_id, work_id, revision_no, title, description, content, status)
     values (:'rid', :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft')`,
    {
      rid: revisionId!,
      wid: workId,
      no: curNo + 1,
      title: String(latest[0].title ?? "未命名作品"),
      desc: String(latest[0].description ?? ""),
      content: JSON.stringify({ ...newContent, content_hash: contentHash }),
    }
  );
  return { revisionId: revisionId!, revisionNo: curNo + 1, conflict: false };
}

/** 分镜重排：按 order（新顺序对应的原始下标全排列）重排 beats，生成新修订（CAS）。 */
export async function reorderBeats(
  workId: string,
  expectedRevisionNo: number,
  order: number[]
): Promise<{ revisionId: string; revisionNo: number; conflict: boolean } | null> {
  const latest = await queryRows(
    "select revision_id::text as rid, revision_no, title, description, content from publication.work_revisions where work_id = :'id' order by revision_no desc limit 1",
    { id: workId }
  );
  if (!latest.length) return null;
  const curNo = Number(latest[0].revision_no);
  if (curNo !== expectedRevisionNo) return { revisionId: "", revisionNo: curNo, conflict: true };

  const content = JSON.parse(String(latest[0].content ?? "{}")) as { beats?: Beat[]; [k: string]: unknown };
  const beats = content.beats ?? [];
  const valid =
    Array.isArray(order) &&
    order.length === beats.length &&
    order.every((n) => Number.isInteger(n) && n >= 0 && n < beats.length) &&
    new Set(order).size === order.length;
  if (!valid) return null;

  const newContent = { ...content, beats: order.map((i) => beats[i]) };
  const contentHash = crypto.createHash("sha256").update(JSON.stringify(newContent)).digest("hex");

  const revisionId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into publication.work_revisions (revision_id, work_id, revision_no, title, description, content, status)
     values (:'rid', :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft')`,
    {
      rid: revisionId!, wid: workId, no: curNo + 1,
      title: String(latest[0].title ?? "未命名作品"),
      desc: String(latest[0].description ?? ""),
      content: JSON.stringify({ ...newContent, content_hash: contentHash }),
    }
  );
  return { revisionId: revisionId!, revisionNo: curNo + 1, conflict: false };
}
