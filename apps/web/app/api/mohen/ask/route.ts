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
import { understand, decideStep, type EntityAliases } from "@mohen/agent-runtime";
import { retrieveMaterials } from "../../../../lib/mohen-agent/retrieve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
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

export async function POST(req: Request) {
  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    if (typeof body.question === "string") question = body.question.trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!question) return NextResponse.json({ ok: false, reason: "empty_question" }, { status: 400 });

  const understanding = await understand(question, JINZE_ALIASES);

  // 检索词 = 别名命中（精确实体）+ 问句实词（通名/未知对象）。
  // 只靠别名会让「寺和桥真的有关系吗」这类无专有名词的问句退回全表扫描，
  // 那不是检索，是碰运气；实词切分让检索至少对准用户真正在问的东西。
  const aliasTerms = understanding.objects.flatMap((id) => JINZE_ALIASES[id] ?? []);
  const terms = dedupe([...aliasTerms, ...understanding.terms]);
  const effectiveTerms = terms.length ? terms : FALLBACK_TERMS;

  // 取满 24 条再交 select 裁决：SQL 已按 kind 各留前 6 条，
  // 保证 event / claim / present 不会被高权重的 evidence 挤光。
  const { materials, degraded } = await retrieveMaterials(effectiveTerms, 24, { objectAliases: LABEL_ALIASES });
  const decision = await decideStep(understanding, materials, JINZE_ALIASES);

  return NextResponse.json({
    ok: true,
    degraded,
    // 库不可用时必须让前端知道：这不是「查到了但没有」，而是「没查到」
    decision: degraded ? { ...decision, gaps: [...decision.gaps, "暂时查不到库里的材料"] } : decision,
  });
}
