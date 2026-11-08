-- CP2-B / QR-04: 唯一权利动作词典落库。
--
-- 目的：`source.sources.rights` 一直是自由格式（实测本地 27 条 SHL 来源全是 `{}`），
-- 既没有逐动作许可字段，也无法把"哪份权利证据支撑哪条许可"固定下来。
-- 本迁移只**新增列**，默认全空 = 全部 unknown = 一律 HOLD：
--   · 不从 `rights.status`、CC 标签、来源类别或任何历史自述**推断回填**；
--   · 只有显式写成 allowed 的动作才会被 `rights-actions.mjs` 放行。
--
-- 边界：只应用到本地隔离库 `mohen_dev`；生产迁移另行授权，本文件不代表已上线。

begin;

-- 1) 逐动作许可：规范动作集见 packages/data-access/src/rights-actions.mjs。
--    键缺失 / 空对象 = unknown；写入者必须是显式授权记录（如 Owner 授权标定工具）。
alter table source.sources
  add column if not exists rights_by_action jsonb not null default '{}';

-- 2) 权利证据：授权依据（Owner 决定、条款、取证时间等）。空 = 无证据 = HOLD。
alter table source.sources
  add column if not exists rights_evidence jsonb not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'source.sources'::regclass
      and conname = 'sources_rights_by_action_object')
  then
    alter table source.sources
      add constraint sources_rights_by_action_object
      check (jsonb_typeof(rights_by_action) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'source.sources'::regclass
      and conname = 'sources_rights_evidence_object')
  then
    alter table source.sources
      add constraint sources_rights_evidence_object
      check (jsonb_typeof(rights_evidence) = 'object');
  end if;
end $$;

-- 3) 来源版本权利快照：登记版本时固定当次权利，之后不可改写（防止"先登记、后补权"）。
alter table source.source_versions
  add column if not exists rights_snapshot jsonb not null default '{}';

create or replace function source.forbid_rights_snapshot_mutation() returns trigger
language plpgsql as $$
begin
  if jsonb_typeof(new.rights_snapshot) <> 'object' then
    raise exception 'RIGHTS_SNAPSHOT_INVALID';
  end if;
  -- 空快照允许一次写入；一旦写入非空即为不可变。
  if old.rights_snapshot is distinct from '{}'::jsonb then
    raise exception 'RIGHTS_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end $$;

drop trigger if exists source_versions_rights_snapshot_immutable on source.source_versions;
create trigger source_versions_rights_snapshot_immutable
  before update of rights_snapshot on source.source_versions
  for each row execute function source.forbid_rights_snapshot_mutation();

comment on column source.sources.rights_by_action is
  'Explicit per-action permission dictionary (mohen.rights-actions.v1). Empty/missing action = unknown = HOLD; never inferred from status, licence labels or provider category.';
comment on column source.sources.rights_evidence is
  'Evidence backing each declared permission (owner decision, terms, scope, captured_at). Empty = no evidence = HOLD.';
comment on column source.source_versions.rights_snapshot is
  'Rights snapshot fixed at version registration; immutable once non-empty.';

commit;
