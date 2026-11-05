import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
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
  expect(response.status()).toBe(200);expect(await response.json()).toEqual({ok:true,degraded:false,materials:[]});
  expect(response.headers()['cache-control']).toContain('no-store');
 }
});

test('visual stage, Agent materials and Evidence on Demand enforce their own live G5 over real product HTTP',async({page,request})=>{
 const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
 if(!socket?.startsWith('/workspace/')||!/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'')||!psql)throw Error('ISOLATED_DATABASE_REQUIRED');
 const sql=(input:string)=>execFileSync(psql!,['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket!,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!],{input,encoding:'utf8'}).trim();
 const {seedWorkG5}=await import('../fixtures/mab-work-g5.mjs');
 const owner=await browserRequests(page);
 expect((await owner.post('/api/auth/register',{data:{email:`consumer-${randomUUID()}@example.invalid`,username:'隔离消费者',password:randomUUID()}})).status()).toBe(200);
 for(const consumer of ['visual_stage','agent','evidence_on_demand'] as const){
  const kind=consumer==='visual_stage'?'world_projection':consumer==='agent'?'story_seed':'evidence_pointer';
  const read=async(fixture:ReturnType<typeof seedWorkG5>)=>{
   const response=consumer==='visual_stage'?await owner.get('/api/explore/spatial?topic=TEST_ONLY:'+fixture.story):
    consumer==='agent'?await request.post('/api/mohen/materials',{data:{terms:[fixture.story],qualification:{consumer,purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:{project:'m5-http'}}}}):
    await request.get('/api/public/evidence/'+fixture.story+'?consumer=visual_stage');
   expect(response.headers()['cache-control']).toContain('no-store');
   const body=await response.json();
   return {status:response.status(),body,found:consumer==='visual_stage'?body.entities?.includes(fixture.story):
    consumer==='agent'?body.materials?.some((m:{id:string})=>m.id===fixture.story):body.ok===true};
  };
  const valid=seedWorkG5(sql,{kind,consumers:[consumer]});
  expect((await read(valid)).found,consumer+' positive actual entry').toBe(true);
  for(const [reason,options] of [
   ['purpose',{purposeCode:'other-purpose'}],['scope',{scope:{project:'other-project'}}],
   ['consumer',{consumers:['watch']}],['rights',{actionOverrides:{[consumer]:'download'}}],
  ] as const){
   const fixture=seedWorkG5(sql,{kind,consumers:[consumer],...options});
   expect((await read(fixture)).found,consumer+' denies wrong '+reason).toBe(false);
  }
  const expired=seedWorkG5(sql,{kind,consumers:[consumer],g5Validity:'100 milliseconds'});
  sql('select pg_sleep(0.15)');
  expect((await read(expired)).found,consumer+' expiry').toBe(false);
  const stale=seedWorkG5(sql,{kind,consumers:[consumer]});
  sql(`update read_model.${stale.table} set ${kind==='evidence_pointer'?"display_excerpt='TEST_ONLY changed revision'":kind==='story_seed'?"title='TEST_ONLY changed revision'":"payload='{}'"} where ${stale.key}='${stale.story}'`);
  expect((await read(stale)).found,consumer+' stale physical revision').toBe(false);
  valid.revoke();
  // Repeat exactly the successful request: a cached response must not survive.
  expect((await read(valid)).found,consumer+' ancestor revoked/cache invalidated').toBe(false);
  const available=seedWorkG5(sql,{kind,consumers:[consumer]});
  expect((await read(available)).found).toBe(true);
  sql('alter table control.qualification_current rename to qualification_current_test_unavailable');
  try{
   const unavailable=await read(available);
   expect(unavailable.found).toBe(false);
   if(consumer==='evidence_on_demand')expect(unavailable.status).toBe(503);
   if(consumer==='agent')expect(unavailable.body.degraded).toBe(true);
  }finally{sql('alter table control.qualification_current_test_unavailable rename to qualification_current');}
  expect((await read(available)).found,consumer+' recovery must revalidate').toBe(true);
  console.log('MAB_PRODUCT_CONSUMER_HTTP_PASS',consumer,'POS purpose/scope/consumer/action/expiry/revision/ancestor/cache/service-recovery NEG');
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

test('current independent G0-G5 permits only the bound work and WATCH loses it immediately on ancestor withdrawal',async({request,page,browser})=>{
 const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
 if(!socket?.startsWith('/workspace/')||!/^mohen_k3_http_[a-f0-9]+_test$/.test(database??'')||!psql)throw Error('ISOLATED_DATABASE_REQUIRED');
 const sql=(input:string)=>execFileSync(psql!,['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket!,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!],{input,encoding:'utf8'}).trim();
 const {seedWorkG5}=await import('../fixtures/mab-work-g5.mjs');
 const fixture=seedWorkG5(sql);
 // Four consumers exercise the core PG reader, not four HTTP endpoints.
 // WATCH additionally traverses the actual application wrapper over Next HTTP.
 const {createWorkQualificationReader}=await import('../../packages/data-access/src/work-qualification-reader.mjs');
 const {Pool}=createRequire(path.join(process.cwd(),'packages/data-access/package.json'))('pg');
 const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database});
 const reader=createWorkQualificationReader(pool);
 const checkReader=async(work:string,revision:string,consumer:string,content:Record<string,unknown>)=>({ok:await reader.check(work,revision,{consumer,purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:{project:'m5-http'}},content)});
 try {
 for(const consumer of ['watch','visual_stage','agent','evidence_on_demand'] as const){
  expect(await checkReader(fixture.work,fixture.revision,consumer,fixture.content)).toEqual({ok:true});
  expect((await checkReader(fixture.work,randomUUID(),consumer,fixture.content)).ok).toBe(false);
 }
 for(const suffix of ['', '/program','/share']){
  const response=await request.get('/api/public/works/'+fixture.work+suffix);
  expect(response.status()).toBe(200);expect(response.headers()['cache-control']).toContain('no-store');
 }
 expect((await (await request.get('/api/public/works')).text())).toContain(fixture.work);

 // ST-08/ST-09: use the real submit -> separate editorial Reviewer ->
 // Operator publish/withdraw endpoints; fixture G5 remains a distinct actor.
 const operator=await browserRequests(page),email=`st09-${randomUUID()}@example.invalid`,password=randomUUID();
 const registration=await operator.post('/api/auth/register',{data:{email,username:'合成运营',password}});
 expect(registration.status()).toBe(200);const operatorId=(await registration.json()).user.user_id;
 sql(`delete from publication.published_pointers where work_id='${fixture.work}';
  update publication.work_revisions set status='draft' where revision_id='${fixture.revision}';
  update publication.works set owner_user_id='${operatorId}' where work_id='${fixture.work}';
  update public.users set roles=array['member','creator','operator'] where user_id='${operatorId}'`);
 expect((await operator.post('/api/auth/login',{data:{email,password}})).status()).toBe(200);
 expect((await operator.post(`/api/studio/works/${fixture.work}/submissions`,{data:{revision_id:fixture.revision}})).status()).toBe(200);
 expect((await (await operator.post(`/api/works/${fixture.work}/publish`)).json()).reason).toBe('reviewer_not_approved');
 expect((await operator.post('/api/governance/gates/decisions',{data:{work_id:fixture.work,revision_id:fixture.revision,decision:'approved'}})).status()).toBe(403);
 const reviewContext=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const reviewer=await browserRequests(await reviewContext.newPage());
  const reviewerEmail=`editor-${randomUUID()}@example.invalid`,reviewerPassword=randomUUID();
  const registered=await reviewer.post('/api/auth/register',{data:{email:reviewerEmail,username:'合成作品审核者',password:reviewerPassword}});
  const reviewerId=(await registered.json()).user.user_id;
  sql(`update public.users set roles=array['member','reviewer'] where user_id='${reviewerId}'`);
  expect((await reviewer.post('/api/auth/login',{data:{email:reviewerEmail,password:reviewerPassword}})).status()).toBe(200);
  const wrong=await reviewer.post('/api/governance/gates/decisions',{data:{work_id:fixture.work,revision_id:randomUUID(),decision:'approved'}});
  expect(wrong.status()).toBe(400);
  expect((await reviewer.post('/api/governance/gates/decisions',{data:{work_id:fixture.work,revision_id:fixture.revision,decision:'approved'}})).status()).toBe(200);
  expect((await (await operator.post(`/api/works/${fixture.work}/publish`)).json()).ok).toBe(true);
  expect(sql(`select revision_id from publication.published_pointers where work_id='${fixture.work}'`)).toBe(fixture.revision);
  expect((await request.get('/api/public/works/'+fixture.work)).status()).toBe(200);
 }finally{await reviewContext.close();}
 fixture.revoke();
 for(const consumer of ['watch','visual_stage','agent','evidence_on_demand'] as const)
  expect((await checkReader(fixture.work,fixture.revision,consumer,fixture.content)).ok).toBe(false);
 for(const suffix of ['', '/program','/share']){
  const response=await request.get('/api/public/works/'+fixture.work+suffix);expect(response.status()).toBe(404);
 }
 expect(await (await request.get('/api/public/works')).text()).not.toContain(fixture.work);
 expect((await (await operator.post(`/api/admin/publications/${fixture.work}/unpublish`)).json()).ok).toBe(true);
 expect(sql(`select count(*) from publication.published_pointers where work_id='${fixture.work}'`)).toBe('0');
 expect(sql(`select count(*) from publication.work_revisions where revision_id='${fixture.revision}'`)).toBe('1');
 console.log('MAB_ST08_ST09_HTTP_PASS exact-submit separate-editor operator-publish ancestor-recheck withdraw');
 console.log('MAB_WORK_G5_HTTP_PASS WATCH POS/NEG/current-ancestor-revoke four-consumer-real-PG-service');
 }finally{await pool.end();}
});
