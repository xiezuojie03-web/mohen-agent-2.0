// apps/web/app/experience/jinze-water-net/humanLabels.ts
//
// EXP-UI-RECON-01（R2–R5）：Human-facing 标签映射（仅展示层，不改引擎 / 数据 / 闸门逻辑）。
//
// 设计铁律：
//   · 默认 Human UI 只显示人话；?inspector=1（devMode）透出内部值，供开发 / 审计诊断。
//   · 不得把候选 / 冲突 / 受约束信息包装成「已证实」。
//   · 本文件不是新架构层，也不是通用设计系统——仅为 R1–R5 复用的极小 helper。
//
// 所有映射都不删除任何内部能力：devMode 路径完整保留 composition.recipe /
// primaryType / LEVEL_LABELS / AD-xx Uxx / eligible·ineligible / 伪公式 / 6 位 raw GPS。

import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";

// —— 叙事单元 level：内部枚举 → 人话（不夸大确定性）——
export const HUMAN_LEVEL_LABELS: Record<NarrativeLevel, string> = {
  FACT_EVIDENCED: "有资料支持",
  FACT_LIMITED: "有限依据（附来源限制）",
  CONFLICT: "两种说法并存（未裁决）",
  QUESTION: "待确认",
  INTERPRETATION_CANDIDATE: "墨痕的解释（尚待证实）",
  UNKNOWN: "未知（缺证据）",
  INTERACTION: "互动提示",
};

export function humanLevelLabel(level: NarrativeLevel, devMode: boolean): string {
  // Inspector 模式透出内部 LEVEL_LABELS；默认 Human UI 只显示人话。
  return devMode ? (LEVEL_LABELS[level] ?? String(level)) : (HUMAN_LEVEL_LABELS[level] ?? String(level));
}

// —— 证据片段闸门 kind：内部 gate 术语 → 人话 ——
export type FragmentKind = "usable" | "forbidden" | "generic";

export function humanFragmentBadge(kind: FragmentKind, devMode: boolean): string {
  if (devMode) {
    return kind === "usable" ? "可用片段" : kind === "forbidden" ? "禁用片段" : "受约束片段";
  }
  return kind === "usable" ? "可引用（有依据）" : kind === "forbidden" ? "暂不采用（依据不足）" : "有条件可用";
}

// —— 008 双值冲突 resolutionStatus 内部枚举 → 人话 ——
const HUMAN_RESOLUTION_STATUS: Record<string, string> = {
  preserved_open: "两值并存",
};

export function humanResolutionStatus(status: string, devMode: boolean): string {
  // Inspector 模式透出内部枚举；默认 Human UI 只显示人话（「· 未裁决」由调用处追加）。
  if (devMode) return status;
  return HUMAN_RESOLUTION_STATUS[status] ?? status;
}

// —— 内部控制语言标记（AD-xx / Uxx / E1-E3 epistemic 枚举）→ 默认模式剥离 / 人话化，Inspector 保留 ——
// 说明（覆盖冻结文本中出现过的全部形态，只删标记、不改语义）：
//   · 「（U5）」「（E1）」        —— 括号内裸标记：整组删除
//   · 「U7（金泽塘走向几何）」    —— 标记 + 括注：保留括注（人话部分），删标记
//   · 「AD-05 U10 禁用：…」      —— 片段闸门 note 前缀：剥离
//   · 「U10：…」「U5：…」        —— 行内编号：剥离
//   · 「E1/E2/E3」               —— epistemic 枚举 → 已证 / 候选级 / 弱线索（与关系图例同一词汇）
//   · 「unresolved」             —— 英文状态词 → 未定
const INTERNAL_PREFIX = /^AD-\d+\s+U\d+\s*禁用：?\s*/;
const BRACKETED_U = /[（(]\s*U\d+\s*[）)]/g;
const U_BEFORE_PAREN = /(^|[^A-Za-z0-9])U\d+\s*(（[^）]*）)/g;
const BRACKETED_E = /[（(]\s*E[123]\s*[）)]/g;
const U_MARKER = /U\d+：/g;
const E_CLASS = /\s*E([123])(?![0-9A-Za-z])/g;
const E_CLASS_HUMAN: Record<"1" | "2" | "3", string> = { "1": "已证", "2": "候选级", "3": "弱线索" };

export function stripInternalPrefix(text: string, devMode: boolean): string {
  if (devMode) return text;
  return text
    .replace(BRACKETED_U, "")
    .replace(U_BEFORE_PAREN, "$1$2")
    .replace(BRACKETED_E, "")
    .replace(/[（(]\s*HR-\d+\s*[）)]/g, "")
    .replace(INTERNAL_PREFIX, "")
    .replace(U_MARKER, "")
    .replace(E_CLASS, (_, d: "1" | "2" | "3") => E_CLASS_HUMAN[d])
    .replace(/unresolved/gi, "未定")
    // 片段闸门 fact 文本内嵌的关系谓词枚举键 → 人话（与关系图/证据检视同一词汇表）
    .replace(/spans_same_waterway/g, "同跨一条水道")
    .replace(/spans_waterway/g, "跨越")
    .replace(/former_site_of/g, "原址即")
    .replace(/named_after/g, "得名于")
    .replace(/temple_bridge_association/g, "关联")
    .replace(/relative_position_south_of/g, "在南");
}

/**
 * scene.uncertainty 专用的 Human-facing 处理：
 * 剥离内部标记后若仍残留系统状态码（ACCEPT_CONFLICT / PARTIAL_CONFIRM / HR-MAP-xx），
 * 视为「无法无损人话化」→ 返回 null（默认 UI 隐藏；?inspector=1 显示原文）。
 */
export function humanUncertainty(text: string, devMode: boolean): string | null {
  if (devMode) return text;
  const stripped = stripInternalPrefix(text, false);
  if (/ACCEPT_CONFLICT|PARTIAL_CONFIRM|HR-MAP-\d+/.test(stripped)) return null;
  return stripped;
}

// —— 内部裁决状态标签：仅 Inspector 透出；默认 UI 改以人话表达冲突本身 ——
export const INTERNAL_ADJUDICATION: Array<{ cls: string; text: string }> = [
  { cls: "tag--unresolved", text: "静默裁决：ineligible" },
  { cls: "tag--confirmed", text: "并列比较：eligible" },
];

// —— Discovery 伪公式：仅 Inspector 透出；默认 UI 改以人话表达 ——
export const DISCOVERY_FORMULA = "Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C interpretation)";
export const DISCOVERY_FORMULA_HUMAN = "三条证据各自成立；把它们合起来怎么解读，还需要独立的判断。";

// —— 默认 UI 的冲突状态人话（替代内部裁决标签）——
export const CONFLICT_STATUS_HUMAN = "两种资料并存，目前不能据此裁定";
// —— 双值冲突页脚人话（替代「双值并存 · 静默裁决：ineligible」）——
export const DUAL_CONFLICT_FOOTER_HUMAN = "双值并存";
