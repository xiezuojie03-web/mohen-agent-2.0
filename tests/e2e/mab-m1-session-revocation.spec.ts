import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';

test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Only on the disposable isolated M1 HTTP runner.');

function isolatedSql(statement: string) {
  const socket=process.env.MOHEN_TEST_SOCKET;
  const database=process.env.MOHEN_TEST_DATABASE;
  const psql=process.env.MOHEN_TEST_PSQL;
  if(!socket?.startsWith('/workspace/') || !/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'') ||
      psql!=='/usr/bin/psql')throw Error('M1_ISOLATED_DATABASE_REQUIRED');
  const args=['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,
    '-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!];
  const marker=execFileSync(psql,args,{input:"select current_setting('mohen.test_instance',true)",encoding:'utf8'}).trim();
  if(marker!=='codex-k3-isolated')throw Error('M1_UNMARKED_DATABASE_REFUSED');
  return execFileSync(psql,args,{input:statement,encoding:'utf8'}).trim();
}

test('M1 session immediately loses private-project access after account is disabled',async({request})=>{
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
});

test('M1 logout invalidates cookie for subsequent private HTTP access',async({request})=>{
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
