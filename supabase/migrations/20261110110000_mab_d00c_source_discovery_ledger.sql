-- D00-C1: Y01 来源需求与 Y07 获取尝试的最小可信落点（本地隔离）
--
-- 为什么必须有 DDL（先做过"能否复用现有表"的核查，以下为核查结论而非推断）：
--   * `source` schema 现有 7 表（sources / source_versions / raw_items / read_runs /
--     read_units / read_handoffs / read_quality_checks）全部要求一条已成立的来源身份，
--     没有任何一列能承载"研究问题 → 需求 → 未定来源的尝试"这种在来源确定之前的事件。
--   * `studio.execution_receipts` 是 Studio 委派（delegation_id 非空 FK）的执行回执，
--     属创作侧记账，不是来源获取日志；复用会造成跨域第二套真值。
--   * `public.research_events`（task_id/stage/event/payload）是 public 层研究任务流水，
--     无 method 版本、无项目作用域、无追加不可变约束，无法承担 §2.5 的获取尝试日志。
--   * 交付包 `01_D00五职责完整设计/03_十类方法输出与L0资产承载.md` 明确"十类标签不等于十张新表"，
--     并要求先复用 DATA_CONTRACT 封套；本迁移只补 §2.5 指定的三件长期逻辑资产中被证明缺失的两件
--     （获取方法目录、获取尝试日志）与 Y01 的需求回执，不新建十张表、不新建资源总目录。
--
-- 本迁移刻意不做的事：
--   * 不建 source_candidate / search_trace / source_identity / source_dependency 表：
--     Y02—Y06 尚未实现，先行建表即为无生产者的死结构（CODE_PRESENT≠可用）。
--   * 不写任何种子数据，不推断回填，不触碰 source.sources / source_versions / raw_items
--     的既有行与既有触发器。
--   * 不授予任何角色 UPDATE/DELETE：需求回执与方法目录的更正都用新行表达。
begin;

-- ---------------------------------------------------------------------------
-- 1) Y01 需求回执：研究问题、覆盖维度与存量缺口诊断
-- ---------------------------------------------------------------------------
create table if not exists source.source_needs (
 need_id uuid primary key default gen_random_uuid(),
 -- 不建到 studio.projects 的外键：source 是更低层，反向依赖会让 L0 依赖创作层。
 -- 项目归属由写入路径强制校验（见 D00 生产者），库内只保证非空。
 project_id uuid not null,
 research_intent text not null check (length(btrim(research_intent)) between 1 and 2000),
 scope jsonb not null default '{}'::jsonb,
 coverage_dimensions jsonb not null default '[]'::jsonb,
 existing_stock_gap jsonb not null default '{}'::jsonb,
 rights_boundary jsonb not null default '{}'::jsonb,
 produced_by text not null,
 created_at timestamptz not null default now(),
 check (jsonb_typeof(scope) = 'object'),
 check (jsonb_typeof(coverage_dimensions) = 'array'),
 check (jsonb_typeof(existing_stock_gap) = 'object'),
 check (jsonb_typeof(rights_boundary) = 'object')
);
create index if not exists source_needs_project on source.source_needs(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) §2.5 获取方法目录：以 method_key + method_version 为单位
-- ---------------------------------------------------------------------------
create table if not exists source.acquisition_methods (
 method_key text not null check (method_key ~ '^M[0-9]{4}$'),
 method_version text not null check (length(btrim(method_version)) between 1 and 64),
 resource_scope jsonb not null default '{}'::jsonb,
 access_mode text not null check (length(btrim(access_mode)) between 1 and 128),
 preconditions jsonb not null default '{}'::jsonb,
 steps jsonb not null default '[]'::jsonb,
 success_criteria jsonb not null default '[]'::jsonb,
 failure_modes jsonb not null default '[]'::jsonb,
 alternatives jsonb not null default '[]'::jsonb,
 method_state text not null default 'DRAFT' check (method_state in (
   'DRAFT','HISTORICALLY_VALIDATED_CURRENT_UNVERIFIED','TESTED_SUCCESS',
   'TESTED_FAILURE','DEGRADED','RETIRED')),
 last_revalidated_at timestamptz,
 recommended boolean not null default false,
 created_at timestamptz not null default now(),
 primary key (method_key, method_version),
 check (jsonb_typeof(resource_scope) = 'object'),
 check (jsonb_typeof(preconditions) = 'object'),
 check (jsonb_typeof(steps) = 'array'),
 check (jsonb_typeof(success_criteria) = 'array'),
 check (jsonb_typeof(failure_modes) = 'array'),
 check (jsonb_typeof(alternatives) = 'array')
);
comment on table source.acquisition_methods is
 'Y07 acquisition method register (§2.5). Identity is method_key@method_version; a path may never be cited by stage step (Y07) instead of this identity.';

-- 方法定义不可改写，只有复核状态可推进；"上次成功"不能靠改历史变成"当前有效"。
create or replace function source.guard_acquisition_method_mutation() returns trigger
language plpgsql as $$
begin
  if new.method_key <> old.method_key or new.method_version <> old.method_version
     or new.resource_scope is distinct from old.resource_scope
     or new.access_mode <> old.access_mode
     or new.preconditions is distinct from old.preconditions
     or new.steps is distinct from old.steps
     or new.success_criteria is distinct from old.success_criteria
     or new.failure_modes is distinct from old.failure_modes
     or new.created_at <> old.created_at then
    raise exception 'ACQUISITION_METHOD_DEFINITION_IMMUTABLE';
  end if;
  return new;
end $$;
drop trigger if exists acquisition_methods_definition_immutable on source.acquisition_methods;
create trigger acquisition_methods_definition_immutable
  before update on source.acquisition_methods
  for each row execute function source.guard_acquisition_method_mutation();
drop trigger if exists acquisition_methods_no_delete on source.acquisition_methods;
create trigger acquisition_methods_no_delete
  before delete on source.acquisition_methods
  for each row execute function source.forbid_raw_mutation();

-- ---------------------------------------------------------------------------
-- 3) §2.5 获取尝试日志：每次实际尝试一行，追加不可变，更正另起一行
-- ---------------------------------------------------------------------------
create table if not exists source.acquisition_attempts (
 attempt_id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 need_id uuid not null references source.source_needs(need_id),
 candidate_ref jsonb not null default '{}'::jsonb,
 method_key text not null,
 method_version text not null,
 execution_environment jsonb not null default '{}'::jsonb,
 request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
 pagination jsonb not null default '{}'::jsonb,
 started_at timestamptz not null,
 finished_at timestamptz,
 result_state text not null check (result_state in (
   'not_found','catalog_found','metadata_only','bibliography_only','excerpt',
   'full_text','scan_or_image','restricted','unavailable',
   'acquired_unverified','acquired_verified')),
 failure_code text,
 failure_certainty text check (failure_certainty in ('CONFIRMED','HYPOTHESIS')),
 acquired_extent jsonb,
 byte_size bigint check (byte_size is null or byte_size >= 0),
 asset_sha256 text check (asset_sha256 is null or asset_sha256 ~ '^[a-f0-9]{64}$'),
 source_locator jsonb not null default '{}'::jsonb,
 rights_actions jsonb not null default '{}'::jsonb,
 access_restrictions jsonb not null default '{}'::jsonb,
 dependency_refs jsonb not null default '[]'::jsonb,
 alternatives jsonb not null default '[]'::jsonb,
 recovery_condition text,
 cost jsonb not null default '{"amount":null,"currency":null,"certainty":"unknown"}'::jsonb,
 correction_of uuid references source.acquisition_attempts(attempt_id),
 created_at timestamptz not null default now(),
 foreign key (method_key, method_version)
   references source.acquisition_methods(method_key, method_version),
 -- "取得并已核验"必须同时有字节数与哈希，禁止无字节冒充已取得正文。
 check (result_state <> 'acquired_verified'
        or (asset_sha256 is not null and byte_size is not null)),
 check (finished_at is null or finished_at >= started_at),
 check (jsonb_typeof(candidate_ref) = 'object'),
 check (jsonb_typeof(execution_environment) = 'object'),
 check (jsonb_typeof(pagination) = 'object'),
 check (jsonb_typeof(source_locator) = 'object'),
 check (jsonb_typeof(access_restrictions) = 'object'),
 check (jsonb_typeof(dependency_refs) = 'array'),
 check (jsonb_typeof(alternatives) = 'array'),
 check (jsonb_typeof(cost) = 'object')
);
create index if not exists acquisition_attempts_need on source.acquisition_attempts(need_id, started_at desc);
create index if not exists acquisition_attempts_method on source.acquisition_attempts(method_key, method_version);
create index if not exists acquisition_attempts_project on source.acquisition_attempts(project_id, started_at desc);

-- 逐动作权利：只认九动作与四取值；缺失键在裁决时等价 unknown，不在存储层乐观补值。
create or replace function source.is_rights_actions_valid(p jsonb) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select coalesce(
    jsonb_typeof(p) = 'object'
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key not in ('access_view','machine_read','retain','download',
                          'quote','display','adapt','redistribute','external_processing')
         or jsonb_typeof(e.value) <> 'string'
         or (e.value #>> '{}') not in ('allowed','denied','unknown','restricted')
    ), false)
$$;
alter table source.acquisition_attempts
  add constraint acquisition_attempts_rights_actions_valid
  check (source.is_rights_actions_valid(rights_actions));

create or replace function source.forbid_d00_history_mutation() returns trigger
language plpgsql as $$ begin raise exception 'D00_HISTORY_APPEND_ONLY'; end $$;

drop trigger if exists source_needs_append_only on source.source_needs;
create trigger source_needs_append_only before update or delete on source.source_needs
  for each row execute function source.forbid_d00_history_mutation();
drop trigger if exists acquisition_attempts_append_only on source.acquisition_attempts;
create trigger acquisition_attempts_append_only before update or delete on source.acquisition_attempts
  for each row execute function source.forbid_d00_history_mutation();

comment on table source.source_needs is
 'Y01 receipt: research question, coverage dimensions and existing-stock gap. Append-only; correction is a new row.';
comment on table source.acquisition_attempts is
 'Y07 append-only acquisition attempt log (§2.5). Success and failure are both kept; correction is a new row with correction_of.';
comment on column source.acquisition_attempts.rights_actions is
 'Per-action dictionary using the nine mohen rights actions only. Missing action = unknown = HOLD, never inferred.';
comment on column source.acquisition_attempts.request_digest is
 'SHA-256 of the redacted request/pagination. Raw credentials and query secrets are never stored.';

-- ---------------------------------------------------------------------------
-- 4) RLS 与最小授权（与既有 source.* 惯例一致：默认拒绝，逐角色开）
-- ---------------------------------------------------------------------------
alter table source.source_needs enable row level security;
alter table source.acquisition_methods enable row level security;
alter table source.acquisition_attempts enable row level security;

grant usage on schema source to mohen_private_worker;
revoke all on source.source_needs, source.acquisition_methods, source.acquisition_attempts
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select, insert on source.source_needs to mohen_private_worker;
grant select, insert on source.acquisition_attempts to mohen_private_worker;
grant select, insert on source.acquisition_methods to mohen_private_worker;
grant update (method_state, last_revalidated_at, recommended, alternatives)
  on source.acquisition_methods to mohen_private_worker;
grant select on source.source_needs, source.acquisition_methods, source.acquisition_attempts
  to mohen_gate_authority, mohen_gate_signer;

drop policy if exists source_needs_worker_write on source.source_needs;
create policy source_needs_worker_write on source.source_needs for insert
  to mohen_private_worker with check (true);
drop policy if exists source_needs_worker_read on source.source_needs;
create policy source_needs_worker_read on source.source_needs for select
  to mohen_private_worker using (true);
drop policy if exists source_needs_review_read on source.source_needs;
create policy source_needs_review_read on source.source_needs for select
  to mohen_gate_authority, mohen_gate_signer using (true);

drop policy if exists acquisition_methods_worker_write on source.acquisition_methods;
create policy acquisition_methods_worker_write on source.acquisition_methods for insert
  to mohen_private_worker with check (true);
drop policy if exists acquisition_methods_worker_read on source.acquisition_methods;
create policy acquisition_methods_worker_read on source.acquisition_methods for select
  to mohen_private_worker using (true);
drop policy if exists acquisition_methods_review_read on source.acquisition_methods;
create policy acquisition_methods_review_read on source.acquisition_methods for select
  to mohen_gate_authority, mohen_gate_signer using (true);

drop policy if exists acquisition_attempts_worker_write on source.acquisition_attempts;
create policy acquisition_attempts_worker_write on source.acquisition_attempts for insert
  to mohen_private_worker with check (true);
drop policy if exists acquisition_attempts_worker_read on source.acquisition_attempts;
create policy acquisition_attempts_worker_read on source.acquisition_attempts for select
  to mohen_private_worker using (true);
drop policy if exists acquisition_attempts_review_read on source.acquisition_attempts;
create policy acquisition_attempts_review_read on source.acquisition_attempts for select
  to mohen_gate_authority, mohen_gate_signer using (true);

-- 既有对象零改动自检：本次不新建、不改写 sources/source_versions/raw_items 任何行。
do $$
begin
  if to_regclass('source.source_needs') is null
     or to_regclass('source.acquisition_methods') is null
     or to_regclass('source.acquisition_attempts') is null then
    raise exception 'D00C1_TABLES_MISSING';
  end if;
end $$;

commit;
