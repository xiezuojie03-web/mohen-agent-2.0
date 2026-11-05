import { NextResponse } from "next/server";
import { queryRows } from "@mohen/data-access";
import { guardRoute } from "../../../../../../lib/guard";
import { getSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";
import { getTaskStatus } from "../../../../../../lib/studio-research";
import { readJsonColumn } from "../../../../../../lib/db-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateJson=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});

// Only persisted work-revision provenance associates a private director plan.
// A research task on the work is not a relationship to arbitrary director plans.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) {denied.headers.set("cache-control","no-store");return denied;}
  const session=await getSession();
  if(!session)return privateJson({ok:false,reason:"login_required"},401);
  const { id } = await params;
  const vars={wid:id,uid:session.uid};
  try{
    // The generic guard permits operators; this endpoint contains private
    // research and director prose, so require the actual work Owner as well.
    const owned=await queryRows("select work_id::text as work_id from publication.works where work_id=:'wid' and owner_user_id=:'uid'",vars);
    if(!owned.length)return privateJson({ok:false,reason:"forbidden"},403);
    const tasks=await queryRows(
      `select t.task_id::text as task_id, t.topic, t.prompt, t.status, t.created_at::text as created_at,
        (exists(select 1 from public.study_asset_receipts r where r.task_id=t.task_id
          and r.kind='checkpoint' and r.stage='D04' and r.status='settled')
         and exists(select 1 from public.research_events e where e.task_id=t.task_id
          and e.stage='D04' and e.event='research_done')) as has_receipt
       from public.research_tasks t join publication.works w on w.work_id=t.work_id
       where t.work_id=:'wid' and t.owner_user_id=:'uid' and w.owner_user_id=:'uid'
       order by t.created_at asc`,vars);
    const plans=await queryRows(
      `select distinct d.plan_id::text as plan_id, d.brief, d.finding, d.selected, d.beats, d.created_at::text as created_at
       from public.director_plans d
       join publication.work_revisions r on d.plan_id::text=r.content->'director_source'->>'plan_id'
       join publication.works w on w.work_id=r.work_id and w.owner_user_id=d.owner_user_id
       where r.work_id=:'wid' and d.owner_user_id=:'uid' and w.owner_user_id=:'uid'
       order by created_at asc limit 20`,vars);
    const revisions=await queryRows(
      `select r.revision_id::text as revision_id, r.revision_no, r.title, r.status, r.created_at::text as created_at
       from publication.work_revisions r join publication.works w on w.work_id=r.work_id
       where r.work_id=:'wid' and w.owner_user_id=:'uid' order by r.revision_no asc`,vars);
    let researched=false;
    for(const task of tasks){
      if(task.status!=="done"||![true,'true','t'].includes(task.has_receipt as string|boolean))continue;
      const current=await getTaskStatus(String(task.task_id),signDatabaseSessionToken(session));
      const cp=readJsonColumn<Record<string,unknown>>(current?.checkpoint,{});
      const read=cp.materialRead as {state?:string}|undefined;
      if(read?.state==='CURRENT'){researched=true;break;}
    }
    const gaps:string[]=[];
    if(!plans.length)gaps.push('DIRECTOR_PLAN_REVISION_BINDING_MISSING');
    if(tasks.length&&!researched)gaps.push('CURRENT_RESEARCH_RECEIPT_OR_MATERIALS_UNAVAILABLE');
    return privateJson({ok:true,stages:{delegated:tasks.length>0,researched,directed:plans.length>0,revisioned:revisions.length>0},artifacts:{tasks,plans,revisions},gaps});
  }catch{
    return privateJson({ok:false,reason:'STUDIO_STAGE_READ_UNAVAILABLE'},503);
  }
}
