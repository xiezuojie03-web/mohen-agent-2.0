// apps/web/lib/mohen-agent/source-discovery.ts — D00 来源发现（Y01/Y02/Y03 编排）
//
// 设计依据：MoHen_Data_Production_Protocol §11.2 —— D00 是「来源发现与获取」，
// 正式方法集 Y01—Y08，其中：
//   Y01 来源需求与存量缺口诊断
//   Y02 机构集合与多渠道来源发现
//   Y03 时空异名与跨语言检索扩展
//   Y04 聚合目录原机构回溯（V1 尚未接入聚合目录，显式记为未接）
// 本模块只产出 source_candidate / search_trace 级别候选（§11.2 约束 3：十类输出不等于原件），
// 绝不产出原件、不签 G0、不冒充合格知识。
//
// 与 private-evidence-adapters 的 D00 分工：
//   - 该 adapter 校验「已经上传并登记的私有原件」，要求 scope.original_id；
//   - 本模块负责「库里没有时出去找」，两者都是 D00 的来源准备，不互为替代。
import type { ShlMaterial } from "./retrieve-shl";
import { searchShanghaiLibraryMaterials, extractExternalEntities } from "./retrieve-shl";
import { searchCommonsForTopic } from "./retrieve-commons";
import { searchLocMaterials } from "./retrieve-loc";
import { searchWikisourceMaterials } from "./retrieve-wikisource";
import { buildQueryPlan } from "./query-plan";

/** 题名检索型渠道：返回即题名命中，不做正文偶遇判定。 */
const TITLE_SEARCH_PROVIDERS = new Set(["shanghai-library", "wikimedia-commons", "loc"]);

/**
 * Y06：资源价值互补与取得优先级评估（不是删除）。
 * 全文检索引擎（维基文库）会把"正文里偶然提到该词"的文档一起返回（判决书、佛经、无关古籍）。
 * 这类候选题名与该题材无关，作为首屏线索会误导，因此降到最低优先级并限量保留。
 * 题名检索渠道与图像渠道不受此判定，避免误杀馆藏繁体题名。
 */
function relevanceTier(m: ShlMaterial, terms: string[]): "title" | "body-only" {
  if (m.source_type === "image" || m.carrier_type === "image") return "title";
  if (TITLE_SEARCH_PROVIDERS.has(m.provider)) return "title";
  const hay = m.title || "";
  return terms.some((t) => t && hay.includes(t)) ? "title" : "body-only";
}

/** 单个渠道的检索轨迹（search_trace 候选，不含正文）。 */
export interface DiscoveryChannelTrace {
  channel: string;
  label: string;
  status: "ok" | "empty" | "unavailable";
  count: number;
  note?: string;
}

export interface SourceDiscoveryResult {
  /** 全部候选线索；epistemic 由调用方统一按 RESEARCH_LEAD 标注。 */
  leads: ShlMaterial[];
  trace: DiscoveryChannelTrace[];
  /** 不可用渠道的人话说明，供界面如实呈现缺口。 */
  gaps: string[];
  /** Y01 诊断：本次是否需要出去找，以及理由。 */
  need: { required: boolean; reason: string };
}

const CHANNEL_LABELS: Record<string, string> = {
  "shl-open-data": "上海图书馆开放数据",
  "wikimedia-commons": "Wikimedia Commons",
  loc: "美国国会图书馆",
  "zh-wikisource": "维基文库（中文）",
};

function dedupeMaterials(items: ShlMaterial[]): ShlMaterial[] {
  const seen = new Set<string>();
  const out: ShlMaterial[] = [];
  for (const m of items) {
    const key = `${m.provider}|${m.url || m.title}`;
    if (!m.title || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

/**
 * Y01：判断是否需要外部发现。
 * 本地已有合格/候选材料时仍可补证，但这属于"可选扩展"；完全没有时才是"必须出去找"。
 */
export function diagnoseSourceNeed(intent: string, localMaterialCount: number): {
  required: boolean;
  reason: string;
} {
  if (!intent.trim()) return { required: false, reason: "没有可检索的研究意图" };
  if (localMaterialCount > 0) {
    return { required: false, reason: `库内已有 ${localMaterialCount} 条材料，外部检索仅作补证` };
  }
  return { required: true, reason: "库内没有可用材料，必须按 Y02/Y03 出去找来源" };
}

/**
 * Y02 + Y03：多渠道来源发现。
 * 检索词来自 Y03 查询梯子（精确实体→别名→繁体→组合→时空→类型），
 * 而不是直接把整句自然语言丢给单一馆藏。
 */
export async function discoverExternalSources(
  intent: string,
  options: { localMaterialCount?: number; maxPerChannel?: number; entities?: string[] } = {}
): Promise<SourceDiscoveryResult> {
  const localCount = options.localMaterialCount ?? 0;
  const maxPerChannel = options.maxPerChannel ?? 6;
  const need = diagnoseSourceNeed(intent, localCount);
  const trace: DiscoveryChannelTrace[] = [];
  const gaps: string[] = [];

  // Y03：先把自然语言扩成可解释的检索梯子。
  // 实体可由调用方先行抽取并单独记账（llm-extract-entities），避免重复计费。
  const entities = options.entities ?? (await extractExternalEntities(intent));
  const plan = buildQueryPlan(intent, entities);
  const terms = plan.terms.slice(0, 4);

  if (!terms.length) {
    return {
      leads: [],
      trace: [{ channel: "query-plan", label: "检索词扩展（Y03）", status: "empty", count: 0, note: "未能从委托中抽出可用检索词" }],
      gaps: ["没能从这句话里抽出可检索的实体，需要补充具体地名、书名或年代"],
      need,
    };
  }

  const entityTerms = plan.entities.length ? plan.entities : terms.slice(0, 2);
  const fallbackTopic = entities[0] || intent.slice(0, 20);

  // Y02：多渠道。上海图书馆内部串行（对方限流），跨渠道并行。
  const [shl, commons, wikisource] = await Promise.all([
    searchShanghaiLibraryMaterials(terms, maxPerChannel, { pageSize: 10, maxPagesPerTerm: 1 }),
    searchCommonsForTopic(fallbackTopic, entityTerms.slice(0, 2), maxPerChannel),
    searchWikisourceMaterials(terms, maxPerChannel),
  ]);

  const record = (channel: string, status: DiscoveryChannelTrace["status"], count: number, note?: string) => {
    trace.push({ channel, label: CHANNEL_LABELS[channel] ?? channel, status, count, ...(note ? { note } : {}) });
  };

  record("shl-open-data", shl.materials.length ? "ok" : shl.degraded ? "unavailable" : "empty", shl.materials.length);
  record("wikimedia-commons", commons.materials.length ? "ok" : "empty", commons.materials.length);
  record("zh-wikisource", wikisource.materials.length ? "ok" : wikisource.degraded ? "unavailable" : "empty", wikisource.materials.length);

  let locMaterials: ShlMaterial[] = [];
  let locDegraded = false;
  // 图像渠道不足时才追加国会图书馆，避免每次都打慢接口。
  if (commons.materials.length < 3) {
    const loc = await searchLocMaterials([fallbackTopic, entityTerms[0] || fallbackTopic], maxPerChannel);
    locMaterials = loc.materials;
    locDegraded = loc.degraded;
    record("loc", locMaterials.length ? "ok" : locDegraded ? "unavailable" : "empty", locMaterials.length);
  } else {
    record("loc", "empty", 0, "Commons 图像已足够，本渠道跳过");
  }

  if (shl.degraded) gaps.push("上海图书馆开放数据当前不可用");
  if (commons.materials.length === 0 && locMaterials.length === 0) gaps.push("图像渠道（Commons / 国会图书馆）没有返回可用线索");
  if (wikisource.degraded) gaps.push("维基文库当前不可用（境内可达性不稳定）");

  const merged = dedupeMaterials([
    ...shl.materials,
    ...commons.materials,
    ...locMaterials,
    ...wikisource.materials,
  ]);
  // Y06：题名命中的候选优先，仅正文偶遇检索词的限量保留在后面。
  const matchTerms = [...terms, ...entityTerms];
  const titled = merged.filter((m) => relevanceTier(m, matchTerms) === "title");
  const bodyOnly = merged.filter((m) => relevanceTier(m, matchTerms) === "body-only");
  const leads = [...titled, ...bodyOnly.slice(0, 2)];
  if (bodyOnly.length > 0) {
    trace.push({
      channel: "relevance-rank",
      label: "相关性优先级（Y06）",
      status: "ok",
      count: leads.length,
      note: `题名命中 ${titled.length} 条；仅正文偶遇检索词 ${bodyOnly.length} 条，降级并最多保留 2 条`,
    });
  }

  if (!leads.length) {
    gaps.push("四个外部渠道都没有返回与本题相关的线索；这不是「没有资料」，而是当前渠道覆盖不到该题材");
  }

  return { leads, trace, gaps, need };
}
