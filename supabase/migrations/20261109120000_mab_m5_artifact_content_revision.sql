-- MAB M5 correction batch: make artifact identity content-based and retire
-- qualifications for objects that are no longer current.
--
-- Problem 1 (recurring re-sign): control.artifact_revision_for() hashed
-- to_jsonb(row) over EVERY column, so any additive schema change (e.g. adding
-- rights_by_action) silently changed every artifact revision and voided every
-- previously signed Gate. Fix: pin the columns that constitute artifact
-- content in control.artifact_content_columns, and hash only those. Schema
-- evolution is then decoupled from content change; only a deliberate registry
-- update changes identity.
--
-- The registry is seeded with every column the tables have TODAY, so the hash
-- produced for every existing row is byte-identical to the old one. The
-- migration asserts that (it would abort otherwise), therefore no currently
-- valid G0..G5 signature is invalidated by this change.
--
-- Problem 2 (retirement): control.sign_gate_candidate() looked up the previous
-- qualification by a key that INCLUDED artifact_revision, then deleted only
-- that single row. Once an artifact's content changed, the lookup found
-- nothing and the old row was never retired, so control.qualification_current
-- accumulated rows that could never be valid again. Fix: retire by the object
-- key (gate, object, purpose, consumer) without artifact_revision, and delete
-- every stale row for that key.
--
-- Problem 3 (existing residue): the 7 rows already stale from the earlier
-- 2026-11-07 attempt are retired here, each with an explicit
-- control.invalidation_events record. This is a recorded retirement, not a
-- silent delete: the signed audits themselves stay immutable history.
begin;

-- 1) Registry of the columns that constitute artifact content.
create table if not exists control.artifact_content_columns (
  kind text not null check(length(kind)>0),
  column_name text not null check(length(column_name)>0),
  registered_at timestamptz not null default now(),
  primary key(kind,column_name)
);
alter table control.artifact_content_columns enable row level security;
revoke all on control.artifact_content_columns from public,mohen_producer,mohen_gate_signer,mohen_app_runtime;
grant select on control.artifact_content_columns to mohen_gate_authority;
drop policy if exists k5_content_columns on control.artifact_content_columns;
create policy k5_content_columns on control.artifact_content_columns for select to mohen_gate_authority using(true);

-- Seed from the live schema once. on conflict do nothing keeps a later
-- deliberate registry edit from being overwritten on re-run.
insert into control.artifact_content_columns(kind,column_name)
select m.kind,a.attname
from (values
  ('source','source','sources'),
  ('source_version','source','source_versions'),
  ('raw_item','source','raw_items'),
  ('read_unit','source','read_units'),
  ('reading_unit','source','read_units'),
  ('read_run','source','read_runs'),
  ('material_evidence','evidence','material_evidence'),
  ('entity','world','entities'),
  ('event','world','events'),
  ('relation_claim','world','relation_claims'),
  ('change','world','changes'),
  ('claim_revision','world','claim_revisions'),
  ('historical_space_claim','world','historical_space_claims'),
  ('visual_object','world','visual_objects'),
  ('finding','meaning','findings'),
  ('present_connection','meaning','present_connections'),
  ('open_question','meaning','open_questions'),
  ('world_projection','read_model','world_projections'),
  ('agent_context','read_model','agent_contexts'),
  ('story_seed','read_model','story_seeds'),
  ('discovery_path','read_model','discovery_paths'),
  ('map_timeline_projection','read_model','map_timeline_projections'),
  ('evidence_pointer','read_model','evidence_pointers')) as m(kind,ns,tbl)
join pg_catalog.pg_class cl on cl.oid=to_regclass(format('%I.%I',m.ns,m.tbl))
join pg_catalog.pg_attribute a on a.attrelid=cl.oid and a.attnum>0 and not a.attisdropped
on conflict do nothing;

-- 2) Snapshot the revisions that are currently reproducible, so the migration
--    can prove the new semantics change none of them.
create temporary table k5_revision_before on commit drop as
select distinct a.object_type,a.object_id,a.artifact_revision
from control.gate_audits a
where a.artifact_revision=control.artifact_revision_for(a.object_type,a.object_id);

-- 3) Content-based artifact revision. Unknown kinds still return null; known
--    kinds without a registry entry fail closed instead of hashing the row.
create or replace function control.artifact_revision_for(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare ns text; tbl text; key_col text; cols text[]; revision text;
begin
 select m.ns,m.tbl,m.key_col into ns,tbl,key_col from (values
    ('source','source','sources','source_id'),
    ('source_version','source','source_versions','source_version_id'),
    ('raw_item','source','raw_items','raw_item_id'),
    ('read_unit','source','read_units','read_unit_id'),
    ('reading_unit','source','read_units','read_unit_id'),
    ('read_run','source','read_runs','read_run_id'),
    ('material_evidence','evidence','material_evidence','evidence_id'),
    ('entity','world','entities','entity_id'),
    ('event','world','events','event_id'),
    ('relation_claim','world','relation_claims','relation_claim_id'),
    ('change','world','changes','change_id'),
    ('claim_revision','world','claim_revisions','claim_revision_id'),
    ('historical_space_claim','world','historical_space_claims','historical_space_claim_id'),
    ('visual_object','world','visual_objects','visual_object_id'),
    ('finding','meaning','findings','finding_id'),
    ('present_connection','meaning','present_connections','present_connection_id'),
    ('open_question','meaning','open_questions','open_question_id'),
    ('world_projection','read_model','world_projections','projection_id'),
    ('agent_context','read_model','agent_contexts','agent_context_id'),
    ('story_seed','read_model','story_seeds','story_seed_id'),
    ('discovery_path','read_model','discovery_paths','discovery_path_id'),
    ('map_timeline_projection','read_model','map_timeline_projections','map_timeline_projection_id'),
    ('evidence_pointer','read_model','evidence_pointers','evidence_pointer_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
 if not found then return null; end if;
 select array_agg(c.column_name) into cols from control.artifact_content_columns c where c.kind=p_kind;
 if cols is null or cardinality(cols)=0 then raise exception 'ARTIFACT_CONTENT_COLUMNS_NOT_REGISTERED:%',p_kind; end if;
 execute format('select (select encode(control.sha256_bytes(convert_to(agg::text,''UTF8'')),''hex'')
   from (select jsonb_object_agg(j.key,j.value) as agg from jsonb_each(to_jsonb(t)) j where j.key=any($2)) s)
   from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id,cols;
 return revision;
end $$;
alter function control.artifact_revision_for(text,uuid) owner to mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer;

-- 4) Fail closed if this change would move any revision that was reproducible
--    before the change: that would silently void already signed Gates.
do $$ declare moved int; begin
 select count(*) into moved from k5_revision_before b
  where control.artifact_revision_for(b.object_type,b.object_id) is distinct from b.artifact_revision;
 if moved>0 then raise exception 'ARTIFACT_REVISION_SEMANTICS_MOVED:%',moved; end if;
end $$;

-- 5) Retirement by object key, not by artifact_revision.
create or replace function control.sign_gate_candidate(p_candidate uuid,p_request uuid,p_result text,p_rule text,
 p_until timestamptz,p_receipt jsonb,p_expected uuid default null) returns uuid
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 c control.gate_candidates; p control.gate_policy_versions; previous control.gate_audits;
 principal uuid; actor name; current_id uuid; new_id uuid; fingerprint text; key_text text;
begin
 principal:=control.current_app_user_id();
 actor:=coalesce(nullif(current_setting('role',true),'none'),session_user)::name;
 if principal is null then raise exception 'REVIEWER_IDENTITY_REQUIRED'; end if;
 if not pg_has_role(actor,'mohen_gate_signer','MEMBER') or exists(select from pg_roles where rolname=actor and (rolsuper or rolbypassrls)) then raise exception 'REVIEWER_DB_IDENTITY_INVALID'; end if;
 select * into c from control.gate_candidates where candidate_id=p_candidate;
 if not found then raise exception 'GATE_CANDIDATE_NOT_FOUND'; end if;
 if actor=c.producer_identity::name then raise exception 'PRODUCER_CANNOT_SIGN'; end if;
 if not exists(select from control.gate_reviewer_bindings b where b.reviewer_user_id=principal and b.db_identity=actor
  and b.gate_code=c.gate_code and b.purpose_namespace=c.purpose_namespace and b.purpose_code=c.purpose_code
  and b.purpose_version=c.purpose_version and b.consumer=c.consumer and b.allowed_scope @> c.allowed_scope
  and b.active and now()>=b.valid_from and now()<b.valid_until) then raise exception 'REVIEWER_BINDING_REQUIRED'; end if;
 select * into p from control.gate_policy_versions where gate_code=c.gate_code and rule_version=p_rule and enabled;
 if not found then raise exception 'GATE_POLICY_NOT_ACTIVE'; end if;
 if p_request is null or p_result not in ('PASS','HOLD','REJECT') or p_result is null then raise exception 'GATE_DECISION_INVALID'; end if;
 if p_until is null or p_until<=now() or p_until>now()+p.max_validity then raise exception 'QUALIFICATION_VALIDITY_INVALID'; end if;
 if p_receipt is null or jsonb_typeof(p_receipt)<>'object' or length(coalesce(p_receipt->>'rationale',''))=0
  or p_receipt->'evidence_refs' is distinct from c.evidence_refs
  or exists(select from unnest(p.required_checks) required where
    jsonb_typeof(p_receipt->'checks'->required) is distinct from 'boolean'
    or (p_result='PASS' and p_receipt->'checks'->required is distinct from 'true'::jsonb))
 then raise exception 'REVIEW_RECEIPT_INVALID'; end if;
 fingerprint:=encode(control.sha256_bytes(convert_to(jsonb_build_object('candidate',p_candidate,'result',p_result,'rule',p_rule,'until',p_until,
  'receipt',p_receipt,'expected',p_expected,'reviewer',principal,'db',actor)::text,'UTF8')),'hex');
 key_text:=jsonb_build_array('mohen.six-stage.v1',c.gate_code,c.object_type,c.object_id,
  c.purpose_namespace,c.purpose_code,c.purpose_version,c.consumer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key_text,0));
 select * into previous from control.gate_audits where decision_request_id=p_request;
 if found then
  if previous.decision_request_fingerprint is distinct from fingerprint then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.gate_audit_id;
 end if;
 perform 1 from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer for update;
 select gate_audit_id into current_id from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer
  order by valid_from desc,gate_audit_id desc limit 1;
 if current_id is distinct from p_expected then raise exception 'QUALIFICATION_CAS_CONFLICT'; end if;
 if c.candidate_status not in ('SUBMITTED','HOLD') then raise exception 'CANDIDATE_ALREADY_DECIDED'; end if;
 if c.gate_code<>'G0' and (jsonb_array_length(c.dependency_snapshot)=0 or not exists(
  select from jsonb_array_elements(c.dependency_snapshot) d join control.gate_audits parent
   on parent.gate_audit_id=(d.value->>'gate_audit_id')::uuid
  where parent.gate_code='G'||(substring(c.gate_code from 2)::int-1)::text)) then raise exception 'MISSING_UPSTREAM_DEPENDENCY'; end if;

 if c.artifact_revision is distinct from control.artifact_revision_for(c.object_type,c.object_id) then raise exception 'ARTIFACT_REVISION_NOT_CURRENT'; end if;
 if exists(select from jsonb_array_elements(c.dependency_snapshot) d where
  jsonb_typeof(d.value)<>'object' or d.value->>'gate_audit_id' is null
  or not exists(select from control.gate_audits a where a.gate_audit_id=(d.value->>'gate_audit_id')::uuid
    and a.qualification_digest=d.value->>'qualification_digest' and a.artifact_revision=d.value->>'artifact_revision'
    and control.current_qualification_is_valid(a.gate_audit_id))) then raise exception 'DEPENDENCY_NOT_CURRENT'; end if;
 insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result,architecture_generation,purpose,allowed_scope,consumer,
  dependency_snapshot,input_fingerprint,rule_version,supersedes_id,candidate_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
  reviewer_user_id,reviewer_db_identity,decision_origin,valid_from,valid_until,qualification_digest,signed_at,decision_request_id,decision_request_fingerprint,details)
 values(c.run_id,c.stage,c.gate_code,c.object_type,c.object_id,p_result::control.gate_result,'mohen.six-stage.v1',c.purpose_code,c.allowed_scope,c.consumer,
  c.dependency_snapshot,c.input_fingerprint,p_rule,current_id,c.candidate_id,c.artifact_revision,c.purpose_namespace,c.purpose_code,c.purpose_version,
  principal,actor,'independent_gate',now(),p_until,fingerprint,now(),p_request,fingerprint,p_receipt) returning gate_audit_id into new_id;
 -- Retire every earlier qualification for this object key, whatever artifact
 -- revision it was signed against. A qualification for superseded content is
 -- not a current qualification.
 delete from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer;
 if p_result='PASS' then
  insert into control.qualification_current(architecture_generation,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
    consumer,gate_audit_id,valid_from,valid_until,dependency_fingerprint,scope_digest,rule_version,reviewer_user_id)
  values('mohen.six-stage.v1',c.gate_code,c.object_type,c.object_id,c.artifact_revision,c.purpose_namespace,c.purpose_code,c.purpose_version,c.consumer,new_id,now(),p_until,
   encode(control.sha256_bytes(convert_to(c.dependency_snapshot::text,'UTF8')),'hex'),encode(control.sha256_bytes(convert_to(c.allowed_scope::text,'UTF8')),'hex'),p_rule,principal);
 end if;
 update control.gate_candidates set candidate_status=case p_result when 'PASS' then 'CONSUMED' when 'HOLD' then 'HOLD' else 'REJECTED' end where candidate_id=p_candidate;
 return new_id;
end $$;
alter function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) owner to mohen_gate_authority;
revoke all on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) from public;
grant execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) to mohen_gate_signer;

-- 6) Retire the residue that the old retirement rule left behind. Every row is
--    recorded as an invalidation event first (deterministic id, so a re-run is
--    a no-op); the signed audit rows themselves are never touched.
insert into control.invalidation_events(invalidation_event_id,control_request_id,revoked_gate_audit_id,
  reviewer_user_id,reviewer_db_identity,blocked_count,changed_dependency_ref,reason,disposition,
  producer_method_id,producer_method_version,affected_purpose_scope_consumers)
select gen_random_uuid(),
  substring(encode(control.sha256_bytes(convert_to('mab-retire-stale-qualification:'||q.gate_audit_id::text,'UTF8')),'hex'),1,32)::uuid,
  q.gate_audit_id,q.reviewer_user_id,a.reviewer_db_identity::text,1,
  jsonb_build_object('gate_audit_id',q.gate_audit_id,'gate_code',q.gate_code,'object_type',q.object_type,
    'object_id',q.object_id,'artifact_revision',q.artifact_revision),
  'qualification retired: artifact revision no longer current and no longer replaced by a new decision for this object key (MAB M5 artifact identity correction)',
  'BLOCKED','mab-m5-artifact-content-revision','20261109120000',
  jsonb_build_array(jsonb_build_object('purpose_namespace',q.purpose_namespace,'purpose_code',q.purpose_code,
    'purpose_version',q.purpose_version,'scope',a.allowed_scope,'consumer',q.consumer))
from control.qualification_current q
join control.gate_audits a on a.gate_audit_id=q.gate_audit_id
where now()<q.valid_until and not control.current_qualification_is_valid(q.gate_audit_id)
on conflict (control_request_id) where control_request_id is not null do nothing;

delete from control.qualification_current q
where now()<q.valid_until and not control.current_qualification_is_valid(q.gate_audit_id);
commit;
