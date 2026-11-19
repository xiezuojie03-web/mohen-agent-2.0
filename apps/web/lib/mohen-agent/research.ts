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
  type Understanding,
} from "@mohen/agent-runtime";
import { retrieveMaterials, type RetrieveResult } from "./retrieve";
import { retrieveQualifiedFormalProject, type FormalQualifiedRead } from "./retrieve-formal";
import { readStudioResearchProject } from "../studio-research-read";
import { planStudioKnowledgeRoute, type StudioKnowledgeRouting } from "./knowledge-routing.mjs";
import { extractExternalEntities, type ShlMaterial } from "./retrieve-shl";
import { discoverExternalSources } from "./source-discovery";
import { useTool, BudgetHoldError, ToolExecutionUncertainError, ToolReceiptPersistenceError, type Ledger } from "../studio/tool-ledger";
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
  knowledgeRoute?: StudioKnowledgeRouting;
}

export interface StudioResearchContext {
  projectId: string;
  sessionToken: string;
  settledUnderstanding?: Understanding;
}

export const TOPIC_NAMES = { jinze: "金泽", a001: "绿之丘", generic: "通用" } as const;
export type TopicKey = keyof typeof TOPIC_NAMES;

export function resolveTopic(topic: unknown): TopicKey {
  return typeof topic === "string" && topic in TOPIC_PROFILES ? (topic as TopicKey) : "generic";
}

// B1（2026-11-13）自由研究委托的通用入口。
//
// understand() 是问答式意图分类器。自由委托（如「楚国八百年」）常被判为 unknown，
// decideStep 据此直接返回 cannot_answer +「意图未确定」，把已检索到的库内材料与
// 外部线索全部丢弃——这就是"非模板题材一律崩"的根因。
//
// 研究委托本身没有具体问句，语义上不是"答不出"，而是"研究焦点待收敛"（MHKA-02 §3）。
// 这里把它转成可继续的研究裁决：保留真实材料及其 epistemic 标记（外部线索仍是
// RESEARCH_LEAD，不得升格），如实说明需要收敛，并给出可点的焦点候选。
// 本函数不产生任何事实，只重新组织已检索到的材料。
/** 是否存在可支撑结论的材料（外部线索不算——线索不是答案） */
function hasEvidencedMaterial(materials: Material[]): boolean {
  return materials.some(
    (m) => m.epistemic === "FACT_EVIDENCED" || m.epistemic === "SUPPORTED_CANDIDATE" || m.epistemic === "CONFLICTED"
  );
}

function toMissionDecision(
  decision: AgentDecision,
  materials: Material[],
  objects: string[],
  entities: string[]
): AgentDecision {
  const ranked = [...materials].sort((a, b) => b.score - a.score).slice(0, 12);
  const focus = dedupe([...objects, ...entities]).slice(0, 5);
  const evidenced = hasEvidencedMaterial(ranked);
  const gaps = decision.gaps.filter((gap) => gap !== "意图未确定");
  gaps.unshift("这是研究委托而非具体问句：需要先收敛到一个可回答的研究问题");
  if (!evidenced) {
    gaps.splice(1, 0, `库内已审核材料还不能直接回答这个问题；下面 ${ranked.length} 条是待核验的外部线索，不是答案`);
  }
  return {
    ...decision,
    materials: ranked,
    evidenceRefs: ranked.map((m) => m.id),
    verdict: "partial",
    primaryStage: "evidence_reveal",
    secondaryStage: null,
    focus,
    mohenLine: evidenced
      ? `这是研究委托。我找到 ${ranked.length} 条可先看的材料，先确认要追哪一条。`
      : `这是研究委托。库里还不能直接回答，但我找到 ${ranked.length} 条外部线索可以核验。`,
    gaps,
    clarifyQuestion: focus.length
      ? `先从「${focus[0]}」追起，还是换一个焦点？`
      : "你想先从哪个角度追这条线？",
  };
}

/**
 * 自由研究委托入口的唯一判定点。只有三个条件同时成立才转换：
 * ① 非预置题材；② 确实检索到材料；③ 问答式裁决确实判死（cannot_answer）。
 *
 * 判死有两种形态，都必须转：
 *   · 意图判不出（intent=unknown →「意图未确定」）；
 *   · 意图判出来了，但没有该 intent 类型的材料（如 time 类意图只要 event/claim，
 *     外部线索 kind=evidence 会被整体过滤掉）——这条在真实委托「楚国八百年」上实测到，
 *     18 条线索被丢弃。
 *
 * 任一条件不满足就原样返回——不假装有收获，也不污染预置题材的问答语义。
 */
export function applyFreeMissionEntry(
  topic: TopicKey,
  materials: Material[],
  decision: AgentDecision,
  objects: string[],
  entities: string[]
): AgentDecision {
  if (topic !== "generic") return decision;
  if (!materials.length) return decision;
  if (decision.verdict !== "cannot_answer") return decision;
  return toMissionDecision(decision, materials, objects, entities);
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
  ledger?: Ledger,
  studioContext?: StudioResearchContext
): Promise<ResearchResult> {
  const qualification = requireResearchPrerequisites(ledger, Boolean(studioContext?.settledUnderstanding));
  const profile = TOPIC_PROFILES[topic];
  // ACL and current rights are checked before spending on intent extraction.
  // This service returns private L0-L4 as candidates only, never qualified facts.
  let projectSnapshot: Record<string,unknown> | null = null;
  if (studioContext) {
    if (!studioContext.projectId || !studioContext.sessionToken)
      throw new ResearchPrerequisiteHold(["STUDIO_PROJECT_READ_CONTEXT_REQUIRED"]);
    try {
      const read = await useTool(ledger, "retrieve-local", () =>
        readStudioResearchProject(studioContext.projectId,studioContext.sessionToken,{persistReadingNotes:false})
      );
      projectSnapshot = read.snapshot;
    } catch (error) {
      if (error instanceof BudgetHoldError || error instanceof ToolExecutionUncertainError ||
          error instanceof ToolReceiptPersistenceError) throw error;
      throw new ResearchPrerequisiteHold(["STUDIO_KNOWLEDGE_READ_NOT_AUTHORIZED_OR_UNAVAILABLE"]);
    }
  }
  const understanding = studioContext?.settledUnderstanding ??
    await useTool(ledger, "llm-understand", () => understand(question, profile.aliases));
  // 前置校验看"模型是否真的接通并作答"，不看意图最终取自哪一档：
  // 自由委托常被判为 unknown，这属于合法结果，不能因此阻断研究。
  if (!understanding.llmResponded)
    throw new ResearchPrerequisiteHold(['PROVIDER_UNDERSTANDING_NOT_VERIFIED']);
  const aliasTerms = understanding.objects.flatMap((id) => profile.aliases[id] ?? []);
  const terms = dedupe([...aliasTerms, ...understanding.terms]);
  const anchoredTerms =
    understanding.objects.length === 0 ? dedupe([...terms, ...profile.fallback]) : terms;
  const effectiveTerms = anchoredTerms.length ? anchoredTerms : profile.fallback;


  // For non-template Studio missions an empty term list is NOT authorization
  // to enumerate unrelated L5 content: fail toward question refinement.
  let l5Search: RetrieveResult = studioContext && !effectiveTerms.length
    ? { materials: [], degraded: false, coverage: "NOT_SEARCHED" }
    : await retrieveMaterials(effectiveTerms, 24, {
        qualification,objectAliases:profile.labelAliases,
      });
  if (!l5Search.materials.length && !l5Search.degraded && (!studioContext || profile.fallback.length > 0)) {
    const fallback = await retrieveMaterials(profile.fallback, 24, {
      qualification,objectAliases:profile.labelAliases,
    });
    l5Search = {
      ...fallback,
      coverage: !fallback.degraded && l5Search.coverage === "PARTIAL" ? "PARTIAL" : fallback.coverage,
    };
  }
  let { materials, degraded } = l5Search;
  const qualifiedL5 = materials;
  let formalRead:FormalQualifiedRead|undefined;
  if(studioContext){
    try{
      formalRead=await useTool(ledger,"retrieve-local",()=>
        retrieveQualifiedFormalProject(studioContext.projectId,effectiveTerms,qualification,studioContext.sessionToken));
    }catch(error){
      if(error instanceof BudgetHoldError||error instanceof ToolExecutionUncertainError||
         error instanceof ToolReceiptPersistenceError)throw error;
      throw new ResearchPrerequisiteHold(["FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE"], undefined, understanding);
    }
  }
  // An eligible L2-L4 Gate result is scoped to the current Owner's Project.
  // The separately authorized cross-Project sharing index does NOT exist in
  // the first-phase Owner-only ACL contract. Never infer full shared coverage
  // or an automatic D00 request from an empty local result.
  const knowledgeRoute=studioContext?planStudioKnowledgeRoute({
    qualifiedL5,qualifiedFormalL0L4:formalRead?.refs??[],
    l5Coverage: l5Search.coverage,
    projectSnapshot,lookupDegraded:degraded,formalLookupDegraded:formalRead?.degraded===true,
    projectFormalCoverageComplete:formalRead?.projectQualifiedCoverage==="COMPLETE",
    sharedL0L4CoverageComplete:false,
  }):undefined;
  materials=[...materials,...(formalRead?.materials??[])];
  degraded=degraded||formalRead?.degraded===true;
  let externalEntities: string[] = [];
  let externalMaterials: Material[] = [];
  let discoveryGaps: string[] = [];
  // Non-Studio ask keeps its prior behavior. Studio only discovers external
  // leads when a complete qualified inventory has established a source gap.
  if (!studioContext || knowledgeRoute?.should_discover_sources) {
    externalEntities = await useTool(ledger, "llm-extract-entities", () =>
      extractExternalEntities(question)
    );
    const discovery = await useTool(ledger, "retrieve-external", () =>
      discoverExternalSources(question, {localMaterialCount:materials.length,entities:externalEntities})
    );
    externalMaterials = discovery.leads.map(toExternalMaterial);
    discoveryGaps = discovery.gaps;
  }
  materials = [...materials, ...externalMaterials];

  let materialsForDecision = materials;
  if (topic === "a001" && /原来|原先|原本|前身|以前|最早/.test(question)) {
    const withoutToday = materials.filter((m) => !(m.kind === "present" && m.sourceRef.includes("今日联系")));
    if (withoutToday.length) materialsForDecision = withoutToday;
  }

  const baseDecision = await useTool(ledger, "llm-polish", () =>
    decideStep(understanding, materialsForDecision, profile.aliases)
  );
  // B1：自由研究委托不再因问答式意图判不出而死路。判定逻辑在 applyFreeMissionEntry，
  // 有一条材料都没有时保持 cannot_answer（不假装有收获）。
  const missionBase = applyFreeMissionEntry(
    topic,
    materialsForDecision,
    baseDecision,
    understanding.objects,
    externalEntities
  );
  const decision = applyRiskGuards(topic, question, missionBase);
  const finalGaps = [...decision.gaps];
  if (degraded) finalGaps.push("暂时查不到库里的材料");
  // 外部渠道的缺口逐个如实列出：单渠道不可用不再整体中断研究，
  // 但"四个渠道都没有线索"必须显式说出，不能当作"没有资料"。
  for (const gap of discoveryGaps) {
    if (!finalGaps.includes(gap)) finalGaps.push(gap);
  }
  if (knowledgeRoute && !knowledgeRoute.may_reuse_l5) {
    const routeGap: Record<string,string> = {
      QUALIFICATION_REQUIRED:"项目内已有来源或研究候选，但尚未证明本次用途所需独立资格；先定向核验，不重新获取。",
      PROJECT_SOURCE_GAP_CONFIRMED:"当前Project的Owner/Project授权正式知识检索已完整、未截断且没有合格来源；仅确认项目范围缺口，可以启动受控D00来源发现，不代表跨Project共享库已完整检索。",
      SOURCE_GAP_UNCONFIRMED:"当前项目和G5读模型未查到可直接引用的知识，但合法共享L0—L4尚未完成检索，不能判定全库缺来源。",
      HOLD:"知识检索范围或当前资格未能可靠核对，暂停来源调度。",
      SOURCE_GAP_CONFIRMED:"已完成授权范围检索且确认缺少来源，可以启动受控D00来源发现。",
      QUALIFIED_INPUT_AVAILABLE:"现有正式L0/L1已获本次项目用途的独立资格；只评估下一必要D阶段，不能重做D00或省略读取/权利前提。",
    };
    const gap=routeGap[knowledgeRoute.disposition];
    if(gap && !finalGaps.includes(gap)) finalGaps.push(gap);
  }
  return { decision: { ...decision, gaps: finalGaps }, degraded,
    researchLeads: externalMaterials,...(knowledgeRoute?{knowledgeRoute}:{}) };
}
