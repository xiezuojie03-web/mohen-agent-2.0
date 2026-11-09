import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as access from '../../packages/data-access/src/index.mjs';
assert.equal(typeof access.createStudioAssetRepository,'function','Studio revisions require a transaction-backed store');
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_DATABASE:database}=process.env;
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined;
const socket=localTcpHost??process.env.MOHEN_TEST_SOCKET;
if(!psql||!(localTcpHost||socket?.startsWith('/workspace/'))||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
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


 // All 13 kinds: real private persistence for ten; three canonical bodies must
 // stay in their existing stores. Saved source/dependency hints confer no G5.
 const srcId=randomUUID(),srcVersionId=randomUUID(),srcChecksum='c'.repeat(64);
 sql(`insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)
   values('${srcId}','TEST_ONLY','合成来源','book','print','full_content');
  insert into source.source_versions(source_version_id,source_id,checksum_sha256)
   values('${srcVersionId}','${srcId}','${srcChecksum}')`);
 const privateKinds=['research_brief','source_anchor','reading_note','evidence_note','spacetime_candidate','relation_hypothesis','humanistic_insight','research_collection','citation_snapshot','consented_feedback'];
 for(const kind of privateKinds){
  const consent=kind==='consented_feedback'?{consent:true,withdrawal_allowed:true}:{};
  const item={...input,assetId:randomUUID(),kind,idempotencyKey:'matrix-first',payload:{kind,text:'TEST_ONLY '+kind,...consent},
   sourceRefs:[{type:'source_version',id:srcVersionId,revision:srcChecksum},{type:'source',id:srcId}],
   dependencyRefs:[{type:'asset_revision',id:second.revision_id}]};
  // A backlink that does not resolve is refused, and so is an evidence-bearing
  // asset with no source at all: neither may be stored as a silent gap.
  await assert.rejects(()=>repo.saveRevision({...item,assetId:randomUUID(),sourceRefs:[{id:'TEST_ONLY_UNVERIFIED',revision:'1'}]},token(a)),
   /STUDIO_REFERENCES_INVALID/,'a reference without a registered type is not a backlink');
  await assert.rejects(()=>repo.saveRevision({...item,assetId:randomUUID(),sourceRefs:[{type:'source_version',id:randomUUID(),revision:'UNVERIFIED'}]},token(a)),
   /STUDIO_REFERENCE_UNRESOLVED/,'a dangling version ref cannot be stored');
  await assert.rejects(()=>repo.saveRevision({...item,assetId:randomUUID(),sourceRefs:[{type:'source_version',id:srcVersionId,revision:'d'.repeat(64)}]},token(a)),
   /STUDIO_REFERENCE_UNRESOLVED/,'a mismatched checksum is a revision mismatch, not a hit');
  if(['source_anchor','reading_note','evidence_note','spacetime_candidate','relation_hypothesis'].includes(kind))
   await assert.rejects(()=>repo.saveRevision({...item,assetId:randomUUID(),sourceRefs:[]},token(a)),
    /STUDIO_SOURCE_REFERENCE_REQUIRED/,'evidence-bearing kinds need at least one source ref');
  if(kind==='consented_feedback')
   await assert.rejects(()=>repo.saveRevision({...item,payload:{kind,text:'TEST_ONLY no consent'}},token(a)),/STUDIO_FEEDBACK_CONSENT_REQUIRED/);
  const one=await repo.saveRevision(item,token(a));
  const two=await repo.saveRevision({...item,expectedRevisionId:one.revision_id,idempotencyKey:'matrix-second',payload:{...item.payload,text:'TEST_ONLY changed'}},token(a));
  assert.equal(two.revision_no,2);assert.equal(two.supersedes_revision_id,one.revision_id);
  assert.deepEqual((await repo.getRevision(one.revision_id,token(a))).payload,item.payload);
  assert.deepEqual(two.source_refs,item.sourceRefs);assert.deepEqual(two.dependency_refs,item.dependencyRefs);
  assert.equal(two.content_state,'WORKING');assert.equal(two.access_state,'RESTRICTED');
  assert.equal(two.freshness_state,'UNKNOWN_DEPENDENCY');assert.equal(two.validation.status,'UNASSESSED');
  assert.ok(Object.values(two.rights_by_action).every(x=>x==='unknown'));
  assert.deepEqual(two.formal_l_refs,[]);
  assert.equal((await repo.listAssetRevisions(project,item.assetId,token(a))).length,2);
  assert.equal((await repo.listAssetRevisions(project,item.assetId,token(b))).length,0);
  assert.equal(await repo.getRevision(one.revision_id,token(b)),null);
  await assert.rejects(()=>repo.saveRevision({...item,idempotencyKey:'foreign'},token(b)),/STUDIO_PROJECT_NOT_FOUND/);
  sql(`insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)
   values('${project}','${two.revision_id}','${a}','studio','TEST_ONLY','read','TEST_ONLY not a rights grant')`);
  assert.equal((await repo.listRevisionUseEvents(project,two.revision_id,token(a))).length,1);
  assert.equal((await repo.listRevisionUseEvents(project,one.revision_id,token(a))).length,0);
  assert.equal((await repo.listRevisionUseEvents(project,two.revision_id,token(b))).length,0);
  // Consumption accounting: an authorized read is recorded, an action whose
  // right is not explicitly allowed is refused by the repository and again by
  // the database guard, so no code path can record a use it cannot justify.
  const recorded=await repo.recordUseEvent({projectId:project,revisionId:two.revision_id,consumer:'agent',
   purpose:'studio_research_context',requestedAction:'read'},token(a));
  assert.equal(recorded.requested_action,'read');
  await assert.rejects(()=>repo.recordUseEvent({projectId:project,revisionId:two.revision_id,consumer:'agent',
   purpose:'studio_research_context',requestedAction:'quote'},token(a)),/STUDIO_USE_BLOCKED/);
  assert.throws(()=>sql(`insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)
   values('${project}','${two.revision_id}','${a}','studio','TEST_ONLY','adapt','TEST_ONLY not a rights grant')`),
   /ASSET_USE_BLOCKED/,'database guard refuses a blocked use without the repository');
  const report=await repo.assetReferenceReport(project,two.revision_id,token(a));
  assert.equal(report.source.blocked,0);assert.equal(report.source.resolved,2);
  assert.equal(report.dependency.resolved,1);
  assert.equal(report.use_event_count,2,'raw fixture plus recorded read');
  assert.equal(await repo.assetReferenceReport(project,two.revision_id,token(b)),null,'cross-owner cannot reverse-look-up refs');
  console.log('MAB_ASSET_KIND_PRIVATE_PASS '+kind+' POS revision/history/source/dependency NEG cross-owner/no-G5/unknown-rights');
 }
 for(const kind of ['director_plan','media_selection','work_revision']){
  await assert.rejects(()=>repo.saveRevision({...input,assetId:randomUUID(),kind},token(a)),/STUDIO_CANONICAL_BINDING_REQUIRED/);
  console.log('MAB_ASSET_KIND_CANONICAL_DENY_PASS '+kind);
 }
 sql(`create function studio.fixture_disable_after_save()returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin if new.asset_id='${asset}'::uuid then update public.users set status='disabled' where user_id='${a}';end if;return new;end$$;create trigger fixture_disable_after_save after update on studio.asset_heads for each row execute function studio.fixture_disable_after_save()`);
 try {
  await assert.rejects(()=>repo.saveRevision({...next,idempotencyKey:'revoked-during-save',expectedRevisionId:current.revision_id},token(a)),/STUDIO_REVISION_NOT_PERSISTED/);
  assert.equal(sql(`select count(*) from studio.asset_revisions where asset_id='${asset}'`),'3');
  assert.equal(sql(`select status from public.users where user_id='${a}'`),'active','failed save rolls back test-only concurrent revoke too');
 }finally{sql(`drop trigger fixture_disable_after_save on studio.asset_heads;drop function studio.fixture_disable_after_save();update public.users set status='active' where user_id='${a}'`);}

 // ST-02 must filter generated notes before LIMIT, so their creation does not
 // displace the oldest research candidate on a full-page replay.
 const fullProject=randomUUID();await repo.createProject({projectId:fullProject,title:'ST02 limit fixture',scope:{}},token(a));
 for(let i=0;i<100;i++)await repo.saveRevision({projectId:fullProject,assetId:randomUUID(),kind:'reading_note',
  expectedRevisionId:null,idempotencyKey:'st02-limit-'+i,payload:{literal_reading:'synthetic candidate '+i},
  sourceRefs:[{type:'source',id:srcId}]},token(a));
 const before=(await repo.listAssets(fullProject,token(a),{excludeGeneratedReadingNotes:true})).map(r=>r.revision_id);
 const generated=await repo.saveRevision({projectId:fullProject,assetId:randomUUID(),kind:'reading_note',expectedRevisionId:null,
  idempotencyKey:'st02-generated',payload:{schema:'mohen.studio-reading-note.v1'},
  sourceRefs:[{type:'source',id:srcId}]},token(a));
 assert.equal(before.length,100);
 assert((await repo.listAssets(fullProject,token(a))).some(r=>r.revision_id===generated.revision_id),'normal notebook retains generated notes');
 assert.deepEqual((await repo.listAssets(fullProject,token(a),{excludeGeneratedReadingNotes:true})).map(r=>r.revision_id),before);
 assert.equal((await repo.listAssets(fullProject,token(b),{excludeGeneratedReadingNotes:true})).length,0);
 console.log('MAB_ST02_PRELIMIT_REPLAY_PASS 100-candidates generated-note owner-only');
 // Explicit Admin browsing must reach all 101 assets without changing ST02's default query.
 const browsed=[];let browseCursor=null;
 do {
  const rows=await repo.listAssets(fullProject,token(a),{browse:true,limit:20,cursor:browseCursor});
  browsed.push(...rows.slice(0,20).map(r=>r.revision_id));
  browseCursor=rows.length>20?rows[19].revision_id:null;
 }while(browseCursor);
 assert.equal(browsed.length,101);assert.equal(new Set(browsed).size,101);
 const found=await repo.listAssets(fullProject,token(a),{browse:true,q:'synthetic candidate 0',kind:'reading_note',limit:20});
 assert.equal(found.length,1);assert.equal(found[0].payload.literal_reading,'synthetic candidate 0');
 assert.equal((await repo.listAssets(fullProject,token(b),{browse:true,limit:20})).length,0);
 assert.equal((await repo.listAssets(fullProject,token(a),{browse:true,cursor:current.revision_id,limit:20})).length,0,'foreign-project cursor grants no traversal');
 assert.throws(()=>repo.listAssets(fullProject,token(a),{browse:true,limit:101}),/STUDIO_BROWSE_INVALID/);
 console.log('MAB_ADMIN_ASSET_BROWSE_PASS 101-assets exact-search stable-pages cross-owner foreign-project-cursor');

 for(let i=0;i<2;i++){const c=await pool.connect();const state=(await c.query("select current_user as role,coalesce(current_setting('mohen.session_token',true),'')as token")).rows[0];assert.equal(state.role,'k3_admin');assert.equal(state.token,'');c.release();}
 console.log('MAB_STUDIO_REPOSITORY_PASS saved-payload immutable-revision request-idempotency exact-CAS concurrency cross-owner clean-pool');
}finally{await pool.end();}
