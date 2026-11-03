import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { signDatabaseSessionToken } from '../../../../lib/auth';
import { studioAssetStore, studioObjectBody, studioAssetFailure } from '../../../../lib/studio-assets';

export const runtime='nodejs';
export const dynamic='force-dynamic';
// Private drafts only; owner_user_id is checked by the DB's project/revision RLS.
export async function GET(request: Request) {
  const session=await getSession();
  if (!session) return NextResponse.json({ok:false,reason:'login_required'},{status:401});
  const query=new URL(request.url).searchParams;
  try {
    const store=studioAssetStore(),token=signDatabaseSessionToken(session);
    // Private F05/Studio inspection only. All reads are joined through exact
    // project+asset and the caller's transaction-scoped owner RLS.
    if (query.get('history')==='1') {
      const projectId=query.get('project_id'),assetId=query.get('asset_id');
      if (!projectId || !assetId)
        return NextResponse.json({ok:false,reason:'project_and_asset_required'},{status:400});
      const revisions=await store.listAssetRevisions(projectId,assetId,token);
      return NextResponse.json({ok:true,revisions},{headers:{'cache-control':'no-store'}});
    }
    if (query.get('use_events')==='1') {
      const projectId=query.get('project_id'),revisionId=query.get('revision_id');
      if (!projectId || !revisionId)
        return NextResponse.json({ok:false,reason:'project_and_revision_required'},{status:400});
      const events=await store.listRevisionUseEvents(projectId,revisionId,token);
      return NextResponse.json({ok:true,events},{headers:{'cache-control':'no-store'}});
    }
    if (query.has('revision_id')) {
      if (!query.get('asset_id')) return NextResponse.json({ok:false,reason:'asset_id_required'},{status:400});
      const asset=await store.getRevision(query.get('revision_id')!,token);
      if (!asset || asset.asset_id!==query.get('asset_id')) return NextResponse.json({ok:false,reason:'asset_not_found'},{status:404});
      return NextResponse.json({ok:true,asset});
    }
    if (!query.get('project_id')) return NextResponse.json({ok:false,reason:'project_id_required'},{status:400});
    return NextResponse.json({ok:true,assets:await store.listAssets(query.get('project_id')!,token)});
  } catch(error) { return studioAssetFailure(error); }
}
export async function POST(request: Request) {
  const session=await getSession();
  if (!session) return NextResponse.json({ok:false,reason:'login_required'},{status:401});
  const body=await studioObjectBody(request);
  if (body instanceof NextResponse) return body;
  try {
    if (body.origin_kind!==undefined && body.origin_kind!=='human') throw new Error('STUDIO_ORIGIN_BINDING_REQUIRED');
    const asset=await studioAssetStore().saveRevision({projectId:body.project_id as string,assetId:body.asset_id as string,
      kind:body.asset_kind as string,expectedRevisionId:body.expected_revision_id as string|null,
      idempotencyKey:body.idempotency_key as string,payload:body.payload,sourceRefs:body.source_refs as unknown[]|undefined,
      dependencyRefs:body.dependency_refs as unknown[]|undefined},signDatabaseSessionToken(session));
    return NextResponse.json({ok:true,asset});
  } catch(error) { return studioAssetFailure(error); }
}
