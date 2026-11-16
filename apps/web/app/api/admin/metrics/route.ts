import { NextRequest, NextResponse } from "next/server";
import { queryValue } from "@mohen/data-access";
import { OPERATOR_COOKIE, isOperator } from "../../../../lib/auth";
import {cloudExecutionReadiness} from '../../../../../../pipelines/data-production/orchestrator/cloud-execution-readiness.mjs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API-004 GET /api/admin/metrics —— 运营指标（基础版：真实计数，对齐 FA-052-01）
export async function GET(req: NextRequest) {
  if (!(await isOperator(req.cookies.get(OPERATOR_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const works = await queryValue("select count(*)::int from publication.works");
  const published = await queryValue("select count(*)::int from publication.published_pointers");
  const assets = await queryValue("select count(*)::int from public.assets");
  const researchTasks = await queryValue("select count(*)::int from public.research_tasks");
  return NextResponse.json({
    ok: true,
    execution_readiness:cloudExecutionReadiness(process.env),
    metrics: {
      works: Number(works ?? 0),
      published: Number(published ?? 0),
      assets: Number(assets ?? 0),
      research_tasks: Number(researchTasks ?? 0),
      noted_at: new Date().toISOString(),
    },
  },{headers:{'cache-control':'private, no-store, max-age=0'}});
}
