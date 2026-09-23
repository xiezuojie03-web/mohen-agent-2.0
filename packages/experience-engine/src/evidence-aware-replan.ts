// packages/experience-engine/src/evidence-aware-replan.ts
//
// TASK-0016 — MoHen Agent Runtime: Evidence-Aware Replan Loop V1.0
// TASK-0017 — Multi-Intent Evidence-Aware Exploration Loop V1.0（扩展四类意图）
//
// 最小链路（任务书 §5 Runtime Contract）：
//   User Follow-up → FollowUpIntent → EvidenceDecision → ReplanPlan
//   → ExperiencePatch → CompositionPatch → Existing Surface → Observe
//
// 设计纪律（与冻结不变量对齐）：
// - 本模块是「语义决策运行时」：只产出意图/决策/计划/补丁，**不生成 DOM/React/SVG**（不变量 #9）；
// - **不读取 followup-patch.json 冒充 runtime**：补丁由下方 pipeline 从 (intent, decision, replan)
//   经既有证据推导计算；冻结 JSON 仅作 invariant 校验与答案参照（裁决 #2）；
// - Geometry itself is a Claim：决策只用关系证据，**不引入任何坐标**（不变量 #3/#7）；
// - 证据不足主动降低断言；E2 不得升级 E1（不变量 #1/#5/#6）；
// - Patch-not-Replace：experienceId 不变、trail 不丢、sceneIndex 不变（不变量 #8）。
//
// TASK-0017 扩展纪律（用户冻结）：
// - **扩展现有 FOLLOWUP_REPLAN runtime**，不建立第二套 Replan 系统；
// - 四类意图的差异必须最终体现为 不同 EvidenceDecision / ReplanPlan / Surface / ExperiencePatch / CompositionPatch，
//   不能只是分类标签不同、最终仍走同一路径（§6「一模板四皮肤」禁令）；
// - `verify_historical_relation` 保持 TASK-0016 已验证行为，不得回归；
// - `inspect_evidence` 让 evidence_reveal 成为体验主表达（非开发者式 Inspector）；
// - `explore_temporal_change` 真正改变时间组织与 timeline 表达（非一段说明）；
// - `propose_present_action` 回到 current_map / present context；路线可达性未验证时只能提受约束建议，
//   不得伪装成已验证导航路线（actionStatus = proposal_not_routed，无 turn-by-turn）。

import {
  selectSurfaces,
  type SurfaceSelection,
  type SurfaceType,
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
export type FollowUpIntentKind =
  | "verify_historical_relation"
  | "inspect_evidence"
  | "explore_temporal_change"
  | "propose_present_action"
  | "unknown";

export interface FollowUpIntent {
  kind: FollowUpIntentKind;
  question: string;
  /** 从用户文本抽取的对象实体 id（来自 ENTITY_NAME_ALIASES） */
  objects: string[];
  /** 本切片只支持确定性意图识别 */
  deterministic: boolean;
}

const RELATION_QUERY = /(有关系吗|真的|是否|关联|吗\s*$|\?$)/;
const EVIDENCE_QUERY = /(凭什么|怎么判断|依据|为什么这么判断|这么判断)/;
const TEMPORAL_QUERY = /(后来|发生什么变化|变化|沿革|变迁|演变|时间|年代)/;
const PRESENT_QUERY = /(去现场|现场可以|现在去|看什么|我能看|推荐|怎么逛|逛)/;

/** inspect_evidence 无显式对象时回退到体验主角关系（寺↔桥） */
const DEFAULT_INSPECT_PAIR: [string, string] = ["yihaosi-site", "pujiqiao"];

export function classifyFollowUp(
  question: string,
  aliases: Record<string, string[]> = ENTITY_NAME_ALIASES
): FollowUpIntent {
  const found = Object.entries(aliases)
    .filter(([, names]) => names.some((n) => question.includes(n)))
    .map(([id]) => id);
  const isRelationQuery = RELATION_QUERY.test(question);

  // A：双对象 + 关系问句
  if (found.length >= 2 && isRelationQuery) {
    return { kind: "verify_historical_relation", question, objects: found, deterministic: true };
  }
  // B：证据检视（你凭什么这么判断？）
  if (EVIDENCE_QUERY.test(question)) {
    return { kind: "inspect_evidence", question, objects: found, deterministic: true };
  }
  // C：时间变化（它们后来发生了什么变化？）
  if (TEMPORAL_QUERY.test(question)) {
    return { kind: "explore_temporal_change", question, objects: found, deterministic: true };
  }
  // D：现场行动（那我现在去现场可以看什么？）
  if (PRESENT_QUERY.test(question)) {
    return { kind: "propose_present_action", question, objects: found, deterministic: true };
  }
  // 单对象 + 关系问句仍按 A 处理（证据决策会按对象对处理）
  if (found.length >= 1 && isRelationQuery) {
    return { kind: "verify_historical_relation", question, objects: found, deterministic: true };
  }
  return { kind: "unknown", question, objects: [], deterministic: false };
}

// ---------------------------------------------------------------------------
// 2) EvidenceDecision —— 证据感知决策（按意图分流；只消费既有证据，不编造新事实）
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
  /** TASK-0017：决策类型标记（plan / render 据此分流，杜绝「一模板四皮肤」） */
  decisionKind: FollowUpIntentKind;
  /** B：可解析回 world.relationEvidence 的证据引用（relationKey，不编造） */
  evidenceRefs?: string[];
  /** C：时间证据可用性（只消费已有 evidenced change，不补连续历史） */
  temporal?: { hasEvidencedChanges: boolean; note: string };
  /** D：现场可观察性（非导航；routeVerified 恒 false） */
  present?: { currentEntities: string[]; currentPhotos: number; routeVerified: false };
}

export function decideEvidence(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  switch (intent.kind) {
    case "verify_historical_relation":
      return decideRelation(intent, world);
    case "inspect_evidence":
      return decideInspect(intent, world);
    case "explore_temporal_change":
      return decideTemporal(intent, world);
    case "propose_present_action":
      return decidePresent(intent, world);
    default:
      return decideUnknown(intent, world);
  }
}

// —— A：关系核验（TASK-0016 已验证行为，保持不变）——
function decideRelation(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  const rels = (world.relationEvidence ?? []) as RelationEvidence[];
  if (intent.objects.length < 2) {
    return {
      verdict: "insufficient_for_confirmation",
      supportedEpistemicClass: "UNKNOWN",
      reason: "无法从现有证据确认该历史关系：意图未识别或对象不足。",
      known: [],
      unknown: ["该对象对之间无可用历史关系意图"],
      missingEvidence: ["关系意图与对象"],
      currentAssociationNotHistorical: false,
      decisionKind: "verify_historical_relation",
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
      decisionKind: "verify_historical_relation",
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
      decisionKind: "verify_historical_relation",
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
    decisionKind: "verify_historical_relation",
  };
}

// —— B：证据检视（打开/聚焦当前判断的依据与缺口；不升 epistemic class）——
function decideInspect(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  const rels = (world.relationEvidence ?? []) as RelationEvidence[];
  const [a, b] = intent.objects.length >= 2 ? intent.objects : DEFAULT_INSPECT_PAIR;
  const rel = rels.find(
    (r) => (r.subject === a && r.object === b) || (r.subject === b && r.object === a)
  );
  if (!rel) {
    return {
      verdict: "insufficient_for_confirmation",
      supportedEpistemicClass: "UNKNOWN",
      reason: "当前世界未登记该对象对的可检视关系。",
      known: [],
      unknown: ["无可解析的关系证据"],
      missingEvidence: ["关系证据登记"],
      currentAssociationNotHistorical: false,
      decisionKind: "inspect_evidence",
      evidenceRefs: [],
    };
  }
  // 关键：打开证据不改变 epistemic class（E2 不升 E1）；依据与缺口都来自既有 world 状态。
  const basis = rel.basis;
  return {
    verdict: rel.epistemicClass === "E1" ? "confirmed" : "insufficient_for_confirmation",
    supportedEpistemicClass: rel.epistemicClass, // 不升
    reason: basis,
    known: [basis],
    unknown: rel.isCurrentAssociationOnly ? ["前现代文献是否记载该历史功能关系"] : [],
    missingEvidence: rel.isCurrentAssociationOnly
      ? ["明清方志/寺志中的寺桥关系条目", "1879 县志图说该区域可辨读细节"]
      : [],
    currentAssociationNotHistorical: rel.isCurrentAssociationOnly,
    decisionKind: "inspect_evidence",
    // 可解析回 world.relationEvidence（relationKey 溯源），不编造
    evidenceRefs: rel.relationKey ? [rel.relationKey] : [],
  };
}

// —— C：时间探索（只消费已有 evidenced change；未知年份保持未知；不把现代坐标当历史几何）——
function decideTemporal(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  const has = world.hasEvidencedChanges;
  return {
    verdict: "insufficient_for_confirmation", // 不能确认一条连续历史
    supportedEpistemicClass: "UNKNOWN",
    reason: has
      ? "存在有据的时间变化链（寺与两桥各自沿革），可作为时间主角。"
      : "没有有据的时间变化链。",
    known: has ? ["寺与两桥的建造/存续/重建各有文献支持的变化节点"] : [],
    unknown: ["无年份的对象不得伪造年份", "时间重叠不得写成因果", "现代坐标不得充当历史几何"],
    missingEvidence: [],
    currentAssociationNotHistorical: false,
    decisionKind: "explore_temporal_change",
    temporal: { hasEvidencedChanges: has, note: "只消费已有 evidenced change，不补画连续历史" },
  };
}

// —— D：现场行动（回到 present；只能提受约束观察建议，不得伪装已验证导航）——
function decidePresent(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  const currentEntities = [
    ...(world.currentExactEntities ?? []),
    ...(world.approximateEntities ?? []),
  ];
  const photos = world.currentPhotosConfirmed;
  return {
    verdict: "insufficient_for_confirmation", // 这不是已验证路线
    supportedEpistemicClass: "UNKNOWN",
    reason: "现场观察建议基于已知现代对象与当代影像；路线可达性尚未验证。",
    known: [
      `已知现代对象：${currentEntities.length} 处当前可见（含 ${world.currentExactEntities.length} 处精确点）`,
      photos > 0 ? `当代实景影像 ${photos} 张可用` : "当代实景影像可用性未登记",
    ],
    unknown: ["实地可达性 / 开放时间 / 步行连通性尚未验证"],
    missingEvidence: ["实地踏勘 / 开放信息（须另行核验，不在本体验内声称）"],
    currentAssociationNotHistorical: false,
    decisionKind: "propose_present_action",
    present: { currentEntities, currentPhotos: photos, routeVerified: false },
  };
}

function decideUnknown(intent: FollowUpIntent, world: WorldEvidenceState): EvidenceDecision {
  return {
    verdict: "insufficient_for_confirmation",
    supportedEpistemicClass: "UNKNOWN",
    reason: "未能识别为可处理的追问意图。",
    known: [],
    unknown: ["意图未识别"],
    missingEvidence: ["明确的追问意图"],
    currentAssociationNotHistorical: false,
    decisionKind: "unknown",
  };
}

// ---------------------------------------------------------------------------
// 3) ReplanPlan —— 重新规划体验（surface / 焦点 / 证据焦点 / 不确定可见 / 时空权威 / 行动状态）
//    每个 intent 至少在 §6 所列维度中体现 ≥2 项真实结构差异。
// ---------------------------------------------------------------------------
export interface ReplanPlan {
  intentKind: FollowUpIntentKind;
  focus: string[];
  /** 复用既有 Surface（A→relational_space / B→evidence_reveal / C→timeline / D→current_map） */
  targetSurface: SurfaceType;
  /** 复用既有 Surface 作为次级表达 */
  secondarySurface?: SurfaceType;
  evidenceFocus: string;
  uncertaintyVisible: boolean;
  /** A 专用：关系 epistemic class 保持（E2 不升 E1） */
  relationEpistemicClass?: "E1" | "E2";
  /** 时空权威：A/C 失去；B 证据语境；D 回到 present 持有 */
  spatialAuthority: "historical_lost" | "present_held" | "evidence_only";
  /** 时间焦点：C 强、D 回到 present、其余 none */
  temporalFocus: "none" | "evidenced_changes" | "present";
  /** 行动状态：D = proposal_not_routed（非 verified route） */
  actionStatus: "judgment" | "evidence" | "temporal" | "proposal_not_routed";
  /** 现代坐标失去历史权威：当前坐标不充当历史几何 */
  currentCoordsLoseHistoricalAuthority: boolean;
  nextActions: Array<{ action: string; text: string }>;
}

export function planReplan(decision: EvidenceDecision, intent: FollowUpIntent): ReplanPlan {
  switch (intent.kind) {
    case "verify_historical_relation":
      return planRelation(decision, intent);
    case "inspect_evidence":
      return planInspect(decision, intent);
    case "explore_temporal_change":
      return planTemporal(decision, intent);
    case "propose_present_action":
      return planPresent(decision, intent);
    default:
      return planRelation(decision, intent);
  }
}

// A：关系核验 → relational_space（TASK-0016 已验证）
function planRelation(decision: EvidenceDecision, intent: FollowUpIntent): ReplanPlan {
  const confirmed = decision.verdict === "confirmed" && decision.supportedEpistemicClass === "E1";
  return {
    intentKind: "verify_historical_relation",
    focus: intent.objects,
    targetSurface: "relational_space",
    secondarySurface: "evidence_reveal",
    evidenceFocus: "temple_bridge_association",
    uncertaintyVisible: true,
    relationEpistemicClass: confirmed ? "E1" : "E2",
    spatialAuthority: "historical_lost",
    temporalFocus: "none",
    actionStatus: "judgment",
    currentCoordsLoseHistoricalAuthority: true,
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

// B：证据检视 → evidence_reveal 成为主表达（非开发者式 Inspector）
function planInspect(decision: EvidenceDecision, intent: FollowUpIntent): ReplanPlan {
  const focus = intent.objects.length >= 2 ? intent.objects : DEFAULT_INSPECT_PAIR;
  return {
    intentKind: "inspect_evidence",
    focus,
    targetSurface: "evidence_reveal",
    secondarySurface: "relational_space",
    evidenceFocus: "claim_basis_and_gap",
    uncertaintyVisible: true,
    spatialAuthority: "evidence_only",
    temporalFocus: "none",
    actionStatus: "evidence",
    currentCoordsLoseHistoricalAuthority: false, // 在 present 语境检视证据，坐标不进入历史几何
    nextActions: [
      { action: "open_relation", text: "看关系：回到关系历史空间，确认依据的边界（证据不足仍不确认）" },
      { action: "return_present", text: "回到今天" },
    ],
  };
}

// C：时间探索 → timeline 成为主表达（时间成为主角）
function planTemporal(decision: EvidenceDecision, intent: FollowUpIntent): ReplanPlan {
  const focus = intent.objects.length
    ? intent.objects
    : ["yihaosi-site", "pujiqiao", "wananqiao"];
  return {
    intentKind: "explore_temporal_change",
    focus,
    targetSurface: "timeline",
    secondarySurface: "relational_space",
    evidenceFocus: "evidenced_changes",
    uncertaintyVisible: true,
    spatialAuthority: "historical_lost",
    temporalFocus: "evidenced_changes",
    actionStatus: "temporal",
    currentCoordsLoseHistoricalAuthority: true, // 历史几何仍 absent，现代坐标不升历史权威
    nextActions: [
      { action: "open_evidence", text: "看证据：时间线上的每个节点都来自有据变化，未知年份保持未知" },
      { action: "return_present", text: "回到今天" },
    ],
  };
}

// D：现场行动 → 回到 current_map / present context（建议非导航）
function planPresent(decision: EvidenceDecision, intent: FollowUpIntent): ReplanPlan {
  return {
    intentKind: "propose_present_action",
    focus: intent.objects.length ? intent.objects : ["yihaosi-site", "pujiqiao", "wananqiao"],
    targetSurface: "current_map",
    secondarySurface: "current_photo",
    evidenceFocus: "present_observation_proposal",
    uncertaintyVisible: true,
    spatialAuthority: "present_held",
    temporalFocus: "present",
    actionStatus: "proposal_not_routed", // 明确不是 verified route
    currentCoordsLoseHistoricalAuthority: false, // 我们本就在 present
    nextActions: [
      { action: "open_photo", text: "看今貌照片：先看当代实景，再决定现场看什么" },
      { action: "return_present", text: "回到今天" },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4) 证据感知 Surface 选择（证明 Surface 由 Evidence Decision + Replan 选择，而非固定 beat）
// ---------------------------------------------------------------------------
export function selectReplanSurface(plan: ReplanPlan, world: WorldEvidenceState): SurfaceSelection {
  return selectSurfaces(world, {
    primary: [plan.targetSurface],
    secondary: plan.secondarySurface ? [plan.secondarySurface] : [],
  });
}

// ---------------------------------------------------------------------------
// 5) ExperiencePatch —— 对持续 ExperienceState 的补丁（Patch-not-Replace）
// ---------------------------------------------------------------------------
export interface ReplanExperiencePatch {
  /** 不变：不新建 Experience */
  experienceId: string;
  intentKind: FollowUpIntentKind;
  focus: string[];
  primarySurface: SurfaceType;
  secondarySurface?: SurfaceType;
  evidenceFocus: string;
  uncertaintyVisible: boolean;
  /** A 专用：关系 epistemic class 保持（E2 不升 E1） */
  relationEpistemicClass?: "E1" | "E2";
  /** 行动状态：D = proposal_not_routed */
  actionStatus: "judgment" | "evidence" | "temporal" | "proposal_not_routed";
  spatialAuthority: "historical_lost" | "present_held" | "evidence_only";
  currentCoordsLoseHistoricalAuthority: boolean;
  verdict: EvidenceVerdict;
  nextActions: Array<{ action: string; text: string }>;
  /** B：溯源引用 */
  evidenceRefs?: string[];
  /** D：路线是否验证（恒 false） */
  presentRouteVerified?: boolean;
}

export function buildExperiencePatch(
  plan: ReplanPlan,
  decision: EvidenceDecision,
  experienceId: string
): ReplanExperiencePatch {
  return {
    experienceId,
    intentKind: plan.intentKind,
    focus: plan.focus,
    primarySurface: plan.targetSurface,
    secondarySurface: plan.secondarySurface,
    evidenceFocus: plan.evidenceFocus,
    uncertaintyVisible: plan.uncertaintyVisible,
    relationEpistemicClass: plan.relationEpistemicClass,
    actionStatus: plan.actionStatus,
    spatialAuthority: plan.spatialAuthority,
    currentCoordsLoseHistoricalAuthority: plan.currentCoordsLoseHistoricalAuthority,
    verdict: decision.verdict,
    nextActions: plan.nextActions,
    evidenceRefs: decision.evidenceRefs,
    presentRouteVerified: decision.present?.routeVerified,
  };
}
