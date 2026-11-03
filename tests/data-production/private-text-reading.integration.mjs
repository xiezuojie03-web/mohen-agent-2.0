// M2: durable L1 candidate, then actual Producer candidate intake for M3.
// Uses official Storage when explicitly configured; otherwise DB/byte-buffer
// assertions only. No Reviewer PASS, paid model or production connection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import * as access from '../../packages/data-access/src/index.mjs';
import {createDataProductionRepository} from '../../packages/data-access/src/data-production-repository.mjs';
import {createPrivateTextReadingRepository} from '../../packages/data-access/src/private-text-reading-repository.mjs';
import {createPrivateOriginalStorage,originalHash} from '../../packages/data-access/src/private-original-storage.mjs';
import {createBoundPrivateEvidenceStageWorker} from '../../pipelines/data-production/workers/private-evidence-binding.mjs';
import {assertPrivateWorkerIdentity} from '../../packages/data-access/src/private-worker-pool.mjs';
import {withExecutionAuthority} from './authorized-fixture.mjs';
import {runProduction} from '../../pipelines/data-production/orchestrator/orchestrator.mjs';
import {createRunState} from '../../pipelines/data-production/orchestrator/run-state.mjs';
import {adapters} from '../../pipelines/data-production/adapters/private-evidence-adapters.mjs';
import {PRIVATE_EVIDENCE_ADAPTER_PATH} from '../../pipelines/data-production/orchestrator/adapter-binding.mjs';
import {executionDigest} from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
import {writeReports} from '../../pipelines/data-production/reporting/write-reports.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const {Pool}=createRequire(new URL('../../packages/data-access/package.json',import.meta.url))('pg');
const connection={host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),database,max:2};
const admin=new Pool({...connection,user:'k3_admin'});
const workerLogin='reading_worker_'+randomUUID().replaceAll('-',''),producerLogin='reading_producer_'+randomUUID().replaceAll('-','');
const a=randomUUID(),b=randomUUID(),project=randomUUID(),originalId=randomUUID(),assetId=randomUUID();
const source=randomUUID(),version=randomUUID(),raw=randomUUID(),runId=randomUUID();
const sessionKey='synthetic-reading-owner-session-at-least-32',key='synthetic-reading-byte-verifier-at-least-32',kid='private-reading-fixture';
const token=(uid,exp=Date.now()+60000)=>{const encoded=Buffer.from(JSON.stringify({uid,r:[],exp})).toString('base64url');return encoded+'.'+createHmac('sha256',sessionKey).update(encoded).digest('base64url');};
const bytes=Buffer.from('桥边有市。\n合成阅读持久化样本，不是历史事实。'),quote='桥边有市。',hash=originalHash(bytes);
const extent={kind:'utf8_byte_range/v1',source_version_id:version,raw_item_id:raw,start_byte:0,end_byte:Buffer.byteLength(quote),raw_sha256:hash,quote_sha256:originalHash(Buffer.from(quote))};
const stageRequest={schema:'mohen.private-evidence-stage-request.v1',stage:'D01',originalId,extent,quote};
const json=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
let workerPool,producerPool,storage;
try {
 sql(`create role ${workerLogin} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_app_runtime to ${workerLogin};
  create role ${producerLogin} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_producer to ${producerLogin};
  insert into public.users(user_id,email,username,password_hash)values('${a}','${a}@example.invalid','A','synthetic'),('${b}','${b}@example.invalid','B','synthetic');
  insert into control.session_verification_keys(verification_key)values('${sessionKey}')on conflict(key_slot)do update set verification_key=excluded.verification_key;
  insert into control.original_bridge_verification_keys(key_version,verification_key)values('${kid}','${key}');`);
 workerPool=new Pool({...connection,user:workerLogin});producerPool=new Pool({...connection,user:producerLogin,options:'-c role=mohen_producer'});
 await assertPrivateWorkerIdentity(workerPool);
 const assets=access.createStudioAssetRepository(workerPool),originals=access.createPrivateOriginalRepository(workerPool);
 await assets.createProject({projectId:project,title:'M2 durable private reading fixture',scope:{}},token(a));
 let record;
 const upload={projectId:project,originalId,assetId,idempotencyKey:'durable-private-reading',bytes,fileName:'reading.txt',contentType:'text/plain'};
 if(process.env.MOHEN_TEST_STORAGE_CONFIG){
  const cfg=JSON.parse(fs.readFileSync(process.env.MOHEN_TEST_STORAGE_CONFIG));
  if(new URL(cfg.origin).hostname!=='127.0.0.1'||cfg.database!=='mohen_storage_official_test')throw Error('OFFICIAL_LOCAL_SYNTHETIC_STORAGE_REQUIRED');
  storage=createPrivateOriginalStorage({endpoint:cfg.httpsOrigin,token:cfg.serviceKey});
  const flow=access.createPrivateOriginalWorkflow({repository:originals,storage});
  await flow.upload(upload,token(a));record=(await flow.download(originalId,token(a))).record;
 }else{
  await originals.reserve({...upload,sha256:hash,byteSize:bytes.length},token(a));
  await originals.finalize(originalId,hash,token(a));record=await originals.getStored(originalId,token(a));
 }
 sql(`insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)values('${source}','TEST_ONLY','Synthetic reading','synthetic','digital_text','full_content');
  insert into source.source_versions(source_version_id,source_id,checksum_sha256)values('${version}','${source}','${hash}');
  insert into source.raw_items(raw_item_id,source_version_id,storage_ref,checksum_sha256,byte_size)values('${raw}','${version}','mohen-private-originals/${project}/${originalId}.bin','${hash}',${bytes.length});
  insert into control.production_runs(run_id,research_intent,scope,execution_mode,status)values('${runId}','synthetic private reading',${json({project_id:project})},'attended','RUNNING')`);
 const input={runId,originalId,extent,quote,record,bytes};
 const repo=createPrivateTextReadingRepository(workerPool,{verificationKey:key,keyVersion:kid});
 const saved=await repo.save(input,token(a));
 assert.match(saved.read_unit_id,/^[a-f0-9-]{36}$/);assert.equal(saved.qualification,'UNASSESSED');
 assert.equal(sql(`select locator_hash from source.read_units where read_unit_id='${saved.read_unit_id}'`),extent.quote_sha256);
 assert.equal(sql(`select raw_item_id from source.read_runs where read_run_id='${saved.read_run_id}'`),raw);
 assert.equal(sql(`select control.artifact_revision_for('read_unit','${saved.read_unit_id}')`),saved.artifact_revision);
 const reopened=createPrivateTextReadingRepository(workerPool,{verificationKey:key,keyVersion:kid});
 assert.deepEqual(await reopened.save(input,token(a)),saved,'reopen/ACK retry returns exact durable candidate');
 const concurrent=await Promise.all([repo.save(input,token(a)),repo.save(input,token(a))]);assert.deepEqual(concurrent,[saved,saved]);
 assert.equal(sql(`select count(*) from source.read_runs where read_run_id='${saved.read_run_id}'`),'1');
 for(const identity of [token(b),token(a,Date.now()-1000),token(a)+'forged'])await assert.rejects(()=>repo.save(input,identity),/ORIGINAL_NOT_FOUND|STUDIO_IDENTITY_REQUIRED/);
 await assert.rejects(()=>repo.save({...input,extent:{...extent,source_version_id:randomUUID()}},token(a)),/PRIVATE_READING_SOURCE_NOT_BOUND/);
 await assert.rejects(()=>repo.save({...input,runId:randomUUID()},token(a)),/PRIVATE_READING_RUN_NOT_BOUND/);
 const invoke=`select studio.persist_private_text_reading('${originalId}','${saved.read_run_id}','${saved.read_unit_id}','${saved.request_digest}','${runId}',${json(extent)},'${quote}',null)`;
 assert.throws(()=>sql(`begin;set local role mohen_app_runtime;select set_config('mohen.session_token','${token(a)}',true);${invoke};commit`),/PRIVATE_READING_BYTE_ATTESTATION_REQUIRED/);
 const mint=overrides=>{
  const now=Date.now(),encoded=Buffer.from(JSON.stringify({kind:'MOHEN_PRIVATE_TEXT_READING_V1',kid,
   uid:a,project_id:project,original_id:originalId,raw_sha256:hash,run_id:runId,
   read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,request_digest:saved.request_digest,
   extent,quote,iat:now,exp:now+30000,...overrides})).toString('base64url');
  return encoded+'.'+createHmac('sha256',key).update(encoded).digest('hex');
 };
 for(const overrides of [{kind:'MOHEN_PRIVATE_READ_BRIDGE_V1'},{uid:b},{project_id:randomUUID()},
   {read_unit_id:randomUUID()},{request_digest:'c'.repeat(64)},{quote:'another quote'},
   {exp:Date.now()-1,iat:Date.now()-30000},{exp:Date.now()+60000},{iat:Date.now()+10000},
   {exp:null}]){
  const signedInvoke=invoke.replace(',null)',",'"+mint(overrides)+"')");
  assert.throws(()=>sql(`begin;set local role mohen_app_runtime;select set_config('mohen.session_token','${token(a)}',true);${signedInvoke};commit`),/PRIVATE_READING_BYTE_ATTESTATION_REQUIRED/);
 }
 assert.equal(sql("select has_schema_privilege('mohen_app_runtime','source','USAGE')"),'f');
 assert.equal(sql("select has_table_privilege('mohen_app_runtime','source.read_units','INSERT')"),'f');
 for(const role of ['anon','authenticated','service_role','mohen_producer','mohen_gate_signer'])
  assert.equal(sql(`select has_function_privilege('${role}','studio.persist_private_text_reading(uuid,uuid,uuid,text,uuid,jsonb,text,text)','EXECUTE')`),'f');
 for(const statement of [`update source.read_units set locator='{}' where read_unit_id='${saved.read_unit_id}'`,
   `delete from source.read_units where read_unit_id='${saved.read_unit_id}'`,
   `update source.read_runs set status='RUNNING' where read_run_id='${saved.read_run_id}'`,
   `delete from source.read_runs where read_run_id='${saved.read_run_id}'`,
   `update source.raw_items set byte_size=byte_size+1 where raw_item_id='${raw}'`,
   `delete from source.raw_items where raw_item_id='${raw}'`,
   `delete from source.source_versions where source_version_id='${version}'`,
   `update source.source_versions set checksum_sha256=repeat('b',64) where source_version_id='${version}'`])
  assert.throws(()=>sql(statement),/PRIVATE_READING_IMMUTABLE|RAW_ITEM_IMMUTABLE/);
 sql(`create function source.fixture_reading_failure()returns trigger language plpgsql as $$begin raise exception 'INJECTED_READING_FAILURE';end$$;
  create trigger fixture_reading_failure before insert on source.read_units for each row execute function source.fixture_reading_failure()`);
 const count=sql('select count(*) from source.read_runs');
 await assert.rejects(()=>repo.save({...input,quote:'桥边',extent:{...extent,end_byte:6,quote_sha256:originalHash(Buffer.from('桥边'))}},token(a)),/INJECTED_READING_FAILURE/);
 assert.equal(sql('select count(*) from source.read_runs'),count,'failed unit insert rolls back the reading run');
 sql('drop trigger fixture_reading_failure on source.read_units;drop function source.fixture_reading_failure()');
 // The real next construction stage receives an immutable candidate. It is
 // explicitly NOT a current qualification and cannot release a Runner handoff.
 const producer=createDataProductionRepository(producerPool);
 const candidate=await producer.recordGate({runId,stage:'D01',gateCode:'G1',objectType:'read_unit',objectId:saved.read_unit_id,
  artifactRevision:saved.artifact_revision,purpose:{namespace:'G1',code:'private-reading-fixture',version:'1'},
  allowedScope:{project_id:project},consumer:'producer',dependencySnapshot:[],
  evidenceRefs:[{original_id:originalId,source_version_id:version,read_unit_id:saved.read_unit_id}],inputFingerprint:executionDigest(stageRequest)});
 assert.match(candidate,/^[a-f0-9-]{36}$/);
 assert.equal(sql(`select candidate_status from control.gate_candidates where candidate_id='${candidate}'`),'SUBMITTED');
 assert.equal(sql(`select count(*) from control.gate_audits where object_id='${saved.read_unit_id}'`),'0');
 if(storage){
  const worker=createBoundPrivateEvidenceStageWorker({pool:workerPool,storage,verificationKey:key,keyVersion:kid});
  await withExecutionAuthority(async({grant})=>{
   const stageInput=stageRequest;
   const job={stage:'D01',job_id:'d01.carrier-reading',implementation:{adapter_binding:PRIVATE_EVIDENCE_ADAPTER_PATH,gate_reviewer_binding:'fixture-G1'},execution_policy:{enabled:true,attended:true,enable_requires:[]}};
   const registry={architecture_generation:'mohen.six-stage.v1',status:'ACTIVE_AUTHORIZED',activation:{enabled:true},jobs:[job]};
   const run=createRunState({run_id:runId,research_intent:'synthetic reading',execution_mode:'attended'});
   let actualOutput;
   const observed={...adapters,D01:async args=>{const result=await adapters.D01(args);actualOutput=result.output;return result;}};
   const result=await runProduction({run,registry,from_stage:'D01',to_stage:'D01',context:{resume_input:stageInput,
    execution_authority_token:grant(registry,job,run,stageInput),adapters:observed,
    privateEvidenceWorker:worker,privateEvidenceOwnerSessionToken:token(a)}});
   assert.equal(result.status,'HOLD');
   const refs=result.stage_results[0].control_outputs?.candidate_refs;
   assert.equal(refs?.[0]?.object_id,saved.read_unit_id,'HOLD preserves the durable candidate reference for M3');
   assert.equal(refs[0].artifact_revision,saved.artifact_revision);
   assert.equal(refs[0].input_digest,executionDigest(stageInput));
   assert.equal(refs[0].output_digest,executionDigest(actualOutput));
   assert.equal(sql(`select input_fingerprint from control.gate_candidates where candidate_id='${candidate}'`),refs[0].input_digest);
   assert.notEqual(refs[0].input_digest,saved.request_digest,'persistence and Runner digests have distinct domains');
   assert.doesNotMatch(JSON.stringify(refs),/桥边|synthetic-reading-owner-session/);
   const reportDir='/workspace/work/mab-reading-report-'+randomUUID();fs.mkdirSync(reportDir,{mode:0o700});
   const reports=writeReports({run:result,outDir:reportDir});
   const machine=JSON.parse(fs.readFileSync(reports.machine_report));
   assert.deepEqual(machine.stages[0].gate_evidence.candidate_refs,refs,'persisted machine receipt is an effective M3 input');
   assert.doesNotMatch(fs.readFileSync(reports.machine_report,'utf8'),/桥边|synthetic-reading-owner-session/);
  });
  // Same backup identity for this exact L1 candidate, DB snapshot and bytes.
  // Restore cannot mint knowledge qualification or resurrect old sessions.
  const backupId=randomUUID(),location='/workspace/work/mab-reading-backup-'+backupId;
  fs.mkdirSync(location,{recursive:true,mode:0o700});
  const originalKey=`${project}/${originalId}.bin`;
  const backupBytes=await storage.readVerified(originalKey,hash,bytes.length);
  fs.writeFileSync(location+'/original.bin',backupBytes,{mode:0o600});
  fs.writeFileSync(location+'/manifest.json',JSON.stringify({backup_id:backupId,
    original_id:originalId,source_version_id:version,raw_item_id:raw,sha256:hash,
    ...saved,m3_candidate_id:candidate}),{mode:0o600});
  const tools=path.dirname(psql),args=['-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin'];
  execFileSync(path.join(tools,'pg_dump'),[...args,'-Fc','-f',location+'/database.dump',database],{stdio:['ignore','pipe','pipe']});
  assert.ok(fs.statSync(location+'/database.dump').size>0);
  await storage.discardUnverified(originalKey);
  const flow=access.createPrivateOriginalWorkflow({repository:originals,storage});
  await assert.rejects(()=>flow.download(originalId,token(a)),/ORIGINAL_NOT_FOUND/);
  await storage.putVerified(originalKey,fs.readFileSync(location+'/original.bin'),'text/plain');
  assert.equal((await flow.download(originalId,token(a))).record.asset_revision_id,record.asset_revision_id);
  const restoredDb='mohen_k3_reading_restore_'+randomUUID().replaceAll('-','')+'_test';
  execFileSync(psql,[...args,'-d','postgres','-v','ON_ERROR_STOP=1','-c',`create database ${restoredDb}`],{stdio:['ignore','pipe','pipe']});
  let restoredAdmin,restoredWorker;
  try {
   execFileSync(path.join(tools,'pg_restore'),[...args,'--exit-on-error','--no-owner','-d',restoredDb,location+'/database.dump'],{stdio:['ignore','pipe','pipe']});
   restoredAdmin=new Pool({...connection,database:restoredDb,user:'k3_admin',max:1});
   restoredWorker=new Pool({...connection,database:restoredDb,user:workerLogin,max:1});
   await restoredAdmin.query('delete from control.session_verification_keys');
   const persisted=(await restoredAdmin.query("select control.artifact_revision_for('read_unit',$1) as revision",[saved.read_unit_id])).rows[0];
   assert.equal(persisted.revision,saved.artifact_revision);
   assert.equal((await restoredAdmin.query('select input_fingerprint from control.gate_candidates where candidate_id=$1',[candidate])).rows[0].input_fingerprint,executionDigest(stageRequest));
   assert.equal((await restoredAdmin.query('select count(*)::int as count from control.gate_audits where object_id=$1',[saved.read_unit_id])).rows[0].count,0);
   await assert.rejects(()=>access.createPrivateOriginalRepository(restoredWorker).getStored(originalId,token(a)),/STUDIO_IDENTITY_REQUIRED/);
  }finally{
   if(restoredWorker)await restoredWorker.end();if(restoredAdmin)await restoredAdmin.end();
   execFileSync(psql,[...args,'-d','postgres','-v','ON_ERROR_STOP=1','-c',`drop database ${restoredDb} with (force)`],{stdio:['ignore','pipe','pipe']});
  }
  console.log('MAB_PRIVATE_READING_BACKUP_PASS same-backup-id actual-PG-dump-restore exact-original-bytes L1-revision-and-M3-input-preserved no-session-or-qualification-revival');
 }
 sql(`update control.original_bridge_verification_keys set is_active=false where key_version='${kid}'`);
 await assert.rejects(()=>repo.save(input,token(a)),/PRIVATE_READING_BYTE_ATTESTATION_REQUIRED/);
 sql(`update control.original_bridge_verification_keys set is_active=true where key_version='${kid}';update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>repo.save(input,token(a)),/STUDIO_IDENTITY_REQUIRED/);
 sql(`update public.users set status='active' where user_id='${a}';update studio.projects set lifecycle_status='ARCHIVED' where project_id='${project}'`);
 await assert.rejects(()=>repo.save(input,token(a)),/ORIGINAL_NOT_FOUND/);
 console.log('MAB_PRIVATE_TEXT_READING_PASS real-PG17 '+(storage?'official-Storage HTTPS real-Runner HOLD-with-durable-refs':'byte-buffer-only no-Storage')+' immutable-L1 precise-source owner idempotency concurrent atomic-failure no-direct-source-grant M3-candidate-intake no-Gate-PASS');
}finally{
 if(storage)await storage.discardUnverified(`${project}/${originalId}.bin`);
 if(workerPool)await workerPool.end();if(producerPool)await producerPool.end();await admin.end();
 sql(`drop role ${workerLogin};drop role ${producerLogin}`);
}
