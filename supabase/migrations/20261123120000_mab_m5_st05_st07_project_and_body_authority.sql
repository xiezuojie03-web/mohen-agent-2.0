-- M5 / ST-05—ST-07 定点修补：项目身份闭环与正式正文权威归位
--
-- 合同依据：specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md §19.1
--   studio.projects             = 首期项目身份来源
--   public.director_plans       = 正式导演方案正文权威
--   publication.work_revisions  = 正式作品修订正文权威
--   public.assets               = 媒资正文权威
-- Studio 侧只允许关联/封套，不复制第二份正文。
--
-- 向前迁移纪律：
--   不删除任何旧表/旧列/旧行；不按题名、Owner 或其它弱信息回填历史 Project；
--   不迁移、不伪造、不复用历史 G5 PASS；本轮不在生产执行本文件的 DDL。
begin;

-- ========== 1) Studio 作品必须取得正式 Project 身份 ==========
alter table publication.works
  add column if not exists project_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'publication_works_project_id_fkey') then
    alter table publication.works
      add constraint publication_works_project_id_fkey
      foreign key (project_id) references studio.projects(project_id) on delete restrict;
  end if;
end $$;

create index if not exists publication_works_project_id_idx
  on publication.works (project_id) where project_id is not null;

comment on column publication.works.project_id is
  'Owner-owned ACTIVE studio.projects identity verified server-side at creation. NULL legacy rows remain HOLD and must never be inferred/backfilled.';

-- ========== 2) DirectorPlan 持久化委托与读取凭证绑定 ==========
alter table public.director_plans
  add column if not exists delegation_id uuid,
  add column if not exists root_task_ref text,
  add column if not exists research_snapshot_hash text,
  add column if not exists research_source_refs jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'director_plans_delegation_id_fkey') then
    alter table public.director_plans
      add constraint director_plans_delegation_id_fkey
      foreign key (delegation_id) references studio.delegations(delegation_id) on delete restrict;
  end if;
end $$;

create index if not exists director_plans_delegation_idx
  on public.director_plans (project_id, delegation_id) where delegation_id is not null;

comment on column public.director_plans.delegation_id is
  'Server-verified delegation belonging to the same Owner and project. NULL legacy plans HOLD.';
comment on column public.director_plans.root_task_ref is
  'Immutable root task key copied from studio.delegations at plan creation, not supplied by the client.';
comment on column public.director_plans.research_snapshot_hash is
  'sha256 of the server-side studio research read snapshot consumed for this plan.';
comment on column public.director_plans.research_source_refs is
  'Exact source refs of the server-side research read that grounded this plan.';

-- ========== 3) ST-07 正文权威归位：studio 表仅为封套/关联 ==========
alter table studio.work_revisions
  add column if not exists formal_revision_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'studio_work_revisions_formal_revision_fkey') then
    alter table studio.work_revisions
      add constraint studio_work_revisions_formal_revision_fkey
      foreign key (formal_revision_id) references publication.work_revisions(revision_id) on delete restrict;
  end if;
end $$;

comment on table studio.work_revisions is
  'Studio envelope/link layer only. The formal immutable work body is publication.work_revisions; this table is not a second body authority and its content/beats columns are legacy snapshots.';
comment on column studio.work_revisions.content is
  'LEGACY ENVELOPE SNAPSHOT ONLY - not the formal work body. Formal text lives in publication.work_revisions.content.';
comment on column studio.work_revisions.beats is
  'LEGACY ENVELOPE SNAPSHOT ONLY - not a second formal body.';
comment on column studio.work_revisions.content_hash is
  'Legacy envelope hash. Qualification fingerprints must come from the bound formal revision.';
comment on column studio.work_revisions.formal_revision_id is
  'Explicit link to the formal publication.work_revisions row. NULL legacy envelopes cannot qualify.';

-- 正式正文的指纹登记表。保留旧 work_revision 登记行不动，历史审计原样留存。
insert into control.artifact_content_columns(kind,column_name)
select 'formal_work_revision', a.attname
  from pg_catalog.pg_class cl
  join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum > 0 and not a.attisdropped
 where cl.oid = to_regclass('publication.work_revisions')
on conflict do nothing;

-- ========== 4) work_revision 指纹只解析正式正文 ==========
-- 直接传正式 revision_id 时按正式正文计算；传 Studio 封套 id 时先解析 formal_revision_id。
-- 无法解析到正式正文时返回 NULL（失败关闭），不回退到 studio.content/beats。
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
    ('director_plan','studio','director_plans','plan_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
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
grant execute on function control.artifact_revision_for(text,uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

commit;
