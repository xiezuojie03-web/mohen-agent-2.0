import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {browserRequests} from './mab-browser-request';
test.skip(process.env.MOHEN_E2E_ISOLATED!=='1','Disposable marked HTTP database only.');
async function draft(page:Parameters<typeof browserRequests>[0]){
 const request=await browserRequests(page);
 expect((await request.post('/api/auth/register',{data:{email:`m5-private-${randomUUID()}@example.invalid`,username:'Private author',password:randomUUID()}})).status()).toBe(200);
 const work=randomUUID(),content={beats:[{title:'first',narration:'saved first',provenanceRefs:['synthetic-source']},{title:'second',narration:'saved second',provenanceRefs:['synthetic-source-2']}]};
 const response=await request.post('/api/works',{data:{creation_id:work,title:'Private revision fixture',content}});
 expect(response.status()).toBe(200);
 return {request,work,content};
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
