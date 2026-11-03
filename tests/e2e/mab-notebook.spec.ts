import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {browserRequests} from './mab-browser-request';

test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Run through the marked isolated test-mab-http runner.');
test.beforeAll(()=>{
  const url=new URL(process.env.MOHEN_E2E_BASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.protocol!=='http:')throw new Error('LOCAL_SYNTHETIC_HTTP_REQUIRED');
});

test('private notebook saves, reloads exact revisions, isolates owners and avoids duplicate assets after a lost acknowledgement',async({page,browser})=>{
  const registered=await page.request.post('/api/auth/register',{data:{email:`mab-${randomUUID()}@example.invalid`,username:'隔离研究者A',password:randomUUID()}});
  expect(registered.status()).toBe(200);
  await page.goto('/studio/desk');
  await expect(page.getByRole('heading',{name:'我的研究记录'})).toBeVisible();
  await page.getByLabel('新项目名称',{exact:true}).fill('运河研究·隔离验收');
  const createdResponse=page.waitForResponse(r=>r.url().endsWith('/api/studio/projects')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'创建项目',exact:true}).click();
  const project=(await (await createdResponse).json()).project;
  await expect(page.getByLabel('当前研究项目',{exact:true})).toHaveValue(project.project_id);
  await page.getByLabel('记录标题',{exact:true}).fill('第一份运河提纲');
  await page.getByLabel('记录内容',{exact:true}).fill('第一版合成研究提纲，不是正式历史结论。');
  const firstResponse=page.waitForResponse(r=>r.url().endsWith('/api/studio/assets')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  const first=(await (await firstResponse).json()).asset;
  expect(first.revision_no).toBe(1);
  await expect(page.getByRole('status')).toContainText('已保存第1版');
  await page.reload();
  await page.getByRole('button',{name:'第一份运河提纲 · 第1版',exact:true}).click();
  await expect(page.getByLabel('记录内容',{exact:true})).toHaveValue('第一版合成研究提纲，不是正式历史结论。');
  await page.getByLabel('记录内容',{exact:true}).fill('第二版补充了研究问题，仍是私人待核笔记。');
  const secondResponse=page.waitForResponse(r=>r.url().endsWith('/api/studio/assets')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  const second=(await (await secondResponse).json()).asset;
  expect(second.asset_id).toBe(first.asset_id);expect(second.revision_no).toBe(2);expect(second.revision_id).not.toBe(first.revision_id);
  await page.getByRole('button',{name:'查看上一版',exact:true}).click();
  await expect(page.getByLabel('记录内容',{exact:true})).toHaveValue('第一版合成研究提纲，不是正式历史结论。');
  await expect(page.getByLabel('记录内容',{exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'返回最新版',exact:true}).click();
  await expect(page.getByLabel('记录内容',{exact:true})).toHaveValue('第二版补充了研究问题，仍是私人待核笔记。');

  const history=await page.evaluate(async ({projectId,assetId})=>{
    const response=await fetch('/api/studio/assets?history=1&project_id='+projectId+'&asset_id='+assetId);
    return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};
  },{projectId:project.project_id,assetId:first.asset_id});
  expect(history.status).toBe(200);expect(history.cache).toBe('no-store');
  expect(history.body.revisions.map((r:{revision_id:string})=>r.revision_id)).toEqual([second.revision_id,first.revision_id]);

  const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
  try {
    const otherPage=await other.newPage();
    const otherRequest=await browserRequests(otherPage);
    const registeredB=await otherRequest.post('/api/auth/register',{data:{email:`mab-${randomUUID()}@example.invalid`,username:'隔离研究者B',password:randomUUID()}});
    expect(registeredB.status()).toBe(200);
    const projects=await otherRequest.get('/api/studio/projects');expect((await projects.json()).projects).toEqual([]);
    const foreignList=await otherRequest.get('/api/studio/assets',{params:{project_id:project.project_id}});expect((await foreignList.json()).assets).toEqual([]);
    const foreignRead=await otherRequest.get('/api/studio/assets',{params:{asset_id:first.asset_id,revision_id:first.revision_id}});expect(foreignRead.status()).toBe(404);
    const foreignHistory=await otherRequest.get('/api/studio/assets',{params:{history:'1',project_id:project.project_id,asset_id:first.asset_id}});
    expect(foreignHistory.status()).toBe(200);expect((await foreignHistory.json()).revisions).toEqual([]);
    const foreignUses=await otherRequest.get('/api/studio/assets',{params:{use_events:'1',project_id:project.project_id,revision_id:first.revision_id}});
    expect(foreignUses.status()).toBe(200);expect((await foreignUses.json()).events).toEqual([]);
    const foreignSave=await otherRequest.post('/api/studio/assets',{data:{project_id:project.project_id,asset_id:randomUUID(),asset_kind:'research_brief',expected_revision_id:null,idempotency_key:randomUUID(),payload:{text:'forged'}}});expect(foreignSave.status()).toBe(404);
  }finally{await other.close();}

  await page.getByRole('button',{name:'新建记录',exact:true}).click();
  await page.getByLabel('记录标题',{exact:true}).fill('网络回执丢失验收');
  await page.getByLabel('记录内容',{exact:true}).fill('首次保存已写入，但浏览器收不到成功回执。');
  let hideAcknowledgement=true;
  await page.route('**/api/studio/assets',async route=>{
    if(route.request().method()==='POST'&&hideAcknowledgement){
      hideAcknowledgement=false;const result=await route.fetch();expect(result.status()).toBe(200);
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})});
    }else await route.continue();
  });
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('暂时无法');
  await page.getByLabel('记录内容',{exact:true}).fill('修改后的未保存输入，应保留而不是生成第二份同一记录。');
  const retry=page.waitForResponse(r=>r.url().endsWith('/api/studio/assets')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  expect((await retry).status()).toBe(409);
  await expect(page.getByLabel('记录内容',{exact:true})).toHaveValue('修改后的未保存输入，应保留而不是生成第二份同一记录。');
  const finalList=await page.evaluate(async projectId=>{
    const response=await fetch('/api/studio/assets?project_id='+projectId);
    return {status:response.status,body:await response.json()};
  },project.project_id);
  expect(finalList.status).toBe(200);
  expect(finalList.body.assets).toHaveLength(2);
});
