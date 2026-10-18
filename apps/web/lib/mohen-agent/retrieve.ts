// apps/web/lib/mohen-agent/retrieve.ts
//
// ADR-003 第 ② 层：运行期检索实现（服务端专用）—— M4 切换到 L5 发布成果。
//
// 数据源从第一代 public 表（evidence / source_records / cultural_relation_claims /
// cultural_events / cultural_conflicts / cultural_present_connections，已 DROP）
// 切换到 read_model 六类 L5 发布成果，且只读 G5 独立资格 PASS（current_valid=true、
// consumer='agent'）。这是「发布层接线」：管道与门禁接对；上游数据生产（N01–N06）
// 尚未实现时，read_model 无候选、G5 无 PASS，本检索诚实返回空，绝不伪造内容。
//
// 纪律：
// - **只读 SELECT**，零写库、零迁移；
// - 唯一数据通道 @mohen/data-access（psql 二进制，零 npm 依赖，离线可复现）；
// - 只返回**经 G5 独立资格 PASS** 的发布成果；认识论档位只降不升；
// - 库不可用 → 返回 degraded，由上层明确告知用户，**绝不静默编造材料**。

import { queryRows, type PgRow } from "@mohen/data-access";
import type { EpistemicTag, Material } from "@mohen/agent-runtime";

export const MAX_LIMIT = 24;
const SNIPPET_MAX = 220;

/** 本切片镇名（ADR-003 §8：不建第二套镇体系，这里只是一个切片常量） */
export const SLICE_TOWN = "金泽";

/** 与本切片易混淆的其它古镇名（用于归属排除，非用于生成内容） */
export const OTHER_TOWNS = [
  "嘉定", "川沙", "朱家角", "南翔", "高桥", "新场",
  "枫泾", "张堰", "罗店", "练塘", "七宝", "泗泾", "召稼楼",
];

/**
 * 六路 UNION：read_model 六类 L5 发布成果，各自 join G5 独立资格 PASS
 * （current_valid=true、consumer='agent'）。object_type 用单数（与 read-model-repository
 * 的 kind 一致）。发布成果 -> 展示 kind 的接线映射：
 *   world_projection -> claim；world_projection.relations -> relation（P0-1）；map_timeline_projection -> event；agent_context -> present；
 *   story_seed -> claim；discovery_path -> fragment；evidence_pointer -> evidence。
 */
const SQL = `
with terms as (
  select u.t from unnest(string_to_array(:'terms','|')) as u(t) where length(u.t) > 0
)
select id, kind, snippet, source_ref, vstatus, time_hint, conf, entity_txt, match_score, rel_score
from (
  select
    x.*,
    (select count(*) from terms tt
       where x.snippet     ilike '%' || tt.t || '%'
          or x.entity_txt  ilike '%' || tt.t || '%')::int as match_score,
    (1.0 * (select count(*) from terms tt where x.snippet    ilike '%' || tt.t || '%')
     + 0.5 * (select count(*) from terms tt where x.entity_txt ilike '%' || tt.t || '%'))::numeric as rel_score
  from (
    select
      p.projection_id::text                                   as id,
      'claim'::text                                           as kind,
      coalesce(p.payload->>'title', p.projection_key, '')     as snippet,
      coalesce(p.payload->>'source_ref', '已发布世界投影')      as source_ref,
      'SUPPORTED'::text                                       as vstatus,
      coalesce(p.payload->>'time_hint', '')                   as time_hint,
      '0.700'::text                                           as conf,
      coalesce(p.payload->>'entities', p.projection_key, '')  as entity_txt
    from read_model.world_projections p
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='world_projection' and g.object_id=p.projection_id

    union all

    select
      m.map_timeline_projection_id::text                      as id,
      'event'::text                                           as kind,
      coalesce(m.payload->>'title', m.projection_key, '')     as snippet,
      coalesce(m.payload->>'source_ref', '已发布时空投影')      as source_ref,
      'SUPPORTED'::text                                       as vstatus,
      coalesce(m.payload->>'time_hint', '')                   as time_hint,
      '0.700'::text                                           as conf,
      coalesce(m.payload->>'entities', m.projection_key, '')  as entity_txt
    from read_model.map_timeline_projections m
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='map_timeline_projection' and g.object_id=m.map_timeline_projection_id

    union all

    select
      a.agent_context_id::text                                as id,
      'present'::text                                         as kind,
      coalesce(a.payload->>'summary', a.context_key, '')      as snippet,
      coalesce(a.payload->>'source_ref', '墨痕知识上下文')      as source_ref,
      'SUPPORTED_CANDIDATE'::text                             as vstatus,
      coalesce(a.payload->>'time_hint', '')                   as time_hint,
      '0.500'::text                                           as conf,
      coalesce(a.payload->>'entities', a.context_key, '')     as entity_txt
    from read_model.agent_contexts a
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='agent_context' and g.object_id=a.agent_context_id

    union all

    -- A001 起：世界投影里的「今日联系」（D04 依据材料原句发布的 L4→L5 内容）。
    -- 它回答的是「今天的人怎么用这处空间」，不是「历史关系」；因此单列为 present，
    -- 且 source_ref 带标记，供裁决层区分「今日联系」与「知识上下文摘要」。
    select
      (p.projection_id::text || '#pc#' || (pc.ord - 1)::text)  as id,
      'present'::text                                          as kind,
      coalesce(pc.item->>'observed_state', '')                 as snippet,
      '今日联系（D04 发布）'::text                               as source_ref,
      'SUPPORTED_CANDIDATE'::text                              as vstatus,
      ''::text                                                 as time_hint,
      '0.600'::text                                            as conf,
      coalesce(pc.item->>'entities', p.projection_key, '')     as entity_txt
    from read_model.world_projections p
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='world_projection' and g.object_id=p.projection_id
    cross join lateral jsonb_array_elements(coalesce(p.payload->'present_connections','[]'::jsonb))
      with ordinality as pc(item, ord)

    union all

    select
      s.story_seed_id::text                                   as id,
      'claim'::text                                           as kind,
      -- 故事种子的 title 是全主题统一标题，真正有信息量的是 payload.statement（解释增量）。
      -- 这里优先给 statement：材料内容必须能被直接读懂，而不是把标题当内容。
      coalesce(nullif(s.payload->>'statement',''), s.title, s.narrative_question, s.seed_key, '') as snippet,
      coalesce(s.payload->>'source_ref', '故事种子')            as source_ref,
      'SUPPORTED_CANDIDATE'::text                             as vstatus,
      coalesce(s.payload->>'time_hint', '')                   as time_hint,
      '0.500'::text                                           as conf,
      coalesce(s.payload->>'entities', s.seed_key, '')        as entity_txt
    from read_model.story_seeds s
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='story_seed' and g.object_id=s.story_seed_id

    union all

    select
      d.discovery_path_id::text                               as id,
      'fragment'::text                                        as kind,
      coalesce(d.steps->0->>'label', d.path_key, '')          as snippet,
      coalesce(d.steps->0->>'source_ref', '探索路径')          as source_ref,
      'SUPPORTED_CANDIDATE'::text                             as vstatus,
      coalesce(d.steps->0->>'time_hint', '')                  as time_hint,
      '0.500'::text                                           as conf,
      coalesce(d.steps->0->>'entities', d.path_key, '')       as entity_txt
    from read_model.discovery_paths d
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='discovery_path' and g.object_id=d.discovery_path_id

    union all

    select
      e.evidence_pointer_id::text                             as id,
      'evidence'::text                                        as kind,
      coalesce(e.display_excerpt, '')                         as snippet,
      coalesce(e.display_locator->>'source_title', '证据指针')  as source_ref,
      'SUPPORTED'::text                                       as vstatus,
      coalesce(e.display_locator->>'time_hint', '')           as time_hint,
      '0.700'::text                                           as conf,
      coalesce(e.display_locator->>'entities', '')            as entity_txt
    from read_model.evidence_pointers e
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='evidence_pointer' and g.object_id=e.evidence_pointer_id

    union all

    -- P0-1 修复：把 world_projection.payload.relations（真实关系三元组）解析为 relation 类材料。
    -- 三元组形如「万安桥—sister_bridge_with—普济桥」，snippet 先存原文，再由 TS 层人话化 + 拆 entityIds。
    select
      (p.projection_id::text || '-rel-' || r.ord::text)       as id,
      'relation'::text                                        as kind,
      r.rel_txt                                               as snippet,
      '已发布世界投影（真实产出）'::text                          as source_ref,
      'SUPPORTED'::text                                       as vstatus,
      coalesce(p.payload->>'time_hint', '')                   as time_hint,
      '0.700'::text                                           as conf,
      r.rel_txt                                               as entity_txt
    from read_model.world_projections p
    join control.gate_audits g
      on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
     and g.consumer='agent' and g.object_type='world_projection' and g.object_id=p.projection_id
    cross join lateral jsonb_array_elements_text(coalesce(p.payload->'relations','[]'::jsonb)) with ordinality as r(rel_txt, ord)
      ) x
) y
where (:'terms' = '' or y.match_score > 0)
order by y.rel_score desc, y.match_score desc, y.conf::numeric desc nulls last
limit __LIMIT__
`;

/** verification_status（8 值）→ 认识论档位。只降不升。 */
export function mapVstatus(v: string): EpistemicTag {
  switch (v) {
    case "published":
    case "verified":
      return "FACT_EVIDENCED";
    case "evidence_linked":
      return "SUPPORTED_CANDIDATE";
    case "candidate":
    case "extracted":
    case "raw":
    case "pending":
      return "RESEARCH_LEAD";
    case "rejected":
      return "UNSUPPORTED";
    default:
      return "UNKNOWN";
  }
}

/** 008 六值 → 展示层档位（SUPPORTED 在本项目即"有据可依"） */
export function mapEpistemic(v: string): EpistemicTag {
  switch (v) {
    case "SUPPORTED":
      return "FACT_EVIDENCED";
    case "SUPPORTED_CANDIDATE":
      return "SUPPORTED_CANDIDATE";
    case "CONFLICTED":
      return "CONFLICTED";
    case "RESEARCH_LEAD":
      return "RESEARCH_LEAD";
    case "UNSUPPORTED":
      return "UNSUPPORTED";
    case "OPEN_QUESTION":
      return "OPEN_QUESTION";
    default:
      return "UNKNOWN";
  }
}

function extractYear(text: string): number | null {
  const m = text.match(/(1\d{3}|2\d{3})/);
  return m ? Number(m[1]) : null;
}

function clip(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > SNIPPET_MAX ? `${t.slice(0, SNIPPET_MAX)}…` : t;
}

/** 008 文化层六值（ADR-002 / 迁移 008）。命中其一就走六值映射，否则按 evidence 的八值映射。 */
const EPISTEMIC_008 = [
  "SUPPORTED",
  "SUPPORTED_CANDIDATE",
  "CONFLICTED",
  "RESEARCH_LEAD",
  "UNSUPPORTED",
  "OPEN_QUESTION",
];

export function toMaterial(r: PgRow): Material {
  const vstatus = r.vstatus ?? "";
  const epistemic = EPISTEMIC_008.includes(vstatus)
    ? mapEpistemic(vstatus)
    : mapVstatus(vstatus);
  const conf = Number.parseFloat(r.conf ?? "0.5");
  const matched = Number.parseInt(r.match_score ?? "0", 10);
  return {
    id: r.id ?? "",
    kind: (r.kind ?? "evidence") as Material["kind"],
    entityIds: (r.entity_txt ?? "")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean),
    snippet: clip(r.snippet ?? ""),
    sourceRef: r.source_ref ?? "",
    epistemic,
    year: extractYear(r.time_hint ?? ""),
    score: Number.isFinite(conf) ? conf : 0.5,
    matchScore: Number.isFinite(matched) ? matched : 0,
  };
}

/** 关系谓词枚举 → 人话（与展示层同一词汇表，避免把内部谓词键读给用户） */
const RELATION_PREDICATE_HUMAN: Record<string, string> = {
  formerly_named: "旧名",
  founded_on_former_residence_of: "建于其故宅",
  built_on_site_of: "建于其故宅",
  named_after: "得名于",
  sister_bridge_with: "互为姐妹桥",
  has_bridges: "桥群含",
  located_in: "位于",
  spans_same_waterway: "同跨一条水道",
  spans_waterway: "跨越",
  same_waterway_as: "同跨一河",
  similar_form_to: "形制相仿",
  temple_bridge_association: "关联（未证实）",
  relative_position_south_of: "在南",
  former_site_of: "原址为",
  claimed_origin_traceable_to: "前身可追溯到（非同一建筑，待证）",
  planned_to_cross: "规划横穿",
  renovated: "改造了",
  // A001（绿之丘）现行生产关系谓词：同一套人话词汇表，避免把内部键读给用户
  traces_origin_to: "前身可追溯到（非同一建筑，待证）",
  crosses: "横切",
  designed: "由……设计",
  part_of: "属于",
  adjacent_to: "紧邻",
  located_on: "位于",
  opened: "开放",
};

/**
 * P0-1：把「主—谓—宾」三元组拆成 (subject, predicate, object)，人话化谓词，
 * 并把 entityIds 收紧为 [subject, object]——relation 材料只归属于它真正连接的两个对象，
 * 不再用「全 7 实体」冒充（这是 P3-5 召回失真的根因之一）。
 *
 * V1.5：objectAliases 传入对象实体的着录别名（如临时水道实体的 金泽塘/秀州塘/市河），
 * 追加进 snippet——否则「万安桥跨的是哪条河」的检索词「河」无法命中
 * 「万安桥 · 跨越 · 桥所跨水道（名称待定）」（别名词「市河」含「河」）。
 * 只追加真实别名，不生成任何新内容。
 */
function humanizeRelation(
  triple: string,
  objectAliases: Record<string, string[]> = {}
): { snippet: string; entityIds: string[] } | null {
  const parts = triple.split("—");
  if (parts.length < 3) return null;
  const subject = parts[0].trim();
  const predicate = parts[1].trim();
  const object = parts.slice(2).join("—").trim();
  if (!subject || !object) return null;
  const predHuman = RELATION_PREDICATE_HUMAN[predicate] ?? predicate;
  const aliases = (objectAliases[object] ?? []).filter((a) => a && a !== object);
  const aliasSuffix = aliases.length ? `（又称：${aliases.join(" / ")}）` : "";
  return { snippet: `${subject} · ${predHuman} · ${object}${aliasSuffix}`, entityIds: [subject, object] };
}

export interface RetrieveResult {
  materials: Material[];
  /** 库不可用时为 true —— 上层必须明确告知用户，不得假装查到了 */
  degraded: boolean;
}

export interface RetrieveOptions {
  /** 切片镇名，默认金泽 */
  town?: string;
  /** 归属排除用的其它镇名；传空数组可关闭该机制 */
  excludeTowns?: string[];
  /** V1.5：实体标签 → 着录别名（relation 材料 snippet 追加，保证通名问句可命中） */
  objectAliases?: Record<string, string[]>;
}

/** 取摘要的前若干句（按句界截断，不硬切词）；超长才加省略号 */
function leadSentences(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const cut = Math.max(head.lastIndexOf("。"), head.lastIndexOf("；"), head.lastIndexOf(";"));
  return cut > 40 ? `${head.slice(0, cut + 1)}` : `${head}…`;
}

export async function retrieveMaterials(
  terms: string[],
  limit = 12,
  opts: RetrieveOptions = {}
): Promise<RetrieveResult> {
  const safeTerms = terms.filter((t) => t.trim().length > 0).slice(0, 8);
  const lim = Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
  // town/others 保留入参契约；L5 发布成果已由 G5 门禁与上游资格保证归属，不再做镇名排除。
  void opts.town;
  void opts.excludeTowns;
  try {
    const rows = await queryRows(SQL.replace("__LIMIT__", String(lim)), {
      terms: safeTerms.join("|"),
    });
    const materials = rows
      .filter((r) => (r.snippet ?? "").trim().length > 0)
      .map((r) => {
        if (r.kind === "relation") {
          const h = humanizeRelation(r.snippet ?? "", opts.objectAliases ?? {});
          if (!h) return null;
          return { ...toMaterial(r), kind: "relation" as const, snippet: h.snippet, entityIds: h.entityIds };
        }
        const m = toMaterial(r);
        // agent_context 的 summary 是「判断摘要 + 拒绝清单 + 待证问题」的机器拼接，
        // 整段塞进一句人话会变成清单灌水。这里只取摘要前部（按句界截断），
        // 拒绝与待证由世界投影另行呈现；不改写、不新增任何内容。
        if (m.kind === "present") return { ...m, snippet: leadSentences(m.snippet, 170) };
        return m;
      })
      .filter((m): m is Material => m !== null);
    return { materials, degraded: false };
  } catch (e) {
    // 诊断留痕：库不可用必须有据可查，不许静默降级后假装「查过了」
    console.warn("[mohen/retrieve] 检索失败：", e instanceof Error ? e.message : String(e));
    return { materials: [], degraded: true };
  }
}