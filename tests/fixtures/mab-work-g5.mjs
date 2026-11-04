// Synthetic fixtures only; callers must prove the disposable instance marker.
import {randomUUID,createHmac} from 'node:crypto';
import {workContentDigest} from '../../packages/data-access/src/work-qualification-reader.mjs';
export function seedWorkG5(sql,{kind='story_seed',workContent}={}){
 if(sql("select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('UNMARKED_FIXTURE_DATABASE');
 const reviewer=randomUUID(),run=randomUUID(),source=randomUUID(),reading=randomUUID(),evidence=randomUUID(),world=randomUUID(),finding=randomUUID(),story=randomUUID(),work=randomUUID(),revision=randomUUID();
 const secret='synthetic-mab-http-database-key-at-least-32';
 const payload=Buffer.from(JSON.stringify({uid:reviewer,r:[],exp:Date.now()+600000})).toString('base64url');
 const token=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
 const content=workContent??{beats:[{narration:'TEST_ONLY qualified work '+work,provenanceRefs:['TEST_ONLY']}],rights_acknowledged:true};
 sql(`insert into public.users(user_id,email,username,password_hash)values('${reviewer}','${reviewer}@example.invalid','Synthetic Reviewer','not-a-password');
 insert into control.production_runs(run_id,research_intent,execution_mode,status)values('${run}','TEST_ONLY work binding','attended','PASS');
 insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)values('${source}','TEST_ONLY','TEST_ONLY source','fixture','text','full_content');
 insert into source.read_runs(read_run_id,input_sha256)values('${run}','${'a'.repeat(64)}');
 insert into source.read_units(read_unit_id,read_run_id,method_code)values('${reading}','${run}','C01');
 insert into evidence.material_evidence(evidence_id,source_id,locator,modality,source_voice)values('${evidence}','${source}','{}','text','TEST_ONLY');
 insert into world.entities(entity_id,entity_type,canonical_label)values('${world}','fixture','TEST_ONLY');
 insert into meaning.findings(finding_id,finding_type,interpretive_statement)values('${finding}','fixture','TEST_ONLY');
 insert into read_model.story_seeds(story_seed_id,seed_key,title,payload)values('${story}','TEST_ONLY:${story}','TEST_ONLY','{}');
 insert into publication.works(work_id,title,creator)values('${work}','TEST_ONLY','fixture');
 insert into publication.work_revisions(revision_id,work_id,revision_no,title,content,status)values('${revision}','${work}',1,'TEST_ONLY','${JSON.stringify(content)}','published');
 insert into publication.published_pointers(work_id,revision_id,published_by)values('${work}','${revision}','TEST_ONLY');`);
 const facets={
  world_projection:['world_projections','projection_id',`projection_key,payload`,`'TEST_ONLY:${story}','{}'`],
  agent_context:['agent_contexts','agent_context_id',`context_key,payload`,`'TEST_ONLY:${story}','{}'`],
  story_seed:['story_seeds','story_seed_id',null,null],
  discovery_path:['discovery_paths','discovery_path_id',`path_key,steps`,`'TEST_ONLY:${story}','[]'`],
  map_timeline_projection:['map_timeline_projections','map_timeline_projection_id',`projection_key,payload`,`'TEST_ONLY:${story}','{}'`],
  evidence_pointer:['evidence_pointers','evidence_pointer_id',`evidence_id,source_id,display_locator`,`'${evidence}','${source}','{}'`]
 };
 const physical=facets[kind];if(!physical)throw Error('FIXTURE_KIND_INVALID');
 const [table,key,columns,values]=physical;
 if(kind!=='story_seed'){
  sql(`delete from read_model.story_seeds where story_seed_id='${story}';
   insert into read_model.${table}(${key},${columns})values('${story}',${values})`);
 }
 let parent=null,root;
 const scope={project:'m5-http'};
 const actions={watch:'display',visual_stage:'display',agent:'read',evidence_on_demand:'quote'};
 function sign(gate,kind,id,consumer,binding){
  const rule='http-work-binding-'+gate;
  sql(`insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)
   values('${gate}','${rule}',array['work_revision_binding','rights_by_operation'],interval '1 hour','TEST_ONLY',true)on conflict do nothing;
   insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
   values('${reviewer}','mohen_gate_signer','${gate}','${gate}','m5-http','1','${consumer}','${JSON.stringify(scope)}',now()+interval '1 hour','TEST_ONLY');`);
  const artifactRevision=sql(`select control.artifact_revision_for('${kind}','${id}')`);
  const deps=parent?[{gate_audit_id:parent.gate_audit_id,artifact_revision:parent.artifact_revision,qualification_digest:parent.qualification_digest}]:[];
  const candidate=sql(`set role mohen_producer;insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
   values('${run}','D0${gate[1]}','${gate}','${kind}','${id}','${artifactRevision}','${gate}','m5-http','1','${JSON.stringify(scope)}','${consumer}','${JSON.stringify(deps)}','[{"id":"TEST_ONLY"}]','${'a'.repeat(64)}')returning candidate_id`);
  const receipt={checks:{work_revision_binding:true,rights_by_operation:true},rationale:'TEST_ONLY not professional qualification',evidence_refs:[{id:'TEST_ONLY'}],...(binding?{work_revision_binding:binding}:{})};
  const audit=sql(`begin;set local role mohen_gate_signer;set local mohen.session_token='${token}';select control.sign_gate_candidate('${candidate}','${randomUUID()}','PASS','${rule}',now()+interval '30 minutes','${JSON.stringify(receipt)}',null);commit;`);
  return JSON.parse(sql(`select row_to_json(a)from control.gate_audits a where gate_audit_id='${audit}'`));
 }
 for(const [gate,kind,id] of [['G0','source',source],['G1','reading_unit',reading],['G2','material_evidence',evidence],['G3','entity',world],['G4','finding',finding]]){
  parent=sign(gate,kind,id,'producer');if(gate==='G0')root=parent;
 }
 for(const consumer of Object.keys(actions)){
  const binding={schema:'mohen.work-revision-g5-binding.v1',work_id:work,revision_id:revision,title:'TEST_ONLY',description:'',
   content_sha256:workContentDigest(content),complete_work:true,consumer,purpose:{namespace:'G5',code:'m5-http',version:'1'},scope,
   rights_by_action:{[actions[consumer]]:'allowed'},rights_valid_until:new Date(Date.now()+600000).toISOString()};
  sign('G5',kind,story,consumer,binding);
 }
 return {work,revision,content,story,kind,table,key,root:root.gate_audit_id,revoke(){
  sql(`begin;set local role mohen_gate_signer;set local mohen.session_token='${token}';select control.revoke_gate_qualification('${root.gate_audit_id}','${randomUUID()}','TEST_ONLY rights withdrawn');commit;`);
 }};
}
