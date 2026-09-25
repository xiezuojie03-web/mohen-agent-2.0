// apps/web/app/experience/jinze-water-net/world.ts + beats.ts 合并模块说明见下
//
// 本文件只做两件 presentation 层的事：
// 1) world.ts：把冻结切片/脚本整理为 Evidence-aware Surface Selection 的输入
//    （WorldEvidenceState）——不含任何新事实。
// 2) beats.ts：8 个冻结 semantic states → 5 个 Experience Beats 的表演编排
//    （短发言 / 默认可见单元 / 按需揭示单元 / 主要行动）。
//
// Beat 不是 truth store：它不新增历史事实，不修改证据语义。

import type { BeatDefinition } from "@mohen/experience-engine";
import type { WorldEvidenceState, RelationEvidence } from "@mohen/experience-engine";
import type { SliceShape } from "./surfaces/types";
import type { ExperienceScript } from "@mohen/experience-engine";
import type { CulturalWorldProjection } from "./culturalWorldProjection";

// ---------------------------------------------------------------------------
// 1) World Evidence State（Selection 的唯一输入）
// ---------------------------------------------------------------------------

/**
 * M4.1（EXP-CULTURAL-03）：新增可选第 4 参 `projection`（008 cultural_* 只读投影）。
 *  - 传入时：WorldEvidenceState 获得 008 派生的文化世界字段（culturalEvents /
 *    evidenceFragmentGates / meaningCandidates / presentConnections / relationEvidence[].epistemicStatus），
 *    并把 008 结构化冲突（1265/1267 preserved_open，双值并存）并入 conflicts；
 *  - 缺省时：行为与 M4.1 之前完全一致（旧调用方/旧测试零回归）。
 */
export function buildWorldEvidenceState(
  script: ExperienceScript,
  slice: SliceShape,
  opts: { historicalVisualAssets: number; historicalMapImageAvailable: boolean },
  projection?: CulturalWorldProjection | null
): WorldEvidenceState {
  const currentExact = slice.current_sources
    .filter((a) => a.kind === "provider_current_object_point")
    .map((a) => a.anchor_key);
  const approximate = slice.current_sources
    .filter((a) => a.kind === "provider_current_object_area")
    .map((a) => a.anchor_key);

  const shortKey = (k: string) => k.split("/").pop() ?? k;
  const relationEvidence: RelationEvidence[] = slice.relations.map((r) => ({
    subject: shortKey(r.subject_feature_key),
    object: shortKey(r.object_feature_key),
    predicate: r.predicate,
    epistemicClass: (r.epistemic_class ?? "UNKNOWN") as RelationEvidence["epistemicClass"],
    // M4.1：轴 A 六值（来自 008 cultural_relation_claims），与轴 B epistemicClass 正交。
    // 匹配键 = subject|predicate|object（与 projectCulturalWorldState 的 claimEpistemicByKey 同构）。
    epistemicStatus: projection
      ? projection.claimEpistemicByKey.get(
          `${r.subject_feature_key}|${r.predicate}|${r.object_feature_key ?? ""}`
        )
      : undefined,
    isCurrentAssociationOnly: r.epistemic_class === "E2" && r.predicate === "temple_bridge_association",
    // 可解析回切片关系行的 key（供证据检视溯源；TASK-0017）
    relationKey: r.relation_key,
    basis:
      r.epistemic_class === "E2" && r.predicate === "temple_bridge_association"
        ? "现代 provider 复合 POI（寺与桥同属一个 POI 名）+ 同街地址 → 这是今天的关联，不是前现代文献记载的历史功能关系"
        : r.epistemic_class === "E1"
        ? "存在 E1 据证历史关系（方志/著录记载）"
        : "弱空间线索（相对位置），非确认历史关系",
  }));

  // M4.1：008 结构化冲突（preserved_open 双值）追加进世界冲突集（不静默择一）。
  // script.conflicts（T11-C1/C2）保持原样在前；008 冲突追加在后。
  const conflicts: WorldEvidenceState["conflicts"] = [
    ...script.conflicts.map((c) => ({ ruling: c.ruling, topic: c.topic })),
    ...(projection?.conflicts ?? []),
  ];

  return {
    currentExactEntities: currentExact,
    approximateEntities: approximate,
    hasHistoricalRelations: slice.relations.length > 0,
    relationEvidence,
    hasHistoricalGeometry: false, // 冻结：本切片历史几何 = 0，且 Geometry itself is a Claim
    historicalMapSource: {
      key: "hs/1879/p36",
      status: "HR-MAP-01=PARTIAL_CONFIRM",
      georeferenced: false,
      attributable: false,
      imageAvailable: opts.historicalMapImageAvailable,
    },
    conflicts,
    currentPhotosConfirmed: new Set(
      script.scenes.flatMap((s) => s.visual_assets).filter((a) => a.type === "photo").map((a) => a.id)
    ).size,
    historicalVisualAssets: opts.historicalVisualAssets,
    hasEvidencedChanges: slice.changes.some((c) => c.change_epistemic === "evidenced"),

    // —— M4.1：008 cultural_* 只读投影共字段（不建第二事实真源；未传 projection 时为 undefined）——
    culturalEvents: projection?.culturalEvents,
    evidenceFragmentGates: projection?.evidenceFragmentGates,
    meaningCandidates: projection?.meaningCandidates,
    presentConnections: projection?.presentConnections,
  };
}

// ---------------------------------------------------------------------------
// 2) Beats（presentation layer）
// ---------------------------------------------------------------------------

export interface BeatPresentation extends BeatDefinition {
  /** 墨痕短发言（默认可见，通常 1–2 句） */
  mohen: string[];
  /**
   * 同一 Beat 内不同 scene 想让谁当主角（只是偏好）。
   * 最终仍由 Surface Eligibility 裁决：ineligible 的偏好一律被丢弃。
   */
  preferPrimaryByScene?: Record<string, string[]>;
  /** 默认可见叙事单元（其余默认折叠，行动后揭示） */
  defaultUnitIds: string[];
  /** 需行动才揭示的单元 */
  revealUnitIds: string[];
  /** ActionDock 主要行动（state transition，不是 page link） */
  actions: string[];
  /** 该 Beat 的用户可感知任务 */
  intent: string;
}

const S = (n: string) => `jinze-3min/${n}`;

export const BEATS: BeatPresentation[] = [
  {
    beatId: "beat-01-hook",
    label: "进入现场",
    recipe: "IMMERSIVE_SPATIAL",
    sceneIds: [S("s01-today-hook")],
    primaryPreference: ["current_map"],
    intent: "先看见今天的三处对象，不急着解释",
    mohen: ["两座古桥、一处宋寺遗址，今天为什么离得这么近？"],
    // 问题由 QuestionSurface 承担，不再以文字块重复（避免同句出现两次）；
    // 默认零 narrative block，事实按需揭示
    defaultUnitIds: [],
    revealUnitIds: ["s01-u1", "s01-u2"],
    actions: ["回到它们刚出现的时代"],
  },
  {
    beatId: "beat-02-time-space-shift",
    label: "时间 / 空间转换",
    recipe: "TIME_SHIFT",
    sceneIds: [S("s02-time-travel")],
    primaryPreference: ["relational_space", "timeline"],
    intent: "经历现代坐标失去权威的那一刻",
    mohen: ["再往前，我不能继续用今天的坐标。", "但有一种关系留下来了。"],
    // 坐标退出本身就是内容：这一句必须可见，其余按需
    defaultUnitIds: ["s02-u2"],
    revealUnitIds: ["s02-u1", "s02-u3"],
    actions: ["看留下的关系"],
  },
  {
    beatId: "beat-03-relationship",
    label: "关系发现",
    recipe: "RELATION_DISCOVERY",
    sceneIds: [S("s03-two-bridges-water"), S("s04-temple-enters")],
    primaryPreference: ["relational_space"],
    intent: "先看桥—水—桥，再让寺进入（不自动连线）",
    mohen: ["先看它们和水的关系。", "把寺也放进来。"],
    defaultUnitIds: ["s03-u1"],
    revealUnitIds: ["s03-u2", "s03-u3", "s04-u1", "s04-u2", "s04-u3"],
    // 「寺的位置有多确定？」→ 只切换到 ApproximateAreaSurface（eligible 才生效）
    actions: ["把寺也放进来", "寺与桥有关系吗", "寺的位置有多确定？"],
  },
  {
    beatId: "beat-04-evidence-change",
    label: "证据与时间变化",
    recipe: "EVIDENCE_FOCUS",
    sceneIds: [S("s05-evidence-reveal"), S("s06-change-through-time")],
    primaryPreference: ["conflict_compare", "evidence_reveal", "timeline"],
    intent: "先问为什么不能确定，再逐层揭示；也让时间成为主角",
    mohen: ["为什么不能确定？", "也可以让时间成为主角。"],
    // s06 让时间成为主角（timeline 只在 eligible 时才真的当选）
    preferPrimaryByScene: { [S("s06-change-through-time")]: ["timeline"] },
    defaultUnitIds: [],
    revealUnitIds: ["s05-u1", "s05-u2", "s05-u3", "s05-u4", "s06-u1", "s06-u2", "s06-u3", "s06-u4"],
    actions: ["看第一组分歧", "看第二组分歧", "看时间变化", "看史料原页"],
  },
  {
    beatId: "beat-05-return-next",
    label: "回到今天 · 下一个问题",
    recipe: "RETURN_TO_PRESENT",
    sceneIds: [S("s07-return-today"), S("s08-next-question")],
    primaryPreference: ["current_map", "current_photo", "discovery"],
    intent: "带着问题重新看一次今天，再引出解释与追问",
    mohen: ["现在，再看一次它们。"],
    // s07 回到今天（地图/照片）；s08 交给解释框架（Discovery），但必须由 eligibility 裁决
    preferPrimaryByScene: { [S("s08-next-question")]: ["discovery"] },
    // s08-u1b（主发现）由 DiscoverySurface 以解释框架身份渲染，不再以文字块重复
    defaultUnitIds: ["s08-u2"],
    revealUnitIds: ["s07-u1", "s07-u2", "s08-u1", "s08-u3", "s08-u4"],
    actions: [
      "看今貌照片",
      "了解更多",
      "追问：那颐浩寺和普济桥以前真的有关系吗？",
      "追问：你凭什么这么判断？",
      "追问：它们后来发生了什么变化？",
      "追问：那我现在去现场可以看什么？",
    ],
  },
];

/** 寺↔桥历史功能关系的固定回应（不编造、不升级 E2→E1） */
export const TEMPLE_BRIDGE_NON_ANSWER =
  "还不能。今天它们彼此很近，但我还没有找到寺与桥存在历史功能联系的证据。";
