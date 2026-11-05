// apps/web/lib/studio-creation.ts — 创作编导引擎（LLM 生成导演方案 / 章节旁白）
//
// 铁律（与 C2/C4 一致）：LLM 只负责"叙事编排"，历史事实必须来自已审核真实材料；
// 生成内容禁止新增任何年份、地名、人物、关系、事件。无材料或无 key 时返回 null（不编造）。
import { readProductionRelationSummary } from "./read-model-bridge";
import { runResearch } from "./mohen-agent/research";

// H1 五母题定义（取自 specs/experience-ui/MoHen_Narrative_Motif_Framework.md §3）。
// 母题是追问方向，不是预设答案；可组合、可单独使用，不要求五母题全出现。
export const MOTIFS: Record<string, { code: string; name: string; question: string }> = {
  M1: { code: "M1", name: "消失的关系世界", question: "今天彼此孤立的桥、河、寺、街、市场、遗址、人物或制度，过去是否曾属于同一个生活世界？" },
  M2: { code: "M2", name: "一个地方为什么会长成这样", question: "为什么这里会有这么多桥/庙/巷/码头/城门/会馆/园林？反复出现的事物背后是什么结构？" },
  M3: { code: "M3", name: "过去的人生活在怎样的一张地图里", question: "过去的人如何通过水、路、市场、信仰、生产和往来理解这里？" },
  M4: { code: "M4", name: "一个地方究竟是怎样活起来的", question: "自然条件、交通、生产、贸易、信仰、制度与人的日常如何共同生成聚落、街区、城市或文化空间？" },
  M5: { code: "M5", name: "今天到底还剩多少过去", question: "眼前哪些是原物、重建、延续的名称、空间关系、生活习惯、记忆或后来的文化重塑？" },
};

export interface H1Finding {
  motifCodes: string[];
  historicalQuestion: string;
  understandingDelta: string;
  supportScope: string;
  limitations: string[];
}

export interface DirectorPlan {
  angle: string;
  points: string[];
  cover: string;
  /** 适用母题（H1→H2 时由 LLM 填充；兼容旧调用可选） */
  motif?: string;
  /** D1-D7 导演取舍（H2，可选） */
  directorDecisions?: string[];
}

export interface Beat {
  title: string;
  narration: string;
  visual: string;
  /** 导演时码（毫秒），不是历史年代 */
  directorTimecodeMs: number;
  /** 来源引用（真实材料里的对象/出处，不是新编内容） */
  provenanceRefs: string[];
}

// Structural validation only: this does not attest historical meaning or G qualification.
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonempty);
function validPlan(value: unknown): value is DirectorPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Partial<DirectorPlan>;
  return nonempty(p.angle) && strings(p.points) && p.points.length > 0 && nonempty(p.cover)
    && (p.motif === undefined || (typeof p.motif === "string" && Object.hasOwn(MOTIFS, p.motif)))
    && (p.directorDecisions === undefined || strings(p.directorDecisions));
}

/** No current director adapter verifies per-source external_processing rights,
 * provider/purpose/input binding and authorized spend. Display/research read,
 * a client boolean, an API key or engineering permission cannot admit a call.
 * Keep legacy signatures but fail closed until the existing controlled
 * delegation/authorization service can supply and revalidate that context. */
export function directorExternalProcessingBlocker(): string | null {
  return "external_processing_not_authorized";
}

function llmConfig() {
  return {
    baseUrl: (process.env.MOHEN_LLM_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
    apiKey: process.env.MOHEN_LLM_API_KEY || process.env.DEEPSEEK_API_KEY,
    model: process.env.MOHEN_LLM_MODEL || "deepseek-chat",
  };
}

async function callLlm(system: string, user: string, temperature: number): Promise<string | null> {
  if (directorExternalProcessingBlocker()) return null;
  const { baseUrl, apiKey, model } = llmConfig();
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string): unknown | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** 收集某主题的真实材料事实（故事陈述 + 史料原文 + 关系三元组） */
async function collectFacts(topic: string): Promise<string[]> {
  const summary = await readProductionRelationSummary(topic);
  if (!summary.available) return [];
  return [
    ...summary.stories.map((s) => s.statement).filter(Boolean),
    ...summary.relations.filter(Boolean),
    ...summary.evidence.map((e) => e.excerpt).filter(Boolean),
  ];
}

export interface DirectorPlansResult {
  planA: DirectorPlan;
  planB: DirectorPlan;
  facts: string[];
  finding: H1Finding;
}

export function parseH1Candidate(value: unknown): H1Finding | null {
  const parsed = value as Partial<H1Finding> | null;
  if (!parsed || !strings(parsed.motifCodes) || !parsed.motifCodes.length
    || !parsed.motifCodes.every(c => Object.hasOwn(MOTIFS, c))
    || !nonempty(parsed.historicalQuestion) || !nonempty(parsed.understandingDelta)
    || !nonempty(parsed.supportScope) || !strings(parsed.limitations)) return null;
  return {
    motifCodes: parsed.motifCodes.filter((c) => typeof c === "string" && c in MOTIFS).slice(0, 3),
    historicalQuestion: String(parsed.historicalQuestion ?? ""),
    understandingDelta: String(parsed.understandingDelta ?? ""),
    supportScope: String(parsed.supportScope ?? ""),
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations.map(String) : [],
  };
}

/** H1：从真实材料识别适用母题 + 认识增量（母题是追问方向，不是答案；材料不足如实收窄） */
export async function identifyMotifs(facts: string[], brief: string): Promise<H1Finding | null> {
  if (directorExternalProcessingBlocker()) return null;
  const system = `你是墨痕的 H1 历史叙事方法。基于真实材料识别适用母题（M1-M5），形成认识增量。
铁律：1. 母题是追问方向，不是答案；材料不足就收窄问题、保留未知；2. 禁止新增任何年份、地名、人物、关系、事件；3. 认识增量必须基于材料里能查证的内容。
母题定义：
${Object.values(MOTIFS).map((m) => `${m.code} ${m.name}：${m.question}`).join("\n")}
只输出 JSON：{"motifCodes":["M1"],"historicalQuestion":"...","understandingDelta":"...","supportScope":"...","limitations":["..."]}。`;

  const user = `真实材料：\n${facts.map((f) => "- " + f).join("\n")}\n\n委托：${brief}`;
  const text = await callLlm(system, user, 0.3);
  if (!text) return null;
  return parseH1Candidate(parseJson(text));
}

export function parseDirectorCandidates(value: unknown): {planA: DirectorPlan; planB: DirectorPlan} | null {
  const parsed = value as {planA?: unknown; planB?: unknown} | null;
  if (!validPlan(parsed?.planA) || !validPlan(parsed?.planB)) return null;
  return {planA: parsed.planA, planB: parsed.planB};
}

/** H1→H2：先识别母题（H1），再生成 A/B 导演方案（H2，D1-D7 导演取舍） */
export async function generateDirectorPlans(
  brief: string,
  topic = "jinze"
): Promise<DirectorPlansResult | null> {
  if (directorExternalProcessingBlocker()) return null;
  const facts = await collectFacts(topic);
  if (!facts.length) return null;

  const finding = await identifyMotifs(facts, brief);
  if (!finding) return null;
  const motifLine = `适用母题：${finding.motifCodes.join("、")}\n历史问题：${finding.historicalQuestion}\n认识增量：${finding.understandingDelta}\n支持范围：${finding.supportScope}`;

  const system = `你是墨痕的创作编导（H2）。基于给定的真实历史材料和 H1 认识增量，为一部短纪录片式作品生成两个不同的讲故事方案（A/B）。
铁律（违反即作废）：1. 只能使用「真实材料」里出现的事实，禁止新增任何年份、地名、人物、关系、事件；2. 方案A与方案B的差异必须来自叙事角度/结构（导演取舍 D1-D7：视角、故事顺序、主要焦点、节奏），不是换措辞；3. 每个方案给出 angle（一句话角度）、points（3条结构要点）、cover（封面画面建议）、motif（一个母题代码）、directorDecisions（2-3条导演取舍）。4. 只输出 JSON：{"planA":{"angle":"...","points":["..."],"cover":"...","motif":"M1","directorDecisions":["..."]},"planB":{...}}，不要多余文字。`;

  const user = `真实材料：\n${facts.map((f) => "- " + f).join("\n")}\n\n${motifLine}\n\n委托：${brief}`;
  const text = await callLlm(system, user, 0.7);
  if (!text) return null;
  const candidates = parseDirectorCandidates(parseJson(text));
  return candidates ? { ...candidates, facts, finding } : null;
}

export function parseBeatCandidates(value: unknown, facts: string[]): Beat[] | null {
  const parsed = value as { beats?: Array<Partial<Beat>> } | null;
  if (!Array.isArray(parsed?.beats) || !parsed.beats.length) return null;
  const allowed = new Set(facts);
  let previous = -1;
  for (const beat of parsed.beats) {
    if (!beat || !nonempty(beat.title) || !nonempty(beat.narration) || !nonempty(beat.visual)
      || !Number.isSafeInteger(beat.directorTimecodeMs) || beat.directorTimecodeMs! < 0
      || beat.directorTimecodeMs! <= previous || !strings(beat.provenanceRefs)
      || !beat.provenanceRefs.length || !beat.provenanceRefs.every(ref => allowed.has(ref))) return null;
    previous = beat.directorTimecodeMs!;
  }
  return parsed.beats as Beat[];
}

/** H3：生成章节 + 旁白（基于选定方案 + 真实材料），带导演时码与溯源 */
export async function generateBeats(plan: DirectorPlan, facts: string[]): Promise<Beat[] | null> {
  if (directorExternalProcessingBlocker()) return null;
  if (!validPlan(plan) || !strings(facts) || !facts.length) return null;
  const system = `你是墨痕的创作编导。基于给定的真实历史材料和一个选定的讲故事方案，生成这部短作品的分镜章节。
铁律：1. 只能使用材料里的事实，禁止新增任何年份、地名、人物、关系、事件；2. 每章给出 title（标题）、narration（旁白，2-3句话，纪录片口吻，只讲有据内容）、visual（画面建议，1句，基于材料里的对象）、directorTimecodeMs（导演时码，毫秒，从0递增，各章间隔约5000-15000）、provenanceRefs（逐项原样引用输入真实材料列表中的完整字符串，不得自编标识符）；3. 共 3-5 章；时码是播放时间，不是历史年代。4. 只输出 JSON：{"beats":[{"title":"...","narration":"...","visual":"...","directorTimecodeMs":0,"provenanceRefs":["..."]}]}，不要多余文字。`;

  const user = `真实材料：\n${facts.map((f) => "- " + f).join("\n")}\n\n选定方案：${plan.angle}\n结构要点：${plan.points.join("；")}`;
  const text = await callLlm(system, user, 0.7);
  if (!text) return null;
  return parseBeatCandidates(parseJson(text), facts);
}

/** 旁白 AI 优化：只润色措辞/口吻/节奏，绝不新增或篡改事实（复用 DeepSeek + 事实护栏）。 */
export async function suggestNarration(narration: string): Promise<string | null> {
  if (directorExternalProcessingBlocker()) return null;
  const system = `你是墨痕的旁白润色助手。只润色措辞、语气、节奏，使旁白更像纪录片口吻。
铁律：1. 绝不新增任何年份、地名、人名、关系、事件、数字；2. 绝不删改或替换既有事实表述；3. 只调整语序、用词、标点与口吻。4. 只输出润色后的旁白文本，不要任何解释或引号。`;
  const text = await callLlm(system, `原始旁白：${narration}`, 0.4);
  return text && text.trim() ? text.trim() : null;
}

// ---------- 作品四面板（API-X01）：故事结构 / 画面风格 / 配音旁白 / 背景音乐 ----------
export interface WorkPanelStoryStructure {
  title: string;
  timecode: string;
  visual: string;
}
export interface WorkPanels {
  storyStructure: WorkPanelStoryStructure[];
  visualStyle: { style: string; palette: string; shot: string };
  voiceover: { full: string; note: string };
  soundtrack: { plan: string; note: string };
}

function formatTimecode(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 生成作品四面板：故事结构 + 旁白 从 beats 直接提炼（不另调 LLM），
 * 画面风格 + 背景音乐 由 LLM 基于导演方案与真实材料生成（克制、不编造）。
 */
export async function generateWorkPanels(
  plan: DirectorPlan,
  facts: string[],
  beats: Beat[]
): Promise<WorkPanels | null> {
  if (directorExternalProcessingBlocker()) return null;
  const storyStructure = beats.map((b) => ({
    title: b.title,
    timecode: formatTimecode(b.directorTimecodeMs),
    visual: b.visual,
  }));
  const fullNarration = beats.map((b) => b.narration).filter(Boolean).join("\n\n");

  const system = `你是墨痕的视觉与音乐导演。基于给定的导演方案和真实材料，为一部短纪录片式历史作品设计画面风格与背景音乐方案。
铁律：1. 禁止新增任何年份、地名、人物、关系、事件；2. 画面风格要克制、真实，符合历史纪录片的质感；3. 音乐方案必须诚实——无版权音乐就建议"静音 + 环境声"，不得虚构可用的音乐曲目。
只输出 JSON：{"visualStyle":{"style":"...","palette":"...","shot":"..."},"soundtrack":{"plan":"...","note":"..."}}，不要多余文字。`;

  const user = `导演方案：${plan.angle}\n真实材料：\n${facts.map((f) => "- " + f).join("\n")}`;
  const text = await callLlm(system, user, 0.6);
  if (!text) return null;
  const parsed = parseJson(text) as {
    visualStyle?: { style?: string; palette?: string; shot?: string };
    soundtrack?: { plan?: string; note?: string };
  } | null;
  if (!parsed?.visualStyle || !parsed?.soundtrack) return null;

  return {
    storyStructure,
    visualStyle: {
      style: String(parsed.visualStyle.style ?? ""),
      palette: String(parsed.visualStyle.palette ?? ""),
      shot: String(parsed.visualStyle.shot ?? ""),
    },
    voiceover: {
      full: fullNarration,
      note: "旁白为文字版；语音合成能力尚未接入，当前仅可阅读。",
    },
    soundtrack: {
      plan: String(parsed.soundtrack.plan ?? ""),
      note: String(parsed.soundtrack.note ?? ""),
    },
  };
}

// ---------- 探索页「AI 动态图见」（API-X02）：从检索材料生成关系图 ----------
export interface InsightGraphNode {
  id: string;
  label: string;
  type: string;
}
export interface InsightGraphEdge {
  from: string;
  to: string;
  label: string;
  source: string;
}
export interface InsightGraph {
  nodes: InsightGraphNode[];
  edges: InsightGraphEdge[];
}

/** 基于检索到的真实材料，用 LLM 提取实体与关系，生成可溯源的关系图（不新增事实）。 */
export async function generateInsightView(question: string): Promise<InsightGraph | null> {
  if (directorExternalProcessingBlocker()) return null;
  const { decision } = await runResearch(question);
  const materials = decision.materials ?? [];
  if (!materials.length) return null;

  const system = `你是墨痕的知识图谱生成器。基于给定的真实材料，提取实体和它们之间的关系，生成一个关系图。
铁律：1. 只使用材料里出现的事实，禁止新增任何实体或关系；2. 同义实体要归一（如"普济桥"与"普济"合并为"普济桥"）；3. 每条关系必须标注它的来源出处；4. 关系标签用简短中文短语。
只输出 JSON：{"nodes":[{"id":"..","label":"..","type":"bridge|temple|place|waterway|person|event|other"}],"edges":[{"from":"..","to":"..","label":"..","source":".."}]}，from/to 用节点 id，不要多余文字。`;

  const user = `真实材料：\n${materials
    .map((m) => "- " + m.snippet + "（出处：" + m.sourceRef + "）")
    .join("\n")}`;
  const text = await callLlm(system, user, 0.3);
  if (!text) return null;
  const parsed = parseJson(text) as { nodes?: InsightGraphNode[]; edges?: InsightGraphEdge[] } | null;
  if (!parsed?.nodes?.length) return null;
  return {
    nodes: parsed.nodes.map((n) => ({
      id: String(n.id),
      label: String(n.label),
      type: String(n.type || "other"),
    })),
    edges: Array.isArray(parsed.edges)
      ? parsed.edges.map((e) => ({
          from: String(e.from),
          to: String(e.to),
          label: String(e.label),
          source: String(e.source || ""),
        }))
      : [],
  };
}
