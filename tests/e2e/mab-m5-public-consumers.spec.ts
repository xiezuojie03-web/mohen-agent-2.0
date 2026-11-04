import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {browserRequests} from './mab-browser-request';

test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Marked disposable HTTP database only.');

test('legacy agent PASS cannot leak through public knowledge search or cached material endpoint',async({request})=>{
 const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
 if(!socket?.startsWith('/workspace/')||!/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'')||
  !psql||!(psql==='/usr/bin/psql'||/^\/workspace\/work\/[a-zA-Z0-9_/-]+$/.test(psql)))throw Error('M5_ISOLATED_DATABASE_REQUIRED');
 const args=['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!];
 const sql=(input:string)=>execFileSync(psql,args,{input,encoding:'utf8'}).trim();
 if(sql("select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('M5_UNMARKED_DATABASE_REFUSED');
 const run=randomUUID(),id=randomUUID(),secret='legacy-knowledge-'+randomUUID();
 sql(`insert into control.production_runs(run_id,research_intent,execution_mode,status) values('${run}','synthetic-only','attended','PASS');
 insert into read_model.story_seeds(story_seed_id,seed_key,title,payload) values('${id}','${secret}','${secret}','{}');
 insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result,consumer) values('${run}','D05','G5','story_seed','${id}','PASS','agent');`);
 const found=await request.get('/api/search?q='+secret);
 expect(found.status()).toBe(200);expect((await found.json()).knowledge).toEqual([]);
 expect(found.headers()['cache-control']).toContain('no-store');
 for(let attempt=0;attempt<2;attempt++){
  const response=await request.post('/api/mohen/materials',{data:{terms:[secret],qualification:{consumer:'agent',purpose:{namespace:'G5',code:'fixture',version:'1'},scope:{project:'fixture'}}}});
  expect(response.status()).toBe(200);expect(await response.json()).toEqual({ok:false,degraded:true,materials:[]});
  expect(response.headers()['cache-control']).toContain('no-store');
 }
});

test('legacy published pointer without current G5 discloses no work through public consumers',async({page})=>{
 const request=await browserRequests(page);
 expect((await request.post('/api/auth/register',{data:{email:`m5-${randomUUID()}@example.invalid`,username:'隔离作者',password:randomUUID()}})).status()).toBe(200);
 const workId=randomUUID(),title='M5-private-'+randomUUID(),secret='unqualified-private-'+randomUUID();
 const created=await request.post('/api/works',{data:{creation_id:workId,title,content:{beats:[{narration:secret}]}}});
 expect(created.status()).toBe(200);const {revision_id:revisionId}=await created.json();
 expect(revisionId).toMatch(/^[a-f0-9-]{36}$/);
 const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
 if(!socket?.startsWith('/workspace/')||!/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'')||
  !psql||!(psql==='/usr/bin/psql'||/^\/workspace\/work\/[a-zA-Z0-9_/-]+$/.test(psql)))throw Error('M5_ISOLATED_DATABASE_REQUIRED');
 const args=['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!];
 const sql=(input:string)=>execFileSync(psql,args,{input,encoding:'utf8'}).trim();
 if(sql("select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('M5_UNMARKED_DATABASE_REFUSED');
 // Deliberately construct a legacy editorial pointer, NOT a signed G5.
 sql(`update publication.work_revisions set status='published' where revision_id='${revisionId}';
 insert into publication.published_pointers(work_id,revision_id,published_by) values('${workId}','${revisionId}','synthetic-legacy');`);
 expect(sql(`select count(*) from publication.published_pointers where work_id='${workId}'`)).toBe('1');
 const anonymous=await page.context().browser()!.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const client=anonymous.request;
  for(const url of ['/api/public/works','/api/works/published','/api/public/works/'+workId+'/related','/api/search?q='+encodeURIComponent(title)]){
   const response=await client.get(url);expect(response.status()).toBe(200);
   const body=await response.text();expect(body).not.toContain(workId);expect(body).not.toContain(secret);
   expect(response.headers()['cache-control']).toContain('no-store');
  }
  for(const suffix of ['', '/program','/share']){
   const response=await client.get('/api/public/works/'+workId+suffix);expect(response.status()).toBe(404);
   expect(await response.text()).not.toContain(secret);expect(response.headers()['cache-control']).toContain('no-store');
  }
  const eligibility=await client.get('/api/public/works/'+workId+'/eligibility');
  expect((await eligibility.json()).eligible).toBe(false);
  // Public refusal must retain the private draft/revision and audit identity.
  expect((await request.get('/api/studio/works/'+workId+'/status')).status()).toBe(200);
  expect(sql(`select count(*) from publication.work_revisions where revision_id='${revisionId}'`)).toBe('1');
 }finally{await anonymous.close();}
});
