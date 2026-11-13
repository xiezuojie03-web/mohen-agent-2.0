// apps/web/lib/mohen-agent/prepare-topic.ts
//
// 自由主题准备：把「任意自然语言委托」转成生产链可用的动态主题配置。
// K5（2026-10-29）：检索词不再只靠"实体+标点切词"，改为六层查询梯子
// （精确实体→别名→繁体→组合→时空/类型），并记录查询计划供追溯。
// B2（2026-11-13）：来源发现不再只查上海图书馆单渠，改走 D00/§11.2 的
// Y01 缺口诊断 + Y02 多渠道 + Y03 查询梯子 + Y06 优先级（source-discovery）。
// 只有可定位（有 url）且带内容的候选才进 materials；其余如实记为 candidates，
// 未取得原件的缺口逐条列出——不得用"仅题名"的线索冒充可读材料（伪造证据）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { extractExternalEntities, type ShlMaterial } from "./retrieve-shl";
import { searchCommonsForTopic } from "./retrieve-commons";
import { searchLocMaterials } from "./retrieve-loc";
import { buildQueryPlan, type QueryPlan } from "./query-plan";
import { discoverExternalSources, relevanceTier, type DiscoveryChannelTrace } from "./source-discovery";

export interface PreparedTopic {
  jsonFile: string;
  key: string;
  label: string;
  materialCount: number;
  photoCount: number;
  plan: QueryPlan;
  /** 本次来源发现的渠道轨迹与缺口，供界面与账本如实呈现。 */
  discovery: {
    channels: DiscoveryChannelTrace[];
    gaps: string[];
    needReason: string;
    candidateCount: number;
  };
}

export type PrepareResult = PreparedTopic | { reason: string; gaps?: string[] };

/** 候选是否可作为可读材料：必须可定位（有 url）且带内容片段。仅题名不算材料。 */
function isLocatableMaterial(m: ShlMaterial): boolean {
  return typeof m.url === "string" && m.url.trim().length > 0
    && Array.isArray(m.fragments) && m.fragments.some((f) => typeof f === "string" && f.trim().length > 0);
}

/**
 * 把发现结果分成两类：可读材料与仅候选。
 * 只有 locatable 能进 topicConfig.materials 交给 D01 读取；
 * candidates 如实留痕（题名/渠道/权利未知），绝不参与读取，避免把线索当原件。
 *
 * B3（2026-11-13）：图像另加一道 Y06 相关性判定——检索词没落在题名或描述里的图像
 * （Commons 全文索引的偶遇命中）只作候选，不冒充可读材料送进 D01。
 * 文本渠道保持原口径，brief 的「仅正文偶遇」仍按 Y06 限量保留，不在此扩大收缩。
 */
export function classifyDiscoveredLeads(leads: ShlMaterial[], terms: string[] = []): {
  locatable: ShlMaterial[];
  candidates: ShlMaterial[];
} {
  const locatable: ShlMaterial[] = [];
  const candidates: ShlMaterial[] = [];
  for (const lead of leads) {
    const imageWithoutMatch = terms.length > 0
      && (lead.source_type === "image" || lead.carrier_type === "image")
      && relevanceTier(lead, terms) !== "title";
    (isLocatableMaterial(lead) && !imageWithoutMatch ? locatable : candidates).push(lead);
  }
  return { locatable, candidates };
}

/** 组装动态主题配置（材料 + 主题短语 + 标题 + 查询计划；不提供 d03/d04 提示词 → 通用模板）。 */
function buildTopic(
  intent: string,
  entities: string[],
  materials: ShlMaterial[],
  photos: ShlMaterial[],
  plan: QueryPlan,
  discovery: PreparedTopic["discovery"],
  candidates: ShlMaterial[]
): PreparedTopic {
  const key = "free-" + crypto.createHash("sha256").update(intent).digest("hex").slice(0, 12);
  const label = entities[0] || intent.slice(0, 12);
  const phrase = entities.slice(0, 3).join("、") || intent.slice(0, 20);

  const topicConfig = {
    key,
    label,
    materials,
    photoMaterials: photos,
    d02TopicPhrase: phrase,
    entityAliases: {},
    d05WorldTitle: label,
    d05TimelineTitle: `${label}（时间）`,
    d05SeedTitle: label,
    d05SourceTitle: `${label} 材料观察`,
    queryPlan: plan,
    // B2：来源发现如实留痕。candidates 是不可读/未取原件的候选，绝不参与 D01 读取；
    // rights 按渠道记录当前已知边界，未知一律 unverified，不推定可用。
    discovery: {
      channels: discovery.channels,
      gaps: discovery.gaps,
      need_reason: discovery.needReason,
      candidates: candidates.map((c) => ({
        title: c.title,
        provider: c.provider,
        url: c.url ?? null,
        rights_hint: { status: "unverified", basis: `${c.provider} 未核验` },
      })),
    },
  };

  const dir = path.join(os.tmpdir(), "mohen-topics");
  fs.mkdirSync(dir, { recursive: true });
  const jsonFile = path.join(dir, `${key}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(topicConfig, null, 2), "utf8");

  return {
    jsonFile, key, label,
    materialCount: materials.length,
    photoCount: photos.length,
    plan, discovery,
  };
}

/** 图像双源：优先从已发现候选里取，不足 3 张时才补 Commons/LOC（渠道不可用自动降级，不阻塞）。 */
async function collectPhotos(leads: ShlMaterial[], entities: string[], fallbackTopic: string): Promise<ShlMaterial[]> {
  const fromLeads = leads.filter((m) => m.source_type === "image" || m.carrier_type === "image");
  const photos = [...fromLeads];
  if (photos.length >= 3) return photos.slice(0, 10);
  const commons = await searchCommonsForTopic(entities[0] || fallbackTopic, entities.slice(0, 2), 8);
  for (const m of commons.materials) {
    if (!photos.some((p) => p.url === m.url || p.title === m.title)) photos.push(m);
  }
  if (photos.length < 3) {
    const loc = await searchLocMaterials([entities[0] || fallbackTopic, fallbackTopic], 4);
    for (const m of loc.materials) {
      if (!photos.some((p) => p.url === m.url || p.title === m.title)) photos.push(m);
    }
  }
  return photos.slice(0, 10);
}

/**
 * 自由主题准备入口。无材料/检索不可用时返回 { reason, gaps }，不假装成功。
 *
 * B2：来源发现走 D00 §11.2 的 Y01/Y02/Y03/Y06，不再只查单一馆藏。
 * materials 只收「可定位（有 url）且带内容」的候选；其余进 candidates。
 */
export async function prepareFreeTopic(intent: string): Promise<PrepareResult> {
  // 1. DeepSeek 抽具体实体名（优先）；失败则规则兜底
  const entities = await extractExternalEntities(intent);

  // 2. K5 六层查询梯子（保留供账本追溯）
  const plan = buildQueryPlan(intent, entities);
  if (!plan.terms.length) return { reason: "empty_query_plan" };

  // 3. Y01 缺口诊断 + Y02 多渠道 + Y03 查询扩展 + Y06 优先级
  const discovery = await discoverExternalSources(intent, { localMaterialCount: 0, entities });
  // B3：图像按 Y06 相关性判（题名/描述须命中检索词），与文本同一口径但不误伤文本线索。
  const { locatable, candidates } = classifyDiscoveredLeads(discovery.leads, [...plan.terms, ...plan.entities]);
  const discoveryMeta: PreparedTopic["discovery"] = {
    channels: discovery.trace,
    gaps: discovery.gaps,
    needReason: discovery.need.reason,
    candidateCount: candidates.length,
  };

  if (!locatable.length) {
    return {
      reason: discovery.leads.length ? "no_locatable_material" : "no_material",
      gaps: discovery.gaps,
    };
  }

  // 4. 图像维度：从已发现候选里取；不足再补渠道
  const photos = await collectPhotos(locatable, plan.entities, intent.slice(0, 20));
  return buildTopic(intent, plan.entities, locatable, photos, plan, discoveryMeta, candidates);
}
