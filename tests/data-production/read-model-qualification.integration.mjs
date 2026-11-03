import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {createReadModelRepository} from '../../packages/data-access/src/read-model-repository.mjs';
import {createDataProductionRepository} from '../../packages/data-access/src/data-production-repository.mjs';
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
 let upstream=root;
 for(const [gate,kind,object] of [['G1','reading_unit',reading],['G2','material_evidence',evidence],['G3','entity',world],['G4','finding',finding],['G5','story_seed',story]]) {
   sql(`insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled) values('${gate}','fixture-rule',array['fixture_check'],interval '1 hour','TEST_ONLY',true);
   insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
   values('${user}','mohen_gate_signer','${gate}','${gate}','fixture','1','visual_stage','{"project":"fixture"}',now()+interval '1 hour','TEST_ONLY');`);
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

 sql(`begin;set local role mohen_gate_signer;set local mohen.session_token='${token}';select control.revoke_gate_qualification('${root.gate_audit_id}','${randomUUID()}','TEST_ONLY root rights withdrawn');commit;`);
 assert.equal(await repo.getRuntimeEligible('story_seed',story,context),null,'even a previously read/cached ID must recheck the entire current dependency chain');
 assert.equal((await production.passed('D05',g5Context)).length,0,'revoked G0 invalidates G5 independent consumer');
 assert.equal((await production.legalInput('D05',g4Context)).length,0,'revoked ancestor forbids G4 being consumed by D05');
 await assert.rejects(()=>validateG5Lineage(pool,[finding],g4Context),/G5_LINEAGE_BLOCKED/);
 console.log('K3_READ_MODEL_QUALIFICATION_PASS real G0-G5 chain legacy-denied exact-purpose scope consumer revision revocation');
}finally{await pool.end();}
