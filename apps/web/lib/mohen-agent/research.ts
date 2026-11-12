// apps/web/lib/mohen-agent/research.ts
//
// 抽取 /api/mohen/ask 的「研究核心链路」（理解 → 检索 → 裁决 → 主题风险守卫），
// 供即时问答（ask）与 Studio 受托研究任务（studio/research-tasks）共用。
// 本模块不产生事实：回答内容只能来自检索到的 materials；LLM 只参与意图判读与润色。
import {
  understand,
  decideStep,
  type EntityAliases,
  type AgentDecision,
  type Material,
} from "@mohen/agent-runtime";
import { retrieveMaterials } from "./retrieve";
import { extractExternalEntities, type ShlMaterial } from "./retrieve-shl";
import { discoverExternalSources } from "./source-discovery";
import { useTool, type Ledger } from "../studio/tool-ledger";
import {requireResearchPrerequisites, ResearchPrerequisiteHold} from './research-prerequisites';

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}

interface RiskGuard {
  id: string;
  asked: RegExp;
  materialSoft?: RegExp;
  gap: string;
}

const RISK_GUARDS: Record<string, RiskGuard[]> = {
  a001: [
    {
      id: "identity",
      asked: /同一(栋|座|幢|处|个)|是同一个|等同|一样吗|算不算同一/,
      materialSoft: /前身可追溯到|可追溯至|来源于|源自/,
      gap: "材料只说「前身可追溯到 1920 年怡和冷库」。这是来源上的软性溯源，不是「同一栋建筑连续存在」的证据，所以不能答成「是同一栋楼」。",
    },
    {
      id: "causality",
      asked: /造成|导致|引起|促成|带来|是不是.*(政策|工程|规划)/,
      gap: "同属一片滨江、彼此紧邻，都是空间关系，不是因果。材料没有记载这处改造是由贯通工程直接造成的。",
    },
  ],
};

function applyRiskGuards(topic: string, question: string, decision: AgentDecision): AgentDecision {
  const guards = RISK_GUARDS[topic];
  if (!guards || decision.verdict === "cannot_answer") return decision;
  const hitGaps: string[] = [];
  for (const g of guards) {
    if (!g.asked.test(question)) continue;
    if (g.materialSoft && !decision.materials.some((m) => g.materialSoft!.test(m.snippet))) continue;
    if (!decision.gaps.includes(g.gap)) hitGaps.push(g.gap);
  }
  if (!hitGaps.length) return decision;
  return { ...decision, verdict: "partial", gaps: [...hitGaps, ...decision.gaps] };
}

const JINZE_ALIASES: EntityAliases = {
  "yihaosi-site": ["颐浩寺", "颐浩", "颐浩寺遗址"],
  pujiqiao: ["普济桥", "普济"],
  wananqiao: ["万安桥", "万安"],
  yingxiangqiao: ["迎祥桥", "迎祥"],
  jinze: ["金泽"],
  baizhuli: ["白苎里", "白苧里"],
  "lv-yihao": ["吕颐浩"],
  "waterway-provisional": ["桥所跨水道（名称待定）", "金泽塘", "秀州塘", "市河"],
};

const LABEL_ALIASES: Record<string, string[]> = {
  "桥所跨水道（名称待定）": ["金泽塘", "秀州塘", "市河"],
};

const A001_ALIASES: EntityAliases = {
  绿之丘: ["绿之丘", "绿丘"],
  烟草公司机修仓库: ["烟草公司机修仓库", "烟草机修仓库", "机修仓库", "烟草仓库", "老仓库"],
  "怡和冷库（1920）": ["怡和冷库", "怡和冷库（1920）", "怡和洋行冷库", "1920年怡和冷库", "怡和洋行"],
  "章明团队": ["章明团队", "章明", "同济大学章明", "章明教授"],
  安浦路: ["安浦路"],
  杨树浦路: ["杨树浦路", "1500号"],
  滨江公共空间: ["滨江公共空间", "杨浦滨江南段5.5公里公共空间", "滨江南段5.5公里", "滨江贯通", "滨江"],
  亚洲建筑师协会建筑奖: ["亚洲建筑师协会建筑奖", "建筑奖", "荣誉提名奖"],
};

const TOPIC_PROFILES: Record<
  string,
  { aliases: EntityAliases; labelAliases: Record<string, string[]>; fallback: string[] }
> = {
  jinze: { aliases: JINZE_ALIASES, labelAliases: LABEL_ALIASES, fallback: ["金泽"] },
  a001: { aliases: A001_ALIASES, labelAliases: {}, fallback: ["绿之丘", "烟草公司机修仓库"] },
  // 非预置题材（E1-2）：空别名 + 空兜底。检索词完全来自用户自然语言，不再污染预置地名。
  generic: { aliases: {}, labelAliases: {}, fallback: [] },
};

export interface ResearchResult {
  decision: AgentDecision;
  degraded: boolean;
  /** 外部检索线索（上海图书馆等），与本地合格知识分开，供前端如实标注呈现 */
  researchLeads: Material[];
}

export const TOPIC_NAMES = { jinze: "金泽", a001: "绿之丘", generic: "通用" } as const;
export type TopicKey = keyof typeof TOPIC_NAMES;

export function resolveTopic(topic: unknown): TopicKey {
  return typeof topic === "string" && topic in TOPIC_PROFILES ? (topic as TopicKey) : "generic";
}

/** 外部线索 → 材料（epistemic 固定 RESEARCH_LEAD，不得冒充合格知识） */
function toExternalMaterial(lead: ShlMaterial): Material {
  const text = lead.fragments.join(" ");
  const yearMatch = text.match(/(1\d{3}|2\d{3})/);
  return {
    id: `${lead.provider}:${lead.url || lead.title}`,
    kind: "evidence",
    entityIds: [],
    snippet: lead.fragments.slice(0, 2).join(" · ") || lead.title,
    sourceRef: `${lead.publisher || lead.provider}（外部检索线索）· ${lead.title}`,
    epistemic: "RESEARCH_LEAD",
    year: yearMatch ? Number(yearMatch[1]) : null,
    score: 0.4,
    matchScore: 0,
  };
}

/** 运行一次研究：理解 → 检索 → 裁决 → 主题风险守卫。不产生事实。ledger 存在时走预算工具路由。 */
export async function runResearch(
  question: string,
  topic: TopicKey = "generic",
  ledger?: Ledger
): Promise<ResearchResult> {
  const qualification = requireResearchPrerequisites(ledger);
  const profile = TOPIC_PROFILES[topic];
  const understanding = await useTool(ledger, "llm-understand", () => understand(question, profile.aliases));
  // 前置校验看"模型是否真的接通并作答"，不看意图最终取自哪一档：
  // 自由委托常被判为 unknown，这属于合法结果，不能因此阻断研究。
  if (!understanding.llmResponded)
    throw new ResearchPrerequisiteHold(['PROVIDER_UNDERSTANDING_NOT_VERIFIED']);
  const aliasTerms = understanding.objects.flatMap((id) => profile.aliases[id] ?? []);
  const terms = dedupe([...aliasTerms, ...understanding.terms]);
  const anchoredTerms =
    understanding.objects.length === 0 ? dedupe([...terms, ...profile.fallback]) : terms;
  const effectiveTerms = anchoredTerms.length ? anchoredTerms : profile.fallback;

  let { materials, degraded } = await retrieveMaterials(effectiveTerms, 24, {
    qualification,
    objectAliases: profile.labelAliases,
  });
  if (!materials.length && !degraded) {
    const retry = await retrieveMaterials(profile.fallback, 24, { qualification, objectAliases: profile.labelAliases });
    materials = retry.materials;
    degraded = retry.degraded;
  }

  // 外部找资料（D00 来源发现 Y02/Y03）：先抽具体实体名（LLM，优先），
  // 再按查询梯子多渠道检索（上海图书馆 / Commons / 国会图书馆 / 维基文库）；
  // 结果只作「检索线索」，不是合格知识，也不冒充原件。
  const externalEntities = await useTool(ledger, "llm-extract-entities", () =>
    extractExternalEntities(question)
  );
  const discovery = await useTool(ledger, "retrieve-external", () =>
    discoverExternalSources(question, { localMaterialCount: materials.length, entities: externalEntities })
  );
  const externalMaterials = discovery.leads.map(toExternalMaterial);
  materials = [...materials, ...externalMaterials];

  let materialsForDecision = materials;
  if (topic === "a001" && /原来|原先|原本|前身|以前|最早/.test(question)) {
    const withoutToday = materials.filter((m) => !(m.kind === "present" && m.sourceRef.includes("今日联系")));
    if (withoutToday.length) materialsForDecision = withoutToday;
  }

  const baseDecision = await useTool(ledger, "llm-polish", () =>
    decideStep(understanding, materialsForDecision, profile.aliases)
  );
  const decision = applyRiskGuards(topic, question, baseDecision);
  const finalGaps = [...decision.gaps];
  if (degraded) finalGaps.push("暂时查不到库里的材料");
  // 外部渠道的缺口逐个如实列出：单渠道不可用不再整体中断研究，
  // 但"四个渠道都没有线索"必须显式说出，不能当作"没有资料"。
  for (const gap of discovery.gaps) {
    if (!finalGaps.includes(gap)) finalGaps.push(gap);
  }
  return { decision: { ...decision, gaps: finalGaps }, degraded, researchLeads: externalMaterials };
}
