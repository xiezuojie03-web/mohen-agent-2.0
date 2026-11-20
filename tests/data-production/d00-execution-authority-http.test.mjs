import assert from 'node:assert/strict';
import test from 'node:test';
import {createD00ExecutionAuthorityHandler} from '../../pipelines/data-production/orchestrator/d00-execution-authority-http.mjs';

const issueCredential='a'.repeat(40),verifyCredential='b'.repeat(40);
const request=(path,credential,body='{}')=>new Request('https://authority.example.invalid'+path,{
 method:'POST',headers:{authorization:'Bearer '+credential,'content-type':'application/json'},body,
});
test('routes issuance and consumption through distinct credentials and bounded JSON',async()=>{
 const calls=[];
 const handler=createD00ExecutionAuthorityHandler({issueCredential,verifyCredential,authority:{
  issue:async body=>{calls.push('issue');return {token:body.token};},
  consume:async()=>{calls.push('consume');return {allowed:true};},
 }});
 assert.equal((await handler(request('/token',verifyCredential))).status,401);
 assert.equal((await handler(request('/consume',issueCredential))).status,401);
 assert.equal((await handler(request('/token?x=1',issueCredential))).status,404);
 assert.equal((await handler(request('/token',issueCredential,JSON.stringify({input:'x'.repeat(17000)})))).status,413);
 assert.equal((await handler(request('/consume',verifyCredential,'null'))).status,400);
 assert.deepEqual(calls,[]);
 const issued=await handler(request('/token',issueCredential,'{"token":"fixture"}'));
 assert.deepEqual(await issued.json(),{token:'fixture'});
 assert.equal(issued.headers.get('cache-control'),'no-store');
 assert.equal((await handler(request('/consume',verifyCredential))).status,200);
 assert.deepEqual(calls,['issue','consume']);
});
test('hides internal errors and rejects shared credentials',async()=>{
 const authority={
  issue:async()=>{throw Error('D00_EXECUTION_AUTHORITY_DENIED');},
  consume:async()=>{throw Error('internal credential detail');},
 };
 assert.throws(()=>createD00ExecutionAuthorityHandler({authority,issueCredential,verifyCredential:issueCredential}),/CONFIG/);
 const handler=createD00ExecutionAuthorityHandler({authority,issueCredential,verifyCredential});
 assert.equal((await handler(request('/token',issueCredential))).status,403);
 const unavailable=await handler(request('/consume',verifyCredential));
 assert.equal(unavailable.status,503);
 assert.doesNotMatch(await unavailable.text(),/internal credential/);
});
