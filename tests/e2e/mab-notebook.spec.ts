import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {browserRequests} from './mab-browser-request';

test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Run through the marked isolated test-mab-http runner.');
test.beforeAll(()=>{
  const url=new URL(process.env.MOHEN_E2E_BASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.protocol!=='http:')throw new Error('LOCAL_SYNTHETIC_HTTP_REQUIRED');
});

test('ST-02 reads current project candidates over real authenticated HTTP and rejects other owners',async({page,browser})=>{
 const owner=await browserRequests(page);
 expect((await owner.post('/api/auth/register',{data:{email:`st02-${randomUUID()}@example.invalid`,username:'ST02研究者',password:randomUUID()}})).status()).toBe(200);
 const projectId=randomUUID(),assetId=randomUUID();
 expect((await owner.post('/api/studio/projects',{data:{project_id:projectId,title:'ST02合成项目',scope:{}}})).status()).toBe(200);
 const saved=await owner.post('/api/studio/assets',{data:{project_id:projectId,asset_id:assetId,
  asset_kind:'reading_note',expected_revision_id:null,idempotency_key:randomUUID(),payload:{literal_reading:'合成材料，仅待核候选'}}});
 expect(saved.status()).toBe(200);const revision=(await saved.json()).asset.revision_id;
 const read=await owner.post('/api/studio/research-read',{data:{project_id:projectId}});
 expect(read.status()).toBe(200);expect(read.headers()['cache-control']).toBe('no-store');
 const result=await read.json();expect(result.externalProcessingAllowed).toBe(false);
 expect(result.materials).toHaveLength(1);expect(result.materials[0]).toMatchObject({id:`studio:${assetId}@${revision}`,epistemic:'RESEARCH_LEAD',entityIds:[]});
 expect(result.snapshot.original_refs).toEqual([]);expect(result.snapshot.storage_key_exposed).toBe(false);
 const replay=await owner.post('/api/studio/research-read',{data:{project_id:projectId}});
 expect(replay.status()).toBe(200);expect((await replay.json()).snapshot.snapshot_hash).toBe(result.snapshot.snapshot_hash);
 const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const client=await browserRequests(await other.newPage());
  const anonymous=await client.post('/api/studio/research-read',{data:{project_id:projectId}});
  expect(anonymous.status()).toBe(401);
  expect((await client.post('/api/auth/register',{data:{email:`st02-other-${randomUUID()}@example.invalid`,username:'ST02另一研究者',password:randomUUID()}})).status()).toBe(200);
  const forbidden=await client.post('/api/studio/research-read',{data:{project_id:projectId}});
  expect(forbidden.status()).toBe(404);expect(forbidden.headers()['cache-control']).toBe('no-store');
  expect(JSON.stringify(await forbidden.json())).not.toContain('合成材料');
 }finally{await other.close();}
 console.log('MAB_ST02_CANDIDATE_HTTP_PASS current-revision owner-only no-store no-provider no-formal-G');
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
  const firstSaved=await firstResponse;
  expect(firstSaved.headers()['cache-control']).toBe('no-store');
  const first=(await firstSaved.json()).asset;
  expect(first.revision_no).toBe(1);
  await expect(page.getByRole('status')).toContainText('已保存第1版');
  await page.reload();
  await page.getByRole('button',{name:'第一份运河提纲 · 第1版',exact:true}).click();
  await expect(page.getByLabel('记录内容',{exact:true})).toHaveValue('第一版合成研究提纲，不是正式历史结论。');
  await page.getByLabel('记录内容',{exact:true}).fill('第二版补充了研究问题，仍是私人待核笔记。');
  const secondResponse=page.waitForResponse(r=>r.url().endsWith('/api/studio/assets')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  const secondSaved=await secondResponse;
  expect(secondSaved.headers()['cache-control']).toBe('no-store');
  const second=(await secondSaved.json()).asset;
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
  const ownList=await page.evaluate(async projectId=>{
    const response=await fetch('/api/studio/assets?project_id='+projectId);
    return {status:response.status,cache:response.headers.get('cache-control')};
  },project.project_id);
  expect(ownList.status).toBe(200);expect(ownList.cache).toBe('no-store');
  expect(history.body.revisions.map((r:{revision_id:string})=>r.revision_id)).toEqual([second.revision_id,first.revision_id]);

  const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
  try {
    const otherPage=await other.newPage();
    const otherRequest=await browserRequests(otherPage);
    const registeredB=await otherRequest.post('/api/auth/register',{data:{email:`mab-${randomUUID()}@example.invalid`,username:'隔离研究者B',password:randomUUID()}});
    expect(registeredB.status()).toBe(200);
    const projects=await otherRequest.get('/api/studio/projects');expect((await projects.json()).projects).toEqual([]);
    const foreignList=await otherRequest.get('/api/studio/assets',{params:{project_id:project.project_id}});expect((await foreignList.json()).assets).toEqual([]);
    const foreignRead=await otherRequest.get('/api/studio/assets',{params:{asset_id:first.asset_id,revision_id:first.revision_id}});
    expect(foreignRead.status()).toBe(404);
    expect(foreignRead.headers()['cache-control']).toBe('no-store');
    const foreignHistory=await otherRequest.get('/api/studio/assets',{params:{history:'1',project_id:project.project_id,asset_id:first.asset_id}});
    expect(foreignHistory.status()).toBe(200);expect((await foreignHistory.json()).revisions).toEqual([]);
    expect(foreignHistory.headers()['cache-control']).toBe('no-store');
    const foreignUses=await otherRequest.get('/api/studio/assets',{params:{use_events:'1',project_id:project.project_id,revision_id:first.revision_id}});
    expect(foreignUses.status()).toBe(200);expect((await foreignUses.json()).events).toEqual([]);
    expect(foreignUses.headers()['cache-control']).toBe('no-store');
    const foreignSave=await otherRequest.post('/api/studio/assets',{data:{project_id:project.project_id,asset_id:randomUUID(),asset_kind:'research_brief',expected_revision_id:null,idempotency_key:randomUUID(),payload:{text:'forged'}}});
    expect(foreignSave.status()).toBe(404);
    expect(foreignSave.headers()['cache-control']).toBe('no-store');
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

test('all thirteen asset kinds keep exact private revisions and canonical write boundaries over real HTTP',async({page,browser})=>{
 const api=await browserRequests(page),email=`matrix-${randomUUID()}@example.invalid`,password=randomUUID();
 const registered=await api.post('/api/auth/register',{data:{email,username:'逐类合成验收',password}});
 expect(registered.status()).toBe(200);const owner=(await registered.json()).user.user_id;
 let inspected:{asset_id:string;first:string;second:string}|undefined;
 let inspectedFeedback:{asset_id:string;first:string;second:string}|undefined;
 const project=(await (await api.post('/api/studio/projects',{data:{project_id:randomUUID(),title:'13类隔离矩阵',scope:{period:'TEST_ONLY'}}})).json()).project;
 const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const foreign=await browserRequests(await other.newPage());
  expect((await foreign.post('/api/auth/register',{data:{email:`matrix-other-${randomUUID()}@example.invalid`,username:'另一个Owner',password:randomUUID()}})).status()).toBe(200);
  const payloads:Record<string,unknown>={
   research_brief:{question:'TEST_ONLY 运河',scope:'合成',purpose:'research',budget:0},
   source_anchor:{source_version:'TEST_ONLY_UNVERIFIED',locator:{page:1},rights:'unknown'},
   reading_note:{read_unit:'TEST_ONLY_UNVERIFIED',method:'C01',uncertainty:['待核']},
   evidence_note:{source_voice:'TEST_ONLY',counterevidence:'待核',locator:{page:1}},
   spacetime_candidate:{period_original:'合成时期',precision:'unknown',alternative_locations:[]},
   relation_hypothesis:{subject:'合成甲',predicate:'待核',object:'合成乙',direction:'unknown',counterevidence:[]},
   humanistic_insight:{comparison_basis:'TEST_ONLY',present_connection:'合成生活',competing_explanations:['待核']},
   research_collection:{references:[]},citation_snapshot:{qualification_snapshot:'UNVERIFIED',recheck_required:true},
   consented_feedback:{consent:true,withdrawal_allowed:true,text:'TEST_ONLY feedback'}
  };
  const evidenceBearing=new Set(['source_anchor','reading_note','evidence_note','spacetime_candidate','relation_hypothesis']);
  for(const [kind,payload] of Object.entries(payloads)){
   const data={project_id:project.project_id,asset_id:randomUUID(),asset_kind:kind,expected_revision_id:null as string|null,idempotency_key:randomUUID(),payload,
    source_refs:[] as unknown[],dependency_refs:[]};
   if(evidenceBearing.has(kind)){
    // Evidence-bearing assets must carry at least one verified backlink; an
    // unverifiable or absent source is refused instead of stored as a gap.
    const dangling=await api.post('/api/studio/assets',{data:{...data,source_refs:[{type:'source_version',id:randomUUID()}]}});
    expect(dangling.status(),kind).toBe(409);
    expect((await dangling.json()).reason,kind).toContain('STUDIO_REFERENCE_UNRESOLVED');
    const empty=await api.post('/api/studio/assets',{data});
    expect(empty.status(),kind).toBe(409);
    expect((await empty.json()).reason,kind).toBe('STUDIO_SOURCE_REFERENCE_REQUIRED');
    console.log('MAB_HTTP_ASSET_BACKLINK_DENIED '+kind+' dangling-ref + no-source-ref refused');
    continue;
   }
   const created=await api.post('/api/studio/assets',{data});expect(created.status(),kind).toBe(200);
   const first=(await created.json()).asset;
   const secondResponse=await api.post('/api/studio/assets',{data:{...data,expected_revision_id:first.revision_id,idempotency_key:randomUUID(),payload:{...payload as object,changed:true}}});
   expect(secondResponse.status(),kind).toBe(200);const second=(await secondResponse.json()).asset;
   if(kind==='research_brief')inspected={asset_id:data.asset_id,first:first.revision_id,second:second.revision_id};
   if(kind==='consented_feedback')inspectedFeedback={asset_id:data.asset_id,first:first.revision_id,second:second.revision_id};
   expect(second.revision_no).toBe(2);expect(second.supersedes_revision_id).toBe(first.revision_id);
   expect(second.access_state).toBe('RESTRICTED');expect(second.content_state).toBe('WORKING');
   expect(second.validation.status).toBe('UNASSESSED');expect(second.formal_l_refs).toEqual([]);
   expect(Object.values(second.rights_by_action).every(x=>x==='unknown')).toBe(true);
   const history=await api.get('/api/studio/assets',{params:{history:'1',project_id:project.project_id,asset_id:data.asset_id}});
   expect((await history.json()).revisions.map((r:{revision_id:string})=>r.revision_id)).toEqual([second.revision_id,first.revision_id]);
   const old=await api.get('/api/studio/assets',{params:{asset_id:data.asset_id,revision_id:first.revision_id}});
   expect((await old.json()).asset.payload).toEqual(payload);
   expect((await foreign.get('/api/studio/assets',{params:{asset_id:data.asset_id,revision_id:first.revision_id}})).status()).toBe(404);
   const foreignHistory=await foreign.get('/api/studio/assets',{params:{history:'1',project_id:project.project_id,asset_id:data.asset_id}});
   expect((await foreignHistory.json()).revisions).toEqual([]);
   expect((await foreign.post('/api/studio/assets',{data:{...data,idempotency_key:randomUUID()}})).status()).toBe(404);
   console.log('MAB_HTTP_ASSET_KIND_PASS '+kind);
  }
  for(const asset_kind of ['director_plan','media_selection','work_revision']){
   const response=await api.post('/api/studio/assets',{data:{project_id:project.project_id,asset_id:randomUUID(),asset_kind,expected_revision_id:null,idempotency_key:randomUUID(),payload:{text:'do not duplicate canonical body'}}});
   expect(response.status()).toBe(409);expect((await response.json()).reason).toBe('STUDIO_CANONICAL_BINDING_REQUIRED');
   console.log('MAB_HTTP_CANONICAL_KIND_DENIED '+asset_kind);
  }
  // Elevate only this synthetic account through the marked test administrator;
  // re-login exercises the real session role lookup, never a forged cookie.
  const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
  if(!socket?.startsWith('/workspace/')||!/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'')||!psql||!inspected)throw Error('MARKED_ADMIN_TEST_REQUIRED');
  const sql=(input:string)=>execFileSync(psql!,['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket!,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!],{input,encoding:'utf8'}).trim();
  expect(sql("select current_setting('mohen.test_instance',true)")).toBe('codex-k3-isolated');
  sql(`update public.users set roles=array['member','operator'] where user_id='${owner}';
   insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)
   values('${project.project_id}','${inspected.second}','${owner}','studio','TEST_ONLY','read','TEST_ONLY no-public-grant')`);
  await api.post('/api/auth/logout');expect((await api.post('/api/auth/login',{data:{email,password}})).status()).toBe(200);
  await page.goto('/admin');await page.getByRole('button',{name:'知识资产',exact:true}).click();
  const panel=page.getByRole('region',{name:'本人有权访问的受限知识资产'});
  await expect(panel.getByText('13类隔离矩阵',{exact:true})).toBeVisible();
  const card=panel.getByText('research_brief · 修订 2',{exact:true}).locator('..');
  await card.getByRole('button',{name:'查看来源与历史',exact:true}).click();
  await expect(panel.getByText('选定版本使用事件 1 条',{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'查看修订 1',exact:true}).click();
  await expect(panel.getByText('选定版本使用事件 0 条',{exact:true})).toBeVisible();
  await expect(panel.getByText('资产 '+inspected.asset_id+' · 修订 '+inspected.first,{exact:true})).toBeVisible();
  await expect(panel.getByText('read: unknown',{exact:false})).toBeVisible();
  await panel.getByRole('button',{name:'查看修订 2',exact:true}).click();
  await expect(panel.getByText('选定版本使用事件 1 条',{exact:true})).toBeVisible();
  console.log('MAB_ADMIN_EXACT_REVISION_HTTP_PASS own-item history rights exact-use-event');
  // Same Owner now operates consent withdrawal from the existing Admin panel,
  // never as a public/Gate permission. No form of client-side revocation alone.
  expect(inspectedFeedback).toBeDefined();
  const feedbackCard=panel.getByText('consented_feedback · 修订 2',{exact:true}).locator('..');
  await feedbackCard.getByRole('button',{name:'查看来源与历史',exact:true}).click();
  await panel.getByRole('button',{name:'撤回反馈',exact:true}).click();
  await expect(panel.getByRole('button',{name:'确认撤回反馈',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'确认撤回反馈',exact:true}).click();
  const revokedCard=panel.getByText('consented_feedback · 修订 3',{exact:true}).locator('..');
  await expect(revokedCard).toBeVisible();
  await revokedCard.getByRole('button',{name:'查看来源与历史',exact:true}).click();
  await expect(panel.getByText(/此反馈已撤回/)).toBeVisible();
  const oldBody=await api.get('/api/studio/assets',{params:{
    asset_id:inspectedFeedback!.asset_id,revision_id:inspectedFeedback!.first
  }});
  expect(oldBody.status()).toBe(404);
  console.log('MAB_ADMIN_FEEDBACK_WITHDRAW_HTTP_PASS two-step-confirmation exact-Owner revoked-head no-old-body');

 }finally{await other.close();}
});
