import {beforeEach,expect,it,vi} from 'vitest';
const deps=vi.hoisted(()=>({session:vi.fn(),projects:vi.fn(),project:vi.fn(),assets:vi.fn(),revision:vi.fn(),save:vi.fn(),withdraw:vi.fn()}));
vi.mock('../../apps/web/lib/session',()=>({getSession:deps.session}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({getNodePgPool:()=>({}),createStudioAssetRepository:()=>({listProjects:deps.projects,createProject:deps.project,listAssets:deps.assets,getRevision:deps.revision,saveRevision:deps.save,withdrawFeedback:deps.withdraw})}));
import {GET as projects,POST as project} from '../../apps/web/app/api/studio/projects/route';
import {GET as assets,POST as save} from '../../apps/web/app/api/studio/assets/route';
import {POST as withdraw} from '../../apps/web/app/api/studio/assets/withdraw/route';
const request=(path:string,body?:unknown)=>new Request('http://test.invalid'+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('MOHEN_DATABASE_SESSION_SECRET','synthetic-route-db-attestation-key-at-least-32');deps.session.mockResolvedValue({uid:'owner',r:[]});deps.projects.mockResolvedValue([]);deps.assets.mockResolvedValue([]);deps.revision.mockResolvedValue(null);});
it('requires authentication for every private asset/project operation',async()=>{deps.session.mockResolvedValue(null);expect((await projects()).status).toBe(401);expect((await project(request('/projects',{}))).status).toBe(401);expect((await assets(request('/assets?project_id=x'))).status).toBe(401);expect((await save(request('/assets',{}))).status).toBe(401);});
it('never caches private asset revisions, listings, failures or authenticated writes',async()=>{
 deps.assets.mockResolvedValue([{asset_id:'private-asset'}]);
 let r=await assets(request('/assets?project_id=project'));
 expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');
 deps.revision.mockResolvedValue({asset_id:'private-asset',revision_id:'old-rev'});
 r=await assets(request('/assets?asset_id=private-asset&revision_id=old-rev'));
 expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');
 r=await assets(request('/assets?asset_id=other&revision_id=old-rev'));
 expect(r.status).toBe(404);expect(r.headers.get('cache-control')).toBe('no-store');
 deps.assets.mockRejectedValueOnce(new Error('synthetic storage failure'));
 r=await assets(request('/assets?project_id=project'));
 expect(r.status).toBe(503);expect(r.headers.get('cache-control')).toBe('no-store');
 deps.save.mockResolvedValue({asset_id:'private-asset',revision_id:'new-rev',revision_no:1});
 r=await save(request('/assets',{project_id:'project',asset_id:'private-asset',asset_kind:'reading_note',
  expected_revision_id:null,idempotency_key:'private-write',payload:{text:'private'}}));
 expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');
 deps.session.mockResolvedValue(null);
 r=await assets(request('/assets?project_id=project'));
 expect(r.status).toBe(401);expect(r.headers.get('cache-control')).toBe('no-store');
});
it('returns only acknowledged saved identities and revision',async()=>{deps.save.mockResolvedValue({asset_id:'asset',revision_id:'saved-revision',revision_no:2});const r=await save(request('/assets',{project_id:'project',asset_id:'asset',asset_kind:'reading_note',expected_revision_id:'old',idempotency_key:'save-1',payload:{text:'note'}}));expect(r.status).toBe(200);expect(await r.json()).toEqual({ok:true,asset:{asset_id:'asset',revision_id:'saved-revision',revision_no:2}});});
it('reports concurrent revision conflicts without claiming a successful save',async()=>{deps.save.mockRejectedValue(new Error('STUDIO_REVISION_CONFLICT'));const r=await save(request('/assets',{payload:{text:'note'}}));expect(r.status).toBe(409);expect(await r.json()).toEqual({ok:false,reason:'STUDIO_REVISION_CONFLICT'});});
it('returns retryable failure for missing storage instead of an empty successful list',async()=>{deps.projects.mockRejectedValue(new Error('relation unavailable'));const r=await projects();expect(r.status).toBe(503);expect(await r.json()).toEqual({ok:false,reason:'studio_storage_unavailable'});});
it('hides missing or inaccessible exact revisions',async()=>{expect((await assets(request('/assets?asset_id=a&revision_id=r'))).status).toBe(404);deps.revision.mockResolvedValue({asset_id:'different-asset',revision_id:'r'});expect((await assets(request('/assets?asset_id=a&revision_id=r'))).status).toBe(404);});
it('rejects non-object requests',async()=>{
 for(const body of [null,[],3]){
  expect((await project(request('/projects',body))).status).toBe(400);
  const response=await save(request('/assets',body));
  expect(response.status).toBe(400);
  expect(response.headers.get('cache-control')).toBe('no-store');
 }
});
it('does not accept client-claimed external provenance',async()=>{const r=await save(request('/assets',{origin_kind:'external_delegate',payload:{text:'candidate'}}));expect(r.status).toBe(409);});

it('requires Owner authentication and never caches feedback withdrawal responses',async()=>{
 deps.session.mockResolvedValue(null);
 let r=await withdraw(request('/assets/withdraw',{project_id:'synthetic'}));
 expect(r.status).toBe(401);expect(r.headers.get('cache-control')).toBe('no-store');
 deps.session.mockResolvedValue({uid:'owner',r:[]});
 r=await withdraw(request('/assets/withdraw',null));
 expect(r.status).toBe(400);expect(r.headers.get('cache-control')).toBe('no-store');
 deps.withdraw.mockResolvedValue({revision_id:'tombstone',revision_no:2,access_state:'REVOKED'});
 r=await withdraw(request('/assets/withdraw',{project_id:'project',asset_id:'feedback',
  expected_revision_id:'original',idempotency_key:'revoke'}));
 expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');
 expect((await r.json()).asset.access_state).toBe('REVOKED');
 expect(deps.withdraw).toHaveBeenCalledOnce();
 deps.withdraw.mockRejectedValueOnce(new Error('STUDIO_REVISION_CONFLICT'));
 r=await withdraw(request('/assets/withdraw',{project_id:'project',asset_id:'feedback',
  expected_revision_id:'original',idempotency_key:'revoke-else'}));
 expect(r.status).toBe(409);expect(r.headers.get('cache-control')).toBe('no-store');
});
it('rejects self-claimed feedback consent when the repository refuses it',async()=>{
 deps.save.mockRejectedValue(new Error('STUDIO_FEEDBACK_CONSENT_REQUIRED'));
 const r=await save(request('/assets',{project_id:'project',asset_id:'feedback',asset_kind:'consented_feedback',
  expected_revision_id:null,idempotency_key:'no-consent',payload:{text:'not authorized'}}));
 expect(r.status).toBe(400);
 expect((await r.json()).reason).toBe('STUDIO_FEEDBACK_CONSENT_REQUIRED');
 expect(r.headers.get('cache-control')).toBe('no-store');
});
