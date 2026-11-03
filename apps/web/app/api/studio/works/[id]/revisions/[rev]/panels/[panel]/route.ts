import {NextResponse} from "next/server";
import {queryRows} from "@mohen/data-access";
import {getSession} from "../../../../../../../../../lib/session";
import {readJsonColumn} from "../../../../../../../../../lib/db-json";
import {revisionNumber,savedPanel} from "../../../../../../../../../lib/kad1-policy.mjs";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{id:string;rev:string;panel:string}>}){
 const session=await getSession();if(!session)return NextResponse.json({ok:false,reason:'login_required'},{status:401});
 const {id,rev,panel}=await params;const n=revisionNumber(rev);
 if(n===null)return NextResponse.json({ok:false,reason:'invalid_revision'},{status:400});
 const rows=await queryRows(`select r.revision_id::text as revision_id,r.content from publication.work_revisions r
 join publication.works w on w.work_id=r.work_id where w.work_id=:'wid' and w.owner_user_id=:'uid' and r.revision_no=:'rev'`,{wid:id,uid:session.uid,rev:n});
 if(!rows.length)return NextResponse.json({ok:false,reason:'not_found'},{status:404});
 const content=readJsonColumn<Record<string,unknown>>(rows[0].content,{});const value=savedPanel(content,panel);
 if(value===null)return NextResponse.json({ok:false,reason:'panel_snapshot_unavailable'},{status:404});
 return NextResponse.json({ok:true,revision_id:rows[0].revision_id,panel,value});
}
