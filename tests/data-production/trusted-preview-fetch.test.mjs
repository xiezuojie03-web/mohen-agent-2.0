import assert from 'node:assert/strict';
import test from 'node:test';
import {createTrustedPreviewFetch} from '../../pipelines/data-production/orchestrator/trusted-preview-fetch.mjs';

test('forwards platform identity only to the exact configured Preview host',async()=>{
 const seen=[];
 const host='authority-preview.vercel.app';
 const fetcher=createTrustedPreviewFetch({
  MOHEN_D00_PREVIEW_OIDC_TOKEN:'fixture-token',MOHEN_D00_AUTHORITY_PREVIEW_HOST:host,
 },async (url,init)=>{seen.push({url,init});});
 for(const url of ['https://'+host+'/api/token','https://'+host+'.other.example','http://'+host,'https://'+host+':8443']){
  await fetcher(url,{headers:{authorization:'Bearer fixture'}});
 }
 assert.equal(seen[0].init.headers.get('x-vercel-trusted-oidc-idp-token'),'fixture-token');
 assert.equal(seen[0].init.headers.get('authorization'),'Bearer fixture');
 assert.equal(seen[0].init.redirect,'error');
 for(const call of seen.slice(1))assert.ok(!new Headers(call.init.headers).has('x-vercel-trusted-oidc-idp-token'));
});
