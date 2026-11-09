-- CP2-F / QR-07: make Studio asset backlinks resolvable, enforced and consumable.
--
-- Root cause this migration closes (evidence, not inference):
--   * tools/m2-landing.py (one-off M2 landing script, 2026-11-07) inserted five
--     studio.asset_revisions with a literal '[]'::jsonb for source_refs and a
--     hard-coded freshness_state 'CURRENT'. It also had every binding it needed
--     (private_original / source_version / raw_item / read_unit / evidence id)
--     in the same script, so this is a write-path omission, not a storage limit.
--   * packages/data-access/src/private-original-repository.mjs finalize() (the
--     real production path, 2026-11-08) records the private original only inside
--     `provenance` and never writes source_refs, so it repeats the same defect.
--   * studio.asset_revisions accepts any JSON array as source_refs/dependency_refs
--     and studio.use_events has no consumer at all, so nothing prevents either.
--
-- What is added here (fail closed, no retroactive fabrication):
--   1. studio.reference_kinds — the only ref types that count as a resolvable
--      backlink, each mapped to one real table+key. A plain string is not a ref.
--   2. studio.resolve_asset_reference(s) — existence/revision check per ref.
--   3. studio.asset_consumption_disposition — ELIGIBLE/BLOCKED per
--      revision+action, combining access state, action rights, ref resolution
--      and the "evidence-bearing assets need at least one source ref" rule.
--      Empty refs are treated as UNKNOWN, never as "no dependency".
--   4. Insert guards on studio.asset_revisions (dangling refs rejected) and
--      studio.use_events (project must match, rights decision required,
--      disposition must be ELIGIBLE). No code path can bypass them.
--
-- The 8 existing revisions stay immutable and are NOT back-filled: two are
-- research_brief (no source by kind), two are legacy script rows whose content
-- cannot be re-verified, two anchors carry a real binding only in
-- studio.private_originals. Their state is reported as BLOCKED / gap instead.
begin;

create table if not exists studio.reference_kinds (
 ref_type text primary key check(ref_type ~ '^[a-z][a-z0-9_]{0,63}$'),
 target_schema text not null check(length(target_schema)>0),
 target_table text not null check(length(target_table)>0),
 target_key text not null check(length(target_key)>0),
 revision_key text,
 registered_at timestamptz not null default now()
);
alter table studio.reference_kinds enable row level security;
revoke all on studio.reference_kinds from public,mohen_producer,mohen_gate_signer,anon,authenticated,service_role;
grant select on studio.reference_kinds to mohen_app_runtime,mohen_gate_authority;
drop policy if exists studio_reference_kinds_read on studio.reference_kinds;
create policy studio_reference_kinds_read on studio.reference_kinds for select
 to mohen_app_runtime,mohen_gate_authority using(true);

-- revision_key is only set where the referenced row itself stores the exact
-- revision identity a ref claims. Everywhere else the revision is recorded but
-- reported as UNVERIFIED instead of being silently trusted.
insert into studio.reference_kinds(ref_type,target_schema,target_table,target_key,revision_key) values
 ('private_original','studio','private_originals','original_id',null),
 ('source','source','sources','source_id',null),
 ('source_version','source','source_versions','source_version_id',null),
 ('raw_item','source','raw_items','raw_item_id','checksum_sha256'),
 ('source_read_unit','source','read_units','read_unit_id',null),
 ('read_unit','source','read_units','read_unit_id',null),
 ('material_evidence','evidence','material_evidence','evidence_id',null),
 ('asset_revision','studio','asset_revisions','revision_id',null),
 ('claim_revision','world','claim_revisions','claim_revision_id',null),
 ('entity','world','entities','entity_id',null),
 ('event','world','events','event_id',null),
 ('relation_claim','world','relation_claims','relation_claim_id',null),
 ('change','world','changes','change_id',null),
 ('historical_space_claim','world','historical_space_claims','historical_space_claim_id',null),
 ('visual_object','world','visual_objects','visual_object_id',null),
 ('finding','meaning','findings','finding_id',null),
 ('open_question','meaning','open_questions','open_question_id',null),
 ('present_connection','meaning','present_connections','present_connection_id',null)
on conflict(ref_type) do nothing;

create or replace function studio.resolve_asset_reference(p_ref jsonb) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare
 k record; v_type text; v_id text; v_rev text; v_exists boolean; v_actual text; v_check text:='UNVERIFIED';
begin
 if p_ref is null or jsonb_typeof(p_ref)<>'object'
  then return jsonb_build_object('status','INVALID_SHAPE','type',null,'id',null,'revision',null,'revision_check',null); end if;
 v_type:=nullif(btrim(p_ref->>'type'),'');
 v_id:=nullif(btrim(p_ref->>'id'),'');
 v_rev:=nullif(btrim(p_ref->>'revision'),'');
 if v_id is null
  then return jsonb_build_object('status','MISSING_ID','type',v_type,'id',null,'revision',v_rev,'revision_check',null); end if;
 if v_type is null
  then return jsonb_build_object('status','UNKNOWN_TYPE','type',null,'id',v_id,'revision',v_rev,'revision_check',null); end if;
 select * into k from studio.reference_kinds where ref_type=v_type;
 if not found
  then return jsonb_build_object('status','UNKNOWN_TYPE','type',v_type,'id',v_id,'revision',v_rev,'revision_check',null); end if;
 execute format('select exists(select 1 from %I.%I where %I::text=$1)',k.target_schema,k.target_table,k.target_key)
  into v_exists using v_id;
 if not v_exists
  then return jsonb_build_object('status','NOT_FOUND','type',v_type,'id',v_id,'revision',v_rev,'revision_check',null,
        'target',k.target_schema||'.'||k.target_table); end if;
 if k.revision_key is not null and v_rev is not null then
  execute format('select %I::text from %I.%I where %I::text=$1',k.revision_key,k.target_schema,k.target_table,k.target_key)
   into v_actual using v_id;
  if v_actual is null then v_check:='UNVERIFIED';
  elsif v_actual=v_rev then v_check:='MATCH';
  else v_check:='REVISION_MISMATCH'; end if;
 end if;
 return jsonb_build_object(
  'status',case when v_check='REVISION_MISMATCH' then 'REVISION_MISMATCH' else 'RESOLVED' end,
  'type',v_type,'id',v_id,'revision',v_rev,'revision_check',v_check,
  'target',k.target_schema||'.'||k.target_table);
end $$;

-- Aggregate report. `blocked` counts refs that cannot be shown to point at a
-- real object; a malformed or unknown ref is blocked, not skipped.
create or replace function studio.resolve_asset_references(p_refs jsonb) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare v_item jsonb; v_one jsonb; v_items jsonb:='[]'::jsonb; v_blocked jsonb:='[]'::jsonb;
 v_total int:=0; v_resolved int:=0; v_block int:=0; v_rev_match int:=0;
begin
 if p_refs is null or jsonb_typeof(p_refs)<>'array'
  then return jsonb_build_object('status','INVALID_SHAPE','total',0,'resolved',0,'blocked',0,
        'revision_verified',0,'items','[]'::jsonb,'blocked_items','[]'::jsonb); end if;
 for v_item in select value from jsonb_array_elements(p_refs) loop
  v_total:=v_total+1;
  v_one:=studio.resolve_asset_reference(v_item);
  if v_one->>'status'='RESOLVED' then
   v_resolved:=v_resolved+1;
   if v_one->>'revision_check'='MATCH' then v_rev_match:=v_rev_match+1; end if;
  else
   v_block:=v_block+1;
   v_blocked:=v_blocked||jsonb_build_array(v_one);
  end if;
  v_items:=v_items||jsonb_build_array(v_one);
 end loop;
 return jsonb_build_object('status','OK','total',v_total,'resolved',v_resolved,'blocked',v_block,
  'revision_verified',v_rev_match,'items',v_items,'blocked_items',v_blocked);
end $$;

-- A revision whose original is bound by a verified private-original row does
-- have a real L0 anchor, just recorded in that table instead of source_refs.
-- This is a verified foreign-key fact, not an inferred backlink: it is counted
-- separately and never reported as a stored source ref.
create or replace function studio.asset_verified_original_bindings(p_revision_id uuid) returns int
language sql stable security definer set search_path=pg_catalog set jit=off as $$
 select count(*)::int from studio.private_originals o
  where o.asset_revision_id=p_revision_id and o.state='STORED_VERIFIED';
$$;

-- One decision for "may this exact revision be consumed for this action".
-- read  : internal owner-scope research reading; unknown rights are allowed but
--         an explicit denial is honoured.
-- other : require an explicit 'allowed' action right.
-- Evidence-bearing epistemic classes without a single source ref are BLOCKED:
-- an empty set is unknown dependency, never "no dependency".
create or replace function studio.asset_consumption_disposition(p_revision_id uuid,p_action text)
returns jsonb
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare r record; v_src jsonb; v_dep jsonb; v_blockers jsonb:='[]'::jsonb;
 v_right text; v_kind text; v_derived int:=0; v_origin text;
begin
 if p_action is null or p_action not in ('read','quote','display','download','adapt','external_processing')
  then return jsonb_build_object('disposition','BLOCKED','action',p_action,'blockers',jsonb_build_array('INVALID_ACTION')); end if;
 select a.revision_id,a.epistemic_class,a.access_state,a.content_state,a.rights_by_action,
        a.source_refs,a.dependency_refs,h.project_id,h.asset_kind
  into r
  from studio.asset_revisions a join studio.asset_heads h on h.asset_id=a.asset_id
  where a.revision_id=p_revision_id;
 if not found
  then return jsonb_build_object('disposition','BLOCKED','action',p_action,'blockers',jsonb_build_array('REVISION_NOT_FOUND')); end if;
 v_kind:=r.epistemic_class;
 if r.access_state='REVOKED' then v_blockers:=v_blockers||jsonb_build_array('ACCESS_REVOKED'); end if;
 if r.content_state='ARCHIVED' then v_blockers:=v_blockers||jsonb_build_array('ARCHIVED'); end if;
 v_right:=coalesce(r.rights_by_action->>p_action,'unknown');
 if p_action='read' then
  if v_right='denied' then v_blockers:=v_blockers||jsonb_build_array('RIGHT_DENIED'); end if;
 else
  if v_right<>'allowed' then v_blockers:=v_blockers||jsonb_build_array('RIGHT_NOT_ALLOWED'); end if;
 end if;
 v_src:=studio.resolve_asset_references(r.source_refs);
 v_dep:=studio.resolve_asset_references(r.dependency_refs);
 if (v_src->>'status')<>'OK' or (v_dep->>'status')<>'OK'
  then v_blockers:=v_blockers||jsonb_build_array('REFERENCE_SHAPE_INVALID');
 elsif (v_src->>'blocked')::int>0 or (v_dep->>'blocked')::int>0
  then v_blockers:=v_blockers||jsonb_build_array('UNRESOLVED_REFERENCE');
 end if;
 if v_kind in ('original_material','observation','claim','hypothesis','qualified_L_ref') then
  v_derived:=studio.asset_verified_original_bindings(p_revision_id);
  if coalesce((v_src->>'total')::int,0)=0 and v_derived=0
   then v_blockers:=v_blockers||jsonb_build_array('NO_SOURCE_REF'); end if;
 end if;
 v_origin:=case when coalesce((v_src->>'total')::int,0)>0 then 'STORED_SOURCE_REFS'
  when v_derived>0 then 'VERIFIED_ORIGINAL_BINDING' else 'NONE' end;
 return jsonb_build_object(
  'disposition',case when jsonb_array_length(v_blockers)=0 then 'ELIGIBLE' else 'BLOCKED' end,
  'action',p_action,'asset_kind',r.asset_kind,'epistemic_class',v_kind,
  'access_state',r.access_state,'content_state',r.content_state,'right',v_right,
  'source_origin',v_origin,'verified_original_bindings',v_derived,
  'blockers',v_blockers,'source',v_src,'dependency',v_dep);
end $$;

-- Write guard 1: a stored ref must point at a real object at insert time.
create or replace function studio.guard_asset_revision_references() returns trigger
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare s jsonb; d jsonb;
begin
 s:=studio.resolve_asset_references(new.source_refs);
 d:=studio.resolve_asset_references(new.dependency_refs);
 if (s->>'status')<>'OK' or (d->>'status')<>'OK'
  then raise exception 'ASSET_REFERENCE_SHAPE_INVALID'; end if;
 if (s->>'blocked')::int>0 or (d->>'blocked')::int>0
  then raise exception 'ASSET_REFERENCE_UNRESOLVED %', coalesce(s->'blocked_items','[]'::jsonb)||coalesce(d->'blocked_items','[]'::jsonb); end if;
 return new;
end $$;
drop trigger if exists studio_asset_revision_reference_guard on studio.asset_revisions;
create trigger studio_asset_revision_reference_guard before insert on studio.asset_revisions
 for each row execute function studio.guard_asset_revision_references();

-- Write guard 2: a use event is only accepted for an eligible revision/action,
-- in that revision's own project, with a recorded rights decision basis.
create or replace function studio.guard_asset_use_event() returns trigger
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare p uuid; d jsonb;
begin
 select h.project_id into p from studio.asset_revisions r join studio.asset_heads h on h.asset_id=r.asset_id
  where r.revision_id=new.asset_revision_id;
 if p is null then raise exception 'ASSET_USE_REVISION_NOT_FOUND'; end if;
 if p<>new.project_id then raise exception 'ASSET_USE_PROJECT_MISMATCH'; end if;
 if new.rights_decision_ref is null or length(btrim(new.rights_decision_ref))=0
  then raise exception 'ASSET_USE_RIGHTS_DECISION_REQUIRED'; end if;
 d:=studio.asset_consumption_disposition(new.asset_revision_id,new.requested_action);
 if (d->>'disposition')<>'ELIGIBLE'
  then raise exception 'ASSET_USE_BLOCKED %', d->'blockers'; end if;
 return new;
end $$;
drop trigger if exists studio_use_event_guard on studio.use_events;
create trigger studio_use_event_guard before insert on studio.use_events
 for each row execute function studio.guard_asset_use_event();

revoke all on function studio.resolve_asset_reference(jsonb) from public;
revoke all on function studio.resolve_asset_references(jsonb) from public;
revoke all on function studio.asset_consumption_disposition(uuid,text) from public;
revoke all on function studio.asset_verified_original_bindings(uuid) from public;
grant execute on function studio.resolve_asset_reference(jsonb) to mohen_app_runtime,mohen_gate_authority;
grant execute on function studio.resolve_asset_references(jsonb) to mohen_app_runtime,mohen_gate_authority;
grant execute on function studio.asset_consumption_disposition(uuid,text) to mohen_app_runtime,mohen_gate_authority;
grant execute on function studio.asset_verified_original_bindings(uuid) to mohen_app_runtime,mohen_gate_authority;

commit;
