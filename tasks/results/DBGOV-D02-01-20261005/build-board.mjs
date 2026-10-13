// 只读脚本：把 research_observation / research_mention 的真实内容整理成"内容解读看板"。
// 不写任何表、不造实体/关系/候选。仅展示"AI 读懂了原文什么"。
import { queryRows } from "../../../packages/data-access/src/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "content-board.md");

function categoryOf(carrier) {
  switch (carrier) {
    case "gazetteer":
    case "town_monograph": return "方志·地方志";
    case "old_book_fulltext": return "古籍·诗文全文";
    case "event_record": return "事件记载";
    case "narrative_asset":
    case "narrative_candidate": return "叙事素材";
    case "heritage_protection": return "文保记录";
    case "access_probe":
    case "verification_probe": return "探测·校核";
    case "historical_map":
    case "image_catalog": return "舆图·图片（需图读层，本轮未覆盖）";
    case "poetry_person": return "诗文·人物（目录级，无正文）";
    case "biography_db":
    case "clan_genealogy":
    case "placename_gazetteer": return "目录·谱牒（无正文）";
    default: return "其他·未分类";
  }
}

const clip = (s, n) => (s == null ? "" : String(s).length > n ? String(s).slice(0, n) + "…" : String(s));

async function main() {
  const inv = await queryRows(
    `select source_ref, carrier_type, readability from research_source_inventory`
  );
  const carrierOf = new Map(inv.map((r) => [r.source_ref, r.carrier_type]));
  const readabilityOf = new Map(inv.map((r) => [r.source_ref, r.readability]));

  const obs = await queryRows(
    `select observation_id, source_id, locator, excerpt, normalized_observation, uncertainty
       from research_observation order by source_id, locator`
  );
  const men = await queryRows(
    `select m.mention_text, m.mention_type, m.resolution, o.source_id as source_id
       from research_mention m join research_observation o on m.observation_id = o.observation_id`
  );

  // 按 source 聚合
  const bySource = new Map();
  for (const o of obs) {
    if (!bySource.has(o.source_id)) bySource.set(o.source_id, []);
    bySource.get(o.source_id).push(o);
  }
  const menBySource = new Map();
  for (const m of men) {
    if (!menBySource.has(m.source_id)) menBySource.set(m.source_id, []);
    menBySource.get(m.source_id).push(m);
  }

  // 按类别分组（只含本轮有 Observation 的源）
  const groups = new Map();
  for (const [src, list] of bySource) {
    const carrier = carrierOf.get(src) || "unknown";
    const cat = categoryOf(carrier);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({ src, carrier, list });
  }

  let md = "# 来源材料内容解读看板（D02 只读层）\n\n";
  md += "> 本看板只呈现「AI 读懂了原文什么」，不写实体 / 关系 / 候选 / 不晋级 Truth。\n";
  md += `> 数据来源：\`research_observation\`（${obs.length} 条）、\`research_mention\`（${men.length} 条），覆盖 ${bySource.size} 个可读文本源。\n\n`;

  // 类别顺序（有内容的在前，按条数降序）
  const catOrder = [...groups.entries()].sort(
    (a, b) => b[1].reduce((s, x) => s + x.list.length, 0) - a[1].reduce((s, x) => s + x.list.length, 0)
  );

  for (const [cat, sources] of catOrder) {
    const totalObs = sources.reduce((s, x) => s + x.list.length, 0);
    md += `## ${cat}　（${sources.length} 源 · ${totalObs} 条解读）\n\n`;
    for (const { src, carrier, list } of sources.sort((a, b) => b.list.length - a.list.length)) {
      md += `### \`${src}\`\n`;
      md += `- 载体类别：${carrier}　|　可读性：${readabilityOf.get(src) || "readable"}\n`;
      md += `- 本源解读条数：${list.length}\n\n`;
      md += `**AI 读出的原文（最多 6 条样本，附 locator）**\n`;
      for (const o of list.slice(0, 6)) {
        md += `- 【${clip(o.locator, 70)}】${clip(o.excerpt || o.normalized_observation, 130)} _(uncertainty: ${clip(o.uncertainty, 40)})_\n`;
      }
      if (list.length > 6) md += `- …（其余 ${list.length - 6} 条略）\n`;
      const ms = menBySource.get(src) || [];
      if (ms.length) {
        // 按 mention_type 聚合，取 top
        const byType = new Map();
        for (const m of ms) {
          if (!byType.has(m.mention_type)) byType.set(m.mention_type, new Map());
          const mm = byType.get(m.mention_type);
          mm.set(m.mention_text, (mm.get(m.mention_text) || 0) + 1);
        }
        const topTypes = [...byType.entries()].sort((a, b) => b[1].size - a[1].size);
        md += `\n**提到的内容（按类型，每类 top 8）**\n`;
        for (const [type, mmap] of topTypes) {
          const items = [...mmap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
          md += `- ${type}：${items.map(([t, c]) => `${t}(${c})`).join("、")}\n`;
        }
      }
      md += `\n`;
    }
  }

  // 未覆盖类别（有源但 0 解读）说明
  md += `---\n\n## 本轮未覆盖（有源但 0 解读）\n\n`;
  md += `- **舆图 / 图片类**（historical_map、image_catalog 等）：视觉载体无正文段落，需「图读层」才能解读，本轮 D02 只读文本，故未覆盖。\n`;
  md += `- **目录 / 谱牒 / 诗文人物类**（catalog_only）：原文件仅结构索引、无正文片段，无可读文本。\n`;

  fs.writeFileSync(OUT, md, "utf8");
  console.log("WROTE", OUT, "bytes=", md.length, "sources=", bySource.size);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
