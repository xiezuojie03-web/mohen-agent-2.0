// apps/web/lib/studio-director.ts — 创作编导（E1-3）数据访问与编排
//
// 复用 studio-creation 的 LLM 编导能力；持久化 A/B 方案与选定节拍到 director_plans。
import crypto from "node:crypto";
import { readStudioResearchProject } from "./studio-research-read";
import { readJsonColumn } from "./db-json";
import { queryRows, queryValue, run } from "@mohen/data-access";
import {
  generateDirectorPlans,
  generateDirectorPlansFromFacts,
  generateBeats,
  generateWorkPanels,
  type DirectorPlan,
  type Beat,
  type H1Finding,
  type WorkPanels,
} from "./studio-creation";

/** Read-only ST02 binding for a private director candidate. No new asset,
 * production, model execution or external transfer is authorized here. */
export async function prepareProjectDirectorInput(projectId: string, sessionToken: string) {
  const result = await readStudioResearchProject(projectId, sessionToken, {persistReadingNotes: false});
  const snapshot = result.snapshot;
  const ids = result.materials.map(material => material.id);
  if (snapshot.project_id !== projectId || typeof snapshot.snapshot_hash !== "string"
    || !snapshot.snapshot_hash || !Array.isArray(snapshot.private_material_ids)
    || JSON.stringify(snapshot.private_material_ids) !== JSON.stringify(ids))
    throw new Error("STUDIO_RESEARCH_READ_BINDING_INVALID");
  const materialSnapshots = result.materials.map(material => ({
    ref: material.id, epistemic: material.epistemic,
    content_sha256: crypto.createHash("sha256").update(JSON.stringify({
      id: material.id, snippet: material.snippet, sourceRef: material.sourceRef,
      epistemic: material.epistemic,
    })).digest("hex"),
  }));
  return {
    state: "HOLD" as const, reason: "external_processing_not_authorized",
    execution_authorized: false as const, project_id: projectId,
    source_snapshot: snapshot, source_refs: ids, material_snapshots: materialSnapshots,
    missing_requirements: ["CURRENT_EXTERNAL_PROCESSING_RIGHTS", "CONTROLLED_PROVIDER_PURPOSE_INPUT_CONTEXT", "AUTHORIZED_SPEND"],
    gaps: result.gaps,
  };
}

export interface CreatedPlan {
  planId: string;
  planA: DirectorPlan;
  planB: DirectorPlan;
  facts: string[];
  finding: H1Finding;
}

/** 生成 A/B 导演方案（H1→H2）并持久化，返回 plan_id。P0-1：方案归属创建者。
 * opts.facts 存在时走 M5 正道（项目真实材料 + dispatcher grant auth）；
 * sourceIds 服务端持久化到 plan 行，供后续 select/panels 逐来源权利核验。 */
export async function createDirectorPlan(
  brief: string,
  topic = "jinze",
  ownerUserId: string,
  opts?: { auth?: unknown; facts?: string[]; sourceIds?: string[]; projectId?: string }
): Promise<CreatedPlan | null> {
  const result = opts?.facts
    ? await generateDirectorPlansFromFacts(opts.facts, brief, opts.auth)
    : await generateDirectorPlans(brief, topic, opts?.auth);
  if (!result) return null;
  if (typeof opts?.projectId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(opts.projectId))
    throw new Error("STUDIO_PROJECT_BINDING_REQUIRED");
  const planId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into public.director_plans (plan_id, brief, topic, plan_a, plan_b, facts, finding, owner_user_id, source_ids, project_id)
     values (:'id', :'brief', :'topic', :'a'::jsonb, :'b'::jsonb, :'facts'::jsonb, :'finding'::jsonb, :'owner', :'sids'::jsonb, :'project'::uuid)`,
    {
      id: planId!,
      brief,
      topic,
      a: JSON.stringify(result.planA),
      b: JSON.stringify(result.planB),
      facts: JSON.stringify(result.facts),
      finding: JSON.stringify(result.finding),
      owner: ownerUserId,
      sids: JSON.stringify(opts?.sourceIds ?? []),
      project: opts.projectId,
    }
  );
  return { planId: planId!, planA: result.planA, planB: result.planB, facts: result.facts, finding: result.finding };
}

export async function getDirectorPlan(planId: string) {
  const rows = await queryRows(
    "select plan_id::text as plan_id, to_jsonb(d)->>'project_id' as project_id, brief, topic, plan_a, plan_b, facts, finding, source_ids, selected, beats, created_at::text as created_at from public.director_plans d where plan_id = :'id'",
    { id: planId }
  );
  return rows[0] ?? null;
}

/** 选定方案 A/B，生成节拍，更新持久化 */
export async function selectDirectorPlan(
  planId: string,
  which: "A" | "B",
  auth?: unknown
): Promise<{ beats: Beat[] } | null> {
  const row = await getDirectorPlan(planId);
  if (!row) return null;
  const plan = which === "A" ? readJsonColumn<DirectorPlan>(row.plan_a, {} as DirectorPlan) : readJsonColumn<DirectorPlan>(row.plan_b, {} as DirectorPlan);
  const facts = readJsonColumn<string[]>(row.facts, []);
  const beats = await generateBeats(plan, facts, auth);
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
export async function getWorkPanels(planId: string, auth?: unknown): Promise<WorkPanels | null> {
  const row = await getDirectorPlan(planId);
  if (!row || !row.selected) return null;
  const which = row.selected === "B" ? "B" : "A";
  const plan = readJsonColumn<DirectorPlan>(which === "B" ? row.plan_b : row.plan_a, {} as DirectorPlan);
  const facts = readJsonColumn<string[]>(row.facts, []);
  const beats = readJsonColumn<Beat[]>(row.beats, []);
  if (!beats.length) return null;
  return generateWorkPanels(plan, facts, beats, auth);
}

/** E1-3 WorkRevision：把选定方案 + H3 节拍存为不可变修订（content hash = CAS）。
 * opts.rightsAcknowledged 是 Creator 在保存时的显式确认：本作不含第三方媒体
 * （无第三方媒体时发布资格的必要条件之一；含媒体则须逐件许可，不得靠此声明确认）。 */
export async function commitWorkRevision(
  workId: string,
  planId: string,
  expectedRevisionNo?: number,
  opts?: { rightsAcknowledged?: boolean }
): Promise<{ revisionId: string; revisionNo: number; contentHash: string; conflict?: boolean } | null> {
  // The plan is a private Owner source, not a free-standing authorization to
  // append to an arbitrary work. Check both owners in the same read.
  const rows = await queryRows(
    `select d.plan_a, d.plan_b, d.beats, d.finding, d.selected
       from public.director_plans d
       join publication.works w on w.owner_user_id = d.owner_user_id
      where d.plan_id = :'pid' and w.work_id = :'wid'`,
    { pid: planId, wid: workId }
  );
  const row = rows[0];
  if (!row || (row.selected !== "A" && row.selected !== "B")) return null;
  const which: "A" | "B" = row.selected;
  const plan = readJsonColumn<DirectorPlan>(which === "B" ? row.plan_b : row.plan_a, {} as DirectorPlan);
  const beats = readJsonColumn<Beat[]>(row.beats, []);
  const finding = readJsonColumn<Partial<H1Finding>>(row.finding, {});
  if (!plan || !Array.isArray(beats) || !beats.length) return null;

  // Bind the exact source plan and selected side to the immutable work revision.
  // An unchanged retry must not create a second revision.
  const content = {
    director_source: { plan_id: planId, selected: which },
    h1Finding: finding,
    motif: finding.motifCodes ?? [],
    historicalQuestion: finding.historicalQuestion ?? "",
    understandingDelta: finding.understandingDelta ?? "",
    plan: { angle: plan.angle ?? "", points: plan.points ?? [], cover: plan.cover ?? "", directorDecisions: plan.directorDecisions ?? [] },
    beats,
    ...(opts?.rightsAcknowledged ? { media: [] as unknown[], rights_acknowledged: true } : {}),
  };
  const contentHash = crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
  const latest = await queryRows(
    `select revision_id::text as revision_id, revision_no, content
       from publication.work_revisions where work_id = :'wid'
      order by revision_no desc limit 1`,
    { wid: workId }
  );
  const currentNo = latest.length ? Number(latest[0].revision_no) : 0;
  const sameRevision = (r: Record<string, unknown> | undefined) => {
    if (!r) return false;
    try {
      const c = readJsonColumn<Record<string, unknown>>(r.content, {});
      return c.content_hash === contentHash &&
        (c.director_source as {plan_id?: string; selected?: string} | undefined)?.plan_id === planId &&
        (c.director_source as {plan_id?: string; selected?: string} | undefined)?.selected === which;
    } catch { return false; }
  };
  const conflict = (no: number) => ({ revisionId: "", revisionNo: no, contentHash, conflict: true as const });
  // A lost HTTP acknowledgement must be safe to retry with the *original*
  // expected head: the exact same saved source/content is an acknowledged
  // idempotent result. A genuinely different saved revision still conflicts.
  if (sameRevision(latest[0])) {
    return { revisionId: String(latest[0].revision_id), revisionNo: currentNo, contentHash };
  }
  if (expectedRevisionNo !== undefined && expectedRevisionNo !== currentNo) return conflict(currentNo);

  const revisionId = await queryValue("select gen_random_uuid()::text");
  // The one INSERT is the arbiter: a concurrent editor, foreign plan, or
  // changed selected plan/beat snapshot cannot win by racing a prior read.
  const saved = await queryRows(
    `insert into publication.work_revisions
       (revision_id, work_id, revision_no, title, description, content, status)
     select :'rid', :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft'
      where (select coalesce(max(revision_no),0) from publication.work_revisions where work_id=:'wid')=:'expected'
        and exists (
          select 1 from public.director_plans d
          join publication.works w on w.owner_user_id=d.owner_user_id
          where d.plan_id=:'pid' and w.work_id=:'wid' and d.selected=:'which'
            and d.beats=:'beats'::jsonb and d.finding=:'finding'::jsonb
            and (case when d.selected='B' then d.plan_b else d.plan_a end)=:'plan'::jsonb
        )
     on conflict (work_id,revision_no) do nothing
     returning revision_id::text as revision_id`,
    {
      rid: revisionId!, wid: workId, no: currentNo + 1, expected: currentNo,
      title: (plan.angle ?? "").slice(0, 80) || "未命名作品",
      desc: finding.understandingDelta ?? "", content: JSON.stringify({ ...content, content_hash: contentHash }),
      pid: planId, which, beats: JSON.stringify(beats), finding: JSON.stringify(finding), plan: JSON.stringify(plan),
    }
  );
  if (saved.length === 1 && saved[0].revision_id) {
    return { revisionId: String(saved[0].revision_id), revisionNo: currentNo + 1, contentHash };
  }
  // Distinguish a byte-identical retry from a real concurrent edit. Do not
  // report success for an unacknowledged INSERT.
  const observed = await queryRows(
    `select revision_id::text as revision_id, revision_no, content
       from publication.work_revisions where work_id=:'wid'
      order by revision_no desc limit 1`,
    { wid: workId }
  );
  if (sameRevision(observed[0])) {
    return { revisionId: String(observed[0].revision_id), revisionNo: Number(observed[0].revision_no), contentHash };
  }
  return conflict(observed.length ? Number(observed[0].revision_no) : currentNo);
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

/** The unique (work_id, revision_no) constraint arbitrates concurrent edits.
 * A preliminary read is not CAS: only an acknowledged INSERT may report success. */
async function appendEditedRevision(
  workId: string,
  currentNo: number,
  latest: Record<string, unknown>,
  content: Record<string, unknown>
): Promise<{ revisionId: string; revisionNo: number; conflict: boolean }> {
  const contentHash = crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
  const saved = await queryRows(
    `insert into publication.work_revisions (work_id, revision_no, title, description, content, status)
     select :'wid', :'no', :'title', :'desc', :'content'::jsonb, 'draft'
     where (select coalesce(max(revision_no),0) from publication.work_revisions where work_id=:'wid')=:'expected'
     on conflict (work_id,revision_no) do nothing
     returning revision_id::text as revision_id`,
    { wid: workId, no: currentNo + 1, expected: currentNo,
      title: String(latest.title ?? "未命名作品"), desc: String(latest.description ?? ""),
      content: JSON.stringify({ ...content, content_hash: contentHash }) }
  );
  if (saved.length === 1 && saved[0].revision_id) {
    return { revisionId: String(saved[0].revision_id), revisionNo: currentNo + 1, conflict: false };
  }
  const observed = Number(await queryValue(
    "select coalesce(max(revision_no),0) from publication.work_revisions where work_id=:'wid'", { wid: workId }
  ));
  return { revisionId: "", revisionNo: Math.max(currentNo, observed), conflict: true };
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

  const content = readJsonColumn<{ beats?: Beat[]; [k: string]: unknown }>(latest[0].content, {});
  const beats = [...(content.beats ?? [])];
  if (!Array.isArray(beatDiff) || !beatDiff.length || new Set(beatDiff.map(d => d?.index)).size !== beatDiff.length)
    throw new Error("invalid_beat_diff");
  for (const d of beatDiff) {
    if (!d || !Number.isSafeInteger(d.index) || d.index < 0 || d.index >= beats.length
      || !d.patch || typeof d.patch !== "object" || Array.isArray(d.patch)
      || !Object.keys(d.patch).length || Object.keys(d.patch).some(key =>
        !["title", "narration", "visual", "directorTimecodeMs"].includes(key))) throw new Error("invalid_beat_diff");
    for (const [key, value] of Object.entries(d.patch)) {
      if (key === "directorTimecodeMs" ? !Number.isSafeInteger(value) || Number(value) < 0
        : typeof value !== "string" || !value.trim()) throw new Error("invalid_beat_diff");
    }
    beats[d.index] = { ...beats[d.index], ...d.patch };
  }
  if (beatDiff.some(d => Object.hasOwn(d.patch, "directorTimecodeMs")) && beats.some((beat, i) =>
    !Number.isSafeInteger(beat.directorTimecodeMs) || beat.directorTimecodeMs < 0
    || (i > 0 && beat.directorTimecodeMs <= beats[i - 1].directorTimecodeMs))) throw new Error("invalid_beat_diff");
  // A saved private edit is not an automatic H1 historical review.
  const newContent = { ...content, beats };
  return appendEditedRevision(workId, curNo, latest[0], newContent);
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

  const content = readJsonColumn<{ beats?: Beat[]; [k: string]: unknown }>(latest[0].content, {});
  const beats = content.beats ?? [];
  const valid =
    Array.isArray(order) &&
    order.length === beats.length &&
    order.every((n) => Number.isInteger(n) && n >= 0 && n < beats.length) &&
    new Set(order).size === order.length;
  if (!valid) return null;

  const newContent = { ...content, beats: order.map((i) => beats[i]) };
  return appendEditedRevision(workId, curNo, latest[0], newContent);
}
