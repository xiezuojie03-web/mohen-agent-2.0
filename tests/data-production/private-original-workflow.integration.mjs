// Real PG + official Storage HTTP, synthetic fixtures, fault injection at I/O boundaries.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createStudioAssetRepository,createPrivateOriginalRepository,createPrivateOriginalWorkflow} from '../../packages/data-access/src/index.mjs';
import {createPrivateOriginalStorage,originalHash} from '../../packages/data-access/src/private-original-storage.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const config=JSON.parse(readFileSync(process.env.MOHEN_TEST_STORAGE_CONFIG??''));
if(new URL(config.origin).hostname!=='127.0.0.1'||new URL(config.origin).protocol!=='http:'||config.database!=='mohen_storage_official_test')throw Error('OFFICIAL_LOCAL_SYNTHETIC_STORAGE_REQUIRED');
const a=randomUUID(),b=randomUUID(),project=randomUUID(),key='synthetic-original-workflow-attestation-at-least-32';
sql(`insert into public.users(user_id,email,username,password_hash)values('${a}','workflow-a@example.invalid','A','synthetic'),('${b}','workflow-b@example.invalid','B','synthetic');insert into control.session_verification_keys(verification_key)values('${key}')on conflict(key_slot)do update set verification_key=excluded.verification_key`);
const token=uid=>{const p=Buffer.from(JSON.stringify({uid,r:[],exp:Date.now()+60000})).toString('base64url');return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
const {Pool}=createRequire(new URL('../../packages/data-access/package.json',import.meta.url))('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:3});
const repository=createPrivateOriginalRepository(pool),assets=createStudioAssetRepository(pool);
let loseUploadResponse=false,posts=0,reads=0;
const fetcher=async(url,opts)=>{
 const u=new URL(url);assert.equal(u.origin,'https://storage.isolated.invalid');
 if(opts.method==='POST')posts++;if(opts.method==='GET')reads++;
 const response=await fetch(config.origin+u.pathname.replace(/^\/storage\/v1/,''),opts);
 if(opts.method==='POST'&&loseUploadResponse){loseUploadResponse=false;await response.arrayBuffer();throw new Error('SYNTHETIC_UPLOAD_ACK_LOST');}
 return response;
};
const storage=createPrivateOriginalStorage({endpoint:'https://storage.isolated.invalid',token:config.serviceKey,fetcher});
const workflow=createPrivateOriginalWorkflow({repository,storage});
const bytes=Buffer.from('Synthetic original for actual DB/object two-system recovery test.');
const input=(suffix)=>({projectId:project,originalId:randomUUID(),assetId:randomUUID(),idempotencyKey:'workflow-'+suffix,bytes,fileName:'synthetic.txt',contentType:'text/plain'});
const cleanup=[];
try{
 await assets.createProject({projectId:project,title:'原件跨系统隔离验证',scope:{}},token(a));
 const first=input('timeout');cleanup.push(first);
 const beforePosts=posts;
 await assert.rejects(()=>workflow.upload(first,token(b)),/STUDIO_PROJECT_NOT_FOUND/);assert.equal(posts,beforePosts,'RLS rejection before privileged object access');
 loseUploadResponse=true;
 const saved=await workflow.upload(first,token(a));assert.equal(saved.state,'STORED_VERIFIED');
 assert.deepEqual((await workflow.download(saved.original_id,token(a))).bytes,bytes);
 await assert.rejects(()=>workflow.download(saved.original_id,token(b)),/ORIGINAL_NOT_FOUND/);
 const noMoreWrites=posts;
 assert.equal((await workflow.upload({...first,originalId:randomUUID(),assetId:randomUUID()},token(a))).asset_revision_id,saved.asset_revision_id);
 assert.equal(posts,noMoreWrites,'acknowledged or lost-response retry never overwrites');
 await assert.rejects(()=>workflow.upload({...first,bytes:Buffer.from('different body')},token(a)),/ORIGINAL_IDEMPOTENCY_CONFLICT/);
 const interrupted=input('db-rollback');cleanup.push(interrupted);
 sql(`create function studio.fixture_original_finalize_failure()returns trigger language plpgsql as $$begin if new.asset_id='${interrupted.assetId}'::uuid then raise exception 'SYNTHETIC_FINALIZE_DB_FAILURE';end if;return new;end$$;create trigger fixture_original_finalize_failure before insert on studio.asset_revisions for each row execute function studio.fixture_original_finalize_failure()`);
 try{await assert.rejects(()=>workflow.upload(interrupted,token(a)),/SYNTHETIC_FINALIZE_DB_FAILURE/);}finally{sql('drop trigger fixture_original_finalize_failure on studio.asset_revisions;drop function studio.fixture_original_finalize_failure()');}
 assert.equal(sql(`select state from studio.private_originals where original_id='${interrupted.originalId}'`),'PENDING');
 assert.equal(sql(`select count(*) from studio.asset_heads where asset_id='${interrupted.assetId}'`),'0','failed DB transaction leaves no asset head');
 const recovered=await workflow.upload({...interrupted,originalId:randomUUID(),assetId:randomUUID()},token(a));assert.equal(recovered.original_id,interrupted.originalId);
 const concurrent=input('concurrent');cleanup.push(concurrent);
 const both=await Promise.all([workflow.upload(concurrent,token(a)),workflow.upload({...concurrent,originalId:randomUUID(),assetId:randomUUID()},token(a))]);
 assert.equal(both[0].asset_revision_id,both[1].asset_revision_id);
 assert.equal(sql(`select count(*) from studio.asset_revisions where asset_id='${concurrent.assetId}'`),'1');
 // Backup binds exact metadata, immutable revision and byte hash with one ID.
 const backupId='synthetic-'+randomUUID(),location='/workspace/work/mab-original-backup-'+backupId;
 mkdirSync(location,{recursive:true});
 const metadata=JSON.parse(sql(`select to_jsonb(o)::text from studio.private_originals o where original_id='${saved.original_id}'`));
 const revision=JSON.parse(sql(`select to_jsonb(r)::text from studio.asset_revisions r where revision_id='${saved.asset_revision_id}'`));
 writeFileSync(location+'/original.bin',bytes);writeFileSync(location+'/manifest.json',JSON.stringify({backup_id:backupId,sha256:originalHash(bytes),metadata,revision}));
 await storage.discardUnverified(metadata.storage_key); // exact synthetic test object, never live originals
 await assert.rejects(()=>workflow.download(saved.original_id,token(a)),/ORIGINAL_NOT_FOUND/);
 const backupBytes=readFileSync(location+'/original.bin');await storage.putVerified(metadata.storage_key,backupBytes,'text/plain');
 assert.equal((await workflow.download(saved.original_id,token(a))).record.asset_revision_id,saved.asset_revision_id,'restored bytes keep exact immutable revision');
 // Withdrawal while bytes are in flight must withhold the response entirely.
 const revoking={...storage,async readVerified(...args){const data=await storage.readVerified(...args);sql(`update studio.projects set lifecycle_status='ARCHIVED' where project_id='${project}'`);return data;}};
 const withdrawal=createPrivateOriginalWorkflow({repository,storage:revoking});
 await assert.rejects(()=>withdrawal.download(saved.original_id,token(a)),/ORIGINAL_NOT_FOUND/);
 await assert.rejects(()=>workflow.upload(input('archived'),token(a)),/STUDIO_PROJECT_NOT_FOUND/);
 assert.equal(await repository.getStored(saved.original_id,token(a)),null,'object recovery never restores revoked project access');
 // Exercise a real database dump/restore, retaining revoked state but invalidating
 // restored session keys before any application identity can access the copy.
 const restoredDb='mohen_k3_restore_'+randomUUID().replaceAll('-','')+'_test';
 const toolsDir=path.dirname(psql),connection=['-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin'];
 execFileSync(path.join(toolsDir,'pg_dump'),[...connection,'-Fc','-f',location+'/database.dump',database],{stdio:['ignore','pipe','pipe']});
 execFileSync(psql,[...connection,'-d','postgres','-v','ON_ERROR_STOP=1','-c',`create database ${restoredDb}`],{stdio:['ignore','pipe','pipe']});
 let restoredPool;
 try{
  execFileSync(path.join(toolsDir,'pg_restore'),[...connection,'--exit-on-error','--no-owner','-d',restoredDb,location+'/database.dump'],{stdio:['ignore','pipe','pipe']});
  restoredPool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database:restoredDb,max:1});
  await restoredPool.query('delete from control.session_verification_keys');
  const restored=await restoredPool.query('select o.sha256,o.asset_revision_id,p.lifecycle_status from studio.private_originals o join studio.projects p using(project_id) where o.original_id=$1',[saved.original_id]);
  assert.equal(restored.rows[0].sha256,originalHash(backupBytes));assert.equal(restored.rows[0].asset_revision_id,saved.asset_revision_id);assert.equal(restored.rows[0].lifecycle_status,'ARCHIVED');
  await assert.rejects(()=>createPrivateOriginalRepository(restoredPool).getStored(saved.original_id,token(a)),/STUDIO_IDENTITY_REQUIRED/,'restored backup cannot revive old credentials');
 }finally{
  if(restoredPool)await restoredPool.end();
  execFileSync(psql,[...connection,'-d','postgres','-v','ON_ERROR_STOP=1','-c',`drop database ${restoredDb} with (force)`],{stdio:['ignore','pipe','pipe']});
 }
 console.log('MAB_PRIVATE_ORIGINAL_WORKFLOW_PASS real-PG official-Storage owner-denied-before-I/O timeout-written recovery DB-rollback PENDING-resume concurrent-idempotency hash backup-object-restore exact-revision revoke-in-flight');
}finally{
 for(const x of cleanup){try{await storage.discardUnverified(x.projectId+'/'+x.originalId+'.bin');}catch{}}
 await pool.end();
}
