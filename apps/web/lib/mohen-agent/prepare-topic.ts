// apps/web/lib/mohen-agent/prepare-topic.ts
//
// 自由主题准备：把「任意自然语言委托」转成生产链可用的动态主题配置。
// 链路：DeepSeek 抽实体 → 上海图书馆检索材料 → 组装主题配置 → 写 JSON 文件，
// 供 run.mjs 经 MOHEN_TOPIC_JSON_FILE 注入 layer1-adapters（替代写死的金泽/绿之丘）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { extractExternalEntities, searchShanghaiLibraryMaterials, type ShlMaterial } from "./retrieve-shl";

export interface PreparedTopic {
  jsonFile: string;
  key: string;
  label: string;
  materialCount: number;
}

export type PrepareResult = PreparedTopic | { reason: string };

/** 组装动态主题配置（材料 + 主题短语 + 标题；不提供 d03/d04 提示词 → layer1-adapters 用通用模板）。 */
function buildTopic(intent: string, entities: string[], materials: ShlMaterial[]): PreparedTopic {
  const key = "free-" + crypto.createHash("sha256").update(intent).digest("hex").slice(0, 12);
  const label = entities[0] || intent.slice(0, 12);
  const phrase = entities.slice(0, 3).join("、") || intent.slice(0, 20);

  const topicConfig = {
    key,
    label,
    materials,
    photoMaterials: [],
    d02TopicPhrase: phrase,
    entityAliases: {},
    d05WorldTitle: label,
    d05TimelineTitle: `${label}（时间）`,
    d05SeedTitle: label,
    d05SourceTitle: `${label} 材料观察`,
  };

  const dir = path.join(os.tmpdir(), "mohen-topics");
  fs.mkdirSync(dir, { recursive: true });
  const jsonFile = path.join(dir, `${key}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(topicConfig, null, 2), "utf8");

  return { jsonFile, key, label, materialCount: materials.length };
}

/** 自由主题准备入口。无材料/检索不可用时返回 { reason }，不假装成功。 */
export async function prepareFreeTopic(intent: string): Promise<PrepareResult> {
  // 1. DeepSeek 抽具体实体名（优先）
  const entities = await extractExternalEntities(intent);

  // 2. 检索词 = 实体名 + 意图里长度≥2 的关键词（去重，最多 5）
  const words = intent
    .split(/[\s,，。、；;：:！？!?]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && w.length <= 12);
  const terms = [...new Set([...entities, ...words])].slice(0, 5);

  // 3. 上海图书馆检索材料
  const { materials, degraded } = await searchShanghaiLibraryMaterials(terms, 12);
  if (materials.length) return buildTopic(intent, entities, materials);

  // 4. 回退：只用实体名再试一次
  const retry = await searchShanghaiLibraryMaterials(entities.slice(0, 3), 12);
  if (retry.materials.length) return buildTopic(intent, entities, retry.materials);

  return { reason: degraded ? "shl_unavailable" : "no_material" };
}
