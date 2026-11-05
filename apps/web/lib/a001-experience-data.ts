// apps/web/lib/a001-experience-data.ts
//
// MH-STRAT-PROD-A001 · 绿之丘体验的数据只读入口（服务端）。
//
// 与金泽「冻结导演稿」不同：A001 没有冻结叙事稿，只有真实数据生产链（D00—D05 · G0—G5）
// 发布的 read_model 六类成果。本模块把这些 L5 成果读成一份「体验数据」，并据此计算
// Surface 资格（packages/experience-engine 的 evaluateSurfaceEligibility / selectSurfaces），
// 让「能不能画」由引擎裁决，而不是由页面好不好看决定。
//
// 纪律：
// - 只读 read_model，复用当前资格守卫核验 visual_stage 展示权、用途、范围及依赖；零写库；
// - 主题隔离：按 projection_key 前缀 a001 锁定世界投影，再用其 run_id 圈定同一次生产；
// - 不读 world/meaning/evidence/source 等物理下层表（架构守卫禁止 runtime 直读下层）；
// - 认识论只降不升：材料说了什么就说什么，缺证据处显式登记为缺口。

import { queryRows } from "@mohen/data-access";
import { consumerContext, contextParams, mediaRightsPermitted } from "./kad1-policy.mjs";
import {
  selectSurfaces,
  type PresentConnectionProjection,
  type SurfaceEligibility,
  type SurfaceSelection,
  type WorldEvidenceState,
} from "@mohen/experience-engine";

/** A001 主题键（投影前缀 / 消费者隔离依据） */
export const A001_TOPIC = "a001";

export interface A001EvidencePointer {
  id: string;
  /** 材料原句（不改写） */
  excerpt: string;
  /** 来源名（如「出片又好玩 看老仓库的华丽蝶变（2023-10-07）」） */
  sourceTitle: string;
  /** 发布机构 */
  publisher: string;
  /** 发布日期文本 */
  date: string;
  /** 可回访原始页面（权利允许时给链接，否则为空串） */
  url: string;
  /** 材料片段序号（可回到第几句） */
  fragmentIndex: number | null;
  /** 归属方式：exact_fragment_match / unattributed */
  attribution: string;
  /** 该句涉及的实体标签 */
  entities: string[];
}

/**
 * 一条「墨痕能说出口的判断」= D05 故事种子（statement 是解释增量，不是事实断言）。
 * 类型/反证等 G4 内部字段属于 L4，前端按分层只消费 L5，不越层读取。
 */
export interface A001Claim {
  id: string;
  /** 解释增量（人话，来自生产链，前端不改写） */
  statement: string;
  entities: string[];
  /** 该判断依据的证据指针 id（生产链已关联） */
  evidenceIds: string[];
}

export interface A001TimelineEvent {
  entity: string;
  year: number | null;
  precision: string;
  changeType: string;
  afterState: string;
}

export interface A001PresentConnection {
  type: string;
  observedState: string;
  basisText: string;
  entities: string[];
  openQuestions: string[];
}

export interface A001Relation {
  subject: string;
  predicate: string;
  /** 谓词的人话（只做词语翻译，不新增语义） */
  predicateLabel: string;
  object: string;
}

export interface A001OpenQuestion {
  question: string;
  missingEvidence: string;
}

/** 视觉资产（world.visual_objects 经 G5 投影到 world_projections.payload.visuals 的 V3 今日观察） */
export interface A001Visual {
  id: string;
  subject: string;
  visualType: string;
  timeIdentity: string;
  displayUrl: string;
  literalReading: string;
  license: string;
  artist: string;
  commonsTitle: string;
}

export interface A001ExperienceData {
  available: boolean;
  /** 本次体验所消费的生产 run */
  runId: string;
  title: string;
  /** 世界投影实体标签 */
  entities: string[];
  relations: A001Relation[];
  timeline: { title: string; events: A001TimelineEvent[] } | null;
  claims: A001Claim[];
  evidence: A001EvidencePointer[];
  /** 视觉资产（V3 今日观察，经 G5 合法分面；非冻结 JSON、非体量示意） */
  visuals: A001Visual[];
  presentConnections: A001PresentConnection[];
  openQuestions: A001OpenQuestion[];
  /** 墨痕在 Agent 侧明确「不认定」的关系（来自已发布 agent_context） */
  refusedRelations: string[];
  /** 引擎裁决输入（可审计） */
  world: WorldEvidenceState;
  eligibility: SurfaceEligibility[];
  selection: SurfaceSelection;
}

const EMPTY_WORLD: WorldEvidenceState = {
  currentExactEntities: [],
  approximateEntities: [],
  hasHistoricalRelations: false,
  hasHistoricalGeometry: false,
  conflicts: [],
  currentPhotosConfirmed: 0,
  historicalVisualAssets: 0,
  hasEvidencedChanges: false,
};

/** 谓词人话表：只翻译词语，不改变认识状态（未登记的谓词原样显示） */
const PREDICATE_LABELS: Record<string, string> = {
  former_site_of: "原址/前身为",
  traces_origin_to: "材料称来源可追溯至",
  claimed_origin_traceable_to: "材料称来源可追溯至",
  designed: "由……设计",
  crosses: "横切",
  planned_to_cross: "曾规划横切",
  part_of: "属于",
  adjacent_to: "紧邻",
  located_on: "位于",
  renovated: "改造了",
  spans_waterway: "跨",
};

function splitEntities(text: string | undefined | null): string[] {
  return String(text ?? "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 解析「甲—谓词—乙」关系行（生产链固定格式） */
function parseRelationLine(line: string): A001Relation | null {
  const parts = line.split("—");
  if (parts.length < 3) return null;
  const subject = parts[0].trim();
  const predicate = parts[1].trim();
  const object = parts.slice(2).join("—").trim();
  if (!subject || !predicate || !object) return null;
  return { subject, predicate, object, predicateLabel: PREDICATE_LABELS[predicate] ?? predicate };
}

/** 空数据（库不可用 / 无有效 G5 时使用；绝不编造内容） */
function emptyData(reason: string, world: WorldEvidenceState = EMPTY_WORLD): A001ExperienceData {
  const eligibility = selectSurfaces(world, { primary: ["unknown_gap"] }).eligibleSurfaces;
  return {
    available: false,
    runId: reason,
    title: "",
    entities: [],
    relations: [],
    timeline: null,
    claims: [],
    evidence: [],
    visuals: [],
    presentConnections: [],
    openQuestions: [],
    refusedRelations: [],
    world,
    eligibility,
    selection: selectSurfaces(world, { primary: ["unknown_gap"] }),
  };
}

/**
 * 读取 A001 已发布 L5 成果，并算好 Surface 资格。
 * 任何异常都返回 available=false（页面按「不画」处理），不静默降级成假内容。
 */
export async function readA001ExperienceData(): Promise<A001ExperienceData> {
  try {
    const qualification = consumerContext('visual_stage');
    if (!qualification || qualification.scope.requested_action !== 'display') return emptyData("NO_VALID_G5");
    const qualificationParams = contextParams(qualification);
    // 1) 定位本主题当前有效的世界投影（visual_stage 消费端）
    const proj = await queryRows(
      `select p.projection_id::text as pid, p.payload::text as payload, g.run_id::text as run_id
       from read_model.world_projections p
       join control.qualification_current q
         on q.gate_code='G5' and q.consumer='visual_stage'
       join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
        and control.qualification_allows(q.gate_audit_id,'visual_stage',
            :'purpose_namespace',:'purpose_code',:'purpose_version',:'allowed_scope'::jsonb) and g.object_type='world_projection' and g.object_id=p.projection_id
       where p.projection_key like :'prefix'
       order by p.generated_at desc limit 1`,
      { ...qualificationParams, prefix: `${A001_TOPIC}-%` }
    );
    if (!proj.length) return emptyData("NO_VALID_G5");

    const runId = String(proj[0].run_id);
    const payload = JSON.parse(String(proj[0].payload || "{}")) as Record<string, unknown>;

    // 2) 时间投影（P03）
    const timelineRows = await queryRows(
      `select m.payload::text as payload
       from read_model.map_timeline_projections m
       join control.qualification_current q
         on q.gate_code='G5' and q.consumer='visual_stage'
       join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
        and control.qualification_allows(q.gate_audit_id,'visual_stage',
            :'purpose_namespace',:'purpose_code',:'purpose_version',:'allowed_scope'::jsonb) and g.object_type='map_timeline_projection'
        and g.object_id=m.map_timeline_projection_id and g.run_id = :'rid'
       order by m.generated_at desc limit 1`,
      { ...qualificationParams, rid: runId }
    );

    // 3) 证据指针（P06）
    const evidenceRows = await queryRows(
      `select e.evidence_pointer_id::text as id,
              coalesce(e.display_excerpt,'') as excerpt,
              coalesce(e.display_locator->>'source_title','来源未标注') as source_title,
              coalesce(e.display_locator->>'publisher','') as publisher,
              coalesce(e.display_locator->>'source_date','') as source_date,
              coalesce(e.display_locator->>'url','') as url,
              coalesce(e.display_locator->>'fragment_index','') as fragment_index,
              coalesce(e.display_locator->>'attribution','') as attribution,
              coalesce(e.display_locator->>'entities','') as entities
       from read_model.evidence_pointers e
       join control.qualification_current q
         on q.gate_code='G5' and q.consumer='visual_stage'
       join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
        and control.qualification_allows(q.gate_audit_id,'visual_stage',
            :'purpose_namespace',:'purpose_code',:'purpose_version',:'allowed_scope'::jsonb) and g.object_type='evidence_pointer'
        and g.object_id=e.evidence_pointer_id and g.run_id = :'rid'
       order by e.generated_at asc`,
      { ...qualificationParams, rid: runId }
    );

    // 4) 故事种子（P04）——把 finding 与其证据指针连起来
    const seedRows = await queryRows(
      `select s.story_seed_id::text as id,
              coalesce(s.payload->>'statement','') as statement,
              coalesce(s.payload->>'entities','') as entities,
              coalesce(array_to_string(s.derived_from_finding_ids, ','),'') as finding_ids,
              coalesce(array_to_string(s.evidence_pointer_ids, ','),'') as evidence_ids
       from read_model.story_seeds s
       join control.qualification_current q
         on q.gate_code='G5' and q.consumer='visual_stage'
       join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
        and control.qualification_allows(q.gate_audit_id,'visual_stage',
            :'purpose_namespace',:'purpose_code',:'purpose_version',:'allowed_scope'::jsonb) and g.object_type='story_seed'
        and g.object_id=s.story_seed_id and g.run_id = :'rid'
       order by s.generated_at asc`,
      { ...qualificationParams, rid: runId }
    );

    // 5) 墨痕侧「明确不认定」的关系；Agent 内容展示仍须自己的 visual_stage 展示资格。
    const ctxRows = await queryRows(
      `select coalesce(a.payload->>'refused_relations','') as refused
       from read_model.agent_contexts a
       join control.qualification_current q
         on q.gate_code='G5' and q.consumer='visual_stage'
       join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
        and control.qualification_allows(q.gate_audit_id,'visual_stage',
            :'purpose_namespace',:'purpose_code',:'purpose_version',:'allowed_scope'::jsonb) and g.object_type='agent_context'
        and g.object_id=a.agent_context_id and g.run_id = :'rid'
       limit 5`,
      { ...qualificationParams, rid: runId }
    );

    const evidence: A001EvidencePointer[] = evidenceRows.map((r) => ({
      id: String(r.id),
      excerpt: String(r.excerpt ?? "").trim(),
      sourceTitle: String(r.source_title ?? "").trim(),
      publisher: String(r.publisher ?? "").trim(),
      date: String(r.source_date ?? "").trim(),
      url: String(r.url ?? "").trim(),
      fragmentIndex: String(r.fragment_index ?? "").trim() === "" ? null : Number(r.fragment_index),
      attribution: String(r.attribution ?? "").trim(),
      entities: splitEntities(asText(r.entities)),
    }));

    const evidenceById = new Map(evidence.map((e) => [e.id, e]));
    const seedEvidenceByFinding = new Map<string, string[]>();

    for (const row of seedRows) {
      const findingIds = String(row.finding_ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const evIds = String(row.evidence_ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      for (const fid of findingIds) {
        seedEvidenceByFinding.set(fid, evIds);
      }
    }

    // 6) 「墨痕能说出口的判断」= D05 故事种子（L5）。反证/类型属 L4，前端不越层读取，
    //    因此这里只呈现陈述、实体与它已关联的证据；缺什么用「尚缺」段（open_questions）表达。
    const claims: A001Claim[] = seedRows
      .map((row) => {
        const fid = String(row.finding_ids ?? "").split(",")[0]?.trim() ?? "";
        return {
          id: fid || String(row.id),
          statement: String(row.statement ?? "").trim(),
          entities: splitEntities(asText(row.entities)),
          evidenceIds: (seedEvidenceByFinding.get(fid) ?? []).filter((x) => evidenceById.has(x)),
        };
      })
      .filter((c) => c.statement.length > 0);

    // 7) 拒绝清单（去重；只从已发布 agent_context 读，不回溯下层表）
    const refused = new Set<string>();
    for (const r of ctxRows) {
      const raw = String(r.refused ?? "").trim();
      if (!raw) continue;
      let lines: unknown[] = [];
      if (raw.startsWith("[")) {
        try {
          lines = JSON.parse(raw) as unknown[];
        } catch {
          lines = [];
        }
      } else {
        lines = raw.split("；");
      }
      for (const line of lines) {
        const t = String(line).trim();
        if (!t) continue;
        if (t.includes("undefined")) continue; // 历史脏行不入体验
        refused.add(t);
      }
    }

    const entities = splitEntities(asText(payload.entities));
    const relations = (Array.isArray(payload.relations) ? (payload.relations as unknown[]) : [])
      .map((x) => parseRelationLine(String(x)))
      .filter((x): x is A001Relation => x !== null);

    const presentConnections: A001PresentConnection[] = (
      Array.isArray(payload.present_connections) ? (payload.present_connections as Record<string, unknown>[]) : []
    ).map((pc) => ({
      type: asText(pc.type) || "today_access",
      observedState: asText(pc.observed_state),
      basisText: asText(pc.basis_text),
      entities: splitEntities(asText(pc.entities)),
      openQuestions: Array.isArray(pc.open_questions) ? (pc.open_questions as unknown[]).map((q) => String(q)) : [],
    }));

    const openQuestions: A001OpenQuestion[] = (
      Array.isArray(payload.open_questions) ? (payload.open_questions as Record<string, unknown>[]) : []
    ).map((q) => ({ question: asText(q.question), missingEvidence: asText(q.missing_evidence) }));

    const timeline = (() => {
      if (!timelineRows.length) return null;
      const tl = JSON.parse(String(timelineRows[0].payload || "{}")) as Record<string, unknown>;
      const events = (Array.isArray(tl.events) ? (tl.events as Record<string, unknown>[]) : []).map((e) => ({
        entity: asText(e.entity),
        year: asNum(e.year),
        precision: asText(e.precision) || "unknown",
        changeType: asText(e.change_type) || "unknown",
        afterState: asText(e.after_state),
      }));
      if (!events.length) return null;
      return { title: asText(tl.title) || "时间投影", events };
    })();

    // 8.5) 视觉资产（world.visual_objects 经 G5 投影到 payload.visuals）：V3 今日观察。
    //    只认 today_photo；V1/V2（历史原件/影像）本切片无资产，historicalVisualAssets 恒 0。
    //    这取代上一轮「体量示意」与「currentPhotosConfirmed 硬编码 0」——真实照片才进舞台。
    const visuals: A001Visual[] = (
      Array.isArray(payload.visuals) ? (payload.visuals as Record<string, unknown>[]) : []
    )
      .filter((v) => mediaRightsPermitted(v) && asText(v.visual_type) === "today_photo")
      .map((v) => ({
        id: asText(v.visual_object_id),
        subject: asText(v.subject),
        visualType: asText(v.visual_type) || "today_photo",
        timeIdentity: asText(v.time_identity) || "今日观察",
        displayUrl: asText(v.display_url),
        literalReading: asText(v.literal_reading),
        license: asText(v.license),
        artist: asText(v.artist),
        commonsTitle: asText(v.commons_title),
      }))
      .filter((v) => v.displayUrl.length > 0);

    // 8) Surface 资格输入（每一条都能在 P3 文档里对上数据来源）：
    //    · 没有任何坐标 → currentExactEntities 为空（不画精确点）
    //    · 只有文字方位/相邻描述 → approximateEntities 有值（可画近似区域）
    //    · 没有历史图表/照片资产 → historicalVisualAssets=0（before_after 恒不可用）
    //    · 有 5 条有据时间变化 → hasEvidencedChanges=true（timeline 可用）
    const world: WorldEvidenceState = {
      currentExactEntities: [],
      approximateEntities: entities,
      hasHistoricalRelations: relations.length > 0,
      relationEvidence: relations.map((r) => ({
        subject: r.subject,
        object: r.object,
        predicate: r.predicate,
        epistemicClass: "E2" as const,
        isCurrentAssociationOnly: false,
        basis: r.predicateLabel,
      })),
      hasHistoricalGeometry: false,
      conflicts: [],
      currentPhotosConfirmed: visuals.length,
      historicalVisualAssets: 0,
      hasEvidencedChanges: (timeline?.events.length ?? 0) > 0,
      presentConnections: presentConnections.map(
        (pc, i): PresentConnectionProjection => ({
          present_id: `a001-pc-${i}`,
          type: pc.type,
          observed_state: pc.observedState,
          basis_claim_ids: pc.entities,
          open_questions: pc.openQuestions,
        })
      ),
    };

    const selection = selectSurfaces(world, {
      primary: ["approximate_area", "timeline", "relational_space"],
      secondary: ["timeline", "evidence_reveal", "source_inspect", "discovery", "question"],
    });

    return {
      available: true,
      runId,
      title: asText(payload.title) || "杨浦滨江绿之丘",
      entities,
      relations,
      timeline,
      claims,
      evidence: evidence.filter((e) => e.excerpt.length > 0),
      visuals,
      presentConnections,
      openQuestions,
      refusedRelations: [...refused],
      world,
      eligibility: selection.eligibleSurfaces,
      selection,
    };
  } catch (e) {
    console.warn("[a001-experience-data] 读取真实发布成果失败：", e instanceof Error ? e.message : String(e));
    return emptyData("READ_FAILED");
  }
}

/** 供页面展示：某条判断关联的证据（保持生产链的关联，不重新猜） */
export function evidenceForClaim(data: A001ExperienceData, claimId: string): A001EvidencePointer[] {
  const byId = new Map(data.evidence.map((e) => [e.id, e]));
  const c = data.claims.find((x) => x.id === claimId);
  if (!c) return [];
  return c.evidenceIds.map((id) => byId.get(id)).filter((x): x is A001EvidencePointer => !!x);
}
