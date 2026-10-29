// apps/web/lib/mohen-agent/query-plan.ts — K5 查询梯子（2026-10-29）
//
// 目的：把"LLM 抽 5 个词"升级为可解释的六层查询计划：
//   1 精确实体 → 2 别名/旧名 → 3 繁体/异体 → 4 组合关系 → 5 时空限定 → 6 类型限定
// 纯函数、无 IO，便于单测与回归；真正的检索由 retrieve-shl.ts 执行。

export interface QueryPlan {
  /** 精确实体（最多 4 个） */
  entities: string[];
  /** 别名 / 旧名 / 雅称 */
  aliases: string[];
  /** 繁体 / 异体变体 */
  variants: string[];
  /** 组合关系（实体 + 关系词） */
  combos: string[];
  /** 类型限定（实体 + 志/桥/寺/图/档案…） */
  typed: string[];
  /** 去重后的最终检索词（按梯子顺序，最多 8 个） */
  terms: string[];
  /** 计划说明（给日志/资料台看，不冒充检索结果） */
  notes: string[];
}

// 常见繁体/异体字（V1 只覆盖江南文史高频字；后续可换成完整转换表）
const TRAD: Record<string, string> = {
  金: "金", 泽: "澤", 万: "萬", 安: "安", 桥: "橋", 颐: "頤", 浩: "浩", 寺: "寺",
  朱: "朱", 家: "家", 角: "角", 珠: "珠", 里: "里", 豫: "豫", 园: "園", 城: "城",
  隍: "隍", 庙: "廟", 湖: "湖", 心: "心", 亭: "亭", 龙: "龍", 华: "華", 塔: "塔",
  苏: "蘇", 州: "州", 河: "河", 松: "松", 江: "江", 嘉: "嘉", 定: "定", 南: "南",
  翔: "翔", 七: "七", 宝: "寶", 枫: "楓", 泾: "涇", 青: "青", 浦: "浦", 县: "縣",
  志: "志", 记: "記", 图: "圖", 档: "檔", 案: "案", 谱: "譜", 诗: "詩", 集: "集",
};

// 江南/上海高频主题的别名、旧名、雅称（V1 人工词表；后续由数据补）
const ALIASES: Record<string, string[]> = {
  金泽: ["金泽镇", "白苧里", "金泽里"],
  朱家角: ["珠里", "珠街阁", "朱家角镇"],
  豫园: ["豫园", "城隍庙", "湖心亭"],
  龙华: ["龙华镇", "龙华寺", "龙华塔"],
  苏州河: ["吴淞江", "苏州河"],
  松江: ["华亭", "云间", "松江府"],
  嘉定: ["嘉定县", "练祁"],
  南翔: ["南翔镇", "槎溪"],
  七宝: ["七宝镇", "七宝老街"],
  枫泾: ["枫泾镇", "枫溪"],
};

const TYPE_SUFFIXES = ["志", "记", "桥", "寺", "庵", "庙", "图", "档案", "家谱", "诗"];
const RELATION_WORDS = ["历史", "沿革", "关系", "变迁"];
const STOPWORDS = new Set([
  "一个", "一部", "关于", "历史", "文化", "故事", "作品", "我想", "帮我", "创作", "研究", "主题",
  "古桥", "寺院", "水乡", "古镇", "江南", "上海", "中国", "视频", "纪录片", "分钟", "普通", "观众",
]);

export function toTraditional(s: string): string {
  return Array.from(s)
    .map((ch) => TRAD[ch] ?? ch)
    .join("");
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const v = x.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/** 从自然语言里兜底抽专名（LLM 不可用时的规则路径）。 */
export function extractFallbackEntities(intent: string, max = 4): string[] {
  // 先认已知主题词（别名表的 key），避免"关于朱家角古镇的短视频"这种整句被长度过滤掉。
  const known = Object.keys(ALIASES).filter((k) => intent.includes(k));

  let cleaned = intent;
  for (const w of [
    "我想做一部", "我想做", "我想", "帮我", "关于", "一部", "的纪录片", "的短视频", "的短片",
    "作品", "创作", "研究", "主题", "视频", "纪录片",
  ]) {
    cleaned = cleaned.split(w).join(" ");
  }
  const parts = cleaned
    .split(/[\s,，。、；;：:！？!?"'“”‘’（）()《》【】\[\]—\-]+/)
    .map((s) => s.trim())
    .map((s) => s.replace(/(古镇|古桥|古寺|历史|文化)$/, ""))
    .filter((s) => s.length >= 2 && s.length <= 12 && !STOPWORDS.has(s));

  return dedupe([...known, ...parts]).slice(0, max);
}

/** 构建六层查询计划。entities 可来自 LLM；为空时用规则兜底。 */
export function buildQueryPlan(intent: string, entities: string[] = []): QueryPlan {
  // LLM 实体优先；只有 LLM 没给（或为空）时才用规则兜底，避免把整句塞进实体。
  const base = (entities.length ? dedupe(entities) : extractFallbackEntities(intent)).slice(0, 4);
  const aliases: string[] = [];
  const variants: string[] = [];
  const combos: string[] = [];
  const typed: string[] = [];

  for (const e of base) {
    for (const a of ALIASES[e] ?? []) if (a !== e) aliases.push(a);
    const trad = toTraditional(e);
    if (trad !== e) variants.push(trad);
    for (const w of RELATION_WORDS.slice(0, 2)) combos.push(`${e}${w}`);
    for (const t of TYPE_SUFFIXES.slice(0, 5)) typed.push(`${e}${t}`);
  }

  const terms = dedupe([...base, ...aliases, ...variants, ...combos, ...typed]).slice(0, 8);
  const notes: string[] = [];
  if (!entities.length) notes.push("no_llm_entities: used rule-based fallback");
  if (aliases.length) notes.push(`aliases=${aliases.length}`);
  if (variants.length) notes.push(`variants=${variants.length}`);
  if (!terms.length) notes.push("empty_plan");

  return { entities: base, aliases, variants, combos, typed, terms, notes };
}
