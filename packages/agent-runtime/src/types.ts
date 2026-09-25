// packages/agent-runtime/src/types.ts
//
// ADR-003 · 墨痕 Agent 分层架构 —— 类型契约层
//
// 本包只定义「理解 / 检索 / 选择 / 表达」的类型与纯函数实现，**不产生任何事实**。
// 事实只来自库里已审核的 evidence（由 web 侧检索层注入，见 RetrieveFn）。
//
// 纪律：
// - 本包零运行时依赖、零 LLM 强依赖（LLM 可选、可降级）；
// - 不输出 DOM / React / SVG；
// - 认识论档位只降不升：E2 不得写成 E1，无证据就说不知道。

/** 认识论档位（与 ADR-002 六值模型对齐，供展示层人话化使用） */
export type EpistemicTag =
  | "FACT_EVIDENCED"
  | "SUPPORTED_CANDIDATE"
  | "CONFLICTED"
  | "RESEARCH_LEAD"
  | "OPEN_QUESTION"
  | "UNSUPPORTED"
  | "UNKNOWN";

/** 用户此刻在追什么（导演稿 §4 五类，比引擎四类多一个「看地方」） */
export type AgentIntentKind =
  | "relation"
  | "evidence"
  | "temporal"
  | "present"
  | "place"
  | "unknown";

/** 引擎既有意图（TASK-0017 四类 + unknown），本包最终必须收敛到它，以复用既有 FOLLOWUP_REPLAN */
export type EngineIntentKind =
  | "verify_historical_relation"
  | "inspect_evidence"
  | "explore_temporal_change"
  | "propose_present_action"
  | "unknown";

/** 舞台主角（与 SurfaceType 一一对应，由 web 侧映射，本包不 import 引擎以避免循环依赖） */
export type Stage =
  | "relational_space"
  | "evidence_reveal"
  | "timeline"
  | "current_map"
  | "current_photo"
  | "unknown_gap";

export interface Understanding {
  intent: AgentIntentKind;
  /** 抽取到的对象实体 id（来自注入的别名表） */
  objects: string[];
  /** 从问句里切出的中文实词（供检索使用；虚词与意图词已剔除） */
  terms: string[];
  /** 时间线索原文（不解析为事实年份，仅作检索提示） */
  timeHint: string | null;
  /** 0–1；低于阈值时不猜，转澄清 */
  confidence: number;
  source: "deterministic" | "llm" | "hybrid";
  needsClarification: boolean;
  clarifyQuestion: string | null;
}

/** 一条「已审核材料」。只由检索层从库里读出，本包绝不自行生成。 */
export interface Material {
  id: string;
  kind: "evidence" | "claim" | "relation" | "event" | "conflict" | "fragment" | "present";
  entityIds: string[];
  /** 面向用户的片段（原文摘要，不得改写为推测） */
  snippet: string;
  /** 出处（人话，例如「光绪《青浦县志》」） */
  sourceRef: string;
  epistemic: EpistemicTag;
  /** 有纪年才填，无纪年一律 null（不得推断） */
  year: number | null;
  /** 检索打分结果，0–1，仅用于排序 */
  score: number;
  /** 命中检索词数量（0 = 兜底召回，非针对性命中）。可选，缺省按 0 处理。 */
  matchScore?: number;
}

export interface RetrieveRequest {
  objects: string[];
  intent: AgentIntentKind;
  timeHint: string | null;
  town: string;
  limit: number;
}

/** 检索实现由 web 侧注入（服务端读库）；离线/失败时返回空数组，由本包转「不知道」 */
export type RetrieveFn = (req: RetrieveRequest) => Promise<Material[]>;

export interface AgentDecision {
  understanding: Understanding;
  /** 被选中用于本次回答的材料（可能为空 → verdict = cannot_answer） */
  materials: Material[];
  engineIntent: EngineIntentKind;
  primaryStage: Stage;
  secondaryStage: Stage | null;
  focus: string[];
  /** 能否回答 / 部分可答 / 不能回答（诚实边界） */
  verdict: "answered" | "partial" | "cannot_answer";
  /** 墨痕短句（人话，≤2 句） */
  mohenLine: string;
  /** 缺口：明确告诉用户还缺什么（不得沉默） */
  gaps: string[];
  /** 需要澄清时的问句 */
  clarifyQuestion: string | null;
  /** 溯源：本次回答依据了哪些材料 id */
  evidenceRefs: string[];
}

/** 别名表：实体 id → 可能的用户说法。由 web 侧从切片/库注入，默认内置金泽最小集合。 */
export type EntityAliases = Record<string, string[]>;
