-- M5 / ST-05 定点归位：director_plan 资格指纹只依据正式正文 public.director_plans
--
-- 合同依据：specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md §19.1
--   public.director_plans = 正式导演方案正文权威
--   studio.director_plans = 封套/引用层，仅承载评审元数据(method/qualification/depends_on/original_ids)
--   指纹必须依据正式正文计算；旧 Studio-only 对象不得冒充正式对象。
--
-- 与 20261123120000 的 work_revision 归位对称：work_revision 指纹读 publication.work_revisions，
-- director_plan 指纹读 public.director_plans。两者共用同一 artifact_revision_for 唯一实现。
--
-- 向前迁移纪律：
--   不删除旧表/旧列/旧行；不转移、不复用、不回填历史 G5 PASS；历史审计原样留存。
--   本轮不在生产执行该 DDL；先在隔离库验证。
begin;

-- ========== 1) 重新登记 director_plan 正文列为正式表业务列 ==========
-- 旧登记（studio.director_plans 的 method_id/qualification/depends_on_* 等）
-- 是封套元数据，不是正文。先清空再按正式表业务列重建，kind 名保持 director_plan 不变，
-- 使所有调用方签名不变，只有底层权威表改变。排除时间戳，保证幂等。
delete from control.artifact_content_columns where kind = 'director_plan';

insert into control.artifact_content_columns(kind, column_name)
select 'director_plan', a.attname
  from pg_catalog.pg_class cl
  join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum > 0 and not a.attisdropped
 where cl.oid = to_regclass('public.director_plans')
   and a.attname not in ('created_at', 'updated_at')
on conflict do nothing;

-- ========== 2) artifact_revision_for 的 director_plan 映射归位正式表 ==========
-- create or replace 完整函数体（与 20261123120000 同构），唯一改动：
--   ('director_plan','studio','director_plans','plan_id')
--     -> ('director_plan','public','director_plans','plan_id')
-- work_revision 分支及其它所有 kind 映射保持逐字不变。
create or replace function control.artifact_revision_for(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare ns text; tbl text; key_col text; cols text[]; revision text; formal_id uuid;
begin
 if p_kind = 'work_revision' then
  formal_id := null;
  execute 'select revision_id from publication.work_revisions where revision_id=$1' into formal_id using p_id;
  if formal_id is null then
    execute 'select formal_revision_id from studio.work_revisions where revision_id=$1' into formal_id using p_id;
  end if;
  if formal_id is null then return null; end if;
  select array_agg(c.column_name) into cols from control.artifact_content_columns c where c.kind='formal_work_revision';
  if cols is null or cardinality(cols)=0 then raise exception 'ARTIFACT_CONTENT_COLUMNS_NOT_REGISTERED:formal_work_revision'; end if;
  execute format('select (select encode(control.sha256_bytes(convert_to(agg::text,''UTF8'')),''hex'')
    from (select jsonb_object_agg(j.key,j.value) as agg from jsonb_each(to_jsonb(t)) j where j.key=any($2)) s)
    from %I.%I t where %I=$1','publication','work_revisions','revision_id') into revision using formal_id,cols;
  return revision;
 end if;

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
    ('director_plan','public','director_plans','plan_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
 if not found then return null; end if;
 select array_agg(c.column_name) into cols from control.artifact_content_columns c where c.kind=p_kind;
 if cols is null or cardinality(cols)=0 then raise exception 'ARTIFACT_CONTENT_COLUMNS_NOT_REGISTERED:%',p_kind; end if;
 execute format('select (select encode(control.sha256_bytes(convert_to(agg::text,''UTF8'')),''hex'')
   from (select jsonb_object_agg(j.key,j.value) as agg from jsonb_each(to_jsonb(t)) j where j.key=any($2)) s)
   from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id,cols;
 return revision;
end $$;
alter function control.artifact_revision_for(text,uuid) owner to mohen_gate_authority;
-- security definer 的 owner 必须能读到正式导演正文，否则 director_plan 指纹解析报 42501。
grant usage on schema public to mohen_gate_authority;
grant select on public.director_plans to mohen_gate_authority;
revoke all on function control.artifact_revision_for(text,uuid) from public;
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

commit;
