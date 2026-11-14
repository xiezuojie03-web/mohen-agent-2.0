-- MAB M5 (2026-11-14)：补 artifact_revision_for 的 claim_revision kind 映射。
-- 断点核发现：G3 门 checkClaimSupport 查 world.claim_revisions，但 control.artifact_revision_for
-- 的 kind→表映射只登记了 relation_claim，未登记 claim_revision → artifact_revision_for('claim_revision',…)
-- 恒返回 NULL → G3 identity_version 恒 artifact_revision_unavailable（private-evidence 与 layer1 同受影响）。
-- 本迁移只在 values 列表追加一条映射，不改变哈希语义（仍整行 to_jsonb，与既有行为一致）、不改已有签名。
begin;

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
    ('claim_revision','world','claim_revisions','claim_revision_id'),
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
    ('evidence_pointer','read_model','evidence_pointers','evidence_pointer_id'),
    ('director_plan','studio','director_plans','plan_id'),
    ('work_revision','studio','work_revisions','revision_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
 if not found then return null; end if;
 execute format('select encode(control.sha256_bytes(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id;
 return revision;
end $$;
alter function control.artifact_revision_for(text,uuid) owner to mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer;

commit;
