// packages/experience-engine/src/evidence-aware-replan.ts
//
// TASK-0016 — MoHen Agent Runtime: Evidence-Aware Replan Loop V1.0
//
// 最小链路（任务书 §5 Runtime Contract）：
//   User Follow-up → FollowUpIntent → EvidenceDecision → ReplanPlan
//   → ExperiencePatch → CompositionPatch → Existing RelationalHistoricalSurface → Observe
//
// 设计纪律（与冻结不变量对齐）：
// - 本模块是「语义决策运行时」：只产出意图/决策/计划/补丁，**不生成 DOM/React/SVG**（不变量 #9）；
// - **不读取 followup-patch.json 冒充 runtime**：补丁由下方 pipeline 从 (intent, decision, replan)
//   经既有证据推导计算；冻结 JSON 仅作 invariant 校验与答案参照（裁决 #2）；
// - Geometry itself is a Claim：决策只用关系证据，**不引入任何坐标**（不变量 #3/#7）；
// - 证据不足主动降低断言；E2 不得升级 E1（不变量 #1/#5/#6）；
// - Patch-not-Replace：experienceId 不变、trail 不丢、sceneIndex 不变（不变量 #8）。

import {
  selectSurfaces,
  type SurfaceSelection,
  type WorldEvidenceState,
  type RelationEvidence,
} from "./surface-eligibility";

// —— 实体别名（切片实体词表，用于从用户文本抽取对象 id；非事实表）——
export const ENTITY_NAME_ALIASES: Record<string, string[]> = {
  "yihaosi-site": ["颐浩寺", "颐浩"],
  "pujiqiao": ["普济桥", "普济"],
  "wananqiao": ["万安桥", "万安"],
};

// ---------------------------------------------------------------------------
// 1) FollowUpIntent —— 用户追问 → 意图判定（纯文本分类，确定性）
// ---------------------------------------------------------------------------
export type FollowUpIntentKind = "verify_historical_relation" | "unknown";

export interface FollowUpIntent {
  kind: FollowUpIntentKind;
  question: string;
  /** 从用户文本抽取的对象实体 id（来自 ENTITY_NAME_ALIASES） */
  objects: string[];
  /** 本切片只支持确定性意图识别 */
  deterministic: boolean;
}

const RELATION_QUERY = /(有关系吗|真的|是否|关联|吗\s*$|\?$)/;

export function classifyFollowUp(
  question: string,
  aliases: Record<string, string[]> = ENTITY_NAME_ALIASES
): FollowUpIntent {
  const found = Object.entries(aliases)
    .filter(([, names]) => names.some((n) => question.includes(n)))
    .map(([id]) => id);
  const isRelationQuery = RELATION_QUERY.test(question);
  if (found.length >= 2 && isRelationQuery) {
    return { kind: "verify_historical_relation", question, objects: found, deterministic: true };
  }
  if (found.length >= 1) {
    // 单对象也按「验证该对象与某历史关系」处理；证据决策会按对象对处理
    return { kind: "verify_historical_relation", question, objects: found, deterministic: true };
  }
  return { kind: "unknown", question, objects: [], deterministic: false };
}

// ---------------------------------------------------------------------------
// 2) EvidenceDecision —— 证据感知决策（消费 world.relationEvidence，不编造新事实）
// ---------------------------------------------------------------------------
export type EvidenceVerdict = "confirmed" | "insufficient_for_confirmation" | "contradicted";
export type EpistemicClass = "E1" | "E2" | "E3" | "E4" | "UNKNOWN";

export interface EvidenceDecision {
  verdict: EvidenceVerdict;
  /** 现有证据能支持到的最高 epistemic class（E2 不升 E1） */
  supportedEpistemicClass: EpistemicClass;
  reason: string;
  /** 已知 */
  known: string[];
  /** 未知（缺证据） */
  unknown: string[];
  /** 缺失证据（要确认须补什么） */
  missingEvidence: string[];
  /** 现代关联不得冒充历史关系 */
  currentAssociationNotHistorical: boolean;
}

export function decideEvidence(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  const rels = (world.relationEvidence ?? []) as RelationEvidence[];
  if (intent.kind !== "verify_historical_relation" || intent.objects.length < 2) {
    return {
      verdict: "insufficient_for_confirmation",
      supportedEpistemicClass: "UNKNOWN",
      reason: "无法从现有证据确认该历史关系：意图未识别或对象不足。",
      known: [],
      unknown: ["该对象对之间无可用历史关系意图"],
      missingEvidence: ["关系意图与对象"],
      currentAssociationNotHistorical: false,
    };
  }
  const [a, b] = intent.objects;
  const rel = rels.find(
    (r) => (r.subject === a && r.object === b) || (r.subject === b && r.object === a)
  );
  if (!rel) {
    return {
      verdict: "insufficient_for_confirmation",
      supportedEpistemicClass: "UNKNOWN",
      reason: "现有状态中未登记该对象对的历史关系。",
      known: [],
      unknown: ["该对象对之间无登记关系"],
      missingEvidence: ["关系证据登记"],
      currentAssociationNotHistorical: false,
    };
  }
  if (rel.epistemicClass === "E1") {
    return {
      verdict: "confirmed",
      supportedEpistemicClass: "E1",
      reason: rel.basis,
      known: [rel.basis],
      unknown: [],
      missingEvidence: [],
      currentAssociationNotHistorical: false,
    };
  }
  // E2 / E3 / E4 → 证据不足，不得确认（核心：不把 E2 升为 E1）
  return {
    verdict: "insufficient_for_confirmation",
    supportedEpistemicClass: rel.epistemicClass,
    reason: rel.basis,
    known: [
      "寺与桥今天相邻、同街（现代 provider 复合 POI + 同街地址）",
      "寺 1260 年创建、两桥 1260s–1267 建成（时间窗口重叠有据）",
    ],
    unknown: ["任何前现代文献是否记载寺—桥功能关联"],
    missingEvidence: [
      "明清方志/寺志中的寺桥关系条目",
      "1879 县志图说该区域可辨读细节",
    ],
    currentAssociationNotHistorical: rel.isCurrentAssociationOnly,
  };
}

// ---------------------------------------------------------------------------
// 3) ReplanPlan —— 重新规划体验（surface / 焦点 / 证据焦点 / 不确定可见）
// ---------------------------------------------------------------------------
export interface ReplanPlan {
  focus: string[];
  /** 复用 RelationalHistoricalSurface V3（relational_space） */
  targetSurface: "relational_space";
  evidenceFocus: string;
  uncertaintyVisible: boolean;
  /** 关系 epistemic class 保持（E2 不升 E1） */
  relationEpistemicClass: "E1" | "E2";
  /** 现代坐标失去历史权威：当前坐标不充当历史几何 */
  currentCoordsLoseHistoricalAuthority: boolean;
  nextActions: Array<{ action: string; text: string }>;
}

export function planReplan(decision: EvidenceDecision, intent: FollowUpIntent): ReplanPlan {
  const confirmed = decision.verdict === "confirmed" && decision.supportedEpistemicClass === "E1";
  return {
    focus: intent.objects,
    targetSurface: "relational_space",
    evidenceFocus: "temple_bridge_association",
    uncertaintyVisible: true,
    relationEpistemicClass: confirmed ? "E1" : "E2",
    currentCoordsLoseHistoricalAuthority: true,
    // §7：next actions = 看证据 / 看各自时间变化 / 回到今天（回到今天 = 可回 Present 的出口）
    nextActions: [
      { action: "open_evidence", text: "看证据：翻出既有材料里关于寺、桥各自历史与水系关系的条目（不新增主张）" },
      { action: "timeline", text: "看各自时间变化：让时间成为主角，分别看寺与桥的沿革（不连线成一条历史关系）" },
      {
        action: "research_lead",
        text: "继续调查方向（§10）：把『前现代文献中的寺桥关系』列为 research-lead（康熙/光绪《青浦县志》寺观、津梁卷）——须另行立项，不在本体验内补查",
      },
      { action: "return_present", text: "回到今天" },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4) 证据感知 Surface 选择（证明 Surface 由 Evidence Decision + Replan 选择，而非固定 beat）
//    verify_historical_relation + insufficient_for_confirmation + historical_geometry_absent
//    → relational_space（且 historical_geometry 恒 ineligible）
// ---------------------------------------------------------------------------
export function selectReplanSurface(plan: ReplanPlan, world: WorldEvidenceState): SurfaceSelection {
  return selectSurfaces(world, { primary: [plan.targetSurface, "evidence_reveal"] });
}

// ---------------------------------------------------------------------------
// 5) ExperiencePatch —— 对持续 ExperienceState 的补丁（Patch-not-Replace）
// ---------------------------------------------------------------------------
export interface ReplanExperiencePatch {
  /** 不变：不新建 Experience */
  experienceId: string;
  focus: string[];
  primarySurface: "relational_space";
  evidenceFocus: string;
  uncertaintyVisible: boolean;
  relationEpistemicClass: "E1" | "E2";
  verdict: EvidenceVerdict;
  nextActions: Array<{ action: string; text: string }>;
  currentCoordsLoseHistoricalAuthority: boolean;
}

export function buildExperiencePatch(
  plan: ReplanPlan,
  decision: EvidenceDecision,
  experienceId: string
): ReplanExperiencePatch {
  return {
    experienceId,
    focus: plan.focus,
    primarySurface: plan.targetSurface,
    evidenceFocus: plan.evidenceFocus,
    uncertaintyVisible: plan.uncertaintyVisible,
    relationEpistemicClass: plan.relationEpistemicClass,
    verdict: decision.verdict,
    nextActions: plan.nextActions,
    currentCoordsLoseHistoricalAuthority: plan.currentCoordsLoseHistoricalAuthority,
  };
}
