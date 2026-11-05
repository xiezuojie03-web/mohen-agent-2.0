import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { signDatabaseSessionToken } from '../../../../lib/auth';
import { studioAssetStore, studioObjectBody, studioAssetFailure } from '../../../../lib/studio-assets';

export const runtime='nodejs';
export const dynamic='force-dynamic';
// Private draft/revision responses must never survive rights changes in a cache.
function privateJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {status,headers:{'cache-control':'no-store'}});
}
function privateFailure(error: unknown) {
  const response = studioAssetFailure(error);
  response.headers.set('cache-control','no-store');
  return response;
}

// Private drafts only; owner_user_id is checked by the DB's project/revision RLS.
export async function GET(request: Request) {
  const session=await getSession();
  if (!session) return privateJson({ok:false,reason:'login_required'},401);
  const query=new URL(request.url).searchParams;
  try {
    const store=studioAssetStore(),token=signDatabaseSessionToken(session);
    // Private F05/Studio inspection only. All reads are joined through exact
    // project+asset and the caller's transaction-scoped owner RLS.
    if (query.get('history')==='1') {
      const projectId=query.get('project_id'),assetId=query.get('asset_id');
      if (!projectId || !assetId)
        return privateJson({ok:false,reason:'project_and_asset_required'},400);
      const revisions=await store.listAssetRevisions(projectId,assetId,token);
      return privateJson({ok:true,revisions});
    }
    if (query.get('use_events')==='1') {
      const projectId=query.get('project_id'),revisionId=query.get('revision_id');
      if (!projectId || !revisionId)
        return privateJson({ok:false,reason:'project_and_revision_required'},400);
      const events=await store.listRevisionUseEvents(projectId,revisionId,token);
      return privateJson({ok:true,events});
    }
    if (query.has('revision_id')) {
      if (!query.get('asset_id')) return privateJson({ok:false,reason:'asset_id_required'},400);
      const asset=await store.getRevision(query.get('revision_id')!,token);
      if (!asset || asset.asset_id!==query.get('asset_id')) return privateJson({ok:false,reason:'asset_not_found'},404);
      return privateJson({ok:true,asset});
    }
    if (!query.get('project_id')) return privateJson({ok:false,reason:'project_id_required'},400);
    if(query.get('browse')==='1'){
      const limit=Number(query.get('limit')??20),q=query.get('q')??'',kind=query.get('kind')??'',cursor=query.get('cursor');
      if(!Number.isInteger(limit)||limit<1||limit>100||q.length>200||(kind&&!['research_brief','source_anchor','reading_note','evidence_note','spacetime_candidate','relation_hypothesis','humanistic_insight','research_collection','director_plan','media_selection','work_revision','citation_snapshot','consented_feedback'].includes(kind)))return privateJson({ok:false,reason:'invalid_browse_options'},400);
      const rows=await store.listAssets(query.get('project_id')!,token,{browse:true,q,kind,cursor,limit});
      const assets=rows.slice(0,limit);
      return privateJson({ok:true,assets,next_cursor:rows.length>limit?assets[assets.length-1].revision_id:null});
    }
    return privateJson({ok:true,assets:await store.listAssets(query.get('project_id')!,token)});
  } catch(error) { return privateFailure(error); }
}
export async function POST(request: Request) {
  const session=await getSession();
  if (!session) return privateJson({ok:false,reason:'login_required'},401);
  const body=await studioObjectBody(request);
  if (body instanceof NextResponse) {
    body.headers.set('cache-control','no-store');
    return body;
  }
  try {
    if (body.origin_kind!==undefined && body.origin_kind!=='human') throw new Error('STUDIO_ORIGIN_BINDING_REQUIRED');
    const asset=await studioAssetStore().saveRevision({projectId:body.project_id as string,assetId:body.asset_id as string,
      kind:body.asset_kind as string,expectedRevisionId:body.expected_revision_id as string|null,
      idempotencyKey:body.idempotency_key as string,payload:body.payload,sourceRefs:body.source_refs as unknown[]|undefined,
      dependencyRefs:body.dependency_refs as unknown[]|undefined},signDatabaseSessionToken(session));
    return privateJson({ok:true,asset});
  } catch(error) { return privateFailure(error); }
}
