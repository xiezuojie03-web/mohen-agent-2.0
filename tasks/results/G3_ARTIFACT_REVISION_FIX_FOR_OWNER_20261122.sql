-- =====================================================================
-- 给 Owner / DBA 在 Supabase 网页后台的 SQL Editor 里执行（一次即可）
-- 目的：给 G3 正式签发解锁。只补一行"识别规则"，不动任何业务数据、
--       不动候选、不动 Gate 判定逻辑、不伪造任何 PASS。
-- 背景：函数 control.artifact_revision_for 的对照表里缺 claim_revision
--       这一项，导致 G3 候选算不出修订号，正式签发被拒。
-- 安全性：整段包在一个事务里，任何一步失败都会整体回滚，不会留下半截改动。
--         函数仍归 mohen_gate_authority 所有，权限授予保持原样。
-- =====================================================================

begin;

-- 以该函数的原 owner 身份重建；Supabase SQL Editor 有此切换能力。
set local role mohen_gate_authority;

create or replace function control.artifact_revision_for(p_kind text, p_id uuid)
 returns text
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
 set jit to 'off'
as $function$
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
 execute format('select encode(control.sha256_bytes(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id;
 return revision;
end $function$;

commit;

-- 执行成功后，把网页上显示的结果（一般是一句 Success）告诉施工方即可。
-- 施工方随后会用同一个 G3 候选重跑 dry_run + 正式签发，并继续后续工序。
