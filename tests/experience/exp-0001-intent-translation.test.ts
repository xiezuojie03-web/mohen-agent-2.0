// tests/experience/exp-0001-intent-translation.test.ts — EXP-0001 Human Experience Translation Slice 验收。
//
// 覆盖任务书 §13 / §14 中可由纯函数 + 源码结构核验的不变量：
//   · 四意图收口判断句（frozen primary understanding）正确且两两不同
//   · B 不升 E1、known/missing 来自 runtime（非编造）
//   · C 人话时间总结消费冻结切片、不编造年份
//   · D 2–3 个证据可溯现场观察问题、无 turn-by-turn
//   · Inspector 降为 DEV-only（源码结构：replan-card 被 devInspector 门控；IntentGuide 接入）
//
// 真实浏览器链路（Inspector 隐藏后四 path 仍可读）见 scripts/e2e-exp-0001-human-experience.mjs。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "path";

import {
  classifyFollowUp,
  decideEvidence,
  planReplan,
  type FollowUpIntentKind,
  type EvidenceDecision,
  type ReplanPlan,
  type WorldEvidenceState,
  type ExperienceScript,
  type FollowupPatch,
} from "../../packages/experience-engine/src/index";
import { buildWorldEvidenceState } from "../../apps/web/app/experience/jinze-water-net/beats";
import { translateIntentToExperience } from "../../apps/web/app/experience/jinze-water-net/intentTranslation";
import type { SliceShape } from "../../apps/web/app/experience/jinze-water-net/surfaces/types";

const ROOT = path.resolve(__dirname, "..", "..");
const FROZEN = path.join(ROOT, "apps", "web", "data", "experience");

const script = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-script.json"), "utf8")) as ExperienceScript;
const patch = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-3min-experience-followup-patch.json"), "utf8")) as FollowupPatch;
const slice = JSON.parse(fs.readFileSync(path.join(FROZEN, "jinze-historical-spatial-slice.json"), "utf8")) as SliceShape;

const world: WorldEvidenceState = buildWorldEvidenceState(script, slice, {
  historicalVisualAssets: 0,
  historicalMapImageAvailable: false,
});

const Q = {
  A: "那颐浩寺和普济桥以前真的有关系吗？",
  B: "你凭什么这么判断？",
  C: "它们后来发生了什么变化？",
  D: "那我现在去现场可以看什么？",
} as const;

// frozen 收口判断句（与 intentTranslation.ts 一致，作为契约锚点）
const GUIDE_LEAD: Record<FollowUpIntentKind, string> = {
  verify_historical_relation: "现在还不能确定它们历史上有关系。今天相邻，不等于从前相连。",
  inspect_evidence: "我凭这些材料下判断——依据和缺口都摊开给你看，不替你升一档结论。",
  explore_temporal_change: "它们没有沿着同一条时间线走到今天：有的毁了又建，有的独自延续。",
  propose_present_action: "历史知识能改变你今天看这个地方的方式——带着下面的问题，去现场重新看一次。",
  unknown: "",
};

function derive(kind: keyof typeof Q) {
  const intent = classifyFollowUp(Q[kind]);
  const decision = decideEvidence(intent, world);
  const plan = planReplan(decision, intent);
  const translation = translateIntentToExperience(intent.kind, decision, plan, slice);
  return { intent, decision, plan, translation };
}

describe("EXP-0001 — 四意图收口判断句（frozen primary understanding）", () => {
  it("A/B/C/D 的 guideLead 与冻结契约一致且两两不同", () => {
    const ta = derive("A").translation;
    const tb = derive("B").translation;
    const tc = derive("C").translation;
    const td = derive("D").translation;
    expect(ta.guideLead).toBe(GUIDE_LEAD.verify_historical_relation);
    expect(tb.guideLead).toBe(GUIDE_LEAD.inspect_evidence);
    expect(tc.guideLead).toBe(GUIDE_LEAD.explore_temporal_change);
    expect(td.guideLead).toBe(GUIDE_LEAD.propose_present_action);
    const leads = [ta.guideLead, tb.guideLead, tc.guideLead, td.guideLead];
    expect(new Set(leads).size).toBe(4); // 四意图收口可区分
  });

  it("身份提示（思考方式切换）正确（gap #5）", () => {
    expect(derive("A").translation.identityLabel).toBe("关系核验");
    expect(derive("B").translation.identityLabel).toBe("证据检视");
    expect(derive("C").translation.identityLabel).toBe("时间探索");
    expect(derive("D").translation.identityLabel).toBe("现场建议");
  });
});

describe("EXP-0001 — B 证据检视：已知/缺口来自 runtime，不升档", () => {
  const { decision, translation } = derive("B");
  it("known/missing 非空，且源自 runtime decision（不编造）", () => {
    expect(translation.known && translation.known.length).toBeGreaterThan(0);
    expect(translation.missing && translation.missing.length).toBeGreaterThan(0);
    // known 必须与 decision.known 一致（adapter 不改写事实）
    expect(translation.known).toEqual(decision.known);
  });
  it("B 不升 E1（supportedEpistemicClass 与既有关系一致）", () => {
    expect(decision.supportedEpistemicClass).not.toBe("E1");
    expect(decision.supportedEpistemicClass).toBe("E2");
  });
});

describe("EXP-0001 — C 时间探索：人话总结消费冻结切片，不编造年份", () => {
  const { translation } = derive("C");
  it("temporalSummary 非空，且提到切片既有 evidenced change", () => {
    expect(translation.temporalSummary).toBeTruthy();
    const evidencedLabels = slice.changes
      .filter((c) => c.change_epistemic === "evidenced")
      .map((c) => c.canonical_label);
    expect(evidencedLabels.length).toBeGreaterThan(0);
    // 至少命中一个冻结 change 标签（证明消费真实数据、非凭空生成）
    const hit = evidencedLabels.some((l) => translation.temporalSummary!.includes(l));
    expect(hit).toBe(true);
  });
});

describe("EXP-0001 — D 现场建议：2–3 个证据可溯观察问题，无 turn-by-turn", () => {
  const { translation } = derive("D");
  it("observationPrompts 数量 2–3，且不含导航/逐段文案（proposal_not_routed）", () => {
    expect(translation.observationPrompts).toBeTruthy();
    const n = translation.observationPrompts!.length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(3);
    for (const p of translation.observationPrompts!) {
      expect(p).not.toMatch(/逐段|导航|turn-by-turn|路线|从入口|先去/);
      // 必须可追溯：每个问题都引用「现场/原址/寺址/桥」等具体对象（不是空泛建议）
      expect(p).toMatch(/现场|原址|寺址|桥|相邻/);
    }
  });
  it("D 主角 surface = current_map 且坐标不失去权威（我们本就在 present）", () => {
    expect(translation.emphasisSurface).toBe("current_map");
    expect(translation.coordinateAuthorityLost).toBe(false);
  });
});

describe("EXP-0001 — Inspector 降为 DEV-only（源码结构）", () => {
  const shell = fs.readFileSync(
    path.join(ROOT, "apps", "web", "app", "experience", "jinze-water-net", "ExperienceShell.tsx"),
    "utf8"
  );
  it("replan-card 被 devInspector 门控（普通模式隐藏，硬测试：inspector 消失墨痕仍在）", () => {
    expect(shell).toContain("devInspector");
    // 门控表达式必须包住 replan-card 渲染（replan-card 不再无条件渲染）
    const idxCard = shell.indexOf('data-testid="replan-card"');
    const idxGate = shell.indexOf("devInspector && state.replanPlan");
    expect(idxGate).toBeGreaterThanOrEqual(0);
    expect(idxCard).toBeGreaterThan(idxGate); // gate 在 replan-card 之前
  });
  it("IntentGuide 接入为普通用户主入口（替代 Inspector）", () => {
    expect(shell).toContain('import IntentGuide from "./IntentGuide"');
    expect(shell).toContain("<IntentGuide");
    expect(shell).toContain("translateIntentToExperience");
    // intent-guide 收口层的 testid 在 IntentGuide.tsx 内（组件职责分离）
    const guide = fs.readFileSync(
      path.join(ROOT, "apps", "web", "app", "experience", "jinze-water-net", "IntentGuide.tsx"),
      "utf8"
    );
    expect(guide).toContain('data-testid="intent-guide"');
    expect(guide).toContain('data-testid="intent-guide-lead"');
  });
  it("画布标注意图强调（四 path composition 可区分）", () => {
    expect(shell).toContain('data-intent-experience=');
  });
});
