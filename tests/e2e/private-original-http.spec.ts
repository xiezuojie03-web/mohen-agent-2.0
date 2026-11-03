import {test,expect} from '@playwright/test';
import {createHash,randomUUID} from 'node:crypto';
import {browserRequests} from './mab-browser-request';

test.skip(process.env.MOHEN_E2E_ISOLATED!=='1'||!process.env.MOHEN_TEST_STORAGE_CONFIG,'Requires the marked isolated PG + official Storage runner.');
test.beforeAll(()=>{const u=new URL(process.env.MOHEN_E2E_BASE_URL??'');if(u.hostname!=='127.0.0.1'||u.protocol!=='http:')throw Error('LOCAL_SYNTHETIC_HTTP_REQUIRED');});
test('authenticated multipart original reaches private Storage and returns identical bytes with owner isolation',async({page,browser})=>{
 const request=await browserRequests(page);
 const bytes=Buffer.from('Synthetic browser original, never real historical material.');
 const expectedHash=createHash('sha256').update(bytes).digest('hex');
 const anonymous=await request.get('/api/studio/attachments?original_id='+randomUUID());expect(anonymous.status()).toBe(401);
 const registered=await request.post('/api/auth/register',{data:{email:`original-${randomUUID()}@example.invalid`,username:'隔离原件用户A',password:randomUUID()}});expect(registered.status()).toBe(200);
 const projectId=randomUUID();expect((await request.post('/api/studio/projects',{data:{project_id:projectId,title:'合成原件浏览器验证',scope:{}}})).status()).toBe(200);
 const multipart={project_id:projectId,idempotency_key:'original-browser-stable-key',rights_declared:'true',file:{name:'synthetic.txt',mimeType:'text/plain',buffer:bytes}};
 const response=await request.post('/api/studio/attachments',{multipart});expect(response.status()).toBe(201);
 const receipt=await response.json();expect(receipt.state).toBe('STORED_VERIFIED');expect(receipt.sha256).toBe(expectedHash);expect(JSON.stringify(receipt)).not.toMatch(/storage_key|serviceKey|https:/);
 const retry=await request.post('/api/studio/attachments',{multipart});expect(retry.status()).toBe(201);expect((await retry.json()).revision_id).toBe(receipt.revision_id);
 const read=await request.get('/api/studio/attachments?original_id='+receipt.original_id);expect(read.status()).toBe(200);expect(read.headers()['cache-control']).toBe('no-store');expect(Buffer.compare(await read.body(),bytes)).toBe(0);
 const list=await request.get('/api/studio/assets',{params:{project_id:projectId}});expect((await list.json()).assets).toHaveLength(1);
 const second=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const secondRequest=await browserRequests(await second.newPage());
  expect((await secondRequest.post('/api/auth/register',{data:{email:`original-b-${randomUUID()}@example.invalid`,username:'隔离原件用户B',password:randomUUID()}})).status()).toBe(200);
  expect((await secondRequest.get('/api/studio/attachments?original_id='+receipt.original_id)).status()).toBe(404);
  expect((await secondRequest.post('/api/studio/attachments',{multipart:{...multipart,idempotency_key:'foreign-project-attempt'}})).status()).toBe(404);
 }finally{await second.close();}
 expect((await request.post('/api/studio/attachments',{multipart:{...multipart,rights_declared:'false'}})).status()).toBe(400);
 expect((await request.post('/api/studio/attachments',{multipart:{...multipart,file:{name:'synthetic.txt',mimeType:'text/plain',buffer:Buffer.from('different body')}}})).status()).toBe(409);
 await page.goto('/studio/desk');await expect(page.getByRole('heading',{name:'我的研究记录'})).toBeVisible();
});
