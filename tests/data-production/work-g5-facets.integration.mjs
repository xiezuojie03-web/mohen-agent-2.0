import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {seedWorkG5} from '../fixtures/mab-work-g5.mjs';
import {createWorkQualificationReader} from '../../packages/data-access/src/work-qualification-reader.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('MARKED_WORK_FACET_DATABASE_REQUIRED');
const sql=input=>execFileSync(psql,['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
sql("insert into control.session_verification_keys(verification_key)values('synthetic-mab-http-database-key-at-least-32')on conflict(key_slot)do update set verification_key=excluded.verification_key");
const {Pool}=createRequire(new URL('../../packages/data-access/package.json',import.meta.url))('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database});
const reader=createWorkQualificationReader(pool);
const contexts=['watch','visual_stage','agent','evidence_on_demand'].map(consumer=>({consumer,purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:{project:'m5-http'}}));
try{
 for(const kind of ['world_projection','agent_context','story_seed','discovery_path','map_timeline_projection','evidence_pointer']){
  const f=seedWorkG5(sql,{kind});
  for(const ctx of contexts)assert.equal(await reader.check(f.work,f.revision,ctx,f.content),true,kind+' '+ctx.consumer+' current exact positive');
  sql(`update read_model.${f.table} set generated_at=generated_at+interval '1 second' where ${f.key}='${f.story}'`);
  for(const ctx of contexts)assert.equal(await reader.check(f.work,f.revision,ctx,f.content),false,kind+' changed physical L5 fingerprint');
  f.revoke();
  for(const ctx of contexts)assert.equal(await reader.check(f.work,f.revision,ctx,f.content),false,kind+' revoked root');
  assert.equal(sql(`select count(*)from publication.work_revisions where revision_id='${f.revision}'`),'1');
  console.log('MAB_WORK_L5_FACET_PASS '+kind+' four-consumers POS exact-revision NEG fingerprint-change ancestor-revoke');
 }
 // Even a signed whole-work receipt does not bypass the local per-media guard.
 for(const media of [[{rights_status:'cleared',license:''}],[{rights_status:'unknown',license:'TEST_ONLY'}],
  [{rights_status:'cleared',license:'TEST_ONLY',valid_until:'2000-01-01T00:00:00Z'}]]){
  const f=seedWorkG5(sql,{workContent:{beats:[{narration:'TEST_ONLY media'}],media}});
  for(const ctx of contexts)assert.equal(await reader.check(f.work,f.revision,ctx,f.content),false,'signed media still needs clear action rights/license/expiry');
 }
 const allowed=seedWorkG5(sql,{workContent:{beats:[{narration:'TEST_ONLY media positive'}],media:[{rights_status:'cleared',license:'TEST_ONLY',valid_until:new Date(Date.now()+600000).toISOString()}]}});
 for(const ctx of contexts)assert.equal(await reader.check(allowed.work,allowed.revision,ctx,allowed.content),true,'signed exact complete media and separate action rights');
 const url=new URL(`postgresql://k3_admin:synthetic@localhost:${process.env.MOHEN_TEST_PORT??55432}/${database}`);url.searchParams.set('host',socket);
 const app=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.work-binding-db.config.ts'],{
  env:{...process.env,DATABASE_URL:url.toString(),MOHEN_DATABASE_PASSWORD:'synthetic',MOHEN_DB_DRIVER:'pg',
   MOHEN_WORK_BINDING_FIXTURE:JSON.stringify({work:allowed.work,revision:allowed.revision,content:allowed.content})},stdio:'inherit'});
 assert.equal(app.status,0,'actual application WorkRevision qualification wrapper');
 console.log('MAB_WORK_MEDIA_RIGHTS_PASS signed-whole-work four-consumers cleared license expiry POS_NEG');
}finally{await pool.end();}
