import {NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/session';
import {signDatabaseSessionToken} from '../../../../../lib/auth';
import {studioAssetStore,studioObjectBody,studioAssetFailure} from '../../../../../lib/studio-assets';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Only the authenticated Owner can withdraw a privately held, exact feedback
// revision. This creates a terminal immutable revision, not a formal G decision.
export async function POST(request:Request) {
  const privateJson=(data:unknown,status=200)=>NextResponse.json(data,{
    status,headers:{'cache-control':'no-store'}
  });
  const session=await getSession();
  if(!session) return privateJson({ok:false,reason:'login_required'},401);
  const body=await studioObjectBody(request);
  if(body instanceof NextResponse){
    body.headers.set('cache-control','no-store');
    return body;
  }
  try {
    const asset=await studioAssetStore().withdrawFeedback({
      projectId:body.project_id as string,
      assetId:body.asset_id as string,
      expectedRevisionId:body.expected_revision_id as string,
      idempotencyKey:body.idempotency_key as string,
    },signDatabaseSessionToken(session));
    return privateJson({ok:true,asset});
  }catch(error){
    const response=studioAssetFailure(error);
    response.headers.set('cache-control','no-store');
    return response;
  }
}
