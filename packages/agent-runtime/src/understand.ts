// packages/agent-runtime/src/understand.ts
//
// ADR-003 第 ① 层：理解（Understand）
//
// 职责：把用户自由输入 → 结构化 Intent + 对象/时间槽位。
// **不产生任何事实**：只输出结构与槽位，事实由第 ② 层从库里检索。
//
// 两档实现，可降级：
//   L0 确定性 —— 加权打分（不是 first-match 正则），永远可用；
//   L1 LLM    —— 可选；无 key / 超时 / 输出非法时静默降级到 L0。
//
// 与既有 `classifyFollowUp` 的关系：本层是它的**上位增强**，
// 既有函数保留为最终兜底（ADR-003 §8 不建第二套 Replan）。

import type { AgentIntentKind, EngineIntentKind, EntityAliases, Understanding } from "./types";
import { llmUnderstand } from "./llm";

// —— 意图信号词表（加权，命中越多分越高）——
const SIGNALS: Record<Exclude<AgentIntentKind, "unknown">, Array<[RegExp, number]>> = {
  relation: [
    [/有关系|有关联|关联性|相连|相通|一个系统|同一个|是否.*关系/, 3],
    [/为什么这么近|离得这么近|这么近|近/, 2],
    // V1.5：水道/跨越类问句（「万安桥跨的是哪条河」）——真实链已发布 spans_waterway 关系
    [/跨|跨越|跨过|水道|河道|同跨|一条河|哪条河/, 2],
    [/真的吗|是真的|是否|是不是/, 1.5],
    [/关系/, 1.5],
    // A001 扩展（2026-10-18）：身份同一 / 因果归属 / 施作者，都是「两个对象之间是什么关系」
    [/同一(栋|座|幢|处|个)|是同一个|等同|一样吗|算不算同一/, 3],
    [/造成|导致|引起|促成|带来|是不是.*(政策|工程|规划)/, 2.5],
    [/谁(做|建|造|设计|改造|修)|由谁|设计的|改造的|建的/, 2],
  ],
  evidence: [
    [/凭什么|怎么知道|怎么判断|凭啥/, 3],
    [/依据|证据|出处|原文|记载|文献/, 2.5],
    [/可信|相信你|为什么相信|真的假的/, 2],
  ],
  temporal: [
    [/后来|之后|接着|接下来/, 2.5],
    [/变化|沿革|变迁|演变|改过|毁|重建|废/, 2.5],
    [/什么时候|年代|哪一年|时间|历史/, 1.5],
  ],
  present: [
    [/去现场|现场|实地|走一趟|走一段|逛/, 3],
    [/现在去|我现在|今天去看|能看什么|看什么/, 2.5],
    [/路线|怎么走|推荐/, 1.5],
    // A001 扩展：今天怎么进得去、怎么用（入口/通行/停留）
    [/走上去|上去|进去|进入|怎么到|怎么上去|能进|开放|停留|散步|打卡|呆在|坐着/, 2.5],
  ],
  place: [
    [/在哪|哪里|什么地方|位置|多远/, 2.5],
    [/看看|什么样|长什么样|是什么样的/, 2],
    [/这.*地方|这个地方/, 1],
    // A001 扩展：问「原来/前身是什么」——问的是这处场所的前身，不是今天的政策效果
    [/原来|原先|从前|以前|前身|最早|原本/, 2],
  ],
};

const TIME_HINT = /((?:南宋|北宋|元|明|清|民国)|(?:1\d{3}|2\d{3})\s*年?)/;

// —— 检索词切分：把问句切成中文实词 ——
//
// 为什么需要它：别名表只覆盖已知实体（颐浩寺/普济桥/万安桥），
// 而用户会直接说「寺」「桥」「河」「街」这类通名。若只靠别名，
// 未命中别名时检索只能退回「金泽」一个宽词 —— 那不叫检索，叫全表扫描。
//
// 做法：虚词/标点当**分隔符**（而不是删除），保留被它们切开的实词片段；
// 再剔除「关系/证据/变化」这类意图词（它们属于意图层，不是检索对象）。
// 注意：不要把「关于」「关系」这类词拆成单字放进字符类 —— 否则「关」被切掉后
// 剩下「系」会变成一个假检索词（实测教训）。多字虚词必须整词进 SEP_WORDS。
const SEP_WORDS =
  "有没有|是不是|是否|为什么|凭什么|怎么知道|凭啥|怎么样|什么样|什么样|怎么|怎样|如何|什么|哪里|哪个|哪些|多少|之间|这个|那个|这些|那些|告诉|说说|讲讲|一下|可以|它们|真的|到底|究竟|后来|之后|现在|今天|现场|样子|关于|对于|至于|哪条|哪|原来|原先|原本|以前|从前|最早|是不是同一";

const SEP_CHARS =
  "吗呢吧啊呀的了着过和与跟及或还是不是请帮我我想我你它们有会去看到能说讲在对那这，。？！、；：,.?!;:（）()\"'《》\\s一二三四五六七八九十几个座条处点些样么什咋啥凭现";

const SEP = new RegExp(`(${SEP_WORDS}|[${SEP_CHARS}])`, "g");

/**
 * 意图词：属于「怎么问」，不属于「问什么」——不作检索词。
 * 同时充当**二级分隔符**：`颐浩寺后来` 应切成 `颐浩寺`，否则检索词带着动词一起废掉。
 */
const GENERIC = new Set([
  "关系", "关联", "联系", "变化", "沿革", "变迁", "演变",
  // V1.5：跨越动词作二级分隔符（「万安桥跨的是哪条河」须切出「万安桥」而非「万安桥跨」）；
  // 长词在先，避免「跨越」被「跨」切碎后留下「越」残片。
  "跨越", "跨",
  "依据", "证据", "出处", "原文", "记载", "文献", "可信",
  "历史", "年代", "时候", "时间", "后来", "之后", "以前", "从前",
  "现在", "今天", "现场", "位置", "地方", "路线", "实地",
  "情况", "事情", "东西", "问题", "原因", "判断", "结论",
]);

/** 从问句切出候选检索词（中文实词，已剔除虚词与意图词） */
export function extractTerms(q: string): string[] {
  // 两级切分：先用虚词/标点切，再用意图词切（后者能剥离「颐浩寺后来」这类粘连）
  let cut = q.replace(SEP, "|");
  for (const g of GENERIC) cut = cut.split(g).join("|");
  const out: string[] = [];
  for (const raw of cut.split("|")) {
    const t = raw.trim();
    if (!t) continue;
    if (t.length > 6) continue; // 过长多半是整句残片，噪声大于信号
    if (GENERIC.has(t)) continue;
    out.push(t);
  }
  return [...new Set(out)].slice(0, 8);
}

/** L0：确定性理解（加权打分 + 对象抽取 + 时间线索） */
export function understandDeterministic(
  question: string,
  aliases: EntityAliases
): Understanding {
  const q = question.trim();
  const objects = extractObjects(q, aliases);
  const terms = extractTerms(q);
  const timeHint = extractTimeHint(q);

  const scores = {} as Record<Exclude<AgentIntentKind, "unknown">, number>;
  for (const key of Object.keys(SIGNALS) as Array<Exclude<AgentIntentKind, "unknown">>) {
    let s = 0;
    for (const [re, w] of SIGNALS[key]) if (re.test(q)) s += w;
    scores[key] = s;
  }

  const ranked = (Object.entries(scores) as Array<[Exclude<AgentIntentKind, "unknown">, number]>)
    .sort((a, b) => b[1] - a[1]);
  const [topKind, topScore] = ranked[0];
  const secondScore = ranked[1] ? ranked[1][1] : 0;

  // 完全没有信号 → 不猜，转澄清（既有实现是硬返回「未能识别」，这里给出可回答的问句）
  if (topScore <= 0) {
    return {
      intent: "unknown",
      objects,
      terms,
      timeHint,
      confidence: 0,
      source: "deterministic",
      needsClarification: true,
      clarifyQuestion: "你想追哪一条：它们之间的关系、它们后来怎么变、我说这话的依据，还是现在去现场能看什么？",
    };
  }

  // 归一化置信度；与第二名过于接近时也转澄清，避免「假理解」
  const confidence = Math.min(1, topScore / 5);
  const ambiguous = secondScore > 0 && topScore - secondScore < 0.8;

  return {
    intent: topKind,
    objects,
    terms,
    timeHint,
    confidence,
    source: "deterministic",
    needsClarification: ambiguous && confidence < 0.6,
    clarifyQuestion:
      ambiguous && confidence < 0.6
        ? `你说的是「${labelOf(topKind)}」还是「${labelOf(ranked[1][0])}」？`
        : null,
  };
}

function labelOf(kind: Exclude<AgentIntentKind, "unknown">): string {
  switch (kind) {
    case "relation": return "它们之间有没有关系";
    case "evidence": return "我凭什么这么说";
    case "temporal": return "后来发生了什么变化";
    case "present": return "现在去现场能看什么";
    case "place": return "这个地方长什么样";
  }
}

function extractObjects(q: string, aliases: EntityAliases): string[] {
  const found: string[] = [];
  for (const [id, names] of Object.entries(aliases)) {
    if (names.some((n) => q.includes(n))) found.push(id);
  }
  return found;
}

function extractTimeHint(q: string): string | null {
  const m = q.match(TIME_HINT);
  if (!m) return null;
  return m[1].trim();
}

/**
 * 统一入口：先尝试 LLM（可选），失败/不可用则回退 L0。
 * 融合规则：LLM 结果与 L0 一致 → 提置信度；不一致 → 以 L0 为准（确定性优先，可复现）。
 */
export async function understand(
  question: string,
  aliases: EntityAliases
): Promise<Understanding> {
  const base = { ...understandDeterministic(question, aliases), llmResponded: false };
  const llm = await llmUnderstand(question, aliases);
  if (!llm) return base;

  if (llm.intent && llm.intent !== "unknown") {
    if (llm.intent === base.intent) {
      return { ...base, confidence: Math.min(1, base.confidence + 0.2), source: "hybrid", llmResponded: true };
    }
    // L0 完全没信号、LLM 有 → 采信 LLM，但标记来源以便审计
    if (base.intent === "unknown") {
      return {
        ...base,
        intent: llm.intent,
        objects: llm.objects?.length ? llm.objects : base.objects,
        confidence: 0.6,
        source: "llm",
        llmResponded: true,
        needsClarification: false,
        clarifyQuestion: null,
      };
    }
    // 有冲突时不猜：保持 L0，降级为澄清
    return { ...base, needsClarification: true, clarifyQuestion: `你说的是「${labelOf(base.intent as Exclude<AgentIntentKind, "unknown">)}」吗？`, source: "hybrid", llmResponded: true };
  }
  // 模型确实作答但判为 unknown（例如"给我研究方法"这类自由委托）：意图仍以 L0 为准，
  // 但必须留下"模型已接通并作答"的事实，否则上层会误判成模型未接通。
  return { ...base, llmResponded: true };
}

/** 收敛到引擎既有四类（复用 FOLLOWUP_REPLAN，不建第二套） */
export function toEngineIntent(kind: AgentIntentKind): EngineIntentKind {
  return mapEngine(kind);
}

function mapEngine(kind: AgentIntentKind): EngineIntentKind {
  switch (kind) {
    case "relation": return "verify_historical_relation" as const;
    case "evidence": return "inspect_evidence" as const;
    case "temporal": return "explore_temporal_change" as const;
    case "present": return "propose_present_action" as const;
    case "place": return "propose_present_action" as const; // 引擎无「看地方」类，归入回到今天
    default: return "unknown" as const;
  }
}
