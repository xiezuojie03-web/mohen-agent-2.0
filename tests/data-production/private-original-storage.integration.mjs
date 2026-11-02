// Real official Supabase Storage HTTP API, synthetic local-only instance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createPrivateOriginalStorage,privateOriginalKey,originalHash} from '../../packages/data-access/src/private-original-storage.mjs';
const config=JSON.parse(readFileSync(process.env.MOHEN_TEST_STORAGE_CONFIG??''));
const origin=new URL(config.origin);
if(origin.hostname!=='127.0.0.1'||origin.protocol!=='http:'||config.database!=='mohen_storage_official_test')throw Error('OFFICIAL_LOCAL_SYNTHETIC_STORAGE_REQUIRED');
const requests=[];
const fetcher=async(url,options)=>{
 const source=new URL(url);assert.equal(source.origin,'https://storage.isolated.invalid');
 requests.push({method:options.method,path:source.pathname});
 return fetch(origin.origin+source.pathname.replace(/^\/storage\/v1/,''),options);
};
const storage=createPrivateOriginalStorage({endpoint:'https://storage.isolated.invalid',token:config.serviceKey,fetcher});
const key=privateOriginalKey(randomUUID(),randomUUID()),raw=Buffer.from('Synthetic original for official Supabase Storage API protocol verification.');
await assert.rejects(()=>storage.readVerified(key,originalHash(raw),raw.length),/ORIGINAL_NOT_FOUND/,'official API reports HTTP400 with object-not-found 404 body');
try{
 const saved=await storage.putVerified(key,raw,'text/plain');
 assert.equal(saved.sha256,originalHash(raw));assert.deepEqual(await storage.readVerified(key,saved.sha256,raw.length),raw);
 await assert.rejects(()=>storage.putVerified(key,Buffer.from('overwrite')),/ORIGINAL_STORAGE_UPLOAD_FAILED/);
 for(const path of ['/object/public/','/object/authenticated/']){
  const r=await fetch(origin.origin+path+'mohen-private-originals/'+key);assert.ok(r.status>=400,'no anonymous public URL can read original bytes');
 }
 const denied=createPrivateOriginalStorage({endpoint:'https://storage.isolated.invalid',token:config.anonKey,fetcher});
 await assert.rejects(()=>denied.readVerified(key,saved.sha256,raw.length),/ORIGINAL_NOT_FOUND|ORIGINAL_STORAGE_GET_FAILED/);
 const corrupt=await fetch(origin.origin+'/object/mohen-private-originals/'+key,{method:'POST',headers:{Authorization:'Bearer '+config.serviceKey,apikey:config.serviceKey,'x-upsert':'true','Content-Type':'text/plain'},body:'synthetic corruption'});
 assert.equal(corrupt.status,200);
 await assert.rejects(()=>storage.readVerified(key,saved.sha256,raw.length),/ORIGINAL_INTEGRITY_FAILED/);
 console.log('MAB_OFFICIAL_STORAGE_PASS official='+config.sourceTag+' real-HTTP immutable-upload private-GET public-anon-denied exact-hash corruption-detected');
}finally{await storage.discardUnverified(key);}
