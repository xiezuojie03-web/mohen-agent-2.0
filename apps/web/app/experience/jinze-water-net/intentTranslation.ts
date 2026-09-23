// apps/web/app/experience/jinze-water-net/intentTranslation.ts
//
// EXP-0001 — Human Experience Translation Adapter（frozen fixture/adapter）。
//
// 纪律（任务书 §2 / §5 / §8 / §10）：
//   · 本模块**只读** runtime state（followUpIntent / evidenceDecision / replanPlan）
//     + 冻结 slice / world，**生成「人类可感知收口」**；
//   · **不修改** runtime contract、不新增事实、不提升 epistemic class；
//   · 所有「人话」均来自冻结意图的 primary understanding（任务书 §4 A/B/C/D）
//     或来自冻结 slice 的 evidenced changes —— 不为演示伪造任何年份 / 几何 / 关系。
//
// 这是「适配器」不是「第二套 Runtime」：Surface 选择仍由 runtime 的
// selectReplanSurface 决定（A→relational_space / B→evidence_reveal /
// C→timeline / D→current_map），本模块只负责把 runtime 输出翻译成用户能秒懂的收口。

import type { FollowUpIntentKind, EvidenceDecision, ReplanPlan, WorldEvidenceState } from "@mohen/experience-engine";
import type { SliceShape } from "./surfaces/types";

/** EXP-0001 人类体验翻译描述（纯展示输入，不含任何历史真相判定） */
export interface IntentExperienceTranslation {
  intentKind: FollowUpIntentKind;
  /** 轻量「思考方式」身份提示（解决 TASK-0017 USER_SENSORY_GAP #5：缺思考方式切换感） */
  identityLabel: string;
  identityBlurb: string;
  /** 收口判断句（frozen primary understanding，是判断边界而非新事实） */
  guideLead: string;
  /** B：已知 / 仍缺（人话，不升档） */
  known?: string[];
  missing?: string[];
  /** C：人话时间总结（gap #3：缺「寺毁于 X、桥在 Y 重建」口语总结） */
  temporalSummary?: string;
  /** D：2–3 个证据可溯的现场观察问题（gap #4：受约束建议 + 可行动性） */
  observationPrompts?: string[];
  /** 下一步探索建议（人话，对应 replanPlan.nextActions 中的探索项） */
  exploreHint?: string;
  /** 退出提示（回到今天，非内部 label） */
  returnHint: string;
  /** 主角 surface（复用 runtime 选择，不得新造） */
  emphasisSurface: string;
  /** 当前坐标是否失去历史权威（用于收口提示，非内部 testid） */
  coordinateAuthorityLost: boolean;
}

// frozen 身份标签（任务书 §4 四意图首要理解）
const IDENTITY: Record<FollowUpIntentKind, { label: string; blurb: string }> = {
  verify_historical_relation: { label: "关系核验", blurb: "你在问：它们历史上有没有关系？" },
  inspect_evidence: { label: "证据检视", blurb: "你在问：我凭什么这么判断？" },
  explore_temporal_change: { label: "时间探索", blurb: "你在问：它们后来怎么变？" },
  propose_present_action: { label: "现场建议", blurb: "你在问：今天去现场看什么？" },
  unknown: { label: "未识别", blurb: "未能识别为可处理的追问。" },
};

// frozen 收口判断句（任务书 §4 A/B/C/D 首要理解；均为判断边界，不引入新事实）
const GUIDE_LEAD: Record<FollowUpIntentKind, string> = {
  verify_historical_relation: "现在还不能确定它们历史上有关系。今天相邻，不等于从前相连。",
  inspect_evidence: "我凭这些材料下判断——依据和缺口都摊开给你看，不替你升一档结论。",
  explore_temporal_change: "它们没有沿着同一条时间线走到今天：有的毁了又建，有的独自延续。",
  propose_present_action: "历史知识能改变你今天看这个地方的方式——带着下面的问题，去现场重新看一次。",
  unknown: "这个问题我还没法用现有证据接住。",
};

function shortKey(key: string): string {
  return key.split("/").pop() ?? key;
}

// C：人话时间总结（gap #3）——只消费切片已有 evidenced changes，不编造年份
function buildTemporalSummary(slice: SliceShape): string {
  const lines = slice.changes
    .filter((c) => c.change_epistemic === "evidenced")
    .map((c) => {
      const label = c.canonical_label;
      const from = c.from_state;
      const to = c.to_state;
      const hint = c.time_hint || "";
      return `${label}：${from}→${to}${hint ? `（${hint}）` : ""}`;
    });
  if (lines.length === 0) return "目前没有可据的时间变化可讲。";
  return lines.join("；");
}

// D：2–3 个证据可溯的现场观察问题（gap #4）——只引用 slice 已知 evidenced change，不导航、不编造可达性
function buildObservationPrompts(slice: SliceShape): string[] {
  const evidenced = slice.changes.filter((c) => c.change_epistemic === "evidenced");
  const prompts: string[] = [];
  // 每个有据变化 → 一个「带着史料去现场看」的观察问题（可追溯，不编造开放时间/路线）
  for (const c of evidenced.slice(0, 3)) {
    const label = c.canonical_label;
    const to = c.to_state;
    if (/重建|毁/.test(c.from_state + c.to_state)) {
      prompts.push(`在原址看「${label}」${to}的边界，想象它${c.from_state}之前的规模——毁与建之间，寺桥的「相邻」跨越了不同年代。`);
    } else {
      prompts.push(`在「${label}」现场看它${to}的痕迹，把它和今天仍相邻的对象对照，理解它们各自如何走到今天。`);
    }
  }
  // 数量保底 2 条（任务书 §14-14）；不足时补一条通用的「带着关系问题去现场」
  if (prompts.length === 0) {
    prompts.push("在寺址与桥之间走一次，体会今天的「相邻」与历史上「是否相连」是两件事。");
  }
  return prompts.slice(0, 3);
}

/**
 * 把 runtime 四意图输出翻译成人类可感知体验（frozen fixture/adapter）。
 * 不读取 frozen answer JSON；只消费 runtime state + 冻结 slice/world。
 */
export function translateIntentToExperience(
  intentKind: FollowUpIntentKind,
  decision: EvidenceDecision,
  plan: ReplanPlan,
  slice: SliceShape
): IntentExperienceTranslation {
  const id = IDENTITY[intentKind] ?? IDENTITY.unknown;
  const t: IntentExperienceTranslation = {
    intentKind,
    identityLabel: id.label,
    identityBlurb: id.blurb,
    guideLead: GUIDE_LEAD[intentKind] ?? GUIDE_LEAD.unknown,
    returnHint: plan.nextActions.find((a) => a.action === "return_present")?.text ?? "回到今天",
    emphasisSurface: plan.targetSurface,
    coordinateAuthorityLost: plan.currentCoordsLoseHistoricalAuthority,
  };

  // B：已知 / 仍缺（人话，不升档）
  if (intentKind === "inspect_evidence") {
    t.known = decision.known;
    t.missing = [...new Set([...decision.unknown, ...decision.missingEvidence])];
  }
  // C：人话时间总结
  if (intentKind === "explore_temporal_change") {
    t.temporalSummary = buildTemporalSummary(slice);
  }
  // D：2–3 个证据可溯现场观察问题
  if (intentKind === "propose_present_action") {
    t.observationPrompts = buildObservationPrompts(slice);
  }
  // 下一步探索建议（取第一个非「回到今天」的 nextAction，作为墨痕的继续探索引导）
  const explore = plan.nextActions.find((a) => a.action !== "return_present");
  if (explore) t.exploreHint = explore.text;
  return t;
}
