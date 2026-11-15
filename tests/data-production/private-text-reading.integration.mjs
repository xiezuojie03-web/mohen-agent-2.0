// M2: durable L1 candidate, then actual Producer candidate intake for M3.
// Uses official Storage when explicitly configured; otherwise DB/byte-buffer
// assertions only. Synthetic service decisions are authorization specimens;
// no professional Reviewer PASS, paid model or production connection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHmac,createHash,randomBytes,randomUUID} from 'node:crypto';
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
import {createIndependentGateClient} from '../../pipelines/data-production/orchestrator/independent-gate-client.mjs';
import {requireIndependentStageQualification} from '../../pipelines/data-production/orchestrator/independent-stage-qualification.mjs';
import {createIndependentGateService} from '../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
import {writeReports} from '../../pipelines/data-production/reporting/write-reports.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_DATABASE:database}=process.env;
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined;
const socket=localTcpHost??process.env.MOHEN_TEST_SOCKET;
if(!psql||!(localTcpHost||socket?.startsWith('/workspace/'))||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
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
const signerLogin='reading_signer_'+randomUUID().replaceAll('-',''),readerLogin='reading_reader_'+randomUUID().replaceAll('-','');
let workerPool,producerPool,signerPool,readerPool,storage;
let intakeOutputDigest,intakeOutput;
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
 const contextRead=await repo.listByOriginal(originalId,token(a));
 assert.equal(contextRead.direct_storage_reference_exposed,false);
 assert.equal(contextRead.original_id,originalId);
 const l1=contextRead.readings.find(item=>item.read_unit_id===saved.read_unit_id);
 assert.ok(l1,'a persisted C01 read must be visible to the authorized Studio L1/L2 consumer');
 assert.equal(l1.locator_schema,'utf8_byte_range/v1');
 assert.equal(l1.locator.quote_sha256,extent.quote_sha256);
 assert.equal(l1.source_version_id,version);
 assert.equal(l1.qualification,'UNASSESSED','L1 persistence never self-qualifies a Gate');
 assert.ok(!JSON.stringify(contextRead).includes('mohen-private-originals/'),'private original storage path must not appear in the read model');
 await assert.rejects(()=>repo.listByOriginal(originalId,token(b)),/ORIGINAL_NOT_FOUND|STUDIO_IDENTITY_REQUIRED/);
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
   const observed={...adapters,D01:async args=>{const result=await adapters.D01(args);actualOutput=result.output;intakeOutput=actualOutput;intakeOutputDigest=executionDigest(actualOutput);return result;}};
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
 // Receive this exact durable L1 candidate through the actual independent
 // service. PASS below is a synthetic authorization specimen, not professional
 // acceptance of this quote, source or any production artifact.
 const reviewToken=randomBytes(32).toString('base64url'),consumeToken=randomBytes(32).toString('base64url');
 const credentialHash=value=>createHash('sha256').update(value).digest('hex');
 const rule='reading-service-'+randomUUID(),reviewerRef='synthetic-reading-G1',jobId='d01.carrier-reading';
 sql(`create role ${signerLogin} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_gate_signer to ${signerLogin};
  create role ${readerLogin} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_gate_reader to ${readerLogin};
  insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)
  values('G1','${rule}',array['synthetic_exact_l1'],interval '1 hour','TEST_ONLY synthetic M2-to-M3 receipt',true)`);
 const bindingId=sql(`insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
  values('${b}','${signerLogin}','G1','G1','private-reading-fixture','1','producer',${json({project_id:project})},now()+interval '1 day','TEST_ONLY')returning binding_id`);
 for(const [capability,login,credential] of [['review',signerLogin,reviewToken],['consume',readerLogin,consumeToken]])
  sql(`insert into control.gate_service_credentials(token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
   values('${credentialHash(credential)}','${capability}','${b}','${login}','${bindingId}','${jobId}','${reviewerRef}','G1','G1','private-reading-fixture','1','producer',${json({project_id:project})},now()+interval '1 hour','TEST_ONLY')`);
 signerPool=new Pool({...connection,user:signerLogin});readerPool=new Pool({...connection,user:readerLogin});
 const service=createIndependentGateService({signerPool,readerPool,databaseSessionKey:sessionKey});
 const post=(route,body,credential)=>service(new Request('https://fixture.invalid'+route,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+credential},body:JSON.stringify(body)}));
 // G1 must depend on a current independent G0. Keep the earlier immutable
 // no-authority candidate intact, then submit a new candidate with that lineage.
 const g0ReviewToken=randomBytes(32).toString('base64url'),g0Ref='synthetic-reading-G0',g0Job='d00.source-acquisition';
 sql(`insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)
  values('G0','${rule}',array['synthetic_exact_source'],interval '1 hour','TEST_ONLY',true)`);
 const g0BindingId=sql(`insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
  values('${b}','${signerLogin}','G0','G0','private-reading-fixture','1','producer',${json({project_id:project})},now()+interval '1 day','TEST_ONLY')returning binding_id`);
 sql(`insert into control.gate_service_credentials(token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
  values('${credentialHash(g0ReviewToken)}','review','${b}','${signerLogin}','${g0BindingId}','${g0Job}','${g0Ref}','G0','G0','private-reading-fixture','1','producer',${json({project_id:project})},now()+interval '1 hour','TEST_ONLY')`);
 const g0Revision=sql(`select control.artifact_revision_for('source_version','${version}')`);
 const g0Evidence=[{source_version_id:version,raw_item_id:raw}];
 const g0Candidate=await producer.recordGate({runId,stage:'D00',gateCode:'G0',objectType:'source_version',objectId:version,
  artifactRevision:g0Revision,purpose:{namespace:'G0',code:'private-reading-fixture',version:'1'},allowedScope:{project_id:project},consumer:'producer',
  dependencySnapshot:[],evidenceRefs:g0Evidence,inputFingerprint:hash});
 const g0Response=await post('/decide',{schema:'mohen.independent-gate-decision-request.v1',candidate_id:g0Candidate,request_id:randomUUID(),result:'PASS',rule_version:rule,
  valid_until:new Date(Date.now()+1200000).toISOString(),expected_audit_id:null,
  receipt:{checks:{synthetic_exact_source:true},rationale:'TEST_ONLY synthetic G0 dependency for exact private source version',evidence_refs:g0Evidence,
   stage_binding:{job_id:g0Job,reviewer_binding_ref:g0Ref,consumer:'producer',input_digest:hash,output_digest:g0Revision}}},g0ReviewToken);
 assert.equal(g0Response.status,200,await g0Response.clone().text());
 const g0AuditId=(await g0Response.json()).gate_audit_id;
 const g0Digest=sql(`select qualification_digest from control.gate_audits where gate_audit_id='${g0AuditId}'`);
 const qualifiedCandidate=await producer.recordGate({runId,stage:'D01',gateCode:'G1',objectType:'read_unit',objectId:saved.read_unit_id,
  artifactRevision:saved.artifact_revision,purpose:{namespace:'G1',code:'private-reading-fixture',version:'1'},allowedScope:{project_id:project},consumer:'producer',
  dependencySnapshot:[{gate_audit_id:g0AuditId,qualification_digest:g0Digest,artifact_revision:g0Revision}],
  evidenceRefs:[{original_id:originalId,source_version_id:version,read_unit_id:saved.read_unit_id}],inputFingerprint:executionDigest(stageRequest)});
 assert.notEqual(qualifiedCandidate,candidate);
 assert.equal(sql(`select candidate_status from control.gate_candidates where candidate_id='${candidate}'`),'SUBMITTED');
 const stageBinding={job_id:jobId,reviewer_binding_ref:reviewerRef,consumer:'producer',input_digest:executionDigest(stageRequest),output_digest:intakeOutputDigest??executionDigest(saved)};
 const decision={schema:'mohen.independent-gate-decision-request.v1',candidate_id:qualifiedCandidate,request_id:randomUUID(),result:'PASS',rule_version:rule,
  valid_until:new Date(Date.now()+1200000).toISOString(),expected_audit_id:null,
  receipt:{checks:{synthetic_exact_l1:true},rationale:'TEST_ONLY exact durable L1 reception; no professional qualification claim',
   evidence_refs:[{original_id:originalId,source_version_id:version,read_unit_id:saved.read_unit_id}],stage_binding:stageBinding}};
 const accepted=await post('/decide',decision,reviewToken);assert.equal(accepted.status,200,await accepted.clone().text());
 const auditId=(await accepted.json()).gate_audit_id;
 assert.equal(sql(`select object_id from control.gate_audits where gate_audit_id='${auditId}'`),saved.read_unit_id);
 const currentRequest={schema:'mohen.independent-gate-current-check.v1',run_id:runId,stage:'D01',gate_code:'G1',...stageBinding};
 const current=await post('/current',currentRequest,consumeToken);assert.equal(current.status,200,await current.clone().text());
 assert.match((await current.json()).qualification_digest,/^[a-f0-9]{64}$/);
 // M4 receives the exact M3 output through permanent, Owner-scoped records.
 // This is a synthetic internal receipt, not an external provider invocation.
 const delegations=access.createStudioDelegationRepository(workerPool);
 const envelope={projectId:project,seriesId:randomUUID(),revisionNo:1,rootTaskRef:runId,
  rootTaskSnapshot:{run_id:runId,state:'HOLD'},subtaskRef:'inspect-private-L1',executor:'synthetic-internal',
  provider:'synthetic-internal',engineVersion:'1',inputManifest:{source_refs:[{object_id:saved.read_unit_id,artifact_revision:saved.artifact_revision}]},
  allowedActions:['prepare_candidate'],transferRightsDecision:{external_processing:'DENIED'},policyVersion:'fixture-1',
  expiresAt:new Date(Date.now()+60000).toISOString(),budgetLimit:'0',currency:'CNY',idempotencyKey:'m4-receive',outputSchema:'mohen.studio-stage-candidate-ref.v1'};
 const delegation=await delegations.saveDelegation(envelope,token(a));
 const candidateRef={schema:'mohen.studio-stage-candidate-ref.v1',run_id:runId,stage:'D01',...stageBinding,
  object_type:'read_unit',object_id:saved.read_unit_id,artifact_revision:saved.artifact_revision};
 const observedReceipt={delegationId:delegation.delegation_id,attemptNo:1,requestHash:delegation.request_hash,
  resultManifest:{state:'HOLD'},candidateRefs:[candidateRef],actualProvider:'synthetic-internal',actualEngineVersion:'1',
  startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),cost:null,currency:null,costConfidence:'UNKNOWN',errorCode:'MIXED_NOT_VERIFIED'};
 const heldReceipt=await delegations.appendHeldReceipt(observedReceipt,token(a));
 assert.equal((await delegations.appendHeldReceipt(observedReceipt,token(a))).receipt_id,heldReceipt.receipt_id);
 assert.equal(await delegations.getDelegation(delegation.delegation_id,token(b)),null);
 const m4Verifier=createIndependentGateClient({endpoint:'https://fixture.invalid/current',credential:consumeToken,
  fetcher:(url,options)=>service(new Request(url,options))});
 const assess=()=>access.assessStudioReceiptCandidates({delegation,receipt:heldReceipt,verifyCurrent:m4Verifier});
 const assessment=await assess();assert.equal(assessment.items[0].checks.T7,'VERIFIED_CURRENT');
 assert.equal(assessment.state,'HOLD');assert.equal(assessment.knowledge_use_authorized,false);
 assert.equal(assessment.cost,null);assert.equal(assessment.cost_confidence,'UNKNOWN');

 // Complete bounded UTF8 ReceiveCandidate uses the original M2 byte/source
 // authorities plus the actual current independent G1. These are synthetic
 // professional decisions; no provider was invoked or historical fact approved.
 const receiveSource={original_id:originalId,source_version_id:version,raw_item_id:raw,raw_sha256:hash};
 const receiveEnvelope=await delegations.saveDelegation({...envelope,seriesId:randomUUID(),idempotencyKey:'m4-seven-checks',
  inputManifest:{source_refs:[receiveSource]},allowedActions:['internal_candidate_read'],policyVersion:'fixture-1'},token(a));
 const receiveRecord=await delegations.appendHeldReceipt({...observedReceipt,delegationId:receiveEnvelope.delegation_id,requestHash:receiveEnvelope.request_hash},token(a));
 const receiveItem={schema:'mohen.studio-receive-item.v1',candidate_ref:candidateRef,source:receiveSource,
  provenance:{kind:'tool_candidate',provider:'synthetic-internal',engine_version:'1'},
  extent:{kind:extent.kind,start_byte:extent.start_byte,end_byte:extent.end_byte,quote_sha256:extent.quote_sha256},
  original_quote:quote,transcription_candidate:null,interpretation:null,operation:'internal_candidate_read'};
 const receiveContext={actor_id:a,project_id:project,consumer:'producer',purpose:{namespace:'G1',code:'private-reading-fixture',version:'1'},
  scope:{project_id:project},policy_version:'fixture-1',profile_version:'utf8-literal/v1',token:token(a)};
 const sourceVerifier=access.createPrivateOriginalSourceVerifier(workerPool);
 const sourceIsCurrent=(r,c)=>sourceVerifier({originalId:r.source.original_id,sourceVersionId:r.source.source_version_id,rawItemId:r.source.raw_item_id,rawSha256:r.source.raw_sha256},c.token);
 const evidence=(schema,r,extra={})=>({schema,request_fingerprint:r.request_fingerprint,decision_id:auditId,current:true,valid_until:new Date(Date.now()+30000).toISOString(),...extra});
 const receiver=access.createStudioCandidateReceiver({
  readOriginal:async(id,c)=>storage?access.createPrivateOriginalWorkflow({repository:originals,storage}).download(id,c.token):{record:await originals.getStored(id,c.token),bytes:Buffer.from(bytes)},
  verifySource:async(r,c)=>await sourceIsCurrent(r,c)?evidence('mohen.studio-source-current.v1',r,{matches:true}):null,
  checkRights:async(r,c)=>r.operation==='internal_candidate_read'&&await sourceIsCurrent(r,c)&&await originals.getStored(r.source.original_id,c.token)
   ?evidence('mohen.studio-rights-current.v1',r,{decision:'ALLOW',explicit_transfer:false}):null,
  resolveLineage:async(r,c)=>await sourceIsCurrent(r,c)?evidence('mohen.studio-lineage-current.v1',r,{family_id:version,lineage_refs:[receiveSource]}):null,
  verifySemantics:async(r)=>{
   // Bounded literal transcription only. Interpretation, other profiles, or a
   // changed exact payload need their own professional check, never a model vote.
   if(r.profile_version!=='utf8-literal/v1'||r.item_fingerprint!==executionDigest(receiveItem)||receiveItem.interpretation!==null)return null;
   const proof=await m4Verifier({run:{run_id:runId},job:{job_id:jobId,stage:'D01',implementation:{gate_reviewer_binding:reviewerRef}},stage:'D01',gate:'G1',input_digest:stageBinding.input_digest,output_digest:stageBinding.output_digest});
   return proof.gate_audit_id===auditId?evidence('mohen.studio-semantic-current.v1',r,{result:'PASS'}):null;
  },verifyCurrent:m4Verifier});
 const receiveSeven=()=>receiver.receive({delegation:receiveEnvelope,receipt:receiveRecord,items:[receiveItem]},{...receiveContext,token:token(a)});
 const seven=await receiveSeven();assert.equal(seven.items[0].state,'accept');assert.equal(seven.state,'HOLD');assert.equal(seven.knowledge_use_authorized,false);
 assert.doesNotMatch(JSON.stringify(seven),/桥边|synthetic-reading-owner-session/);
 const retainedSeven=await delegations.appendHeldReceipt({...observedReceipt,delegationId:receiveEnvelope.delegation_id,requestHash:receiveEnvelope.request_hash,attemptNo:2,resultManifest:seven},token(a));
 assert.equal(retainedSeven.acceptance_state,'HOLD');assert.equal(retainedSeven.cost_confidence,'UNKNOWN');
 console.log('MAB_M4_RECEIVE_SEVEN_PASS actual-Owner-source-binding verified-private-bytes UTF8-locator current-internal-rights same-source-family literal-only-independent-G1 candidate-not-knowledge no-provider');

 // Exercise the Runner's actual qualification validator with the exact output
 // captured from the real D01 adapter, rather than rebuilding its payload.
 // fetcher dispatches to the actual service handler in process; this is not a
 // network transport assertion.
 let receiveQualification;
 if(intakeOutput){
  assert.equal(executionDigest(intakeOutput),stageBinding.output_digest);
  const verifyStageQualification=createIndependentGateClient({endpoint:'https://fixture.invalid/current',credential:consumeToken,
   fetcher:(url,options)=>service(new Request(url,options))});
  receiveQualification=()=>requireIndependentStageQualification({context:{verifyStageQualification},
   stage:'D01',run:{run_id:runId},job:{stage:'D01',job_id:jobId,implementation:{gate_reviewer_binding:reviewerRef}},
   input:stageRequest,result:{disposition:'PASS',outputs:{qualified_reading:intakeOutput}}});
  const received=await receiveQualification();
  assert.equal(received.gate_audit_id,auditId);
  assert.equal(received.object_id,saved.read_unit_id);
  assert.equal(received.artifact_revision,saved.artifact_revision);
  assert.equal(received.input_digest,stageBinding.input_digest);
  assert.equal(received.output_digest,stageBinding.output_digest);
 }

 assert.notEqual((await post('/current',{...currentRequest,input_digest:'f'.repeat(64)},consumeToken)).status,200,'a different M2 input cannot consume this receipt');
 const revoked=await post('/revoke',{schema:'mohen.independent-gate-revocation-request.v1',gate_audit_id:g0AuditId,request_id:randomUUID(),reason:'TEST_ONLY synthetic upstream G0 withdrawal',reviewer_binding_ref:g0Ref},g0ReviewToken);
 assert.equal(revoked.status,200,await revoked.clone().text());
 assert.equal((await post('/current',currentRequest,consumeToken)).status,409,'ancestor-revoked exact L1 receipt cannot be consumed');
 if(receiveQualification)await assert.rejects(receiveQualification,/INDEPENDENT_GATE_VERIFY_DENIED/,'Runner rechecks authority and rejects the same output after revocation');
 assert.equal(sql(`select control.current_qualification_is_valid('${auditId}')`),'f');
 assert.equal((await assess()).items[0].checks.T7,'GATE_NOT_VALID','M4 never caches the earlier T7 result');
 assert.notEqual((await receiveSeven()).items[0].state,'accept','revoked professional qualification cannot be reused by ReceiveCandidate');
 const retained=(await delegations.listReceipts(delegation.delegation_id,token(a)))[0];
 assert.equal(retained.receipt_id,heldReceipt.receipt_id);assert.equal(retained.acceptance_state,'HOLD');
 assert.equal(retained.cost_confidence,'UNKNOWN');assert.equal(retained.cost,null);
 console.log('MAB_M4_RECEIPT_T7_PASS actual-Owner-permanent-receipt exact-M3-L1 current-qualification ancestor-revocation same-attempt-idempotency UNKNOWN-cost HOLD-not-accept no-external-provider');

 console.log('MAB_PRIVATE_READING_M3_SERVICE_PASS actual-durable-L1 Producer-candidate dedicated-LOGIN hashed-credentials synthetic-G1 current-consume revoke-denied no-professional-PASS-claim');
 sql(`update control.original_bridge_verification_keys set is_active=false where key_version='${kid}'`);
 await assert.rejects(()=>repo.save(input,token(a)),/PRIVATE_READING_BYTE_ATTESTATION_REQUIRED/);
 sql(`update control.original_bridge_verification_keys set is_active=true where key_version='${kid}';update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>repo.save(input,token(a)),/STUDIO_IDENTITY_REQUIRED/);
 sql(`update public.users set status='active' where user_id='${a}';update studio.projects set lifecycle_status='ARCHIVED' where project_id='${project}'`);
 await assert.rejects(()=>repo.save(input,token(a)),/ORIGINAL_NOT_FOUND/);
 console.log('MAB_PRIVATE_TEXT_READING_PASS real-PG17 '+(storage?'official-Storage HTTPS real-Runner HOLD-with-durable-refs':'byte-buffer-only no-Storage')+' immutable-L1 precise-source owner idempotency concurrent atomic-failure no-direct-source-grant M3-candidate-intake synthetic-service-receipt no-professional-Gate-PASS');
}finally{
 if(storage)await storage.discardUnverified(`${project}/${originalId}.bin`);
 if(workerPool)await workerPool.end();if(producerPool)await producerPool.end();if(signerPool)await signerPool.end();if(readerPool)await readerPool.end();await admin.end();
 if(signerPool)sql(`drop owned by ${signerLogin};drop role ${signerLogin}`);if(readerPool)sql(`drop owned by ${readerLogin};drop role ${readerLogin}`);
 sql(`drop role ${workerLogin};drop role ${producerLogin}`);
}
