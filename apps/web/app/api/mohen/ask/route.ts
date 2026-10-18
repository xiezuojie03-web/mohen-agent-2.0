// apps/web/app/api/mohen/ask/route.ts
//
// ADR-003 第 ①+②+③+④ 层的服务端收口：理解 → 检索 → 裁决 → 编排。
//
// 这是导演稿 §4 要求的「真正墨痕最小能力」的服务端实现：
//   · 听懂用户此刻在追什么（understand：L0 确定性 / L1 LLM 可选）
//   · 从已审核金泽材料里找下一步（retrieveMaterials：运行期只读检索）
//   · 决定下一步让什么成为主角（decideStep：选主角 + 选材料）
//   · 守住边界（无材料 = 说不知道；冲突并列；档位只降不升）
//
// **本 route 不产生事实**：所有回答内容只能来自检索到的 materials。
// LLM（若配置了 key）只参与「意图判读」与「措辞润色」，且不通过事实护栏就不采用。

import { NextResponse } from "next/server";
import { understand, decideStep, type EntityAliases, type AgentDecision } from "@mohen/agent-runtime";
import { retrieveMaterials } from "../../../../lib/mohen-agent/retrieve";
import { isRateLimited, getCached, setCache, getClientSource } from "../../../../lib/mohen-agent/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}

/**
 * 主题风险守卫：只降不升。
 * 命中「用户问的是同一性/因果」而「材料给的只是软关联/共现」时，把结论降为 partial 并补边界说明。
 * 不改写材料、不新增史料、不做额外检索；没有命中就原样返回。
 */
interface RiskGuard {
  id: string;
  /** 用户在追什么（同一性/因果） */
  asked: RegExp;
  /** 材料实际给出的关系措辞（软关联/共现）；省略表示「只要这样问就补边界」 */
  materialSoft?: RegExp;
  gap: string;
}

const RISK_GUARDS: Record<string, RiskGuard[]> = {
  a001: [
    {
      id: "identity",
      asked: /同一(栋|座|幢|处|个)|是同一个|等同|一样吗|算不算同一/,
      materialSoft: /前身可追溯到|可追溯至|来源于|源自/,
      gap: "材料只说「前身可追溯到 1920 年怡和冷库」。这是来源上的软性溯源，不是「同一栋建筑连续存在」的证据，所以不能答成「是同一栋楼」。",
    },
    {
      id: "causality",
      // 因果：A001 生产链已把「贯通工程→改造」登记为未证（open_questions），
      // 因此只要用户追问因果，就必须补这条边界，无论检索到的是哪类材料。
      asked: /造成|导致|引起|促成|带来|是不是.*(政策|工程|规划)/,
      gap: "同属一片滨江、彼此紧邻，都是空间关系，不是因果。材料没有记载这处改造是由贯通工程直接造成的。",
    },
  ],
};

function applyRiskGuards(topic: string, question: string, decision: AgentDecision): AgentDecision {
  const guards = RISK_GUARDS[topic];
  if (!guards || decision.verdict === "cannot_answer") return decision;

  const hitGaps: string[] = [];
  for (const g of guards) {
    if (!g.asked.test(question)) continue;
    // 有 materialSoft 的守卫生效条件：材料其实只给了软关联/共现；
    // 没有 materialSoft 的守卫（因果）只要这样问就必须补边界。
    if (g.materialSoft && !decision.materials.some((m) => g.materialSoft!.test(m.snippet))) continue;
    if (!decision.gaps.includes(g.gap)) hitGaps.push(g.gap);
  }
  if (!hitGaps.length) return decision;
  return { ...decision, verdict: "partial", gaps: [...hitGaps, ...decision.gaps] };
}

/** 金泽切片对象别名（与世界模型当前实体对齐；后续应由切片/库注入，此处为最小集）。
 *  V1.5：补 迎祥桥/金泽/白苎里/吕颐浩/颐浩寺遗址全称 与临时水道实体及其着录别名
 *  （金泽塘/秀州塘/市河——T11-C2 登记的三种着录，使「跨的是哪条河」类问句可命中）。 */
const JINZE_ALIASES: EntityAliases = {
  "yihaosi-site": ["颐浩寺", "颐浩", "颐浩寺遗址"],
  pujiqiao: ["普济桥", "普济"],
  wananqiao: ["万安桥", "万安"],
  yingxiangqiao: ["迎祥桥", "迎祥"],
  jinze: ["金泽"],
  baizhuli: ["白苎里", "白苧里"],
  "lv-yihao": ["吕颐浩"],
  "waterway-provisional": ["桥所跨水道（名称待定）", "金泽塘", "秀州塘", "市河"],
};

/** 实体标签 → 着录别名（V1.5：relation 材料 snippet 追加用）。
 *  只收录「有意义的替代名」（临时水道实体的三种着录名）；不含简称/截断形（万安/普济/迎祥），
 *  否则答句会混入「（又称：普济）」这类读感糟糕的噪音。 */
const LABEL_ALIASES: Record<string, string[]> = {
  "桥所跨水道（名称待定）": ["金泽塘", "秀州塘", "市河"],
};

/** 未识别到对象时的宽检索词（保证至少与金泽相关，而不是随机材料） */
const FALLBACK_TERMS = ["金泽"];

/** A001（绿之丘）切片对象别名。
 *  键直接采用数据生产链里的实体规范名（与 read_model 世界投影的实体标签一致），
 *  这样 Agent 裁决出的 focus 可以直接驱动视觉舞台聚焦，不需要第二套 id 映射表。
 *  只收录有意义的替代名；问句命中别名即精确定位到绿之丘材料，否则退回绿之丘宽检索。 */
const A001_ALIASES: EntityAliases = {
  绿之丘: ["绿之丘", "绿丘"],
  烟草公司机修仓库: ["烟草公司机修仓库", "烟草机修仓库", "机修仓库", "烟草仓库", "老仓库"],
  "怡和冷库（1920）": ["怡和冷库", "怡和冷库（1920）", "怡和洋行冷库", "1920年怡和冷库", "怡和洋行"],
  "章明团队": ["章明团队", "章明", "同济大学章明", "章明教授"],
  安浦路: ["安浦路"],
  杨树浦路: ["杨树浦路", "1500号"],
  滨江公共空间: ["滨江公共空间", "杨浦滨江南段5.5公里公共空间", "滨江南段5.5公里", "滨江贯通", "滨江"],
  亚洲建筑师协会建筑奖: ["亚洲建筑师协会建筑奖", "建筑奖", "荣誉提名奖"],
};

/** 未识别到对象时的宽检索词（保证至少与绿之丘相关） */
const A001_FALLBACK = ["绿之丘", "烟草公司机修仓库"];

/**
 * 主题档案：把别名 / 着录别名 / 宽检索词按主题隔离。
 * 默认 jinze（向后兼容，金泽页面不传 topic）；绿之丘页面传 topic="a001"。
 * 检索层本身 town-agnostic（G5 门禁保证归属），主题分离由别名与宽检索词自然完成。
 */
const TOPIC_PROFILES: Record<string, {
  aliases: EntityAliases;
  labelAliases: Record<string, string[]>;
  fallback: string[];
}> = {
  jinze: { aliases: JINZE_ALIASES, labelAliases: LABEL_ALIASES, fallback: FALLBACK_TERMS },
  a001: { aliases: A001_ALIASES, labelAliases: {}, fallback: A001_FALLBACK },
};

export async function POST(req: Request) {
  let question = "";
  let topic = "jinze";
  try {
    const body = (await req.json()) as { question?: unknown; topic?: unknown };
    if (typeof body.question === "string") question = body.question.trim();
    if (typeof body.topic === "string" && TOPIC_PROFILES[body.topic]) topic = body.topic;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!question) return NextResponse.json({ ok: false, reason: "empty_question" }, { status: 400 });

  const profile = TOPIC_PROFILES[topic];

  // 防滥用：限流（按来源 IP）
  const source = getClientSource(req);
  if (isRateLimited(`ask:${source}`)) {
    return NextResponse.json({ ok: false, degraded: false, reason: "rate_limited" }, { status: 429 });
  }

  // 防滥用：结果缓存（相同问句 5 分钟内直接回缓存，不打库）
  const cacheKey = `ask:${topic}:${question}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) {
    return NextResponse.json(cached);
  }

  const understanding = await understand(question, profile.aliases);

  // 检索词 = 别名命中（精确实体）+ 问句实词（通名/未知对象）。
  // 只靠别名会让「寺和桥真的有关系吗」这类无专有名词的问句退回全表扫描，
  // 那不是检索，是碰运气；实词切分让检索至少对准用户真正在问的东西。
  const aliasTerms = understanding.objects.flatMap((id) => profile.aliases[id] ?? []);
  const terms = dedupe([...aliasTerms, ...understanding.terms]);
  // 没命中任何对象时，锚上主题词一起检索：否则「今天是怎样走上去的」只拿「走上」去撞库，
  // 会漏掉「今日联系」这类正是回答它的发布内容（锚定不改变检索结果的含义，只保证不跑题）。
  const anchoredTerms =
    understanding.objects.length === 0 ? dedupe([...terms, ...profile.fallback]) : terms;
  const effectiveTerms = anchoredTerms.length ? anchoredTerms : profile.fallback;

  // 取满 24 条再交 select 裁决：SQL 已按 kind 各留前 6 条，
  // 保证 event / claim / present 不会被高权重的 evidence 挤光。
  let { materials, degraded } = await retrieveMaterials(effectiveTerms, 24, { objectAliases: profile.labelAliases });
  // 实词没命中（例如「今天是怎样走上去的」被切成「走上」）时退回主题宽检索：
  // 有材料可读才有裁决可言；仍为空则如实说「答不了」，绝不补内容。
  if (!materials.length && !degraded) {
    const retry = await retrieveMaterials(profile.fallback, 24, { objectAliases: profile.labelAliases });
    materials = retry.materials;
    degraded = retry.degraded;
  }
  // A001：问「原来/前身」时别拿「今天怎么用」的回答顶上——先摘掉今日联系类材料，
  // 让原址/始建/前身那条记录成为主角（只调顺序与取舍，不改写材料）。
  let materialsForDecision = materials;
  if (topic === "a001" && /原来|原先|原本|前身|以前|最早/.test(question)) {
    const withoutToday = materials.filter((m) => !(m.kind === "present" && m.sourceRef.includes("今日联系")));
    if (withoutToday.length) materialsForDecision = withoutToday;
  }
  const baseDecision = await decideStep(understanding, materialsForDecision, profile.aliases);

  // 主题风险守卫（A001）：把「软关联/共现」误读成「同一性/因果」是本题最大的错误风险。
  // 检索层如实返回了生产链发布的关系（例如「前身可追溯到」），但用户问的是「是不是同一栋」，
  // 这一步只做降级：把结论从「有据」改成「部分据」，并补上边界说明；不改写材料、不新增史料。
  const guarded = applyRiskGuards(topic, question, baseDecision);
  const decision = guarded;

  const result = {
    ok: true,
    degraded,
    // 库不可用时必须让前端知道：这不是「查到了但没有」，而是「没查到」
    decision: degraded ? { ...decision, gaps: [...decision.gaps, "暂时查不到库里的材料"] } : decision,
  };
  // 只缓存成功、非降级的结果（degraded 不缓存，库恢复后能自愈）
  if (!degraded) setCache(cacheKey, result);
  return NextResponse.json(result);
}
