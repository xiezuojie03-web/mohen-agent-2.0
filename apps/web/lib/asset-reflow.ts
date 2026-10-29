// apps/web/lib/asset-reflow.ts
//
// 资产回流：作品（work_revision）发布后，把其合格知识叙事回流成 read_model 知识资产（story_seeds），
// 让 EXP 能消费作品的叙事（不再只是 publication 表里的"孤本"）。
// 回流写 G5 资格（consumer='visual_stage'），与生产链 D05 的 story_seed 同构、同资格。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { createGovernanceRun, writeGovernanceGate } from "./governance-gate";

interface WorkContent {
  historicalQuestion?: unknown;
  understandingDelta?: unknown;
  beats?: Array<{ title?: unknown; narration?: unknown; provenanceRefs?: unknown }>;
}

/** 把某作品修订回流成 story_seed；返回回流数（幂等：同 seed_key 已存在则复用）。 */
export async function reflowWorkToAssets(workId: string, revisionId: string): Promise<{ reflowed: number; seedKey: string }> {
  const row = await queryRows(
    "select revision_id::text as rid, title, description, content from publication.work_revisions where revision_id = :'rid'",
    { rid: revisionId }
  );
  const seedKey = `work-${workId}-${revisionId.slice(0, 8)}`;
  if (!row.length) return { reflowed: 0, seedKey };

  const title = String(row[0].title ?? "未命名作品");
  let content: WorkContent = {};
  try {
    content = JSON.parse(String(row[0].content ?? "{}")) as WorkContent;
  } catch {
    content = {};
  }

  const understandingDelta = String(content.understandingDelta ?? "").trim();
  const beats = Array.isArray(content.beats) ? content.beats : [];
  const beatLines = beats
    .map((b, i) => `${i + 1}. ${String(b?.title ?? "")}：${String(b?.narration ?? "").slice(0, 120)}`)
    .filter((s) => s.trim().length > 3);
  const statement = [understandingDelta, ...beatLines].filter(Boolean).join("\n");

  // 幂等：同 seed_key 已存在则复用，不重复回流、不重复写资格
  const existing = await queryRows(
    "select story_seed_id::text as sid from read_model.story_seeds where seed_key = :'key'",
    { key: seedKey }
  );

  let seedId: string;
  if (existing.length) {
    seedId = String(existing[0].sid);
  } else {
    seedId = (await queryValue("select gen_random_uuid()::text")) ?? "";
    await run(
      `insert into read_model.story_seeds
       (story_seed_id, seed_key, title, narrative_question, payload, derived_from_finding_ids, evidence_pointer_ids)
       values (:'sid'::uuid, :'key', :'title', :'q', :'payload'::jsonb, '{}'::uuid[], '{}'::uuid[])`,
      {
        sid: seedId,
        key: seedKey,
        title,
        q: content.historicalQuestion ? String(content.historicalQuestion) : null,
        payload: JSON.stringify({
          statement,
          understanding_delta: understandingDelta,
          beat_count: beats.length,
          work_id: workId,
          revision_id: revisionId,
          provenance_refs: beats.flatMap((b) => (Array.isArray(b?.provenanceRefs) ? b.provenanceRefs.map(String) : [])),
          reflowed_at: new Date().toISOString(),
        }),
      }
    );
  }

  // 写 G5 资格（consumer='visual_stage'，EXP 的 read-model-bridge 据此消费）
  const runId = await createGovernanceRun(`作品回流：${title}`);
  await writeGovernanceGate(runId, "story_seed", seedId, "visual_stage", {
    seed_key: seedKey,
    title,
    work_id: workId,
    revision_id: revisionId,
    reflowed: true,
  });

  return { reflowed: 1, seedKey };
}
