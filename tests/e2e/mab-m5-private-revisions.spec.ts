import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {browserRequests} from './mab-browser-request';
test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Disposable marked HTTP database only.');
async function draft(page:Parameters<typeof browserRequests>[0]){
 const request=await browserRequests(page);
 const registered=await request.post('/api/auth/register',{data:{email:`m5-private-${randomUUID()}@example.invalid`,username:'Private author',password:randomUUID()}});
 expect(registered.status()).toBe(200);
 const ownerUserId=String((await registered.json()).user.user_id);
 const work=randomUUID(),content={beats:[{title:'first',narration:'saved first',provenanceRefs:['synthetic-source']},{title:'second',narration:'saved second',provenanceRefs:['synthetic-source-2']}]};
 const response=await request.post('/api/works',{data:{creation_id:work,title:'Private revision fixture',content}});
 expect(response.status()).toBe(200);
 const created=await response.json();
 expect(created.revision_id).toBeTruthy();
 return {request,work,content,revisionId:String(created.revision_id),ownerUserId};
}
test('private preview returns the saved body and does not disclose it to another Owner',async({page,browser})=>{
 const {request,work,content}=await draft(page);
 const preview=await request.post(`/api/studio/works/${work}/preview`);
 expect(preview.status()).toBe(200);expect((await preview.json()).preview).toEqual(content);
 const other=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{const foreign=await browserRequests(await other.newPage());
  expect((await foreign.post('/api/auth/register',{data:{email:`other-${randomUUID()}@example.invalid`,username:'Other',password:randomUUID()}})).status()).toBe(200);
  expect((await foreign.post(`/api/studio/works/${work}/preview`)).status()).toBe(403);
 }finally{await other.close();}
});
test('parallel narration edits have one immutable revision winner and explicit version conflicts',async({page})=>{
 const {request,work}=await draft(page);
 const responses=await Promise.all(Array.from({length:8},(_,i)=>request.post(`/api/studio/works/${work}/narration`,{data:{expected_revision_no:1,beat_index:0,narration:'writer-'+i}})));
 const statuses=responses.map(r=>r.status());expect(statuses.filter(s=>s===200)).toHaveLength(1);
 expect(statuses.filter(s=>s===409)).toHaveLength(7);
 const winner=await responses[statuses.indexOf(200)].json();expect(winner.revision_no).toBe(2);
 const preview=await request.post(`/api/studio/works/${work}/preview`);
 expect((await preview.json()).preview.beats).toEqual([{title:'first',narration:'writer-'+statuses.indexOf(200),provenanceRefs:['synthetic-source']},{title:'second',narration:'saved second',provenanceRefs:['synthetic-source-2']}]);
 const submitted=await request.post(`/api/studio/works/${work}/submissions`,{data:{revision_id:winner.revision_id}});
 expect(submitted.status()).toBe(200);expect((await submitted.json()).revision_id).toBe(winner.revision_id);
 expect((await request.post(`/api/studio/works/${work}/submissions`,{data:{revision_id:winner.revision_id}})).status()).toBe(200);
 expect((await request.post(`/api/studio/works/${work}/beat-order`,{data:{expected_revision_no:1,order:[1,0]}})).status()).toBe(409);
 const ordered=await request.post(`/api/studio/works/${work}/beat-order`,{data:{expected_revision_no:2,order:[1,0]}});
 expect(ordered.status()).toBe(200);expect((await ordered.json()).revision_no).toBe(3);
});

test('real PG: concurrent forks have one CAS winner, retries are idempotent, historical restore preserves source',async({page,browser})=>{
 const {request,work,content,revisionId}=await draft(page);
 const url=`/api/studio/works/${work}`;
 const attempts=Array.from({length:8},()=>randomUUID());
 const results=await Promise.all(attempts.map(operation_id=>request.post(url+'/fork',{
  data:{source_revision_id:revisionId,expected_revision_no:1,operation_id}
 })));
 const codes=results.map(r=>r.status());
 expect(codes.filter(s=>s===200)).toHaveLength(1);
 expect(codes.filter(s=>s===409)).toHaveLength(7);
 const winner=codes.indexOf(200),forked=await results[winner].json();
 expect(forked.revision_no).toBe(2);
 // The exact previous acknowledgement must survive a lost HTTP response.
 const retried=await request.post(url+'/fork',{
  data:{source_revision_id:revisionId,expected_revision_no:1,operation_id:attempts[winner]}
 });
 expect(retried.status()).toBe(200);
 expect((await retried.json()).revision_id).toBe(forked.revision_id);
 expect((await request.post(url+'/restore',{
  data:{source_revision_id:revisionId,expected_revision_no:1,operation_id:randomUUID()}
 })).status()).toBe(409);
 const restored=await request.post(url+'/restore',{
  data:{source_revision_id:revisionId,expected_revision_no:2,operation_id:randomUUID()}
 });
 expect(restored.status()).toBe(200);
 expect((await restored.json()).revision_no).toBe(3);
 const snapshot=await request.post(url+'/preview');
 expect(snapshot.status()).toBe(200);
 const actual=(await snapshot.json()).preview;
 expect(actual.beats).toEqual(content.beats);
 expect(actual.fork_source).toEqual({work_id:work,revision_id:revisionId,revision_no:1});
 expect(actual.content_hash).toMatch(/^[a-f0-9]{64}$/);
 const missing=await request.post(url+'/restore',{
  data:{source_revision_id:randomUUID(),expected_revision_no:3,operation_id:randomUUID()}
 });
 expect(missing.status()).toBe(404);
 // The work route must refuse a second Owner before it can look up private
 // historical source revisions.
 const foreignContext=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const foreign=await browserRequests(await foreignContext.newPage());
  expect((await foreign.post('/api/auth/register',{data:{
   email:`m5-fork-foreign-${randomUUID()}@example.invalid`,username:'Other author',password:randomUUID()
  }})).status()).toBe(200);
  expect((await foreign.post(url+'/restore',{
   data:{source_revision_id:revisionId,expected_revision_no:3}
  })).status()).toBe(403);
 }finally{await foreignContext.close();}
});

/** Fixture insertion is only permitted into the disposable marked PG17
 * database created by scripts/test-mab-http.mjs. No network, Provider, or
 * production data is read, and no fake plan is qualified as historic evidence. */
function isolatedSql(input:string):string{
 const socket=process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE,psql=process.env.MOHEN_TEST_PSQL;
 if(process.env.MOHEN_E2E_ISOLATED!=='1'||!socket?.startsWith('/workspace/')||
    !/^mohen_k3_http_[a-f0-9]{32}_test$/.test(database??'')||
    !psql||!(psql==='/usr/bin/psql'||/^\/workspace\/work\/[a-zA-Z0-9_/-]+$/.test(psql)))
  throw Error('M5_DIRECTOR_DISPOSABLE_PG_REQUIRED');
 const args=['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!];
 const exec=(sql:string)=>execFileSync(psql,args,{input:sql,encoding:'utf8'}).trim();
 if(exec("select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('M5_DIRECTOR_UNMARKED_PG_REFUSED');
 return exec(input);
}
function seedSyntheticDirectorPlan(ownerUserId:string,planId:string,angle:string){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 if(!uuid.test(ownerUserId)||!uuid.test(planId))throw Error('M5_DIRECTOR_FIXTURE_INVALID_UUID');
 const plan={angle,points:['synthetic-only'],cover:'No actual historical image',directorDecisions:['synthetic fixture']};
 const beats=[{title:'Synthetic evidence placeholder',narration:'Not a historical claim',visual:'synthetic',directorTimecodeMs:0,provenanceRefs:['fixture-only']}];
 const finding={motifCodes:['M1'],historicalQuestion:'fixture?',understandingDelta:'synthetic',supportScope:'synthetic only',limitations:['Not historical evidence']};
 const quote=(v:unknown)=>"'"+JSON.stringify(v).replace(/'/g,"''")+"'::jsonb";
 isolatedSql(`insert into public.director_plans
  (plan_id,owner_user_id,brief,topic,plan_a,plan_b,facts,finding,selected,beats)
  values ('${planId}'::uuid,'${ownerUserId}'::uuid,'Synthetic-only','synthetic',
    ${quote(plan)},${quote(plan)},'[]'::jsonb,${quote(finding)},'A',${quote(beats)})`);
 return {plan,beats,finding};
}
test('real PG: director commit binds Owner and exact plan, races safely and acknowledges a lost response',async({page,browser})=>{
 const {request,work,ownerUserId}=await draft(page);
 const planIds=Array.from({length:8},()=>randomUUID());
 const plans=planIds.map((id,i)=>seedSyntheticDirectorPlan(ownerUserId,id,'synthetic-director-'+i));
 const target=`/api/studio/works/${work}/revisions`;
 const sent=await Promise.all(planIds.map(plan_id=>request.post(target,{data:{plan_id,expected_revision_no:1}})));
 const codes=sent.map(r=>r.status());
 expect(codes.filter(s=>s===200)).toHaveLength(1);
 expect(codes.filter(s=>s===409)).toHaveLength(7);
 const winner=codes.indexOf(200),committed=await sent[winner].json();
 expect(committed.revisionNo).toBe(2);
 const restored=await request.post(target,{data:{plan_id:planIds[winner],expected_revision_no:1}});
 expect(restored.status()).toBe(200);
 expect((await restored.json()).revisionId).toBe(committed.revisionId);
 const preview=await request.post(`/api/studio/works/${work}/preview`);
 expect(preview.status()).toBe(200);
 expect((await preview.json()).preview).toMatchObject({
   director_source:{plan_id:planIds[winner],selected:'A'},
   plan:{angle:plans[winner].plan.angle},beats:plans[winner].beats
 });
 const loser=await request.post(target,{data:{plan_id:planIds[(winner+1)%8],expected_revision_no:1}});
 expect(loser.status()).toBe(409);
 const otherContext=await browser.newContext({baseURL:process.env.MOHEN_E2E_BASE_URL});
 try{
  const other=await browserRequests(await otherContext.newPage());
  const foreign=await other.post('/api/auth/register',{data:{
    email:`m5-director-foreign-${randomUUID()}@example.invalid`,username:'Foreign author',password:randomUUID()
  }});
  expect(foreign.status()).toBe(200);
  const foreignOwnerId=String((await foreign.json()).user.user_id);
  const otherWork=randomUUID();
  expect((await other.post('/api/works',{data:{creation_id:otherWork,title:'Other owner work'}})).status()).toBe(200);
  // An authorized foreign work cannot borrow a director source from Owner A.
  expect((await other.post(`/api/studio/works/${otherWork}/revisions`,{
    data:{plan_id:planIds[winner],expected_revision_no:1}
  })).status()).toBe(400);
  // A foreign session may not append to the original Owner's work.
  expect((await other.post(target,{data:{plan_id:planIds[winner],expected_revision_no:2}})).status()).toBe(403);
  expect(foreignOwnerId).not.toBe(ownerUserId);
 }finally{await otherContext.close();}
});
