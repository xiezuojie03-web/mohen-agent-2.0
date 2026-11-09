// Synthetic DB-only M2 provenance test. This does NOT attest external Storage
// bytes. It proves the narrow helper against actual PostgreSQL roles/RLS and
// verifies that rollback revokes the only app-visible source lookup.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createStudioAssetRepository,createPrivateOriginalRepository,createPrivateOriginalSourceVerifier} from '../../packages/data-access/src/index.mjs';
import {assertPrivateWorkerIdentity} from '../../packages/data-access/src/private-worker-pool.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_DATABASE:database}=process.env;
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined;
const socket=localTcpHost??process.env.MOHEN_TEST_SOCKET;
if(!psql||!(localTcpHost||socket?.startsWith('/workspace/'))||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))
 throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432',
 '-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const uuid=()=>randomUUID(),a=uuid(),b=uuid(),project=uuid(),originalId=uuid(),assetId=uuid(),
 source=uuid(),version=uuid(),raw=uuid();
const sha='a'.repeat(64),size=1024,secret='synthetic-private-source-verification-secret-2026';
const token=(user,exp=Date.now()+60000)=>{
 const encoded=Buffer.from(JSON.stringify({uid:user,r:[],exp})).toString('base64url');
 return encoded+'.'+createHmac('sha256',secret).update(encoded).digest('base64url');
};
const {Pool}=createRequire(new URL('../../packages/data-access/package.json',import.meta.url))('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:2});
let workerPool,workerLogin;
const as=(user,stmt)=>sql(`begin;set local role mohen_app_runtime;select set_config('mohen.session_token','${token(user)}',true);${stmt};rollback;`);
try{
 sql(`insert into public.users(user_id,email,username,password_hash)values
  ('${a}','source-binding-a@example.invalid','A','synthetic'),
  ('${b}','source-binding-b@example.invalid','B','synthetic');
 insert into control.session_verification_keys(verification_key)values('${secret}')
  on conflict(key_slot)do update set verification_key=excluded.verification_key;`);
 const assets=createStudioAssetRepository(pool),originals=createPrivateOriginalRepository(pool);
 await assets.createProject({projectId:project,title:'Synthetic M2 source verification',scope:{}},token(a));
 const receipt=await originals.reserve({projectId:project,originalId,assetId,
  idempotencyKey:'source-provenance-pg-test-v1',sha256:sha,byteSize:size,
  fileName:'synthetic-private-original.txt',contentType:'text/plain'},token(a));
 assert.equal(receipt.state,'PENDING');
 // Only DB provenance is under test. There are no Storage bytes in this fixture.
 const stored=await originals.finalize(originalId,sha,token(a));
 assert.equal(stored.state,'STORED_VERIFIED');
 const ref='mohen-private-originals/'+project+'/'+originalId+'.bin';
 sql(`insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)
 values('${source}','TEST_ONLY','Synthetic private source','synthetic','digital_text','full_content');
 insert into source.source_versions(source_version_id,source_id,checksum_sha256)
 values('${version}','${source}','${sha}');
 insert into source.raw_items(raw_item_id,source_version_id,storage_ref,checksum_sha256,byte_size)
 values('${raw}','${version}','${ref}','${sha}',${size});`);
 assert.equal(sql("select has_schema_privilege('mohen_app_runtime','source','USAGE')"),'f');
 assert.equal(sql("select has_table_privilege('mohen_app_runtime','source.raw_items','SELECT')"),'f');
 assert.equal(sql("select has_function_privilege('mohen_app_runtime','studio.private_source_binding_matches(uuid,uuid,uuid,text)','EXECUTE')"),'t');
 for(const r of ['anon','authenticated','service_role','mohen_producer','mohen_gate_signer'])
  assert.equal(sql(`select has_function_privilege('${r}','studio.private_source_binding_matches(uuid,uuid,uuid,text)','EXECUTE')`),'f',r+' must not execute');
 assert.throws(()=>as(a,'select count(*) from source.raw_items'),/permission denied/,
  'runtime must not obtain whole source table SELECT');
 await assert.rejects(()=>assertPrivateWorkerIdentity(pool),/PRIVATE_WORKER_DATABASE_IDENTITY_UNSAFE/);
 workerLogin='private_worker_'+randomUUID().replaceAll('-','');
 sql(`create role ${workerLogin} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
   grant mohen_app_runtime to ${workerLogin}`);
 workerPool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:workerLogin,database,max:1});
 await assertPrivateWorkerIdentity(workerPool);
 sql(`grant mohen_gate_signer to ${workerLogin}`);
 await assert.rejects(()=>assertPrivateWorkerIdentity(workerPool),/PRIVATE_WORKER_DATABASE_IDENTITY_UNSAFE/);
 sql(`revoke mohen_gate_signer from ${workerLogin}`);
 const disguised=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:1,options:'-c role=mohen_app_runtime'});
 try {await assert.rejects(()=>assertPrivateWorkerIdentity(disguised),/PRIVATE_WORKER_DATABASE_IDENTITY_UNSAFE/);}finally{await disguised.end();}
 const verify=createPrivateOriginalSourceVerifier(workerPool),exact={originalId,sourceVersionId:version,rawItemId:raw,rawSha256:sha};
 assert.equal(await verify(exact,token(a)),true,'owner + exact raw/version/hash passes');
 assert.equal(await verify({...exact,rawItemId:uuid()},token(a)),false,'forged raw ID');
 assert.equal(await verify({...exact,sourceVersionId:uuid()},token(a)),false,'forged source version');
 assert.equal(await verify({...exact,rawSha256:'b'.repeat(64)},token(a)),false,'forged original hash');
 await assert.rejects(()=>verify(exact,token(b)),/ORIGINAL_NOT_FOUND/,'foreign owner');
 await assert.rejects(()=>verify(exact,token(a,Date.now()-1000)),/STUDIO_IDENTITY_REQUIRED/,'expired');
 await assert.rejects(()=>verify(exact,token(a)+'forged'),/STUDIO_IDENTITY_REQUIRED/,'forged token');
 sql(`update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>verify(exact,token(a)),/STUDIO_IDENTITY_REQUIRED/,'disabled user');
 sql(`update public.users set status='active' where user_id='${a}';
 update studio.projects set lifecycle_status='ARCHIVED' where project_id='${project}'`);
 await assert.rejects(()=>verify(exact,token(a)),/ORIGINAL_NOT_FOUND/,'archived project');
 console.log('MAB_PRIVATE_SOURCE_BINDING_PG_PASS real-pg17 dedicated-worker-login admin-and-signer-denied no-source-select exact-origin-version owner expired forged disabled archived');
} finally {
 if(workerPool)await workerPool.end();
 if(workerLogin)sql(`drop role ${workerLogin}`);
 await pool.end();
}
