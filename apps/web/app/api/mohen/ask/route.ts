// apps/web/app/api/mohen/ask/route.ts
//
// 即时问答收口：理解 → 检索 → 裁决 → 编排（研究核心抽到 lib/mohen-agent/research.runResearch）。
// 本 route 只保留：入参解析、限流；不缓存可能在撤权后失效的材料衍生回答。
import { NextResponse } from "next/server";
import { runResearch, resolveTopic, type TopicKey } from "../../../../lib/mohen-agent/research";
import { isRateLimited, getClientSource } from "../../../../lib/mohen-agent/guard";
import {ResearchPrerequisiteHold} from '../../../../lib/mohen-agent/research-prerequisites';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let question = "";
  let topic: TopicKey = "jinze";
  try {
    const body = (await req.json()) as { question?: unknown; topic?: unknown };
    if (typeof body.question === "string") question = body.question.trim();
    // 即时问答默认金泽切片（绿之丘/金泽体验页）；仅当显式传入 topic 才覆盖。
    if (body.topic !== undefined) topic = resolveTopic(body.topic);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!question) return NextResponse.json({ ok: false, reason: "empty_question" }, { status: 400 });

  const source = getClientSource(req);
  if (isRateLimited(`ask:${source}`)) {
    return NextResponse.json({ ok: false, degraded: false, reason: "rate_limited" }, { status: 429 });
  }

  try {
    const { decision, degraded } = await runResearch(question, topic);
    return NextResponse.json({ ok: true, degraded, decision }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ResearchPrerequisiteHold)
      return NextResponse.json({ok:false,status:'hold',reason:'research_prerequisites',missing_requirements:error.missingRequirements},
        {status:409,headers:{'cache-control':'no-store'}});
    throw error;
  }
}
