-- MAB M5 K5 correction: preserve the earlier registered-content identity contract.
-- 20261114210000 replaced control.artifact_revision_for with full-row to_jsonb hashing,
-- unintentionally undoing 20261109120000's content-column registry. A non-content field
-- then invalidated previously signed G0-G5 qualifications. This later migration restores
-- the canonical fingerprint function, retaining its claim_revision / director_plan /
-- work_revision mappings without changing signed rows or Gate authorizations.
-- Append-only correction: do NOT edit the already-used prior migration in place.
begin;

-- The two later kinds require an explicit registered column set if the tables exist.
-- Do not retroactively modify registries for pre-existing kinds.
insert into control.artifact_content_columns(kind,column_name)
select m.kind,a.attname from (values
  ('director_plan','studio','director_plans'),
  ('work_revision','studio','work_revisions')
) as m(kind,ns,tbl)
join pg_catalog.pg_class cl on cl.oid=to_regclass(format('%I.%I',m.ns,m.tbl))
join pg_catalog.pg_attribute a on a.attrelid=cl.oid and a.attnum>0 and not a.attisdropped
on conflict do nothing;

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
    ('evidence_pointer','read_model','evidence_pointers','evidence_pointer_id'),
    ('director_plan','studio','director_plans','plan_id'),
    ('work_revision','studio','work_revisions','revision_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
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


commit;
