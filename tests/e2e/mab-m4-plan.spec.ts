import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
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
