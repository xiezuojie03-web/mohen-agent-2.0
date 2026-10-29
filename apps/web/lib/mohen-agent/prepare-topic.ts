// apps/web/lib/mohen-agent/prepare-topic.ts
//
// 自由主题准备：把「任意自然语言委托」转成生产链可用的动态主题配置。
// K5（2026-10-29）：检索词不再只靠"实体+标点切词"，改为六层查询梯子
// （精确实体→别名→繁体→组合→时空/类型），并记录查询计划供追溯。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { extractExternalEntities, searchShanghaiLibraryMaterials, type ShlMaterial } from "./retrieve-shl";
import { searchCommonsForTopic } from "./retrieve-commons";
import { searchLocMaterials } from "./retrieve-loc";
import { buildQueryPlan, type QueryPlan } from "./query-plan";

export interface PreparedTopic {
  jsonFile: string;
  key: string;
  label: string;
  materialCount: number;
  photoCount: number;
  plan: QueryPlan;
}

export type PrepareResult = PreparedTopic | { reason: string };

/** 组装动态主题配置（材料 + 主题短语 + 标题 + 查询计划；不提供 d03/d04 提示词 → 通用模板）。 */
function buildTopic(
  intent: string,
  entities: string[],
  materials: ShlMaterial[],
  photos: ShlMaterial[],
  plan: QueryPlan
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
  };

  const dir = path.join(os.tmpdir(), "mohen-topics");
  fs.mkdirSync(dir, { recursive: true });
  const jsonFile = path.join(dir, `${key}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(topicConfig, null, 2), "utf8");

  return { jsonFile, key, label, materialCount: materials.length, photoCount: photos.length, plan };
}

/** 图像双源：Commons 优先；不足 3 张时尝试 LOC（环境 403 时自动降级，不阻塞）。 */
async function collectPhotos(entities: string[], fallbackTopic: string): Promise<ShlMaterial[]> {
  const commons = await searchCommonsForTopic(entities[0] || fallbackTopic, entities.slice(0, 2), 8);
  const photos = [...commons.materials];
  if (photos.length < 3) {
    const loc = await searchLocMaterials([entities[0] || fallbackTopic, fallbackTopic], 4);
    for (const m of loc.materials) {
      if (!photos.some((p) => p.url === m.url || p.title === m.title)) photos.push(m);
    }
  }
  return photos.slice(0, 10);
}

/** 自由主题准备入口。无材料/检索不可用时返回 { reason }，不假装成功。 */
export async function prepareFreeTopic(intent: string): Promise<PrepareResult> {
  // 1. DeepSeek 抽具体实体名（优先）；失败则规则兜底
  const entities = await extractExternalEntities(intent);

  // 2. K5 六层查询梯子
  const plan = buildQueryPlan(intent, entities);
  if (!plan.terms.length) return { reason: "empty_query_plan" };

  // 3. 上海图书馆检索（分页 + 快照；最多 4 个词，避免请求爆炸）
  const { materials, degraded } = await searchShanghaiLibraryMaterials(plan.terms.slice(0, 4), 24, {
    pageSize: 10,
    maxPagesPerTerm: 2,
  });
  if (materials.length) {
    const photos = await collectPhotos(plan.entities, intent.slice(0, 20));
    return buildTopic(intent, plan.entities, materials, photos, plan);
  }

  // 4. 回退：只用精确实体再试一次（别名/繁体可能过窄）
  if (plan.entities.length) {
    const retry = await searchShanghaiLibraryMaterials(plan.entities.slice(0, 3), 24, {
      pageSize: 10,
      maxPagesPerTerm: 2,
    });
    if (retry.materials.length) {
      const photos = await collectPhotos(plan.entities, intent.slice(0, 20));
      return buildTopic(intent, plan.entities, retry.materials, photos, plan);
    }
  }

  return { reason: degraded ? "shl_unavailable" : "no_material" };
}
