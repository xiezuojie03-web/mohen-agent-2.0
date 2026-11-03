import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as access from '../../packages/data-access/src/index.mjs';
assert.equal(typeof access.createStudioAssetRepository,'function','Studio revisions require a transaction-backed store');
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const a=randomUUID(),b=randomUUID(),project=randomUUID(),asset=randomUUID();
const key='mab-repository-synthetic-attestation-key-at-least-32';
sql(`insert into public.users(user_id,email,username,password_hash)values('${a}','repo-a@example.invalid','A','synthetic'),('${b}','repo-b@example.invalid','B','synthetic');insert into control.session_verification_keys(verification_key)values('${key}')on conflict(key_slot)do update set verification_key=excluded.verification_key`);
const token=uid=>{const p=Buffer.from(JSON.stringify({uid,r:[],exp:Date.now()+60000})).toString('base64url');return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
const require=createRequire(new URL('../../packages/data-access/package.json',import.meta.url)),{Pool}=require('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:2});
const repo=access.createStudioAssetRepository(pool);
try {
 const p=await repo.createProject({projectId:project,title:'运河研究',scope:{period:'TEST_ONLY'}},token(a));
 assert.equal(p.project_id,project);
 assert.equal((await repo.listProjects(token(a))).length,1);
 assert.equal((await repo.listProjects(token(b))).length,0);
 const input={projectId:project,assetId:asset,kind:'research_brief',expectedRevisionId:null,idempotencyKey:'first',payload:{question:'synthetic canal question'},sourceRefs:[],dependencyRefs:[]};
 const first=await repo.saveRevision(input,token(a));
 assert.equal((await repo.listAssets(project,token(a))).length,1);
 assert.equal((await repo.listAssets(project,token(b))).length,0);
 assert.match(first.revision_id,/^[a-f0-9-]{36}$/);assert.equal(first.revision_no,1);assert.equal(first.payload.question,'synthetic canal question');
 assert.equal((await repo.saveRevision({...input,payload:{question:'synthetic canal question'}},token(a))).revision_id,first.revision_id,'retries return same immutable revision');
 await assert.rejects(()=>repo.saveRevision({...input,payload:{question:'different request'}},token(a)),/STUDIO_IDEMPOTENCY_CONFLICT/);
 assert.equal(await repo.getRevision(first.revision_id,token(b)),null,'different owner cannot read stored payload');
 await assert.rejects(()=>repo.saveRevision({...input,assetId:randomUUID()},token(b)),/STUDIO_PROJECT_NOT_FOUND/);
 const next={...input,expectedRevisionId:first.revision_id,idempotencyKey:'second',payload:{question:'new exact revision'}};
 const second=await repo.saveRevision(next,token(a));assert.equal(second.revision_no,2);assert.equal(second.supersedes_revision_id,first.revision_id);
 assert.equal((await repo.getRevision(first.revision_id,token(a))).payload.question,'synthetic canal question','old revision stays readable');
 await assert.rejects(()=>repo.saveRevision({...next,idempotencyKey:'stale'},token(a)),/STUDIO_REVISION_CONFLICT/);
 const concurrent=await Promise.allSettled(['a','b'].map(idempotencyKey=>repo.saveRevision({...next,idempotencyKey,expectedRevisionId:second.revision_id},token(a))));
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1,'one CAS wins');
 assert.match(concurrent.find(r=>r.status==='rejected').reason.message,/STUDIO_REVISION_CONFLICT/);
 await assert.rejects(()=>repo.saveRevision({...input,assetId:randomUUID(),payload:undefined},token(a)),/STUDIO_PAYLOAD_REQUIRED/);
 await assert.rejects(()=>repo.saveRevision({...input,assetId:randomUUID(),kind:'not-a-real-kind'},token(a)),/STUDIO_ASSET_KIND_INVALID/);
 await assert.rejects(()=>repo.saveRevision({...input,assetId:randomUUID(),kind:'work_revision'},token(a)),/STUDIO_CANONICAL_BINDING_REQUIRED/,'do not create a second work body');
 await assert.rejects(()=>repo.saveRevision({...input,assetId:randomUUID(),originKind:'external_delegate'},token(a)),/STUDIO_ORIGIN_BINDING_REQUIRED/,'external provenance needs verified delegation binding');
 assert.equal(sql(`select count(*) from studio.asset_revisions where asset_id='${asset}'`),'3');
 // A revocation between write and readback must roll back, never return an empty success.
 const current=concurrent.find(r=>r.status==='fulfilled').value;
 const lineage=await repo.listAssetRevisions(project,asset,token(a));
 assert.equal(lineage.length,3,'owner sees all exact immutable revisions');
 assert.deepEqual(lineage.map(x=>x.revision_no),[3,2,1],
   'lineage orders newest to oldest and preserves old versions');
 assert.equal((await repo.listAssetRevisions(project,asset,token(b))).length,0,
   'another owner sees no revision history');
 const useRevision=lineage[0].revision_id;
 sql(`insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)
   values('${project}','${useRevision}','${a}','studio','fixture_research','read','fixture_only_no_actual_rights')`);
 const uses=await repo.listRevisionUseEvents(project,useRevision,token(a));
 assert.equal(uses.length,1,'owner can trace a stored use-event');
 assert.equal(uses[0].rights_decision_ref,'fixture_only_no_actual_rights');
 assert.equal((await repo.listRevisionUseEvents(project,useRevision,token(b))).length,0,
   'cross-owner cannot infer use-event history');
 assert.equal((await repo.listRevisionUseEvents(project,first.revision_id,token(a))).length,0,
   'use-event belongs to exact revision, not a different one');

 sql(`create function studio.fixture_disable_after_save()returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin if new.asset_id='${asset}'::uuid then update public.users set status='disabled' where user_id='${a}';end if;return new;end$$;create trigger fixture_disable_after_save after update on studio.asset_heads for each row execute function studio.fixture_disable_after_save()`);
 try {
  await assert.rejects(()=>repo.saveRevision({...next,idempotencyKey:'revoked-during-save',expectedRevisionId:current.revision_id},token(a)),/STUDIO_REVISION_NOT_PERSISTED/);
  assert.equal(sql(`select count(*) from studio.asset_revisions where asset_id='${asset}'`),'3');
  assert.equal(sql(`select status from public.users where user_id='${a}'`),'active','failed save rolls back test-only concurrent revoke too');
 }finally{sql(`drop trigger fixture_disable_after_save on studio.asset_heads;drop function studio.fixture_disable_after_save();update public.users set status='active' where user_id='${a}'`);}

 for(let i=0;i<2;i++){const c=await pool.connect();const state=(await c.query("select current_user as role,coalesce(current_setting('mohen.session_token',true),'')as token")).rows[0];assert.equal(state.role,'k3_admin');assert.equal(state.token,'');c.release();}
 console.log('MAB_STUDIO_REPOSITORY_PASS saved-payload immutable-revision request-idempotency exact-CAS concurrency cross-owner clean-pool');
}finally{await pool.end();}
