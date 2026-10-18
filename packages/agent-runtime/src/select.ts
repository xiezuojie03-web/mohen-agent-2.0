// packages/agent-runtime/src/select.ts
//
// ADR-003 第 ②+③+④ 层的收口：从「已审核材料」里选下一步，决定主角与墨痕说什么。
//
// 这是导演稿 §4 要求的最小能力中的两条：
//   · 从已有金泽材料里找下一步（不是自由编历史，是在已审核材料里挑最相关的）
//   · 决定下一步让什么成为主角（有时关系、有时时间、有时一份史料、有时今天的照片）
//
// 边界（不得违反）：
//   · 只用传入的 materials，**不得凭空生成材料**；
//   · E2 不升 E1：材料 epistemic 原样透出，由展示层人话化；
//   · 冲突并列，不替用户选边；
//   · 无材料 = 明确说不知道，不许用常识补。

import { llmPolish } from "./llm";
import { toEngineIntent } from "./understand";
import type {
  AgentDecision,
  AgentIntentKind,
  EntityAliases,
  EpistemicTag,
  Material,
  Stage,
  Understanding,
} from "./types";

const EPISTEMIC_WEIGHT: Record<EpistemicTag, number> = {
  FACT_EVIDENCED: 1,
  SUPPORTED_CANDIDATE: 0.7,
  CONFLICTED: 0.6,
  RESEARCH_LEAD: 0.4,
  OPEN_QUESTION: 0.3,
  UNSUPPORTED: 0.2,
  UNKNOWN: 0.1,
};

/** 各类意图关心的材料类型 */
const KIND_BY_INTENT: Record<AgentIntentKind, Material["kind"][]> = {
  relation: ["relation", "claim", "evidence"],
  evidence: ["evidence", "fragment", "conflict"],
  temporal: ["event", "claim"],
  present: ["present", "evidence"],
  place: ["present", "evidence"],
  unknown: [],
};

/** 各意图对应的主角舞台（导演稿：一刻只讲一件事） */
const STAGE_BY_INTENT: Record<AgentIntentKind, { primary: Stage; secondary: Stage | null }> = {
  relation: { primary: "relational_space", secondary: "evidence_reveal" },
  evidence: { primary: "evidence_reveal", secondary: "relational_space" },
  temporal: { primary: "timeline", secondary: "relational_space" },
  present: { primary: "current_map", secondary: "current_photo" },
  place: { primary: "current_photo", secondary: "current_map" },
  unknown: { primary: "unknown_gap", secondary: null },
};

export async function decideStep(
  understanding: Understanding,
  materials: Material[],
  aliases: EntityAliases
): Promise<AgentDecision> {
  const engineIntent = toEngineIntent(understanding.intent);

  // —— 需要澄清：不猜，先问（既有实现是硬返回「未能识别」，这里给可点的问题）——
  if (understanding.intent === "unknown" || understanding.needsClarification) {
    return {
      understanding,
      materials: [],
      engineIntent: "unknown",
      primaryStage: "unknown_gap",
      secondaryStage: null,
      focus: understanding.objects,
      verdict: "cannot_answer",
      mohenLine: "我还不确定你在追哪一条。",
      gaps: ["意图未确定"],
      clarifyQuestion: understanding.clarifyQuestion,
      evidenceRefs: [],
    };
  }

  const wanted = KIND_BY_INTENT[understanding.intent];
  const objects = new Set(understanding.objects);

  const ranked = materials
    .filter((m) => wanted.includes(m.kind))
    .map((m) => ({
      m,
      s:
        m.score * 0.5 +
        EPISTEMIC_WEIGHT[m.epistemic] * 0.35 +
        (objects.size === 0 || m.entityIds.some((e) => objects.has(e)) ? 0.15 : 0),
    }))
    .sort((a, b) => b.s - a.s);

  // P0-1 修复：relation 意图先核验「是否有关系材料覆盖所问对象对」。
  // 所问对象对 = 别名主标签 + 问句切出的实词；一条关系必须同时覆盖它们才算「回答了这条关系」。
  // 有 → 只讲这一条关系（一刻只讲一件事）；没有 → 退回「提到它们的记录」作为待查证线索。
  const askedTokens = dedupe([
    ...understanding.objects.map((o) => aliases[o]?.[0] ?? o),
    ...understanding.terms,
  ]);

  // 导演稿原则：**一刻只讲一件事**。意图的首选材料类型有货时，就只讲那一类 ——
  // 否则会出现「问今天能看什么，前面两条却是地名志和家谱条目」这种措辞与材料错配。
  const preferred = wanted[0];
  let picked: Material[];
  if (understanding.intent === "relation") {
    const hit = ranked.find((r) => r.m.kind === "relation" && coversRelation(r.m, askedTokens));
    picked = hit
      ? [hit.m]
      : ranked.filter((r) => r.m.kind !== "relation").slice(0, 3).map((r) => r.m);
  } else {
    const preferredPicks = ranked.filter((r) => r.m.kind === preferred).slice(0, 3);
    // 「今日联系」是直接回答「今天怎么用/怎么到达」的那类材料：同类里优先讲它，
    // 免得被泛泛的知识上下文摘要顶掉，让用户听到「我还没核验过」而不是材料原话。
    const todayFirst = [...preferredPicks].sort((a, b) => {
      const sa = a.m.sourceRef.includes("今日联系") ? 1 : 0;
      const sb = b.m.sourceRef.includes("今日联系") ? 1 : 0;
      return sb - sa;
    });
    picked = (todayFirst.length ? todayFirst : ranked.slice(0, 3)).map((r) => r.m);
  }
  const stage = STAGE_BY_INTENT[understanding.intent];

  // —— 能否回答：只由材料本身决定 ——
  const hasFact = picked.some((m) => m.epistemic === "FACT_EVIDENCED");
  const hasConflict = picked.some((m) => m.epistemic === "CONFLICTED");
  // P0-1：relation 意图的「answered」必须有关系材料（不能拿任意 FACT 材料冒充关系结论）
  const verdict: AgentDecision["verdict"] =
    understanding.intent === "relation"
      ? picked.some((m) => m.kind === "relation")
        ? "answered"
        : picked.length === 0
          ? "cannot_answer"
          : "partial"
      : picked.length === 0
        ? "cannot_answer"
        : hasFact || hasConflict
          ? "answered"
          : "partial";

  const gaps = buildGaps(picked, understanding.intent);
  const template = buildMohenLine(
    understanding.intent,
    picked,
    gaps,
    aliases,
    understanding.objects
  );

  // 可选润色：只改措辞，且不得引入材料中不存在的年份（越界即回退模板句）
  const polished = await llmPolish(
    template,
    Object.values(aliases).flat(),
    picked.map((m) => m.snippet)
  );

  return {
    understanding,
    materials: picked,
    engineIntent,
    primaryStage: verdict === "cannot_answer" ? "unknown_gap" : stage.primary,
    secondaryStage: stage.secondary,
    focus: understanding.objects.length
      ? understanding.objects
      : dedupe(picked.flatMap((m) => m.entityIds)),
    verdict,
    mohenLine: polished ?? template,
    gaps,
    clarifyQuestion: null,
    evidenceRefs: picked.map((m) => m.id),
  };
}

/** 缺口：把「还不知道什么」讲清楚，不允许沉默 */
function buildGaps(picked: Material[], intent: AgentIntentKind): string[] {
  const gaps: string[] = [];
  if (picked.length === 0) {
    gaps.push("已审核材料里没有能回答这个问题的条目");
    return gaps;
  }
  if (picked.some((m) => m.epistemic === "CONFLICTED")) {
    gaps.push("不同资料记载不一致，这里并列呈现，不替你选边");
  }
  if (picked.some((m) => m.epistemic === "OPEN_QUESTION" || m.epistemic === "RESEARCH_LEAD")) {
    gaps.push("这一条仍是有待查证的方向，不是结论");
  }
  if (intent === "relation" && !picked.some((m) => m.kind === "relation")) {
    gaps.push("没有登记到这条对象对的历史关系");
  }
  // 已有「今日联系」这类发布内容时，不再一律加「不给路线」的兜底缺口：
  // 材料确实写了怎么到达，就不该反过来声明不知道；没写才说没核验。
  const hasTodayConnection = picked.some((m) => m.sourceRef.includes("今日联系"));
  if (intent === "present" && !hasTodayConnection) {
    gaps.push("实地可达性、开放时间、步行连通性尚未核验（这里不给路线）");
  }
  return gaps;
}

/** 墨痕短句模板（确定性，永远可用；LLM 只是可选润色） */
function buildMohenLine(
  intent: AgentIntentKind,
  picked: Material[],
  gaps: string[],
  aliases: EntityAliases,
  objects: string[]
): string {
  const nameOf = (id: string): string => aliases[id]?.[0] ?? id;

  if (picked.length === 0) {
    return "这个问题，已审核的材料里现在还答不了。我不能替材料说话。";
  }

  const first = picked[0];
  // 主语只认「别名表命中的对象」；绝不拿 materials.entityIds 的碎片当主语 ——
  // 那些是从材料文本里按空格切出来的词（如 SPARQL 批量记录里的 "linlaoqiao"），
  // 拿它当主语等于替材料编了一个它没说过的对象。
  const who = objects.length ? objects.slice(0, 2).map(nameOf).join("与") : "它们";

  switch (intent) {
    case "relation": {
      // P0-1：只有选中了「关系材料」才可说有据可依；其余一律是「还没有登记」，
      // 绝不拿任意 FACT 材料冒充关系结论（红线：几何/相邻本身就是主张，材料里没有就不说）。
      // 单对象问句（「万安桥跨的是哪条河」）用「关于X」而非「X之间」，避免「万安桥之间」。
      // 无对象命中时不要说「它们之间」——不替材料编一个它没提到的对象对。
      const whoPhrase =
        objects.length === 0 ? "" : objects.length === 1 ? `关于${nameOf(objects[0])}` : `${who}之间`;
      const rel = picked.find((m) => m.kind === "relation");
      if (rel) return `${whoPhrase}这一条是有据可依的：${rel.snippet}`;
      return objects.length === 0
        ? "材料里还没有登记你问的这条历史关系。下面这几条是可能相关的记录 —— 我只给你看记录，不替它下结论。"
        : `已审核材料里还没有登记${whoPhrase}的历史关系。下面这几条是库里提到它们的记录 —— 我只给你看记录，不替它下结论。`;
    }
    case "evidence":
      return `凭的是这条：${first.snippet}（${first.sourceRef}）。`;
    case "temporal":
      return first.year !== null
        ? `${first.year} 年这一节点是有记载的。往后的变化，我只说有据的部分。`
        : "这条变化没有可靠年份，我不替它编一个。";
    case "present": {
      // 措辞必须跟**实际选中的材料**对得上：库里若只有史料而没有「当下连接」记录，
      // 说「今天能看的是这几处」就是把过去当成现在 —— 那是错配，不是省略。
      // A001 起：若选中的是「今日联系」（D04 依据材料原句发布），就直接把那句话交出去，
      // 不再用「不给你编路线」的兜底话盖住已有记录。
      if (first.sourceRef.includes("今日联系")) {
        return `今天是这样用的：${first.snippet}`;
      }
      const hasPresent = picked.some((m) => m.kind === "present");
      return hasPresent
        ? `今天能看的是这几处。至于怎么走、能不能进，我还没核验过，不给你编路线。`
        : `库里还没有登记「今天能看什么」的实地记录。下面这几条是提到这些地方的史料 —— 那是过去的样子，不是今天的现状。`;
    }
    case "place":
      // 「这是什么样的地方 / 原来是什么」——材料本身就是答案，不再套前缀把它拧成「今天的样子」。
      return first.snippet;
    default:
      return gaps[0] ?? "我还不能回答这个。";
  }
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/** relation 意图：所问对象对（别名主标签 + 切出的实词）是否都被该关系材料覆盖。 */
function coversRelation(m: Material, askedTokens: string[]): boolean {
  if (askedTokens.length === 0) return true;
  const hay = m.snippet;
  return askedTokens.every((t) => hay.includes(t));
}
