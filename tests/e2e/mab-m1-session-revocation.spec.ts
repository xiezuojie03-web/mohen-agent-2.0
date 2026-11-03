import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {browserRequests} from './mab-browser-request';

test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Only on the disposable isolated M1 HTTP runner.');

function isolatedSql(statement: string) {
  const socket=process.env.MOHEN_TEST_SOCKET;
  const database=process.env.MOHEN_TEST_DATABASE;
  const psql=process.env.MOHEN_TEST_PSQL;
  if(!socket?.startsWith('/workspace/') || !/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'') ||
      (!psql || !(psql==='/usr/bin/psql' || /^\/workspace\/work\/[a-zA-Z0-9_/-]+$/.test(psql))))throw Error('M1_ISOLATED_DATABASE_REQUIRED');
  const args=['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,
    '-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!];
  const marker=execFileSync(psql,args,{input:"select current_setting('mohen.test_instance',true)",encoding:'utf8'}).trim();
  if(marker!=='codex-k3-isolated')throw Error('M1_UNMARKED_DATABASE_REFUSED');
  return execFileSync(psql,args,{input:statement,encoding:'utf8'}).trim();
}

test('M1 session immediately loses private-project access after account is disabled',async({page})=>{
  const request=await browserRequests(page);
  const email=`m1-revocation-${randomUUID()}@example.invalid`;
  const password='SyntheticTest-'+randomUUID();
  const registration=await request.post('/api/auth/register',{
    data:{email,username:'隔离撤权用户',password},
  });
  expect(registration.status()).toBe(200);
  const user=(await registration.json()).user;
  expect(user.user_id).toMatch(/^[0-9a-f-]{36}$/);
  expect((await request.get('/api/studio/projects')).status()).toBe(200);
  const projectId=randomUUID();
  const project=await request.post('/api/studio/projects',{
    data:{project_id:projectId,title:'Synthetic M1 revocation fixture',scope:{}},
  });
  expect(project.status()).toBe(200);
  const prior=await request.get('/api/studio/projects');
  expect((await prior.json()).projects.some((p:{project_id:string})=>p.project_id===projectId)).toBe(true);
  // Only mutate the authenticated synthetic user in the freshly created DB.
  const changed=isolatedSql(`update public.users set status='disabled' where user_id='${user.user_id}' and email='${email}' returning user_id`);
  expect(changed).toBe(user.user_id);
  const after=await request.get('/api/studio/projects');
  expect(after.status()).toBe(401);
  const afterWrite=await request.post('/api/studio/projects',{
    data:{project_id:randomUUID(),title:'Must not be created',scope:{}},
  });
  expect(afterWrite.status()).toBe(401);
  const identity=await request.get('/api/auth/me');
  expect((await identity.json()).authenticated).toBe(false);
  const login=await request.post('/api/auth/login',{data:{email,password}});
  expect(login.status()).toBe(403);
  if(process.env.MOHEN_REVOCABLE_SESSIONS_ENABLED==='true') {
    isolatedSql(`update public.users set status='active' where user_id='${user.user_id}'`);
    expect((await request.get('/api/studio/projects')).status()).toBe(401);
    expect((await request.post('/api/auth/login',{data:{email,password}})).status()).toBe(200);
    expect((await request.get('/api/studio/projects')).status()).toBe(200);
  }
});

test('M1 logout invalidates cookie for subsequent private HTTP access',async({page})=>{
  const request=await browserRequests(page);
  const registration=await request.post('/api/auth/register',{data:{
    email:`m1-logout-${randomUUID()}@example.invalid`,
    username:'隔离退出用户',password:'SyntheticTest-'+randomUUID(),
  }});
  expect(registration.status()).toBe(200);
  expect((await request.get('/api/studio/projects')).status()).toBe(200);
  const logout=await request.post('/api/auth/logout');
  expect(logout.status()).toBe(200);
  expect((await request.get('/api/studio/projects')).status()).toBe(401);
  const identity=await request.get('/api/auth/me');
  expect((await identity.json()).authenticated).toBe(false);
});


test('HP02 copied cookie cannot replay logout; another independent session remains usable',async({page,browser})=>{
  test.skip(process.env.MOHEN_REVOCABLE_SESSIONS_ENABLED!=='true','Requires candidate migration in marked test DB.');
  const request=await browserRequests(page);
  const email=`m1-replay-${randomUUID()}@example.invalid`,password='Synthetic-'+randomUUID();
  expect((await request.post('/api/auth/register',{data:{email,username:'隔离重放用户',password}})).status()).toBe(200);
  const oldCookies=await page.context().cookies();
  const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
  const replay=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
  try {
    const otherRequest=await browserRequests(await other.newPage());
    expect((await otherRequest.post('/api/auth/login',{data:{email,password}})).status()).toBe(200);
    await replay.addCookies(oldCookies);
    const replayRequest=await browserRequests(await replay.newPage());
    expect((await replayRequest.get('/api/studio/projects')).status()).toBe(200);
    const results=await Promise.all([request.post('/api/auth/logout'),request.post('/api/auth/logout')]);
    expect(results.map(r=>r.status())).toEqual([200,200]);
    expect((await replayRequest.get('/api/studio/projects')).status()).toBe(401);
    expect((await otherRequest.get('/api/studio/projects')).status()).toBe(200);
    expect((await replayRequest.post('/api/auth/logout')).status()).toBe(200);
    expect((await replayRequest.get('/api/studio/projects')).status()).toBe(401);
  } finally {await replay.close();await other.close();}
});

test('HP02 logout UI preserves signed-in state when server revocation fails',async({page})=>{
  const request=await browserRequests(page);
  expect((await request.post('/api/auth/register',{data:{email:`m1-ui-${randomUUID()}@example.invalid`,username:'退出故障验收',password:'Synthetic-'+randomUUID()}})).status()).toBe(200);
  await page.goto('/studio/desk');
  await page.route('**/api/auth/logout',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,reason:'session_revocation_unavailable'})}));
  await expect(page.getByRole('button',{name:'用户',exact:true})).toHaveAttribute('title','退出故障验收');
  await page.getByRole('button',{name:'用户',exact:true}).click();
  await page.getByRole('button',{name:'退出登录',exact:true}).click();
  await expect(page.getByText('退出未完成，请重试。',{exact:true})).toBeVisible({timeout:3000});
  await expect(page.getByRole('button',{name:'用户',exact:true})).toHaveAttribute('title','退出故障验收');
  expect((await request.get('/api/studio/projects')).status()).toBe(200);
  await page.goto('/admin');
  await expect(page.locator('.admin__auth-btn')).toBeVisible();
  await page.locator('.admin__auth-btn').click();
  await expect(page.getByText('退出未完成，请重试。',{exact:true})).toBeVisible({timeout:3000});
  await expect(page.locator('.admin__auth-btn')).toBeVisible();
});
