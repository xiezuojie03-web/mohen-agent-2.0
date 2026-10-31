-- Independent Gate transactions. No live reviewer or policy is provisioned here.
begin;
do $$ begin
 if not exists(select from pg_roles where rolname='mohen_gate_authority') then
   create role mohen_gate_authority nologin noinherit nosuperuser nobypassrls;
 end if;
 if exists(select from pg_roles where rolname='mohen_gate_authority' and (rolcanlogin or rolsuper or rolbypassrls))
 or exists(select from pg_auth_members where roleid='mohen_gate_authority'::regrole or member='mohen_gate_authority'::regrole)
 then raise exception 'UNSAFE_GATE_AUTHORITY_ROLE'; end if;
end $$;
create table if not exists control.gate_policy_versions (
 gate_code text not null check(gate_code in ('G0','G1','G2','G3','G4','G5')),
 rule_version text not null check(length(rule_version)>0), required_checks text[] not null check(cardinality(required_checks)>0),
 max_validity interval not null check(max_validity>interval '0 seconds'),
 source_ref text not null check(length(source_ref)>0), enabled boolean not null default false,
 primary key(gate_code,rule_version)
);
create table if not exists control.gate_reviewer_bindings (
 binding_id uuid primary key default gen_random_uuid(), reviewer_user_id uuid not null references public.users(user_id),
 db_identity name not null, gate_code text not null, purpose_namespace text not null, purpose_code text not null,
 purpose_version text not null, consumer text not null, allowed_scope jsonb not null check(jsonb_typeof(allowed_scope)='object'),
 valid_from timestamptz not null default now(), valid_until timestamptz not null,
 source_ref text not null check(length(source_ref)>0), active boolean not null default true,
 check(valid_until>valid_from)
);
alter table control.gate_audits add column if not exists decision_request_id uuid,
 add column if not exists decision_request_fingerprint text;
create unique index if not exists k3_gate_decision_request on control.gate_audits(decision_request_id) where decision_request_id is not null;
alter table control.invalidation_events add column if not exists control_request_id uuid,
 add column if not exists revoked_gate_audit_id uuid references control.gate_audits(gate_audit_id),
 add column if not exists reviewer_user_id uuid references public.users(user_id),
 add column if not exists reviewer_db_identity text, add column if not exists blocked_count bigint;
create unique index if not exists k3_gate_control_request on control.invalidation_events(control_request_id) where control_request_id is not null;
alter table control.gate_policy_versions enable row level security;
alter table control.gate_reviewer_bindings enable row level security;
revoke all on control.gate_policy_versions,control.gate_reviewer_bindings from public,mohen_producer,mohen_gate_signer,mohen_app_runtime;
grant usage on schema control,public to mohen_gate_authority;
grant select on control.gate_policy_versions,control.gate_reviewer_bindings,control.gate_candidates,
 control.gate_audits,control.qualification_current,control.invalidation_events to mohen_gate_authority;
grant select(user_id,status) on public.users to mohen_gate_authority;
grant insert on control.gate_audits,control.invalidation_events,control.qualification_current to mohen_gate_authority;
grant update(candidate_status) on control.gate_candidates to mohen_gate_authority;
grant update,delete on control.qualification_current to mohen_gate_authority;
grant execute on function control.current_app_user_id() to mohen_gate_authority;
do $$ declare t text; begin
 foreach t in array array['gate_policy_versions','gate_reviewer_bindings','gate_candidates','gate_audits','qualification_current','invalidation_events'] loop
  execute format('drop policy if exists k3_authority on control.%I',t);
  execute format('create policy k3_authority on control.%I to mohen_gate_authority using(true) with check(true)',t);
 end loop;
end $$;
drop policy if exists k3_authority_identity on public.users;
create policy k3_authority_identity on public.users for select to mohen_gate_authority using(true);

create or replace function control.protect_signed_gate_history() returns trigger language plpgsql set search_path=pg_catalog set jit=off as $$
begin
 if (tg_table_name='gate_audits' and old.decision_origin='independent_gate') then raise exception 'SIGNED_AUDIT_IMMUTABLE'; end if;
 if tg_op='UPDATE' then return new; end if;
 return old;
end $$;
revoke all on function control.protect_signed_gate_history() from public;
drop trigger if exists k3_signed_history on control.gate_audits;
create trigger k3_signed_history before update or delete on control.gate_audits for each row execute function control.protect_signed_gate_history();

-- Derive a version from the actual row; never create a second artifact registry.
create or replace function control.artifact_revision_for(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare ns text; tbl text; key_col text; revision text;
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
 execute format('select encode(public.digest(convert_to(to_jsonb(t)::text,''UTF8''),''sha256''),''hex'') from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id;
 return revision;
end $$;
alter function control.artifact_revision_for(text,uuid) owner to mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer;
grant usage on schema evidence to mohen_gate_authority;
grant select on evidence.material_evidence to mohen_gate_authority;
drop policy if exists k3_artifact_read on evidence.material_evidence;
create policy k3_artifact_read on evidence.material_evidence for select to mohen_gate_authority using(true);
grant usage on schema meaning to mohen_gate_authority;
grant select on meaning.findings to mohen_gate_authority;
drop policy if exists k3_artifact_read on meaning.findings;
create policy k3_artifact_read on meaning.findings for select to mohen_gate_authority using(true);
grant usage on schema meaning to mohen_gate_authority;
grant select on meaning.open_questions to mohen_gate_authority;
drop policy if exists k3_artifact_read on meaning.open_questions;
create policy k3_artifact_read on meaning.open_questions for select to mohen_gate_authority using(true);
grant usage on schema meaning to mohen_gate_authority;
grant select on meaning.present_connections to mohen_gate_authority;
drop policy if exists k3_artifact_read on meaning.present_connections;
create policy k3_artifact_read on meaning.present_connections for select to mohen_gate_authority using(true);
grant usage on schema read_model to mohen_gate_authority;
grant select on read_model.agent_contexts to mohen_gate_authority;
drop policy if exists k3_artifact_read on read_model.agent_contexts;
create policy k3_artifact_read on read_model.agent_contexts for select to mohen_gate_authority using(true);
grant usage on schema read_model to mohen_gate_authority;
grant select on read_model.discovery_paths to mohen_gate_authority;
drop policy if exists k3_artifact_read on read_model.discovery_paths;
create policy k3_artifact_read on read_model.discovery_paths for select to mohen_gate_authority using(true);
grant usage on schema read_model to mohen_gate_authority;
grant select on read_model.evidence_pointers to mohen_gate_authority;
drop policy if exists k3_artifact_read on read_model.evidence_pointers;
create policy k3_artifact_read on read_model.evidence_pointers for select to mohen_gate_authority using(true);
grant usage on schema read_model to mohen_gate_authority;
grant select on read_model.map_timeline_projections to mohen_gate_authority;
drop policy if exists k3_artifact_read on read_model.map_timeline_projections;
create policy k3_artifact_read on read_model.map_timeline_projections for select to mohen_gate_authority using(true);
grant usage on schema read_model to mohen_gate_authority;
grant select on read_model.story_seeds to mohen_gate_authority;
drop policy if exists k3_artifact_read on read_model.story_seeds;
create policy k3_artifact_read on read_model.story_seeds for select to mohen_gate_authority using(true);
grant usage on schema read_model to mohen_gate_authority;
grant select on read_model.world_projections to mohen_gate_authority;
drop policy if exists k3_artifact_read on read_model.world_projections;
create policy k3_artifact_read on read_model.world_projections for select to mohen_gate_authority using(true);
grant usage on schema source to mohen_gate_authority;
grant select on source.raw_items to mohen_gate_authority;
drop policy if exists k3_artifact_read on source.raw_items;
create policy k3_artifact_read on source.raw_items for select to mohen_gate_authority using(true);
grant usage on schema source to mohen_gate_authority;
grant select on source.read_runs to mohen_gate_authority;
drop policy if exists k3_artifact_read on source.read_runs;
create policy k3_artifact_read on source.read_runs for select to mohen_gate_authority using(true);
grant usage on schema source to mohen_gate_authority;
grant select on source.read_units to mohen_gate_authority;
drop policy if exists k3_artifact_read on source.read_units;
create policy k3_artifact_read on source.read_units for select to mohen_gate_authority using(true);
grant usage on schema source to mohen_gate_authority;
grant select on source.source_versions to mohen_gate_authority;
drop policy if exists k3_artifact_read on source.source_versions;
create policy k3_artifact_read on source.source_versions for select to mohen_gate_authority using(true);
grant usage on schema source to mohen_gate_authority;
grant select on source.sources to mohen_gate_authority;
drop policy if exists k3_artifact_read on source.sources;
create policy k3_artifact_read on source.sources for select to mohen_gate_authority using(true);
grant usage on schema world to mohen_gate_authority;
grant select on world.changes to mohen_gate_authority;
drop policy if exists k3_artifact_read on world.changes;
create policy k3_artifact_read on world.changes for select to mohen_gate_authority using(true);
grant usage on schema world to mohen_gate_authority;
grant select on world.entities to mohen_gate_authority;
drop policy if exists k3_artifact_read on world.entities;
create policy k3_artifact_read on world.entities for select to mohen_gate_authority using(true);
grant usage on schema world to mohen_gate_authority;
grant select on world.events to mohen_gate_authority;
drop policy if exists k3_artifact_read on world.events;
create policy k3_artifact_read on world.events for select to mohen_gate_authority using(true);
grant usage on schema world to mohen_gate_authority;
grant select on world.historical_space_claims to mohen_gate_authority;
drop policy if exists k3_artifact_read on world.historical_space_claims;
create policy k3_artifact_read on world.historical_space_claims for select to mohen_gate_authority using(true);
grant usage on schema world to mohen_gate_authority;
grant select on world.relation_claims to mohen_gate_authority;
drop policy if exists k3_artifact_read on world.relation_claims;
create policy k3_artifact_read on world.relation_claims for select to mohen_gate_authority using(true);
grant usage on schema world to mohen_gate_authority;
grant select on world.visual_objects to mohen_gate_authority;
drop policy if exists k3_artifact_read on world.visual_objects;
create policy k3_artifact_read on world.visual_objects for select to mohen_gate_authority using(true);

-- Canonical projection and all exact pinned ancestors must remain current.
create or replace function control.current_qualification_is_valid(p_audit uuid) returns boolean
language sql stable security definer set search_path=pg_catalog set jit=off as $$
 with recursive dependencies(id) as (
  select p_audit union
  select (d.value->>'gate_audit_id')::uuid from dependencies x
   join control.gate_audits a on a.gate_audit_id=x.id
   join control.gate_candidates c on c.candidate_id=a.candidate_id
   cross join lateral jsonb_array_elements(c.dependency_snapshot) d
 ), checked as (
  select x.id,
   a.decision_origin='independent_gate' and a.result='PASS' and a.current_valid
   and q.gate_audit_id is not null and now()>=q.valid_from and now()<q.valid_until
   and a.valid_from=q.valid_from and a.valid_until=q.valid_until
   and a.artifact_revision=q.artifact_revision and a.qualification_digest is not null
   and a.artifact_revision=control.artifact_revision_for(a.object_type,a.object_id)
   and u.status='active' and p.enabled
   and exists(select from control.gate_reviewer_bindings b where b.reviewer_user_id=a.reviewer_user_id
    and b.db_identity=a.reviewer_db_identity::name and b.gate_code=a.gate_code
    and b.purpose_namespace=a.purpose_namespace and b.purpose_code=a.purpose_code and b.purpose_version=a.purpose_version
    and b.consumer=a.consumer and b.allowed_scope @> a.allowed_scope and b.active and now()>=b.valid_from and now()<b.valid_until)
   and not exists(select from jsonb_array_elements(c.dependency_snapshot) d
    left join control.gate_audits parent on parent.gate_audit_id=(d.value->>'gate_audit_id')::uuid
    where parent.gate_audit_id is null or parent.qualification_digest is distinct from d.value->>'qualification_digest'
     or parent.artifact_revision is distinct from d.value->>'artifact_revision') as valid
  from dependencies x left join control.gate_audits a on a.gate_audit_id=x.id
   left join control.gate_candidates c on c.candidate_id=a.candidate_id
   left join control.qualification_current q on q.gate_audit_id=a.gate_audit_id
   left join public.users u on u.user_id=a.reviewer_user_id
   left join control.gate_policy_versions p on p.gate_code=a.gate_code and p.rule_version=a.rule_version
 ) select coalesce(bool_and(coalesce(valid,false)),false) from checked
$$;
alter function control.current_qualification_is_valid(uuid) owner to mohen_gate_authority;
revoke all on function control.current_qualification_is_valid(uuid) from public;
grant execute on function control.current_qualification_is_valid(uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

-- Consumption requires an exact declared purpose/consumer and a contained scope.
create or replace function control.qualification_allows(p_audit uuid,p_consumer text,p_namespace text,p_code text,p_version text,p_scope jsonb) returns boolean
language sql stable security definer set search_path=pg_catalog set jit=off as $$
 select exists(select from control.gate_audits a where a.gate_audit_id=p_audit
  and a.consumer=p_consumer and a.purpose_namespace=p_namespace and a.purpose_code=p_code and a.purpose_version=p_version
  and jsonb_typeof(p_scope)='object' and a.allowed_scope @> p_scope and control.current_qualification_is_valid(p_audit))
$$;
alter function control.qualification_allows(uuid,text,text,text,text,jsonb) owner to mohen_gate_authority;
revoke all on function control.qualification_allows(uuid,text,text,text,text,jsonb) from public;
grant execute on function control.qualification_allows(uuid,text,text,text,text,jsonb) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

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
 fingerprint:=encode(public.digest(convert_to(jsonb_build_object('candidate',p_candidate,'result',p_result,'rule',p_rule,'until',p_until,
  'receipt',p_receipt,'expected',p_expected,'reviewer',principal,'db',actor)::text,'UTF8'),'sha256'),'hex');
 key_text:=jsonb_build_array('mohen.six-stage.v1',c.gate_code,c.object_type,c.object_id,c.artifact_revision,
  c.purpose_namespace,c.purpose_code,c.purpose_version,c.consumer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key_text,0));
 select * into previous from control.gate_audits where decision_request_id=p_request;
 if found then
  if previous.decision_request_fingerprint is distinct from fingerprint then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.gate_audit_id;
 end if;
 select gate_audit_id into current_id from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id and artifact_revision=c.artifact_revision
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer for update;
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
 delete from control.qualification_current where gate_audit_id=current_id;
 if p_result='PASS' then
  insert into control.qualification_current(architecture_generation,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
    consumer,gate_audit_id,valid_from,valid_until,dependency_fingerprint,scope_digest,rule_version,reviewer_user_id)
  values('mohen.six-stage.v1',c.gate_code,c.object_type,c.object_id,c.artifact_revision,c.purpose_namespace,c.purpose_code,c.purpose_version,c.consumer,new_id,now(),p_until,
   encode(public.digest(convert_to(c.dependency_snapshot::text,'UTF8'),'sha256'),'hex'),encode(public.digest(convert_to(c.allowed_scope::text,'UTF8'),'sha256'),'hex'),p_rule,principal);
 end if;
 update control.gate_candidates set candidate_status=case p_result when 'PASS' then 'CONSUMED' when 'HOLD' then 'HOLD' else 'REJECTED' end where candidate_id=p_candidate;
 return new_id;
end $$;
alter function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) owner to mohen_gate_authority;
revoke all on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) from public;
grant execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) to mohen_gate_signer;

create or replace function control.revoke_gate_qualification(p_audit uuid,p_request uuid,p_reason text) returns bigint
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare a control.gate_audits; e control.invalidation_events; principal uuid; actor name; key_text text; changed bigint;
begin
 principal:=control.current_app_user_id();actor:=coalesce(nullif(current_setting('role',true),'none'),session_user)::name;
 if principal is null then raise exception 'REVIEWER_IDENTITY_REQUIRED'; end if;
 if not pg_has_role(actor,'mohen_gate_signer','MEMBER') or exists(select from pg_roles where rolname=actor and (rolsuper or rolbypassrls)) then raise exception 'REVIEWER_DB_IDENTITY_INVALID'; end if;
 select * into a from control.gate_audits where gate_audit_id=p_audit and decision_origin='independent_gate';
 if not found then raise exception 'INDEPENDENT_GATE_NOT_FOUND'; end if;
 if p_request is null or length(coalesce(p_reason,''))=0 then raise exception 'REVOCATION_REASON_REQUIRED'; end if;
 if not exists(select from control.gate_reviewer_bindings b where b.reviewer_user_id=principal and b.db_identity=actor and b.gate_code=a.gate_code
  and b.purpose_namespace=a.purpose_namespace and b.purpose_code=a.purpose_code and b.purpose_version=a.purpose_version
  and b.consumer=a.consumer and b.allowed_scope @> a.allowed_scope and b.active and now()>=b.valid_from and now()<b.valid_until)
 then raise exception 'REVIEWER_BINDING_REQUIRED'; end if;
 key_text:=jsonb_build_array(a.architecture_generation,a.gate_code,a.object_type,a.object_id,a.artifact_revision,a.purpose_namespace,a.purpose_code,a.purpose_version,a.consumer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key_text,0));
 select * into e from control.invalidation_events where control_request_id=p_request;
 if found then
  if e.revoked_gate_audit_id is distinct from p_audit or e.reason is distinct from p_reason or e.reviewer_user_id is distinct from principal or e.reviewer_db_identity is distinct from actor::text then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return e.blocked_count;
 end if;
 delete from control.qualification_current where gate_audit_id=p_audit;get diagnostics changed=row_count;
 insert into control.invalidation_events(control_request_id,revoked_gate_audit_id,reviewer_user_id,reviewer_db_identity,blocked_count,
   changed_dependency_ref,reason,disposition,producer_method_id,producer_method_version,affected_purpose_scope_consumers)
 values(p_request,p_audit,principal,actor,changed,jsonb_build_object('gate_audit_id',p_audit,'object_id',a.object_id,'artifact_revision',a.artifact_revision),
  p_reason,'BLOCKED','independent-gate-control','1',jsonb_build_array(jsonb_build_object('purpose_namespace',a.purpose_namespace,'purpose_code',a.purpose_code,'purpose_version',a.purpose_version,'scope',a.allowed_scope,'consumer',a.consumer)));
 return changed;
end $$;
alter function control.revoke_gate_qualification(uuid,uuid,text) owner to mohen_gate_authority;
revoke all on function control.revoke_gate_qualification(uuid,uuid,text) from public;
grant execute on function control.revoke_gate_qualification(uuid,uuid,text) to mohen_gate_signer;
commit;
