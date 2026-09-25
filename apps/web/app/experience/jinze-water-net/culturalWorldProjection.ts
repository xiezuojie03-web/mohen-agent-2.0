// apps/web/app/experience/jinze-water-net/culturalWorldProjection.ts
//
// M4.1（EXP-CULTURAL-03）· Projection Reader（只读派生层）。
//
// 职责（单一，不可改变）：把 008 cultural_* 第一簇（jinze-min-001）投影为体验可消费的
// CulturalWorldProjection。它 **只读** 入参 `source`，**不回写 008**、**不复制成第二套事实存储**。
//
// 物源纪律：
//   · 008 cultural_*（Supabase）是唯一事实真源；
//   · 本模块的入参 `source` 是 008 第一簇的「只读投影副本」（frozen JSON，与 jinze-historical-spatial-slice.json
//     同性质——它们都是从真源导出的体验端读副本，不是事实真源）；
//   · 本模块是纯函数：幂等、可重跑，对相同入参永远产出相同出参（T-01）。
//
// 六值 SOT：epistemic_status 严格沿用 ADR-002 + migration 008 CHECK 的六值
// （SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION）。
// INTERPRETIVE 不是六值之一，它仅属 Meaning/Expression 层 tone（migration 008 line 90 强制 INTERPRETIVE tone）。

import type {
  SixValue,
  CulturalEventProjection,
  EvidenceFragmentGate,
  MeaningCandidateProjection,
  PresentConnectionProjection,
  WorldConflict,
} from "@mohen/experience-engine";

/** 008 cultural_* 第一簇的只读投影副本（体验端读源；非事实真源） */
export interface CulturalWorldProjectionSource {
  slice_id: string;
  events: Array<{
    event_id: string;
    canonical_label: string;
    time_scope_start: string | null;
    time_scope_end: string | null;
    time_scope_unknown?: boolean;
    epistemic_status: SixValue;
    evidence_fragment_ids: string[];
  }>;
  claims: Array<{
    claim_id: string;
    subject_feature_key: string;
    predicate: string;
    object_feature_key: string | null;
    object_value: string | null;
    epistemic_status: SixValue;
  }>;
  meanings: Array<{
    meaning_id: string;
    subject_feature_key: string;
    interpretive_text: string;
    derived_from_claim_ids: string[];
    epistemic_status: SixValue;
  }>;
  presents: Array<{
    present_id: string;
    subject_feature_key: string;
    connection_type: string;
    observed_state: string;
    basis_claim_ids: string[];
    open_questions: string[];
  }>;
  fragments: Array<{
    fragment_id: string;
    span_type: "hr4_usable" | "u10_forbidden" | "generic";
    quote_fragment: string;
    usable_for_claim: string | null;
    usage_note: string | null;
  }>;
  conflicts: Array<{
    conflict_key: string;
    subject_feature_key: string;
    primary_value: string;
    conflicted_value: string;
    source_of_conflict: string;
    resolution_status: string;
  }>;
}

/** 008 claim 的六值真值，按 subject|predicate|object 建索引，供 buildWorldEvidenceState 给 relationEvidence 补轴 A */
export type ClaimEpistemicIndex = Map<string, SixValue>;

/** projectCulturalWorldState 的输出：体验消费的投影字段集合 */
export interface CulturalWorldProjection {
  sliceId: string;
  culturalEvents: CulturalEventProjection[];
  evidenceFragmentGates: EvidenceFragmentGate[];
  meaningCandidates: MeaningCandidateProjection[];
  presentConnections: PresentConnectionProjection[];
  /** subject|predicate|object → 六值（轴 A），供 relationEvidence 补 epistemicStatus */
  claimEpistemicByKey: ClaimEpistemicIndex;
  /** 008 结构化冲突（双值并存，preserved_open） */
  conflicts: WorldConflict[];
}

/** 规范化关系键：subject|predicate|object（object 取 feature_key，无则取 value） */
function relKey(subject: string, predicate: string, obj: string | null, val: string | null): string {
  const o = obj ?? val ?? "";
  return `${subject}|${predicate}|${o}`;
}

/** 时间窗文本：未知必须显式 UNKNOWN，不伪造年代 */
function timeScope(start: string | null, end: string | null, unknown?: boolean): string {
  if (unknown) return "未知";
  if (start && end && start !== end) return `${start}-${end}`;
  return start ?? end ?? "未知";
}

/**
 * 只读投影：008 cultural_* 第一簇 → 体验投影字段。
 * 纯函数：同入参恒同出参（T-01 幂等）。
 */
export function projectCulturalWorldState(
  sliceId: string,
  source: CulturalWorldProjectionSource
): CulturalWorldProjection {
  const culturalEvents: CulturalEventProjection[] = source.events.map((e) => ({
    event_id: e.event_id,
    label: e.canonical_label,
    time_scope: timeScope(e.time_scope_start, e.time_scope_end, e.time_scope_unknown),
    epistemic_status: e.epistemic_status,
    evidence_fragment_ids: e.evidence_fragment_ids,
  }));

  const evidenceFragmentGates: EvidenceFragmentGate[] = source.fragments.map((f) => ({
    fragment_id: f.fragment_id,
    span_type: f.span_type,
    usable_for_claim: f.usable_for_claim,
    usage_note: f.usage_note,
  }));

  const meaningCandidates: MeaningCandidateProjection[] = source.meanings.map((m) => ({
    meaning_id: m.meaning_id,
    subject: m.subject_feature_key,
    interpretive_text: m.interpretive_text,
    derived_from_claim_ids: m.derived_from_claim_ids,
    epistemic_status: m.epistemic_status,
    // tone 由 expression_rule 派生为 INTERPRETIVE（解释层，非 status）—— 与六值正交
    tone: "INTERPRETIVE",
  }));

  const presentConnections: PresentConnectionProjection[] = source.presents.map((p) => ({
    present_id: p.present_id,
    type: p.connection_type,
    observed_state: p.observed_state,
    basis_claim_ids: p.basis_claim_ids,
    open_questions: p.open_questions,
  }));

  // 008 claim 六值索引（轴 A），供 relationEvidence 补 epistemicStatus
  const claimEpistemicByKey: ClaimEpistemicIndex = new Map();
  for (const c of source.claims) {
    claimEpistemicByKey.set(
      relKey(c.subject_feature_key, c.predicate, c.object_feature_key, c.object_value),
      c.epistemic_status
    );
  }

  // 008 结构化冲突：双值并存 + preserved_open，不静默择一
  const conflicts: WorldConflict[] = source.conflicts.map((c) => ({
    ruling: c.conflict_key,
    topic: `普济桥建造年代（${c.conflicted_value} vs ${c.primary_value}）`,
    primaryValue: c.primary_value,
    conflictedValue: c.conflicted_value,
    resolutionStatus: c.resolution_status,
    dualValue: true,
    source: "008/cultural_conflicts",
  }));

  return {
    sliceId,
    culturalEvents,
    evidenceFragmentGates,
    meaningCandidates,
    presentConnections,
    claimEpistemicByKey,
    conflicts,
  };
}

// ---------------------------------------------------------------------------
// 表达边界辅助（纯函数，可测）：把 fragment gate 转成 Drawer 可消费的项。
//  · hr4_usable → 可显（正向，但仍是「据方志记载」的解释性可用片段，受 claim 约束）
//  · u10_forbidden → 禁正向事实：只作为「禁用边界标记」出现，fact 恒为 null
//  · generic → 受 claim/usage 约束地呈现
// ---------------------------------------------------------------------------
export type FragmentGateDisplayKind = "usable" | "forbidden" | "generic";

export interface FragmentGateDisplayItem {
  fragment_id: string;
  span_type: EvidenceFragmentGate["span_type"];
  kind: FragmentGateDisplayKind;
  /** 仅 hr4_usable 携带正向可用说明；u10_forbidden 恒为 null（不形成任何正向事实） */
  fact: string | null;
  /** u10_forbidden 的边界说明（说明「为何不作为事实」） */
  forbiddenNote: string | null;
  usage_note: string | null;
}

export function fragmentGateDisplayItems(
  gates: EvidenceFragmentGate[]
): FragmentGateDisplayItem[] {
  return gates.map((g) => {
    if (g.span_type === "u10_forbidden") {
      // 关键防火墙：u10_forbidden 不得形成任何正向事实表达
      return {
        fragment_id: g.fragment_id,
        span_type: g.span_type,
        kind: "forbidden",
        fact: null,
        forbiddenNote: g.usage_note ?? "该片段仅见于非权威转载、无官方文号，不得作为事实呈现",
        usage_note: g.usage_note,
      };
    }
    if (g.span_type === "hr4_usable") {
      return {
        fragment_id: g.fragment_id,
        span_type: g.span_type,
        kind: "usable",
        // 可显，但仍标注为「据方志记载」的解释性可用片段，受 claim 约束（不升为无条件事实）
        fact: g.usable_for_claim,
        forbiddenNote: null,
        usage_note: g.usage_note,
      };
    }
    return {
      fragment_id: g.fragment_id,
      span_type: g.span_type,
      kind: "generic",
      fact: null,
      forbiddenNote: null,
      usage_note: g.usage_note,
    };
  });
}

/** 单一真源提取：所有 presentConnections 的开放问题（U10 等）平铺为体验表达源 */
export function presentOpenQuestions(world: {
  presentConnections?: PresentConnectionProjection[];
}): string[] {
  return (world.presentConnections ?? []).flatMap((p) => p.open_questions);
}
