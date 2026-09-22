// apps/web/lib/mohen-visual/visual-grammar.ts
//
// TASK-0015 §5 — Humanistic Surface Visual Grammar V1。
//
// 本文件只做一件事：把「语义状态」映射为「视觉变量组合」。
//
// 硬规则（§5 / §13）：
//   1) 不含任何镇级 / 对象级事实：无地名、无坐标、无年代、无对象名。
//      本模块可被任意切片复用；本轮以某个最小切片作 fixture 验证，但本文件不感知其具体对象。
//   2) 差异不得只靠 badge 或颜色：每个状态至少组合
//      stroke / strokeWidth / strokeDash / fill / fillOpacity / opacity / prominence / rhythm
//      中的**两种以上**变量（见 distinctVariables）。
//   3) 每个状态必须携带 label / hint —— 语义不依赖颜色即可读（可访问性）。
//   4) 纯函数、确定性：无 Math.random、无 Date.now。

export const VISUAL_GRAMMAR_VERSION = "1.0.0";

/** 语义色板：名称通用（墨 / 纸 / 石绿 / 朱砂 / 雾 / 线 / 水），不含任何对象级含义 */
export const VG_PALETTE = {
  ink: "#1a1a1a",
  paper: "#fffdf7",
  stone: "#4a6741",
  cinnabar: "#9e2b25",
  mist: "#8b9189",
  line: "#c9c2b4",
  water: "#4a6741",
  none: "none",
} as const;

/** 动态节奏：与静态线型（strokeDash）正交的第二个「时间维度」变量 */
export type Rhythm = "none" | "flow" | "stagger" | "quiet-pulse";

/** 视觉变量组合（一个语义状态 = 一组变量，而不是一个颜色） */
export interface VisualToken {
  stroke: string;
  strokeWidth: number;
  /** 线型节奏："" = 实线 */
  strokeDash: string;
  fill: string;
  fillOpacity: number;
  opacity: number;
  /** 视觉权重 0..1：驱动尺寸 / 字重 / 层级 */
  prominence: number;
  rhythm: Rhythm;
  /** 永远存在的短文字标签（遮色可辨） */
  label: string;
  /** 语义说明（图例 / aria） */
  hint: string;
}

/** 参与「差异判据」的变量名（§5：至少两种不同） */
export const VISUAL_VARIABLES = [
  "stroke",
  "strokeWidth",
  "strokeDash",
  "fill",
  "fillOpacity",
  "opacity",
  "prominence",
  "rhythm",
] as const;
export type VisualVariable = (typeof VISUAL_VARIABLES)[number];

/** 两个状态之间真正不同的视觉变量（用于测试：差异不得只靠颜色/badge） */
export function distinctVariables(a: VisualToken, b: VisualToken): VisualVariable[] {
  return VISUAL_VARIABLES.filter((k) => a[k] !== b[k]);
}

// ---------------------------------------------------------------------------
// 1) Epistemic Grammar —— 认知状态
// ---------------------------------------------------------------------------

export type EpistemicState =
  | "EVIDENCE_BACKED" // FACT / EVIDENCE_BACKED
  | "INTERPRETATION_CANDIDATE"
  | "UNKNOWN"
  | "CONFLICT"
  | "EVIDENCE_GAP";

export const EPISTEMIC: Record<EpistemicState, VisualToken> = {
  // 有据：实线 + 粗 + 满不透明 + 高权重 + 墨色实心
  EVIDENCE_BACKED: {
    stroke: VG_PALETTE.ink,
    strokeWidth: 2.4,
    strokeDash: "",
    fill: VG_PALETTE.paper,
    fillOpacity: 1,
    opacity: 0.95,
    prominence: 0.9,
    rhythm: "none",
    label: "有据",
    hint: "有来源支持的陈述",
  },
  // 解释候选：虚线 + 细 + 半透明 + 中权重 + 朱砂（斜体只在文字层）
  INTERPRETATION_CANDIDATE: {
    stroke: VG_PALETTE.cinnabar,
    strokeWidth: 1.6,
    strokeDash: "7 6",
    fill: VG_PALETTE.cinnabar,
    fillOpacity: 0.08,
    opacity: 0.62,
    prominence: 0.55,
    rhythm: "stagger",
    label: "解释候选",
    hint: "墨痕的解释，尚未证实",
  },
  // 未知：点线 + 更细 + 低不透明 + 低权重 + 雾色
  UNKNOWN: {
    stroke: VG_PALETTE.mist,
    strokeWidth: 1.2,
    strokeDash: "2 7",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.45,
    prominence: 0.3,
    rhythm: "none",
    label: "未知",
    hint: "没有证据，也不作推断",
  },
  // 冲突：双划节奏 + 中粗 + 高不透明 + 较高权重 + 朱砂描边（并列，不选边）
  CONFLICT: {
    stroke: VG_PALETTE.cinnabar,
    strokeWidth: 2.0,
    strokeDash: "10 4 2 4",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.85,
    prominence: 0.75,
    rhythm: "stagger",
    label: "冲突 · 并列",
    hint: "两说着录并存，不代用户裁决",
  },
  // 证据缺口：极淡点线 + 最细 + 最低权重（「不画」也是一种画法）
  EVIDENCE_GAP: {
    stroke: VG_PALETTE.line,
    strokeWidth: 1.0,
    strokeDash: "1 9",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.3,
    prominence: 0.2,
    rhythm: "none",
    label: "证据缺口",
    hint: "缺证据，故无关系可画",
  },
};

/** 切片 epistemic_class（E1/E2/E3）→ 认知状态（E2 永不升为 EVIDENCE_BACKED） */
export function epistemicFromClass(cls: string): EpistemicState {
  if (cls === "E1") return "EVIDENCE_BACKED";
  if (cls === "E2") return "INTERPRETATION_CANDIDATE";
  if (cls === "E3") return "CONFLICT"; // 弱线索：只支持相对陈述，与「有据」严格区分
  return "UNKNOWN";
}

// ---------------------------------------------------------------------------
// 2) Spatial Grammar —— 空间角色
// ---------------------------------------------------------------------------

export type NodeRole = "spine" | "crossing" | "node" | "cultural_node" | "approximate_area";
export type RelationRole = "relation_confirmed" | "relation_candidate" | "relation_weak" | "relation_missing";
export type SpatialRole = NodeRole | RelationRole;

export const SPATIAL: Record<SpatialRole, VisualToken> = {
  // 水道＝关系骨架（semantic spine，不是几何）：宽色带 + 流动节奏 + 最高权重
  spine: {
    stroke: VG_PALETTE.water,
    strokeWidth: 1.2,
    strokeDash: "",
    fill: VG_PALETTE.water,
    fillOpacity: 0.14,
    opacity: 1,
    prominence: 1,
    rhythm: "flow",
    label: "骨架",
    hint: "关系空间的水系骨架；不是历史几何",
  },
  // 跨越节点：骑在骨架上的桥——实墨粗描边 + 纸色实心 + 高权重
  crossing: {
    stroke: VG_PALETTE.ink,
    strokeWidth: 2.6,
    strokeDash: "",
    fill: VG_PALETTE.paper,
    fillOpacity: 1,
    opacity: 0.95,
    prominence: 0.85,
    rhythm: "none",
    label: "跨越",
    hint: "跨越骨架的节点",
  },
  // 一般节点：中等实线 + 纸色实心
  node: {
    stroke: VG_PALETTE.ink,
    strokeWidth: 1.8,
    strokeDash: "",
    fill: VG_PALETTE.paper,
    fillOpacity: 0.9,
    opacity: 0.85,
    prominence: 0.6,
    rhythm: "none",
    label: "节点",
    hint: "进入同一探索空间的对象",
  },
  // 文化节点：粗描边 + 暖色淡填充（寺观/遗址类）
  cultural_node: {
    stroke: VG_PALETTE.ink,
    strokeWidth: 2.2,
    strokeDash: "",
    fill: VG_PALETTE.cinnabar,
    fillOpacity: 0.16,
    opacity: 0.9,
    prominence: 0.8,
    rhythm: "quiet-pulse",
    label: "文化节点",
    hint: "可进入、可追问的文化空间",
  },
  // 近似区域：虚线轮廓 + 极淡填充 + 中低权重（无中心精确 marker）
  approximate_area: {
    stroke: VG_PALETTE.stone,
    strokeWidth: 1.4,
    strokeDash: "6 6",
    fill: VG_PALETTE.stone,
    fillOpacity: 0.12,
    opacity: 0.55,
    prominence: 0.45,
    rhythm: "none",
    label: "近似区域",
    hint: "只有范围，没有精确点",
  },
  // 已证关系：实线 + 中粗 + 满不透明
  relation_confirmed: {
    stroke: VG_PALETTE.ink,
    strokeWidth: 2.2,
    strokeDash: "",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.95,
    prominence: 0.8,
    rhythm: "none",
    label: "已证关系",
    hint: "有文献支持的关系",
  },
  // 候选关系：虚线 + 细 + 半透明（可追问，未落定）
  relation_candidate: {
    stroke: VG_PALETTE.cinnabar,
    strokeWidth: 1.5,
    strokeDash: "6 5",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.6,
    prominence: 0.5,
    rhythm: "stagger",
    label: "候选关系",
    hint: "仅有线索，未落定",
  },
  // 弱线索（相对陈述）：点线 + 更细 + 更淡（E3）
  relation_weak: {
    stroke: VG_PALETTE.mist,
    strokeWidth: 1.2,
    strokeDash: "2 6",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.42,
    prominence: 0.32,
    rhythm: "none",
    label: "弱线索",
    hint: "仅相对/拓扑陈述，无坐标",
  },
  // 缺失关系：中断的线（负空间）—— 极淡 + 最细 + 最低权重 + 留白
  relation_missing: {
    stroke: VG_PALETTE.line,
    strokeWidth: 1.1,
    strokeDash: "2 8",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.34,
    prominence: 0.22,
    rhythm: "none",
    label: "无已证实的线",
    hint: "被问到的连接没有证据 —— 这是状态，不是遗漏",
  },
};

/** 关系谓词 + epistemic_class → 空间关系角色 */
export function relationRoleForEpistemic(cls: string): RelationRole {
  if (cls === "E1") return "relation_confirmed";
  if (cls === "E2") return "relation_candidate";
  if (cls === "E3") return "relation_weak";
  return "relation_missing";
}

/** feature_type 词汇 → 节点角色（语义词汇表，与具体对象无关） */
export function nodeRoleForFeatureType(type: string): NodeRole {
  const t = type.toLowerCase();
  if (/water|river|canal|creek|waterway/.test(t)) return "spine";
  if (/bridge|crossing/.test(t)) return "crossing";
  if (/temple|shrine|monastery|church|mosque|site|cultural/.test(t)) return "cultural_node";
  if (/area|zone|district|approx/.test(t)) return "approximate_area";
  return "node";
}

// ---------------------------------------------------------------------------
// 3) Temporal Grammar —— 时间状态
// ---------------------------------------------------------------------------

export type TemporalState =
  | "continuity"
  | "appearance"
  | "change"
  | "destruction"
  | "reconstruction"
  | "unknown"
  | "return_to_present";

export const TEMPORAL: Record<TemporalState, VisualToken> = {
  // 延续：粗实线 + 满不透明 + 高权重
  continuity: {
    stroke: VG_PALETTE.ink,
    strokeWidth: 3.0,
    strokeDash: "",
    fill: VG_PALETTE.paper,
    fillOpacity: 1,
    opacity: 0.95,
    prominence: 0.85,
    rhythm: "none",
    label: "延续",
    hint: "跨越时间持续存在",
  },
  // 出现：中粗实线 + 起点实心标记 + 高不透明
  appearance: {
    stroke: VG_PALETTE.stone,
    strokeWidth: 2.4,
    strokeDash: "",
    fill: VG_PALETTE.stone,
    fillOpacity: 1,
    opacity: 0.9,
    prominence: 0.7,
    rhythm: "none",
    label: "出现",
    hint: "见于着录的起点",
  },
  // 变化：实线 + 间断节奏（加建 / 改制 / 重修）
  change: {
    stroke: VG_PALETTE.stone,
    strokeWidth: 2.2,
    strokeDash: "9 3",
    fill: VG_PALETTE.none,
    fillOpacity: 0,
    opacity: 0.8,
    prominence: 0.65,
    rhythm: "stagger",
    label: "变化",
    hint: "形制/状态改变",
  },
  // 毁损：断裂 —— 短划 + 最粗（醒目）+ 中低不透明（不再是连续生命线）
  destruction: {
    stroke: VG_PALETTE.cinnabar,
    strokeWidth: 3.4,
    strokeDash: "3 6",
    fill: VG_PALETTE.cinnabar,
    fillOpacity: 0.18,
    opacity: 0.7,
    prominence: 0.95,
    rhythm: "stagger",
    label: "毁损",
    hint: "生命线在此中断",
  },
  // 原址重建：双划节奏 + 中粗 + 淡填充（与「延续」明显不同：它不是没断过）
  reconstruction: {
    stroke: VG_PALETTE.stone,
    strokeWidth: 2.4,
    strokeDash: "8 4 2 4",
    fill: VG_PALETTE.stone,
    fillOpacity: 0.2,
    opacity: 0.85,
    prominence: 0.75,
    rhythm: "quiet-pulse",
    label: "原址重建",
    hint: "中断之后在同一处重建",
  },
  // 未知：斜纹占位（不落在时间轴上作断言）+ 极淡
  unknown: {
    stroke: VG_PALETTE.mist,
    strokeWidth: 1.2,
    strokeDash: "2 7",
    fill: VG_PALETTE.mist,
    fillOpacity: 0.08,
    opacity: 0.4,
    prominence: 0.28,
    rhythm: "none",
    label: "未知",
    hint: "不作时间断言；未知可合法占据时间结构",
  },
  // 回到今天：满不透明 + 高权重 + 朱砂端点
  return_to_present: {
    stroke: VG_PALETTE.cinnabar,
    strokeWidth: 2.6,
    strokeDash: "",
    fill: VG_PALETTE.cinnabar,
    fillOpacity: 1,
    opacity: 1,
    prominence: 0.9,
    rhythm: "quiet-pulse",
    label: "回到今天",
    hint: "时间结构的当代终点",
  },
};

/**
 * 由切片自带的措辞判定时间状态（只对已有文本分类，不生成新事实）。
 * 命中顺序固定（毁 > 重建 > 变化 > 出现），确定性。
 */
export function temporalStateFromWording(text: string): TemporalState | null {
  if (/毁|废|拆|塌|焚|destroy|demolish|ruin/i.test(text)) return "destruction";
  if (/重建|修复|重修|原址|rebuil|restore|reconstruct/i.test(text)) return "reconstruction";
  if (/加建|改建|改制|升|移|change|extend|add/i.test(text)) return "change";
  if (/创建|始建|建|置|设|found|built|establish/i.test(text)) return "appearance";
  return null;
}

// ---------------------------------------------------------------------------
// 4) Composition / Depth Grammar —— 构图层级
// ---------------------------------------------------------------------------

export type DepthState = "primary" | "secondary" | "context" | "emerging" | "fading" | "inactive";

export interface DepthModifier {
  opacityScale: number;
  prominenceScale: number;
  strokeScale: number;
  rhythm: Rhythm;
  label: string;
  hint: string;
}

export const DEPTH: Record<DepthState, DepthModifier> = {
  primary: { opacityScale: 1, prominenceScale: 1, strokeScale: 1, rhythm: "none", label: "主角", hint: "此刻的视觉主角" },
  secondary: { opacityScale: 0.78, prominenceScale: 0.7, strokeScale: 0.9, rhythm: "none", label: "次层", hint: "退让但存在" },
  context: { opacityScale: 0.5, prominenceScale: 0.45, strokeScale: 0.75, rhythm: "none", label: "语境", hint: "背景层" },
  emerging: { opacityScale: 0.9, prominenceScale: 0.8, strokeScale: 0.95, rhythm: "quiet-pulse", label: "正在进入", hint: "刚刚被放进来" },
  fading: { opacityScale: 0.3, prominenceScale: 0.3, strokeScale: 0.7, rhythm: "none", label: "正在退出", hint: "正在失去作证资格" },
  inactive: { opacityScale: 0.28, prominenceScale: 0.2, strokeScale: 0.65, rhythm: "none", label: "静默", hint: "不在本刻的视线内" },
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** 把构图层级施加到一个语义状态上（确定性缩放） */
export function withDepth(token: VisualToken, depth: DepthState): VisualToken {
  const d = DEPTH[depth];
  return {
    ...token,
    opacity: r3(token.opacity * d.opacityScale),
    prominence: r3(token.prominence * d.prominenceScale),
    strokeWidth: r3(token.strokeWidth * d.strokeScale),
    rhythm: d.rhythm === "none" ? token.rhythm : d.rhythm,
  };
}

/** 聚焦：非聚焦元素统一降为 context（focus 转移不改语义，只改层级） */
export function emphasisFor(focusKey: string | null | undefined, key: string): DepthState | null {
  if (!focusKey) return null;
  return focusKey === key ? "primary" : "context";
}

/** rhythm → CSS class（动态节奏是第二个变量，不只是线型） */
export function rhythmClass(r: Rhythm): string {
  return r === "none" ? "vg-r-none" : `vg-r-${r}`;
}

/** 语义状态的可访问文字标签（颜色失效时仍可读） */
export function labelOf(token: VisualToken): string {
  return token.label;
}

/** 供图例使用的最小状态集合（有序，确定性） */
export const EPISTEMIC_ORDER: EpistemicState[] = [
  "EVIDENCE_BACKED",
  "INTERPRETATION_CANDIDATE",
  "UNKNOWN",
  "CONFLICT",
  "EVIDENCE_GAP",
];
export const SPATIAL_NODE_ORDER: NodeRole[] = ["spine", "crossing", "cultural_node", "node", "approximate_area"];
export const SPATIAL_RELATION_ORDER: RelationRole[] = [
  "relation_confirmed",
  "relation_candidate",
  "relation_weak",
  "relation_missing",
];
export const TEMPORAL_ORDER: TemporalState[] = [
  "continuity",
  "appearance",
  "change",
  "destruction",
  "reconstruction",
  "unknown",
  "return_to_present",
];

/** Visual Grammar 覆盖的语义状态总数（供 result 报告量化） */
export const SEMANTIC_STATE_COUNT =
  EPISTEMIC_ORDER.length + SPATIAL_NODE_ORDER.length + SPATIAL_RELATION_ORDER.length + TEMPORAL_ORDER.length + 6;

/** 由 VisualToken 派生可用于 SVG 的样式（保持单一真源） */
export function svgStyle(t: VisualToken): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  fill: string;
  fillOpacity: number;
  opacity: number;
} {
  return {
    stroke: t.stroke,
    strokeWidth: t.strokeWidth,
    strokeDasharray: t.strokeDash || undefined,
    fill: t.fill,
    fillOpacity: t.fillOpacity,
    opacity: t.opacity,
  };
}
