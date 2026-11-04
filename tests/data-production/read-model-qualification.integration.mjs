import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {createReadModelRepository} from '../../packages/data-access/src/read-model-repository.mjs';
import {createDataProductionRepository} from '../../packages/data-access/src/data-production-repository.mjs';
import {createWorkQualificationReader,workContentDigest} from '../../packages/data-access/src/work-qualification-reader.mjs';
import {validateG5Lineage} from '../../packages/data-access/src/lineage-validator.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw new Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=text=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const requirePg=createRequire(new URL('../../packages/data-access/package.json',import.meta.url));
const {Pool}=requirePg('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:2});
try {
 const repo=createReadModelRepository(pool);
 const id=randomUUID();
 sql(`insert into read_model.story_seeds(story_seed_id,seed_key,title,payload) values('${id}','TEST_ONLY:legacy-read','legacy must not be promoted','{}');
 insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result,consumer) values('00000000-0000-0000-0000-000000000010','D05','G5','story_seed','${id}','PASS','visual_stage');`);
 const context={consumer:'visual_stage',purpose:{namespace:'G5',code:'fixture',version:'1'},scope:{project:'fixture'}};
 assert.equal(await repo.getRuntimeEligible('story_seed',id,context),null,'Legacy PASS without current independent qualification must not be returned');
 await assert.rejects(()=>repo.listRuntimeEligible('story_seed'),/QUALIFICATION_CONTEXT_REQUIRED/);
 await assert.rejects(()=>repo.listRuntimeEligible('story_seed',{...context,scope:{}}),/QUALIFICATION_CONTEXT_REQUIRED/);
 await assert.rejects(()=>repo.listRuntimeEligible('story_seed',{...context,scope:[]}),/QUALIFICATION_CONTEXT_REQUIRED/);
 await assert.rejects(()=>repo.listRuntimeEligible('story_seed',{...context,purpose:{...context.purpose,version:''}}),/QUALIFICATION_CONTEXT_REQUIRED/);
 // Full physical G0 -> G1 -> G2 -> G3 -> G4 -> G5 fixture, no mocked DB grants.
 const user='11111111-1111-4111-8111-111111111111';
 const secret='isolated-authority-fixture-session-secret-at-least-32';
 const payload=Buffer.from(JSON.stringify({uid:user,r:[],exp:Date.now()+300000})).toString('base64url');
 const token=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
 const root=JSON.parse(sql("select row_to_json(a)::text from control.gate_audits a where a.gate_code='G0' and control.current_qualification_is_valid(a.gate_audit_id) limit 1"));
 const run=randomUUID(),reading=randomUUID(),evidence=randomUUID(),world=randomUUID(),finding=randomUUID(),story=randomUUID();
 sql(`insert into source.read_runs(read_run_id,input_sha256) values('${run}','${'a'.repeat(64)}');
 insert into source.read_units(read_unit_id,read_run_id,method_code) values('${reading}','${run}','C01');
 insert into evidence.material_evidence(evidence_id,source_id,locator,modality,source_voice) values('${evidence}','${root.object_id}','{}','text','TEST_ONLY');
 insert into world.entities(entity_id,entity_type,canonical_label) values('${world}','fixture','TEST_ONLY entity');
 insert into meaning.findings(finding_id,finding_type,interpretive_statement) values('${finding}','fixture','TEST_ONLY finding');
 insert into read_model.story_seeds(story_seed_id,seed_key,title,payload) values('${story}','TEST_ONLY:qualified','qualified story','{}');`);
 let upstream=root,g4;
 for(const [gate,kind,object] of [['G1','reading_unit',reading],['G2','material_evidence',evidence],['G3','entity',world],['G4','finding',finding],['G5','story_seed',story]]) {
   sql(`insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled) values('${gate}','fixture-rule',array['fixture_check'],interval '1 hour','TEST_ONLY',true);
   insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
   values('${user}','mohen_gate_signer','${gate}','${gate}','fixture','1','visual_stage','{"project":"fixture"}',now()+interval '1 hour','TEST_ONLY');`);
   if(gate==='G5')g4=upstream;
   const rev=sql(`select control.artifact_revision_for('${kind}','${object}')`);
   const deps=JSON.stringify([{gate_audit_id:upstream.gate_audit_id,qualification_digest:upstream.qualification_digest,artifact_revision:upstream.artifact_revision}]);
   const candidate=sql(`set role mohen_producer; insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
    values('00000000-0000-0000-0000-000000000010','D0${gate[1]}','${gate}','${kind}','${object}','${rev}','${gate}','fixture','1','{"project":"fixture"}','visual_stage','${deps}','[{"id":"TEST_ONLY"}]','${'a'.repeat(64)}') returning candidate_id;`);
   const receipt=JSON.stringify({checks:{fixture_check:true},rationale:'TEST_ONLY professional fixture',evidence_refs:[{id:'TEST_ONLY'}]});
   const audit=sql(`begin; set local role mohen_gate_signer; set local mohen.session_token='${token}'; select control.sign_gate_candidate('${candidate}','${randomUUID()}','PASS','fixture-rule',now()+interval '30 minutes','${receipt}',null); commit;`);
   upstream=JSON.parse(sql(`select row_to_json(a)::text from control.gate_audits a where gate_audit_id='${audit}'`));
 }
 const emptyDependency=sql(`set role mohen_producer;insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
 values('00000000-0000-0000-0000-000000000010','D05','G5','story_seed','${story}','${upstream.artifact_revision}','G5','fixture','1','{"project":"fixture"}','visual_stage','[]','[{"id":"TEST_ONLY"}]','${'a'.repeat(64)}') returning candidate_id;`);
 const honestReceipt=JSON.stringify({checks:{fixture_check:true},rationale:'TEST_ONLY',evidence_refs:[{id:'TEST_ONLY'}]});
 assert.throws(()=>sql(`begin;set local role mohen_gate_signer;set local mohen.session_token='${token}';select control.sign_gate_candidate('${emptyDependency}','${randomUUID()}','PASS','fixture-rule',now()+interval '30 minutes','${honestReceipt}','${upstream.gate_audit_id}');commit;`),/MISSING_UPSTREAM_DEPENDENCY/,'G5 cannot qualify without its G4 dependency');
 assert.equal((await repo.getRuntimeEligible('story_seed',story,context)).title,'qualified story');
 assert.equal(await repo.getRuntimeEligible('story_seed',story,{...context,consumer:'agent'}),null);
 assert.equal(await repo.getRuntimeEligible('story_seed',story,{...context,purpose:{...context.purpose,code:'foreign'}}),null);
 assert.equal(await repo.getRuntimeEligible('story_seed',story,{...context,scope:{project:'foreign'}}),null);
 assert.equal((await repo.listRuntimeEligible('story_seed',context)).length,1,'one current facet, no duplicate history and no legacy promotion');
 const checkWebRetrieval=phase=>{
  const url=new URL(`postgresql://k3_admin:synthetic@localhost:${process.env.MOHEN_TEST_PORT??55432}/${database}`);url.searchParams.set('host',socket);
  const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.qualified-retrieve-db.config.ts'],{
   env:{...process.env,DATABASE_URL:url.toString(),MOHEN_DATABASE_PASSWORD:'synthetic',MOHEN_DB_DRIVER:'pg',MOHEN_RETRIEVE_STORY:story,MOHEN_RETRIEVE_PHASE:phase},stdio:'inherit'});
  assert.equal(result.status,0,'WEB_CURRENT_QUALIFICATION_RETRIEVAL_'+phase);
 };
 checkWebRetrieval('current');
 const production=createDataProductionRepository(pool);
 const g5Context={consumer:'visual_stage',purpose:{namespace:'G5',code:'fixture',version:'1'},scope:{project:'fixture'}};
 const g4Context={consumer:'visual_stage',purpose:{namespace:'G4',code:'fixture',version:'1'},scope:{project:'fixture'}};
 assert.ok((await production.passed('D05',g5Context)).some(row=>row.object_id===story),
  'real PG independent current-qualified G5 must pass');
 assert.ok((await production.legalInput('D05',g4Context)).some(row=>row.object_id===finding),
  'real PG D05 must accept only G4 current-qualified scope');
 await validateG5Lineage(pool,[finding],g4Context);
 assert.equal((await production.passed('D05',{...g5Context,consumer:'producer'})).length,0,
  'wrong producer consumer must not inherit visual_stage G5');
 assert.equal((await production.passed('D05',{...g5Context,purpose:{...g5Context.purpose,code:'forged'}})).length,0);
 assert.equal((await production.legalInput('D05',{...g4Context,scope:{project:'another'}})).length,0);
 await assert.rejects(()=>production.legalInput('D05'),/QUALIFICATION_CONTEXT_REQUIRED/);


 sql(`insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)
 values('G5','work-fixture-rule',array['fixture_check','work_revision_binding','rights_by_operation'],interval '1 hour','TEST_ONLY',true)`);
 const work=randomUUID(),revision=randomUUID();
 const content={beats:[{text:'TEST_ONLY signed complete work',provenanceRefs:['TEST_ONLY']}],rights_acknowledged:true};
 sql(`insert into publication.works(work_id,title,creator)values('${work}','TEST_ONLY','fixture');
 insert into publication.work_revisions(revision_id,work_id,revision_no,title,content)values('${revision}','${work}',1,'TEST_ONLY','${JSON.stringify(content)}')`);
 const workReader=createWorkQualificationReader(pool),checks=[];
 for(const consumer of ['watch','visual_stage','agent','evidence_on_demand']){
  const ctx={consumer,purpose:{namespace:'G5',code:'work-fixture',version:'1'},scope:{project:'fixture',work_id:work}};
  const action=consumer==='agent'?'read':consumer==='evidence_on_demand'?'quote':'display';
  const binding={schema:'mohen.work-revision-g5-binding.v1',work_id:work,revision_id:revision,content_sha256:workContentDigest(content),
   title:'TEST_ONLY',description:'',complete_work:true,consumer,purpose:ctx.purpose,scope:ctx.scope,rights_by_action:{[action]:'allowed'},rights_valid_until:new Date(Date.now()+600000).toISOString()};
  assert.equal(await workReader.check(work,revision,ctx,content),false,'no signed binding never gains permission');
  sql(`insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
   values('${user}','mohen_gate_signer','G5','G5','work-fixture','1','${consumer}','${JSON.stringify(ctx.scope)}',now()+interval '1 hour','TEST_ONLY');`);
  const deps=JSON.stringify([{gate_audit_id:g4.gate_audit_id,qualification_digest:g4.qualification_digest,artifact_revision:g4.artifact_revision}]);
  const makeCandidate=()=>sql(`set role mohen_producer;insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
   values('00000000-0000-0000-0000-000000000010','D05','G5','story_seed','${story}','${upstream.artifact_revision}','G5','work-fixture','1','${JSON.stringify(ctx.scope)}','${consumer}','${deps}','[{"id":"TEST_ONLY"}]','${'a'.repeat(64)}') returning candidate_id`);
  const sign=async bound=>{
   const candidate=makeCandidate();
   const receipt=JSON.stringify({checks:{fixture_check:true,work_revision_binding:true,rights_by_operation:true},rationale:'TEST_ONLY complete work rights attestation',evidence_refs:[{id:'TEST_ONLY'}],work_revision_binding:bound});
   const prior=sql(`select gate_audit_id from control.qualification_current where object_id='${story}' and consumer='${consumer}' and purpose_code='work-fixture'`);
   return sql(`begin;set local role mohen_gate_signer;set local mohen.session_token='${token}';select control.sign_gate_candidate('${candidate}','${randomUUID()}','PASS','work-fixture-rule',now()+interval '30 minutes','${receipt}',${prior?`'${prior}'`:'null'});commit;`);
  };
  await sign(binding);
  assert.equal(await workReader.check(work,revision,ctx,content),true,consumer+' real signed G5 complete work positive');
  checks.push([ctx,content]);
  for(const altered of [{...ctx,consumer:'producer'},{...ctx,scope:{project:'foreign'}},{...ctx,purpose:{...ctx.purpose,code:'foreign'}},{...ctx,purpose:{...ctx.purpose,version:'2'}}])
   assert.equal(await workReader.check(work,revision,altered,content),false,'wrong context');
  assert.equal(await workReader.check(work,randomUUID(),ctx,content),false,'wrong immutable work revision');
  assert.equal(await workReader.check(randomUUID(),revision,ctx,content),false,'wrong work identity');
  assert.equal(await workReader.check(work,revision,ctx,{...content,beats:[]}),false,'caller cannot substitute content');
  // Each rights failure is itself independently signed, proving the consumer
  // refuses a real current G5 that lacks the exact action/expiry/whole-work grant.
  for(const altered of [{...binding,rights_by_action:{[action]:'unknown'}},{...binding,rights_valid_until:'2000-01-01T00:00:00Z'},
    {...binding,content_sha256:'b'.repeat(64)},{...binding,complete_work:false},{...binding,title:'altered'},{...binding,description:'altered'}]){
   await sign(altered);
   assert.equal(await workReader.check(work,revision,ctx,content),false,consumer+' signed wrong rights/hash/complete-work');
  }
  await sign(binding);
  assert.equal(await workReader.check(work,revision,ctx,content),true);
 }

 sql(`update read_model.story_seeds set title='TEST_ONLY altered L5 revision' where story_seed_id='${story}'`);
 for(const [ctx,body] of checks)assert.equal(await workReader.check(work,revision,ctx,body),false,'physical L5 revision changed');
 sql(`update read_model.story_seeds set title='qualified story' where story_seed_id='${story}'`);
 for(const [ctx,body] of checks)assert.equal(await workReader.check(work,revision,ctx,body),true,'exact independently reviewed fingerprint restored before revocation');
 sql(`update control.gate_policy_versions set required_checks=array['fixture_check'] where gate_code='G5' and rule_version='work-fixture-rule'`);
 for(const [ctx,body] of checks)assert.equal(await workReader.check(work,revision,ctx,body),false,'generic G5 policy cannot attest a complete work');
 sql(`update control.gate_policy_versions set required_checks=array['fixture_check','work_revision_binding','rights_by_operation'] where gate_code='G5' and rule_version='work-fixture-rule'`);
 assert.equal(await createWorkQualificationReader({query:async()=>{throw Error('unavailable');}}).check(work,revision,checks[0][0],content),false);
 console.log('MAB_WORK_G5_BINDING_POS_NEG_PASS four-consumers persisted-work exact-L5 signed-rights current-dependencies');
 sql(`begin;set local role mohen_gate_signer;set local mohen.session_token='${token}';select control.revoke_gate_qualification('${root.gate_audit_id}','${randomUUID()}','TEST_ONLY root rights withdrawn');commit;`);
 for(const [ctx,body] of checks)assert.equal(await workReader.check(work,revision,ctx,body),false,'ancestor revocation denies every work consumer');
 console.log('MAB_WORK_G5_BINDING_REVOKED_PASS four-consumers');
 assert.equal(await repo.getRuntimeEligible('story_seed',story,context),null,'even a previously read/cached ID must recheck the entire current dependency chain');
 checkWebRetrieval('revoked');
 assert.equal((await production.passed('D05',g5Context)).length,0,'revoked G0 invalidates G5 independent consumer');
 assert.equal((await production.legalInput('D05',g4Context)).length,0,'revoked ancestor forbids G4 being consumed by D05');
 await assert.rejects(()=>validateG5Lineage(pool,[finding],g4Context),/G5_LINEAGE_BLOCKED/);
 console.log('K3_READ_MODEL_QUALIFICATION_PASS real G0-G5 chain legacy-denied exact-purpose scope consumer revision revocation');
}finally{await pool.end();}
