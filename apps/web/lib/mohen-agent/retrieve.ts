// apps/web/lib/mohen-agent/retrieve.ts
//
// ADR-003 第 ② 层：运行期检索实现（服务端专用）
//
// 墨痕第一次在运行期真正读库。纪律：
// - **只读 SELECT**，零写库、零迁移；
// - 唯一数据通道 @mohen/data-access（psql 二进制，零 npm 依赖，离线可复现）；
// - 只返回**已审核材料**（evidence / 008 cultural_*）；认识论档位原样映射，只降不升；
// - 库不可用 → 返回 degraded，由上层明确告知用户，**绝不静默编造材料**。
//
// ★ 排序不是装饰，是可信度的一部分 ★
//   实测教训：问「万安桥在哪」曾把**新场万安桥**（新场镇）排在**金泽万安桥**前面 ——
//   两者正文都含「万安桥」，旧算法下完全同分，谁在前全凭运气。对本项目而言
//   **配错就是底线错误**，比总量少、比排序略差都严重。因此这里显式做两件事：
//     1. 「材料讲的是谁」（subject_hint 命中）权重远高于「只是提到谁」（正文命中）；
//     2. 完全不提本镇、却提到别镇的记录，判定不属于本切片并排除。
//   二者都是**相关性判定**，不是改写事实 —— 不触碰认识论档位，也不新增材料。

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
 * 五路 UNION：基础证据 + 008 文化层（关系主张 / 事件 / 冲突 / 当下连接）。
 * 统一输出列：subject_txt（材料讲的是谁）/ entity_txt（提到谁）/ hay（归属判定的全文草堆）。
 */
const SQL = `
with terms as (
  select u.t from unnest(string_to_array(:'terms','|')) as u(t) where length(u.t) > 0
),
other_towns as (
  select u.n from unnest(string_to_array(:'others','|')) as u(n) where length(u.n) > 0
)
select id, kind, snippet, source_ref, vstatus, time_hint, conf, entity_txt, match_score, rel_score
from (
  select
    z.*,
    row_number() over (partition by z.kind order by z.rel_score desc, z.match_score desc) as rn
  from (
  select
    x.*,
    (select count(*) from terms tt
       where x.snippet     ilike '%' || tt.t || '%'
          or x.entity_txt  ilike '%' || tt.t || '%'
          or x.subject_txt ilike '%' || tt.t || '%')::int as match_score,
    (
      3.0 * (select count(*) from terms tt where x.subject_txt = tt.t)
    + 2.0 * (select count(*) from terms tt where x.subject_txt ilike '%' || tt.t || '%')
    + 1.0 * (select count(*) from terms tt where x.snippet     ilike '%' || tt.t || '%')
    + 0.5 * (select count(*) from terms tt where x.entity_txt  ilike '%' || tt.t || '%')
    )::numeric as rel_score
  from (
    select
      e.evidence_id::text                                   as id,
      'evidence'::text                                      as kind,
      coalesce(e.quote_text, '')                            as snippet,
      coalesce(s.title, '未标注来源')                          as source_ref,
      e.verification_status::text                           as vstatus,
      coalesce(e.time_hint, '')                             as time_hint,
      e.confidence::text                                    as conf,
      coalesce(e.subject_hint, '')                          as subject_txt,
      coalesce(e.subject_hint, '') || ' ' || coalesce(e.place_hint, '') as entity_txt
    from evidence e
    left join source_records s on s.source_id = e.source_id

    union all

    select
      c.claim_id::text                                      as id,
      'claim'::text                                         as kind,
      coalesce(c.predicate, '') || coalesce(' ' || c.object_value, '') as snippet,
      '金泽切片 · 文化关系主张'                                 as source_ref,
      c.epistemic_status::text                              as vstatus,
      coalesce(c.time_scope_start, '')                      as time_hint,
      '0.500'::text                                         as conf,
      coalesce(c.subject_feature_key, '')                   as subject_txt,
      coalesce(c.subject_feature_key, '') || ' ' || coalesce(c.object_feature_key, '') as entity_txt
    from cultural_relation_claims c

    union all

    select
      v.event_id::text                                      as id,
      'event'::text                                         as kind,
      coalesce(v.canonical_label, '')                       as snippet,
      '金泽切片 · 文化事件'                                    as source_ref,
      v.epistemic_status::text                              as vstatus,
      coalesce(v.time_scope_start, '')                      as time_hint,
      '0.500'::text                                         as conf,
      coalesce(v.subject_feature_key, '')                   as subject_txt,
      coalesce(v.subject_feature_key, '')                   as entity_txt
    from cultural_events v

    union all

    select
      f.conflict_id::text                                   as id,
      'conflict'::text                                      as kind,
      '一种记载是 ' || coalesce(f.primary_value, '?') || '，另一种记载是 ' || coalesce(f.conflicted_value, '?') as snippet,
      coalesce(f.source_of_conflict, '来源待核')               as source_ref,
      'CONFLICTED'::text                                    as vstatus,
      ''::text                                              as time_hint,
      '0.500'::text                                         as conf,
      coalesce(f.subject_feature_key, '')                   as subject_txt,
      coalesce(f.subject_feature_key, '')                   as entity_txt
    from cultural_conflicts f

    union all

    select
      p.present_id::text                                    as id,
      'present'::text                                       as kind,
      coalesce(p.observed_state, '')                        as snippet,
      '金泽切片 · 当下连接'                                    as source_ref,
      'SUPPORTED'::text                                     as vstatus,
      ''::text                                              as time_hint,
      '0.500'::text                                         as conf,
      coalesce(p.subject_feature_key, '')                   as subject_txt,
      coalesce(p.subject_feature_key, '')                   as entity_txt
    from cultural_present_connections p
      ) x
  ) z
) y
where (:'terms' = '' or y.match_score > 0)
  -- 每类材料各留前 6 条：否则高权重的 evidence 会把 event/claim/present 全部挤出 limit
  and y.rn <= 6
  -- 归属排除（防「宣桥万安桥」「新场万安桥」混入「金泽万安桥」）：
  -- 判据用**通用模式**而非硬编码镇名单（实测：宣桥镇不在任何预设名单里，列不全就会漏）。
  --   全文不提本镇 且（提到别镇名 或 出现「某镇」字样）→ 判定不属于本切片。
  and not (
    (coalesce(y.snippet,'') || ' ' || coalesce(y.entity_txt,'') || ' ' || coalesce(y.subject_txt,'')) not ilike '%' || :'town' || '%'
    and (
      (select count(*) from other_towns ot
         where (coalesce(y.snippet,'') || ' ' || coalesce(y.entity_txt,'') || ' ' || coalesce(y.subject_txt,'')) ilike '%' || ot.n || '%') > 0
      or (coalesce(y.snippet,'') || ' ' || coalesce(y.entity_txt,'') || ' ' || coalesce(y.subject_txt,'')) like '%镇%'
    )
  )
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
  // ★ 修过一个静默降级 bug ★：原判据是 `startsWith("SUPPORTED_") || [...其余四值]`，
  //   "SUPPORTED" 两个分支都不进 → 落到 mapVstatus 的 default → UNKNOWN。
  //   结果：库里明明是「有据可依」的当下连接记录，展示层却显示「档位不明」。
  //   档位可以降，但**不能因为分派写错而降**。
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
}

export async function retrieveMaterials(
  terms: string[],
  limit = 12,
  opts: RetrieveOptions = {}
): Promise<RetrieveResult> {
  const safeTerms = terms.filter((t) => t.trim().length > 0).slice(0, 8);
  const lim = Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
  const town = opts.town ?? SLICE_TOWN;
  const others = (opts.excludeTowns ?? OTHER_TOWNS).join("|");
  try {
    const rows = await queryRows(SQL.replace("__LIMIT__", String(lim)), {
      terms: safeTerms.join("|"),
      town,
      others,
    });
    const materials = rows.filter((r) => (r.snippet ?? "").trim().length > 0).map(toMaterial);
    return { materials, degraded: false };
  } catch (e) {
    // 诊断留痕：库不可用必须有据可查，不许静默降级后假装「查过了」
    console.warn("[mohen/retrieve] 检索失败：", e instanceof Error ? e.message : String(e));
    return { materials: [], degraded: true };
  }
}
