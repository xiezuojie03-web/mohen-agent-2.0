import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {browserRequests} from './mab-browser-request';

// No production identities, public publication or real user-submitted consent.
test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Disposable marked PostgreSQL + Chromium only.');
test('private feedback requires declared opt-in and withdrawal revokes current and historical reads',async({page,browser})=>{
  const api=await browserRequests(page);
  const registered=await api.post('/api/auth/register',{data:{
    email:`feedback-owner-${randomUUID()}@example.invalid`,username:'Synthetic feedback owner',password:randomUUID()
  }});
  expect(registered.status()).toBe(200);
  const projectId=randomUUID(),assetId=randomUUID(),firstKey=randomUUID();
  const createdProject=await api.post('/api/studio/projects',{data:{
    project_id:projectId,title:'Synthetic private feedback',scope:{kind:'TEST_ONLY'}
  }});
  expect(createdProject.status()).toBe(200);
  const base={project_id:projectId,asset_id:assetId,asset_kind:'consented_feedback',
    expected_revision_id:null as string|null,idempotency_key:firstKey};

  for(const payload of [
    {text:'No consent',withdrawal_allowed:true},
    {text:'Not explicit',consent:'true',withdrawal_allowed:true},
    {text:'No withdrawal allowed',consent:true,withdrawal_allowed:false},
    {text:'   ',consent:true,withdrawal_allowed:true}
  ]){
    const refused=await api.post('/api/studio/assets',{data:{...base,payload}});
    expect(refused.status()).toBe(400);
    expect((await refused.json()).reason).toBe('STUDIO_FEEDBACK_CONSENT_REQUIRED');
    expect(refused.headers()['cache-control']).toBe('no-store');
  }

  const created=await api.post('/api/studio/assets',{data:{...base,payload:{
    text:'TEST_ONLY contributor opinion; not historical evidence',consent:true,withdrawal_allowed:true
  }}});
  expect(created.status()).toBe(200);
  const current=(await created.json()).asset;
  expect(current.access_state).toBe('RESTRICTED');
  expect(current.validation.status).toBe('UNASSESSED');
  expect(Object.values(current.rights_by_action).every(x=>x==='unknown')).toBe(true);
  expect(created.headers()['cache-control']).toBe('no-store');

  const foreignContext=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
  try{
    const foreign=await browserRequests(await foreignContext.newPage());
    const foreignRegistered=await foreign.post('/api/auth/register',{data:{
      email:`feedback-other-${randomUUID()}@example.invalid`,username:'Synthetic other owner',password:randomUUID()
    }});
    expect(foreignRegistered.status()).toBe(200);
    const attempt=await foreign.post('/api/studio/assets/withdraw',{data:{
      project_id:projectId,asset_id:assetId,expected_revision_id:current.revision_id,idempotency_key:randomUUID()
    }});
    expect(attempt.status()).toBe(404);
    expect(attempt.headers()['cache-control']).toBe('no-store');
  }finally{await foreignContext.close();}

  const keys=Array.from({length:6},()=>randomUUID());
  const attempts=await Promise.all(keys.map(idempotency_key=>api.post('/api/studio/assets/withdraw',{
    data:{project_id:projectId,asset_id:assetId,expected_revision_id:current.revision_id,idempotency_key}
  })));
  const statuses=attempts.map(r=>r.status());
  expect(statuses.filter(s=>s===200)).toHaveLength(1);
  expect(statuses.filter(s=>s===409)).toHaveLength(5);
  const successIndex=statuses.indexOf(200);
  const tombstone=(await attempts[successIndex].json()).asset;
  expect(tombstone.revision_no).toBe(current.revision_no+1);
  expect(tombstone.supersedes_revision_id).toBe(current.revision_id);
  expect(tombstone.payload).toMatchObject({consent:false,withdrawn:true});
  expect(tombstone.access_state).toBe('REVOKED');
  expect(Object.values(tombstone.rights_by_action).every(x=>x==='denied')).toBe(true);
  expect(attempts[successIndex].headers()['cache-control']).toBe('no-store');

  const retry=await api.post('/api/studio/assets/withdraw',{data:{
    project_id:projectId,asset_id:assetId,expected_revision_id:current.revision_id,idempotency_key:keys[successIndex]
  }});
  expect(retry.status()).toBe(200);
  expect((await retry.json()).asset.revision_id).toBe(tombstone.revision_id);
  const deniedOld=await api.get('/api/studio/assets',{params:{
    asset_id:assetId,revision_id:current.revision_id
  }});
  expect(deniedOld.status()).toBe(404);
  expect(deniedOld.headers()['cache-control']).toBe('no-store');

  const history=await api.get('/api/studio/assets',{params:{
    history:'1',project_id:projectId,asset_id:assetId
  }});
  expect(history.status()).toBe(200);
  const revisions=(await history.json()).revisions;
  expect(revisions.map((r:{revision_id:string})=>r.revision_id)).toEqual([tombstone.revision_id,current.revision_id]);
  for(const revision of revisions){
    expect(revision.payload).toEqual({consent:false,withdrawn:true});
    expect(revision.access_state).toBe('REVOKED');
    expect(Object.values(revision.rights_by_action).every(x=>x==='denied')).toBe(true);
  }
  expect(history.headers()['cache-control']).toBe('no-store');
  const reactivation=await api.post('/api/studio/assets',{data:{...base,
    idempotency_key:randomUUID(),expected_revision_id:tombstone.revision_id,
    payload:{text:'Attempted consent revival',consent:true,withdrawal_allowed:true}
  }});
  expect(reactivation.status()).toBe(409);
  expect((await reactivation.json()).reason).toBe('STUDIO_FEEDBACK_WITHDRAWN');
  expect(reactivation.headers()['cache-control']).toBe('no-store');
  console.log('MAB_FEEDBACK_WITHDRAW_HTTP_PASS explicit-opt-in Owner-only immutable-CAS idempotency history-redacted no-reactivation');
});
