import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { signDatabaseSessionToken } from '../../../../lib/auth';
import { studioAssetStore, studioObjectBody, studioAssetFailure } from '../../../../lib/studio-assets';

export const runtime='nodejs';
export const dynamic='force-dynamic';
// MAB private service extension: existing 85 API IDs remain unchanged.
// owner_user_id is derived inside the verified DB transaction, never from JSON.
export async function GET() {
  const session=await getSession();
  if (!session) return NextResponse.json({ok:false,reason:'login_required'},{status:401});
  try {
    return NextResponse.json({ok:true,projects:await studioAssetStore().listProjects(signDatabaseSessionToken(session))});
  } catch(error) { return studioAssetFailure(error); }
}
export async function POST(request: Request) {
  const session=await getSession();
  if (!session) return NextResponse.json({ok:false,reason:'login_required'},{status:401});
  const body=await studioObjectBody(request);
  if (body instanceof NextResponse) return body;
  try {
    const project=await studioAssetStore().createProject({projectId:body.project_id as string,title:body.title as string,
      scope:body.scope as Record<string,unknown> | undefined},signDatabaseSessionToken(session));
    return NextResponse.json({ok:true,project});
  } catch(error) { return studioAssetFailure(error); }
}
// 只改显示名称；所有者由数据库会话判定，不从 JSON 取。
export async function PATCH(request: Request) {
  const session=await getSession();
  if (!session) return NextResponse.json({ok:false,reason:'login_required'},{status:401});
  const body=await studioObjectBody(request);
  if (body instanceof NextResponse) return body;
  try {
    const project=await studioAssetStore().updateProjectTitle({projectId:body.project_id as string,title:body.title as string},
      signDatabaseSessionToken(session));
    return NextResponse.json({ok:true,project});
  } catch(error) { return studioAssetFailure(error); }
}
