import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { guardRoute } from "../../../../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/works/:id/stages —— 选择状态节点看实际产物（对齐 FA-012-02）
// 返回该作品关联的研究任务 + 导演方案 + 修订的实际回执（四步创作状态轴的实际产物）。
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) return denied;
  const { id } = await params;
  const tasks = await queryRows(
    "select task_id::text as task_id, topic, prompt, status, created_at::text as created_at from public.research_tasks where work_id = :'wid' order by created_at asc",
    { wid: id }
  );
  const plans = await queryRows(
    `select d.plan_id::text as plan_id, d.brief, d.finding, d.selected, d.beats, d.created_at::text as created_at
     from public.director_plans d
     join public.research_tasks t on t.work_id = :'wid'
     limit 20`,
    { wid: id }
  );
  const revisions = await queryRows(
    "select revision_id::text as revision_id, revision_no, title, status, created_at::text as created_at from publication.work_revisions where work_id = :'wid' order by revision_no asc",
    { wid: id }
  );
  return NextResponse.json({
    ok: true,
    stages: {
      delegated: tasks.length > 0,
      researched: tasks.some((t) => t.status === "done"),
      directed: plans.length > 0,
      revisioned: revisions.length > 0,
    },
    artifacts: { tasks, plans, revisions },
  });
}
