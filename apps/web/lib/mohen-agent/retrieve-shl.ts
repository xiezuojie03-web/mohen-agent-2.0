// apps/web/lib/mohen-agent/retrieve-shl.ts
//
// 上海图书馆开放数据（S1）动态检索 —— Studio 研究「去系统之外找资料」的运行时接入。
//
// 复用 TASK-0005 retrieve-s1-jinze.mjs 的端点与抽取逻辑，但把「写死金泽的批量脚本」
// 泛化为「任意自然语言检索词的运行时查询」，供 Agent 受托研究时动态调用（E1-2 非预置题材）。
//
// 纪律（与生产管线一致）：
// - SHANGHAI_LIBRARY_API_KEY 仅注入 query，绝不打印 / 落盘 / 入库 / 进日志；
// - 响应体不含 key，可安全返回与展示；
// - 串行请求（并发 > 3 会触发对方限流）；
// - 结果只作「外部检索线索」（RESEARCH_LEAD），不是 G5 合格知识，必须如实标注。

export interface ShlLead {
  provider: "shanghai-library";
  /** 人话标题（端点类型 + 检索词） */
  title: string;
  /** 从响应里抽取的真实字段摘要（绝不 AI 补写） */
  summary: string;
  /** 无 key 的 uri（可安全展示） */
  uri: string | null;
  /** 命中的端点 */
  endpoint: string;
}

const BASE = "https://data1.library.sh.cn";
// 实际 .env.local 的变量名是 SHANGHAI_LIBRARY_KEY；旧脚本用 SHANGHAI_LIBRARY_API_KEY，一并兼容。
const KEY = process.env.SHANGHAI_LIBRARY_KEY || process.env.SHANGHAI_LIBRARY_API_KEY;

async function getJson(url: string): Promise<{ status: number; parsed: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "MoHenAgent2.0/0.1 (studio-research)" },
    });
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      // 非 JSON 响应，忽略
    }
    return { status: res.status, parsed };
  } catch {
    return { status: 0, parsed: null };
  } finally {
    clearTimeout(timer);
  }
}

function extractItems(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") return [];
  const p = parsed as Record<string, unknown>;
  if (Array.isArray(p.data)) return p.data;
  if (p.data && typeof p.data === "object") {
    const d = p.data as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.result)) return d.result;
  }
  if (Array.isArray(p.items)) return p.items;
  if (Array.isArray(p.result)) return p.result;
  return [];
}

function itemSummary(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const it = item as Record<string, unknown>;
  const parts: string[] = [];
  const push = (k: string, label: string) => {
    const v = it[k];
    if (v === null || v === undefined) return;
    // 数组字段（如 creator/contributor）取各元素的 label 列表，避免 [object Object]
    if (Array.isArray(v)) {
      const labels = v
        .map((e) => (e && typeof e === "object" ? String((e as Record<string, unknown>).label ?? "") : String(e)))
        .filter(Boolean);
      if (labels.length) parts.push(`${label}：${labels.join("、")}`);
      return;
    }
    if (String(v).trim()) parts.push(`${label}：${String(v).trim()}`);
  };
  push("dtitle", "书名");
  push("title", "题名");
  push("name", "名称");
  push("creator", "作者");
  push("edition", "版本");
  push("temporalValue", "年代");
  push("dateLabel", "时间");
  push("description", "描述");
  push("classLabel", "类别");
  return parts.length ? parts.join("；") : null;
}

function itemUri(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const it = item as Record<string, unknown>;
  const u = it.uri || it.placeUri || it.typeUri || it.resourceUri;
  return u && String(u).trim() ? String(u).trim() : null;
}

interface EndpointSpec {
  endpoint: string;
  label: string;
  qs: Record<string, string>;
}

// 动态检索只打这几个稳定端点（与生产管线一致，不扩展爬取范围）
function buildEndpoints(term: string): EndpointSpec[] {
  return [
    { endpoint: "gj/webapi/works", label: "方志书名", qs: { title: term } },
    { endpoint: "gj/webapi/instances", label: "古籍全文", qs: { freetext: term } },
    { endpoint: "webapi/kg/list", label: "人名规范", qs: { freetext: term } },
    { endpoint: "shnh/dmz/webapi/geonames/list", label: "地名志", qs: { type: "3", freetext: term } },
  ];
}

export interface ShlSearchResult {
  leads: ShlLead[];
  /** key 缺失或全部端点失败时为 true —— 上层必须如实告知，不得假装查到了 */
  degraded: boolean;
}

/** 动态检索上海图书馆开放数据。max 限制返回条数，串行请求避免限流。 */
export async function searchShanghaiLibrary(terms: string[], max = 6): Promise<ShlSearchResult> {
  if (!KEY) return { leads: [], degraded: true };
  const q = terms.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!q.length) return { leads: [], degraded: false };

  const leads: ShlLead[] = [];
  let okCount = 0;
  for (const term of q) {
    for (const ep of buildEndpoints(term)) {
      const qs = new URLSearchParams({ ...ep.qs, key: KEY });
      const { status, parsed } = await getJson(`${BASE}/${ep.endpoint}?${qs.toString()}`);
      if (status !== 200) continue;
      okCount++;
      const items = extractItems(parsed).slice(0, 8);
      for (const it of items) {
        const summary = itemSummary(it);
        if (!summary) continue;
        leads.push({
          provider: "shanghai-library",
          title: `${ep.label}·${term}`,
          summary,
          uri: itemUri(it),
          endpoint: ep.endpoint,
        });
        if (leads.length >= max) return { leads, degraded: false };
      }
      // 串行节流，避免触发限流
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return { leads, degraded: okCount === 0 };
}

// —— 外部检索词抽取深化（具体实体名优先）——
// 用 DeepSeek 从创作主题/问题里抽取「具体实体名」（地名/人名/建筑/寺桥/著作名），
// 优先于泛化类别词（"古桥""寺院""水乡"）。抽取失败则回退空，不阻塞。
const LLM_BASE = (process.env.MOHEN_LLM_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const LLM_KEY = process.env.MOHEN_LLM_API_KEY || process.env.DEEPSEEK_API_KEY;
const LLM_MODEL = process.env.MOHEN_LLM_MODEL || "deepseek-chat";

export async function extractExternalEntities(question: string): Promise<string[]> {
  if (!LLM_KEY) return [];
  const system = `你是墨痕的资料检索助手。从用户的创作主题/问题里，抽取可用于外部文献检索的「具体实体名」。
只输出专有名词（地名、人名、建筑、寺、桥、机构、著作名等），每行一个，最多6个。
不要输出泛化类别词（如"古桥""寺院""水乡""历史""联系"），只输出具体专有名词（如"金泽""万安桥""颐浩寺""赵孟頫"）。没有则输出空。`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${LLM_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0,
        messages: [{ role: "system", content: system }, { role: "user", content: question }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    return text
      .split(/\r?\n/)
      .map((s) => s.replace(/^[\d.\-—•·\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// —— 自由主题材料检索（生产原料，区别于上面的"线索"）——
// 把上海图书馆 4 端点的返回，按端点类型组装成可作 D00 原料的「材料」：
//   - 地名志(dmz) description 有实质描述文本；古籍书目(instances) 有书名/作者/版本/年代/分类；
//   - 人名规范(kg) 有 chsAgent + annoList.hasBody 正文；方志书名(works) 有 dtitle。
// 注意：开放数据只提供书目/地名/人名级元数据+描述，不是古籍全文——材料如实标注，不冒充全文。

export interface ShlMaterial {
  provider: string;
  title: string;
  source_type: string;
  carrier_type: string;
  provenance_status: string;
  content_availability: string;
  url: string;
  publisher: string;
  fragments: string[];
}

interface ItemFragments {
  title: string;
  source_type: string;
  fragments: string[];
}

function itemFragments(endpoint: string, item: unknown): ItemFragments | null {
  if (!item || typeof item !== "object") return null;
  const it = item as Record<string, unknown>;
  const frags: string[] = [];
  let title = "";
  let source_type = "bibliography";

  if (endpoint === "shnh/dmz/webapi/geonames/list") {
    source_type = "gazetteer";
    title = String(it.name || it.placeLabel || "");
    if (it.description) frags.push(String(it.description));
    if (it.placeLabel) frags.push(`所属：${String(it.placeLabel)}`);
    if (it.riverLabel) frags.push(`相关水系：${String(it.riverLabel)}`);
  } else if (endpoint === "gj/webapi/instances") {
    title = String(it.dtitle || it.label || "");
    if (it.dtitle) frags.push(`书名：${String(it.dtitle)}`);
    if (Array.isArray(it.creator) && it.creator.length) {
      const names = it.creator
        .map((c) => (c && typeof c === "object" ? String((c as Record<string, unknown>).label ?? "") : String(c)))
        .filter(Boolean);
      if (names.length) frags.push(`作者：${names.join("、")}`);
    }
    if (it.edition) frags.push(`版本：${String(it.edition)}`);
    if (it.temporalValue) frags.push(`年代：${String(it.temporalValue)}`);
    if (it.classLabel || it.fullClassName) frags.push(`分类：${String(it.fullClassName || it.classLabel)}`);
  } else if (endpoint === "webapi/kg/list") {
    source_type = "person";
    title = String(it.chsAgent || "");
    if (it.chsAgent) frags.push(`人名：${String(it.chsAgent)}`);
    if (Array.isArray(it.roles) && it.roles.length) frags.push(`身份：${it.roles.map(String).join("、")}`);
    if (Array.isArray(it.annoList)) {
      for (const a of it.annoList) {
        if (a && typeof a === "object" && (a as Record<string, unknown>).hasBody) {
          frags.push(String((a as Record<string, unknown>).hasBody));
        }
      }
    }
  } else if (endpoint === "gj/webapi/works") {
    title = String(it.dtitle || "");
    if (it.dtitle) frags.push(`书名：${String(it.dtitle)}`);
  }

  if (!frags.length) return null;
  return { title, source_type, fragments: frags };
}

/** 自由主题材料检索：返回可作 D00 原料的材料列表（不是线索）。 */
export async function searchShanghaiLibraryMaterials(
  terms: string[],
  max = 12
): Promise<{ materials: ShlMaterial[]; degraded: boolean }> {
  if (!KEY) return { materials: [], degraded: true };
  const q = terms.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!q.length) return { materials: [], degraded: false };

  const materials: ShlMaterial[] = [];
  let okCount = 0;
  for (const term of q) {
    for (const ep of buildEndpoints(term)) {
      const qs = new URLSearchParams({ ...ep.qs, key: KEY });
      const { status, parsed } = await getJson(`${BASE}/${ep.endpoint}?${qs.toString()}`);
      if (status !== 200) continue;
      okCount++;
      const items = extractItems(parsed).slice(0, 8);
      for (const it of items) {
        const m = itemFragments(ep.endpoint, it);
        if (!m) continue;
        const uri = itemUri(it);
        materials.push({
          provider: "shanghai-library",
          title: `${ep.label}·${m.title || term}`,
          source_type: m.source_type,
          carrier_type: "digital_text",
          provenance_status: "candidate",
          content_availability: "full_content",
          url: uri || "",
          publisher: "上海图书馆开放数据",
          fragments: m.fragments,
        });
        if (materials.length >= max) return { materials, degraded: false };
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return { materials, degraded: okCount === 0 };
}
