import {NextResponse} from 'next/server';
import {getSession} from '../../../../lib/session';
import {signDatabaseSessionToken} from '../../../../lib/auth';
import {studioObjectBody,studioAssetFailure} from '../../../../lib/studio-assets';
import {readStudioResearchProject} from '../../../../lib/studio-research-read';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function privateJson(body:unknown,status=200){
  return NextResponse.json(body,{status,headers:{'cache-control':'no-store'}});
}

// ST-02 persists idempotent reading notes, so it is an explicit POST rather
// than a cacheable GET. Owner/project ACL remains in the existing repositories.
// No model, formal production, L5 promotion or external processing is invoked.
export async function POST(request:Request){
  const session=await getSession();
  if(!session)return privateJson({ok:false,reason:'login_required'},401);
  const body=await studioObjectBody(request);
  if(body instanceof NextResponse){body.headers.set('cache-control','no-store');return body;}
  if(typeof body.project_id!=='string'||!uuid.test(body.project_id))
    return privateJson({ok:false,reason:'project_id_required'},400);
  try{
    const result=await readStudioResearchProject(body.project_id,signDatabaseSessionToken(session));
    return privateJson({ok:true,...result});
  }catch(error){
    const response=studioAssetFailure(error);
    response.headers.set('cache-control','no-store');
    return response;
  }
}
