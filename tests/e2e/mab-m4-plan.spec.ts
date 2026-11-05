import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {browserRequests} from './mab-browser-request';
test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Marked synthetic HTTP instance only.');
test.beforeAll(()=>{const u=new URL(process.env.MOHEN_E2E_BASE_URL??'');if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname))throw Error('LOCAL_SYNTHETIC_HTTP_REQUIRED');});
test('M4 Owner plan persists after lost acknowledgement and reload; revoke is durable and foreign Owner denied',async({page,browser})=>{
 const registration=await page.request.post('/api/auth/register',{data:{email:`m4-${randomUUID()}@example.invalid`,username:'M4隔离Owner',password:randomUUID()}});expect(registration.status()).toBe(200);
 await page.goto('/studio/desk');await page.getByLabel('新项目名称',{exact:true}).fill('M4研究计划隔离验收');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/studio/projects')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'创建项目',exact:true}).click();const project=(await(await created).json()).project;
 await expect(page.getByLabel('当前研究项目',{exact:true})).toHaveValue(project.project_id);
 await page.getByLabel('研究计划问题',{exact:true}).fill('合成桥市文献如何逐项核查？');
 let hide=true;let originalRequest:Record<string,unknown>={};let persisted:{asset:{asset_id:string};delegation:{delegation_id:string}}|undefined;
 await page.route('**/api/studio/plans',async route=>{
  if(route.request().method()==='POST'&&hide){hide=false;originalRequest=route.request().postDataJSON();const result=await route.fetch();expect(result.status()).toBe(200);persisted=await result.json();await route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});}
  else await route.continue();
 });
 await page.getByRole('button',{name:'保存研究计划',exact:true}).click();await expect(page.getByText('计划暂未保存，请重试；当前问题仍保留。',{exact:true})).toBeVisible();
 const retry=page.waitForResponse(r=>r.url().endsWith('/api/studio/plans')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'保存研究计划',exact:true}).click();const retried=await(await retry).json();
 expect(retried.asset.asset_id).toBe(persisted!.asset.asset_id);expect(retried.delegation.delegation_id).toBe(persisted!.delegation.delegation_id);
 expect(retried.execution_authorized).toBe(false);expect(retried.state).toBe('HOLD');
 await page.reload();await expect(page.getByText('合成桥市文献如何逐项核查？',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'撤销委托',exact:true}).click();await expect(page.getByText('委托已撤销，原计划与回执仍保留。',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('已撤销 · 计划与回执保留',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'撤销委托',exact:true})).toBeDisabled();
 const ownerRequests=await browserRequests(page);
 const second=await ownerRequests.post('/api/studio/plans',{data:{...originalRequest,asset_id:randomUUID(),series_id:randomUUID(),request_id:randomUUID()}});
 expect(second.status()).toBe(200);const secondPlan=await second.json();
 const reloaded=await (await ownerRequests.get('/api/studio/plans?project_id='+project.project_id)).json();
 expect(reloaded.plans.find((p:{asset_id:string})=>p.asset_id===persisted!.asset.asset_id).control.state).toBe('REVOKED');
 expect(reloaded.plans.find((p:{asset_id:string})=>p.asset_id===secondPlan.asset.asset_id).control.state).toBe('READY');
 // Simulate a process stopping after private plan persistence but before the
 // immutable delegation was acknowledged. Recovery loads only its Owner snapshot.
 const pending={...originalRequest,asset_id:randomUUID(),series_id:randomUUID(),request_id:randomUUID()};
 const orphan=await ownerRequests.post('/api/studio/assets',{data:{project_id:project.project_id,asset_id:pending.asset_id,asset_kind:'research_brief',expected_revision_id:null,
  idempotency_key:pending.request_id,payload:{...secondPlan.asset.payload,request_id:pending.request_id,delegation_series_id:pending.series_id,plan_request:pending}}});
 expect(orphan.status()).toBe(200);const orphanAsset=(await orphan.json()).asset;
 await page.goto('/studio/desk');await expect(page.getByRole('button',{name:'继续登记委托',exact:true})).toBeVisible();
 const recovering=page.waitForResponse(r=>r.url().endsWith('/api/studio/plans')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'继续登记委托',exact:true}).click();const recovered=await(await recovering).json();
 expect(recovered.asset.asset_id).toBe(orphanAsset.asset_id);expect(recovered.control.state).toBe('READY');expect(recovered.execution_authorized).toBe(false);
 await expect(page.getByText('委托登记已确认，计划仍未执行。',{exact:true})).toBeVisible();
 const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{const p=await other.newPage(),r=await browserRequests(p);expect((await r.post('/api/auth/register',{data:{email:`m4-other-${randomUUID()}@example.invalid`,username:'其他Owner',password:randomUUID()}})).status()).toBe(200);
  const plans=await r.get('/api/studio/plans',{params:{project_id:project.project_id}});expect(plans.status()).toBe(200);expect((await plans.json()).plans).toEqual([]);
  expect((await r.post('/api/studio/delegations/'+persisted!.delegation.delegation_id+'/controls',{data:{action:'revoke',request_id:randomUUID(),reason:'foreign'}})).status()).toBe(404);
 }finally{await other.close();}
});

test('ST-01 creates one project-bound immutable brief before research; HOLD and idempotent replay never auto-dispatch ST-04',async({page,browser})=>{
 const owner=await browserRequests(page);
 expect((await owner.post('/api/auth/register',{data:{email:`research-hold-${randomUUID()}@example.invalid`,username:'合成研究作者',password:randomUUID()}})).status()).toBe(200);
 await page.goto('/studio');
 await page.getByLabel('新研究项目名称',{exact:true}).fill('隋唐大运河研究·隔离验收');
 const projectResponse=page.waitForResponse(r=>r.url().endsWith('/api/studio/projects')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'创建研究项目',exact:true}).click();
 const project=(await(await projectResponse).json()).project;
 await expect(page.getByLabel('当前研究项目',{exact:true})).toHaveValue(project.project_id);

 const prompt='TEST_ONLY 研究隋唐运河与江南水路如何连接，逐项保留来源身份、修订与不确定性 '+randomUUID();
 await page.getByLabel('向墨痕委托或提问').fill(prompt);
 const requestWait=page.waitForRequest(r=>r.url().endsWith('/api/studio/research-tasks')&&r.method()==='POST');
 const responseWait=page.waitForResponse(r=>r.url().endsWith('/api/studio/research-tasks')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'发送',exact:true}).click();
 const [request,response]=await Promise.all([requestWait,responseWait]);
 const requestBody=request.postDataJSON();
 const body=await response.json();
 expect(response.status()).toBe(200);expect(body.status).toBe('hold');expect(body.hold_reason).toBe('research_prerequisites');
 expect(body.decision).toBeNull();expect(body.production).toBeNull();expect(body.replayed).toBe(false);
 expect(body.missing_requirements).toEqual(expect.arrayContaining(['REAL_PROVIDER_UNAVAILABLE','SOURCE_ACQUISITION_UNAVAILABLE']));
 expect(requestBody).toMatchObject({prompt,project_id:project.project_id});
 expect(requestBody.idempotency_key).toMatch(/^[a-f0-9-]{36}$/);
 await expect(page.getByText('委托已保存，研究暂停，尚未完成。',{exact:true})).toBeVisible();
 await expect(page.getByText('研究模型尚未接通',{exact:false})).toBeVisible();

 const task=body.task_id,briefRef=body.brief_asset_ref;
 expect(task).toBe(requestBody.idempotency_key);
 expect(briefRef).toMatchObject({asset_id:expect.any(String),revision_id:expect.any(String),revision_no:1});
 const assetResponse=await owner.get('/api/studio/assets',{params:{project_id:project.project_id}});
 expect(assetResponse.status()).toBe(200);expect(assetResponse.headers()['cache-control']).toBe('no-store');
 const briefs=(await assetResponse.json()).assets.filter((a:{asset_kind:string})=>a.asset_kind==='research_brief');
 expect(briefs).toHaveLength(1);
 const brief=briefs[0];
 expect(brief).toMatchObject({asset_id:briefRef.asset_id,revision_id:briefRef.revision_id,revision_no:1,
  origin_task_id:task,epistemic_class:'editorial',content_state:'WORKING',access_state:'RESTRICTED',
  freshness_state:'UNKNOWN_DEPENDENCY'});
 expect(brief.payload).toMatchObject({schema:'mohen.studio-research-brief.v1',question:prompt,
  topic:'generic',purpose:'research_and_creation',audience:null,audience_state:'not_specified'});
 expect(brief.origin_task_snapshot).toMatchObject({task_id:task,owner_user_id:expect.any(String),
  project_id:project.project_id,prompt,topic:'generic'});
 expect(brief.validation.status).toBe('UNASSESSED');
 expect(Object.values(brief.rights_by_action).every((v:string)=>v==='unknown')).toBe(true);

 const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
 if(!socket?.startsWith('/workspace/')||!/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'')||!psql)throw Error('ISOLATED_DATABASE_REQUIRED');
 const sql=(input:string)=>execFileSync(psql!,['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket!,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!],{input,encoding:'utf8'}).trim();
 expect(sql("select current_setting('mohen.test_instance',true)")).toBe('codex-k3-isolated');
 expect(sql(`select prompt from public.research_tasks where task_id='${task}'`)).toBe(prompt);
 const checkpoint=JSON.parse(sql(`select checkpoint from public.research_tasks where task_id='${task}'`));
 expect(checkpoint).toMatchObject({holdReason:'research_prerequisites',budgetSpent:0,reserved:0,retry_requires_reconciliation:false,
  studio:{project_id:project.project_id,brief_asset_id:briefRef.asset_id,brief_asset_ref:{asset_id:briefRef.asset_id,revision_id:briefRef.revision_id}}});
 expect(sql(`select count(*) from studio.asset_revisions where asset_id='${briefRef.asset_id}' and origin_task_id='${task}'`)).toBe('1');
 expect(sql(`select count(*) from public.study_asset_receipts where task_id='${task}' and kind='tool'`)).toBe('0');
 expect(sql(`select count(*) from public.research_events where task_id='${task}' and event='research_done'`)).toBe('0');
 expect(sql(`select count(*) from public.research_events where task_id='${task}' and event='brief_asset_saved'`)).toBe('1');
 expect(sql(`select count(*) from public.research_events where task_id='${task}' and event='production_requested'`)).toBe('0');

 // Lost acknowledgement/retry reuses the exact task and brief; changed content with same key conflicts.
 const replay=await owner.post('/api/studio/research-tasks',{data:requestBody});
 expect(replay.status()).toBe(200);const replayBody=await replay.json();
 expect(replayBody.replayed).toBe(true);expect(replayBody.task_id).toBe(task);
 expect(replayBody.brief_asset_ref).toEqual(briefRef);expect(replayBody.production).toBeNull();
 const replayAssets=await owner.get('/api/studio/assets',{params:{project_id:project.project_id}});
 expect((await replayAssets.json()).assets.filter((a:{asset_kind:string})=>a.asset_kind==='research_brief')).toHaveLength(1);
 const conflict=await owner.post('/api/studio/research-tasks',{data:{...requestBody,prompt:prompt+' changed'}});
 expect(conflict.status()).toBe(409);expect((await conflict.json()).reason).toBe('STUDIO_RESEARCH_TASK_IDEMPOTENCY_CONFLICT');
 expect((await owner.post('/api/studio/research-tasks',{data:{...requestBody,project_id:undefined}})).status()).toBe(400);
 expect((await owner.post('/api/studio/research-tasks',{data:{...requestBody,idempotency_key:undefined}})).status()).toBe(400);

 await page.reload();
 const reopened=await owner.get(`/api/studio/research-tasks/${task}/status`);
 expect(reopened.status()).toBe(200);expect((await reopened.json()).task.status).toBe('hold');
 const resumed=await owner.post(`/api/studio/research-tasks/${task}/resume`,{data:{}});
 expect(resumed.status()).toBe(409);expect((await resumed.json()).reason).toBe('research_prerequisites');
 expect(sql(`select count(*) from public.study_asset_receipts where task_id='${task}' and kind='tool'`)).toBe('0');
 const foreign=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const other=await browserRequests(await foreign.newPage());
  expect((await other.post('/api/auth/register',{data:{email:`research-foreign-${randomUUID()}@example.invalid`,username:'其他研究作者',password:randomUUID()}})).status()).toBe(200);
  expect((await other.get(`/api/studio/research-tasks/${task}/status`)).status()).toBe(403);
  expect((await other.post(`/api/studio/research-tasks/${task}/resume`,{data:{}})).status()).toBe(403);
  expect((await other.post('/api/studio/research-tasks',{data:requestBody})).status()).toBe(404);
 }finally{await foreign.close();}
 console.log('MAB_ST01_BRIEF_HTTP_PASS project-bound-immutable-origin idempotent-replay prerequisite-HOLD zero-tool-charge no-auto-ST04 owner-only');
});
