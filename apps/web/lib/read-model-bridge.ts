// apps/web/lib/read-model-bridge.ts
//
// 第二层 · 视觉舞台真实数据桥接：只读 read_model 六类 L5 发布成果（consumer='visual_stage'）。
// 解决冻结 JSON 与真实数据并行的双事实源问题：真实数据可用时，视觉舞台优先呈现生产链产出；
// 库不可用/无 G5 PASS 时返回 available=false，由上层降级到冻结 JSON（绝不静默编造）。
//
// V1.4 组合批（2026-10-17）：新增时间投影（P03 map_timeline_projections）、着录分歧
// （world_projections.payload.conflicts_detail）与未决问题（payload.open_questions）三类读取，
// 供 s06 时间轴 / s05 冲突并列 / s08 与内容看板消费。
//
// 纪律：只读 SELECT，零写库；唯一通道 @mohen/data-access。

import { queryRows } from "@mohen/data-access";

export interface ProductionEvidenceExcerpt {
  /** 史料原文摘录（display_excerpt，不改写） */
  excerpt: string;
  /** 出处（人话，如「光绪《青浦县志》」；发布层未细化时为通用来源名） */
  sourceTitle: string;
}

export interface ProductionStorySeed {
  /** 故事种子标题 */
  title: string;
  /** 可讲的故事陈述（D05 statement，人话增量，非事实断言） */
  statement: string;
}

/** V1.4：P03 时空投影的一条时间事件（只含有着录的年代） */
export interface ProductionTimelineEvent {
  entity: string;
  change_type: string;
  after_state: string;
  dynasty: string;
  year: number | null;
  precision: string;
}

export interface ProductionTimeline {
  title: string;
  events: ProductionTimelineEvent[];
}

/** V1.4：W09 着录分歧（并列保留，未裁决） */
export interface ProductionConflictVariant {
  value: string;
  source: string;
}

export interface ProductionConflict {
  key: string;
  subject: string;
  variants: ProductionConflictVariant[];
}

/** V1.4：未决问题（D03 边界登记：含无据关系拒绝与精度缺口） */
export interface ProductionOpenQuestion {
  question: string;
  missingEvidence: string;
}

/** V1.5：今貌照片（P06 视觉证据；身份 = V3 今日观察，出处/license 随行） */
export interface ProductionVisual {
  /** 影像被断言描绘的实体标签 */
  entities: string[];
  /** 可前端直接引用的资产 URL（/production-assets/...） */
  displayUrl: string;
  /** Commons 条目自述（来源自己的话，照录不改写） */
  excerpt: string;
  sourceTitle: string;
  license: string;
  artist: string;
  timeIdentity: string;
  /** Commons 条目页（溯源链接） */
  commonsTitle: string;
}

export interface ProductionRelationSummary {
  /** 已发布世界投影里的实体标签（空格分隔文本切分） */
  entities: string[];
  /** 已发布世界投影里的关系行（"甲—谓词—乙"） */
  relations: string[];
  /** 已发布故事种子数 */
  storyCount: number;
  /** 是否有真实 G5(visual_stage) 数据可消费 */
  available: boolean;
  /** 投影标题（来源 run） */
  title?: string;
  /** D2 内容看板：史料原文摘录（按需展示，Evidence on Demand） */
  evidence: ProductionEvidenceExcerpt[];
  /** D2 内容看板：可讲的故事（D05 story_seeds） */
  stories: ProductionStorySeed[];
  /** V1.4：P03 时间投影（s06 时间轴消费；无有着录年代时为 null） */
  timeline: ProductionTimeline | null;
  /** V1.4：着录分歧（s05 冲突并列消费；无分歧时为空数组） */
  conflicts: ProductionConflict[];
  /** V1.4：未决问题（s08 / 内容看板消费；含"关系拒绝"登记） */
  openQuestions: ProductionOpenQuestion[];
  /** V1.5：今貌照片（s01 视觉层消费；V3 今日观察，无数据时为空数组） */
  visuals: ProductionVisual[];
}

export async function readProductionRelationSummary(): Promise<ProductionRelationSummary> {
  try {
    const proj = await queryRows(
      `select p.payload::text as payload
       from read_model.world_projections p
       join control.gate_audits g
         on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
        and g.consumer='visual_stage' and g.object_type='world_projection' and g.object_id=p.projection_id
       order by p.generated_at desc limit 1`
    );
    const seeds = await queryRows(
      `select count(*)::text as cnt
       from read_model.story_seeds s
       join control.gate_audits g
         on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
        and g.consumer='visual_stage' and g.object_type='story_seed' and g.object_id=s.story_seed_id`
    );
    // D2 内容看板：史料原文摘录（evidence_pointers，G5 visual_stage 独立资格）
    const evidence = await queryRows(
      `select e.display_excerpt as excerpt,
              coalesce(e.display_locator->>'source_title', '史料原文') as source_title
       from read_model.evidence_pointers e
       join control.gate_audits g
         on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
        and g.consumer='visual_stage' and g.object_type='evidence_pointer' and g.object_id=e.evidence_pointer_id
       order by e.generated_at asc`
    );
    // D2 内容看板：可讲的故事（story_seeds，D05 statement）
    const stories = await queryRows(
      `select s.title as title,
              coalesce(s.payload->>'statement', s.title, '') as statement
       from read_model.story_seeds s
       join control.gate_audits g
         on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
        and g.consumer='visual_stage' and g.object_type='story_seed' and g.object_id=s.story_seed_id
       order by s.generated_at asc`
    );
    // V1.4：P03 时间投影（取最新一条 current_valid visual_stage）
    const timelineRows = await queryRows(
      `select m.payload::text as payload
       from read_model.map_timeline_projections m
       join control.gate_audits g
         on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
        and g.consumer='visual_stage' and g.object_type='map_timeline_projection' and g.object_id=m.map_timeline_projection_id
       order by m.generated_at desc limit 1`
    );
    // V1.5：今貌照片（P06 视觉证据指针，G5 visual_stage current_valid）
    const visualRows = await queryRows(
      `select e.display_excerpt as excerpt,
              coalesce(e.display_locator->>'source_title', '史料影像') as source_title,
              coalesce(e.display_locator->>'display_url', '') as display_url,
              coalesce(e.display_locator->>'license', 'license 待核') as license,
              coalesce(e.display_locator->>'artist', '作者待核') as artist,
              coalesce(e.display_locator->>'time_identity', '今日观察') as time_identity,
              coalesce(e.display_locator->>'entities', '') as entities,
              coalesce(e.display_locator->>'commons_title', '') as commons_title
       from read_model.evidence_pointers e
       join control.gate_audits g
         on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
        and g.consumer='visual_stage' and g.object_type='evidence_pointer' and g.object_id=e.evidence_pointer_id
       where e.display_locator->>'visual_type' = 'today_photo'
       order by e.generated_at asc`
    );
    if (!proj.length) {
      return { entities: [], relations: [], storyCount: 0, available: false, evidence: [], stories: [], timeline: null, conflicts: [], openQuestions: [], visuals: [] };
    }
    const payload = JSON.parse(proj[0].payload || "{}");
    const timeline: ProductionTimeline | null = (() => {
      if (!timelineRows.length) return null;
      try {
        const tl = JSON.parse(timelineRows[0].payload || "{}");
        const events = Array.isArray(tl.events) ? tl.events : [];
        if (!events.length) return null;
        return {
          title: String(tl.title ?? "时间投影"),
          events: events.map((e: Record<string, unknown>) => ({
            entity: String(e.entity ?? ""),
            change_type: String(e.change_type ?? ""),
            after_state: String(e.after_state ?? ""),
            dynasty: String(e.dynasty ?? ""),
            year: typeof e.year === "number" ? e.year : null,
            precision: String(e.precision ?? "unknown"),
          })).filter((e: ProductionTimelineEvent) => e.entity.length > 0),
        };
      } catch {
        return null;
      }
    })();
    const conflicts: ProductionConflict[] = Array.isArray(payload.conflicts_detail)
      ? payload.conflicts_detail
          .map((c: Record<string, unknown>) => ({
            key: String(c.key ?? ""),
            subject: String(c.subject ?? ""),
            variants: (Array.isArray(c.variants) ? c.variants : [])
              .map((v: Record<string, unknown>) => ({ value: String(v.value ?? ""), source: String(v.source ?? "") }))
              .filter((v: ProductionConflictVariant) => v.value.length > 0),
          }))
          .filter((c: ProductionConflict) => c.key.length > 0 && c.variants.length > 0)
      : [];
    const openQuestions: ProductionOpenQuestion[] = Array.isArray(payload.open_questions)
      ? payload.open_questions
          .map((q: Record<string, unknown>) => ({
            question: String(q.question ?? ""),
            missingEvidence: String(q.missing_evidence ?? ""),
          }))
          .filter((q: ProductionOpenQuestion) => q.question.length > 0)
      : [];
    return {
      entities: String(payload.entities ?? "")
        .split(/\s+/)
        .map((s: string) => s.trim())
        .filter(Boolean),
      relations: Array.isArray(payload.relations) ? payload.relations : [],
      storyCount: Number(seeds[0]?.cnt ?? 0),
      available: true,
      title: payload.title ? String(payload.title) : undefined,
      evidence: evidence.map((r) => ({
        excerpt: String(r.excerpt ?? "").trim(),
        sourceTitle: String(r.source_title ?? "史料原文").trim(),
      })).filter((r) => r.excerpt.length > 0),
      stories: stories.map((r) => ({
        title: String(r.title ?? "").trim(),
        statement: String(r.statement ?? "").trim(),
      })).filter((r) => r.statement.length > 0),
      timeline,
      conflicts,
      openQuestions,
      visuals: visualRows
        .map((r) => ({
          entities: String(r.entities ?? "").split(/\s+/).map((s: string) => s.trim()).filter(Boolean),
          displayUrl: String(r.display_url ?? "").trim(),
          excerpt: String(r.excerpt ?? "").trim(),
          sourceTitle: String(r.source_title ?? "史料影像").trim(),
          license: String(r.license ?? "license 待核").trim(),
          artist: String(r.artist ?? "作者待核").trim(),
          timeIdentity: String(r.time_identity ?? "今日观察").trim(),
          commonsTitle: String(r.commons_title ?? "").trim(),
        }))
        .filter((v) => v.displayUrl.length > 0),
    };
  } catch (e) {
    console.warn("[read-model-bridge] 读取真实发布成果失败：", e instanceof Error ? e.message : String(e));
    return { entities: [], relations: [], storyCount: 0, available: false, evidence: [], stories: [], timeline: null, conflicts: [], openQuestions: [], visuals: [] };
  }
}
