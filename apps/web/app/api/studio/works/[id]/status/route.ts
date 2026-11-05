import {NextResponse} from 'next/server';
import {guardRoute} from '../../../../../../lib/guard';
import {GET as readCurrentStages} from '../stages/route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Both views must use the same Owner/current-material/receipt checks. A legacy
// task.done boolean is not proof of a currently readable research result.
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
  const {params}=context;
  const denied=await guardRoute(params, "publication.works");
  if(denied){denied.headers.set('cache-control','no-store');return denied;}
  const response=await readCurrentStages(request,context);
  response.headers.set('cache-control','no-store');
  if(!response.ok)return response;
  const body=await response.json();
  const rows=body.artifacts?.revisions;
  const latest=Array.isArray(rows)&&rows.length?rows[rows.length-1]:null;
  return NextResponse.json({ok:true,stages:body.stages,
    revision:latest?{revision_id:latest.revision_id,revision_no:latest.revision_no,status:latest.status}:null,
    gaps:body.gaps??[]},{headers:{'cache-control':'no-store'}});
}
