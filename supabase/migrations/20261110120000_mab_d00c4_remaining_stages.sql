-- D00-C4: Y02 资源总目录、Y04 取得范围/缺失部件、Y03 候选来源核查、Y06 优先级评估（本地隔离）
--
-- 为什么现在建（Owner 2026-11-10 一次性签四张表）：
--   C1 已交付 Y01 需求回执 / 获取方法目录 / Y07 尝试日志，C3 打通了真实入口与 G0 强制预选。
--   D00 剩下的判断链是"看到哪些资源 → 实际拿到多少、缺哪部分 → 候选能不能用 → 先取哪个"，
--   没有一处能复用现有表：source.source_needs 只有需求、acquisition_attempts 只有单次尝试结果，
--   都不能表达"跨尝试的覆盖结论"与"为什么选这一家"。四者互为上下游，拆分建会出现
--   "有目录无处记覆盖""有评估无核查"的空档，故一次迁移落齐。
--
-- 本迁移刻意不做的事：
--   * 不建 Y05（来源身份确认）表：Y05 的产出就是 source.sources / source_versions 的既有身份，
--     另建即第二套身份真值；核查动作由 Y03 承载。需要"确认动作"留痕时再最小增补。
--   * 不建 search_trace / source_dependency / 十类标签对应表：无生产者先建表即死结构。
--   * 不写种子数据、不推断回填、不改 sources / source_versions / raw_items 既有行与触发器。
--   * 不授予 UPDATE/DELETE：一切更正用新行 + correction_of 表达。
begin;

-- ---------------------------------------------------------------------------
-- 1) Y02 资源总目录：这次研究看到了哪些资源（无论最终取没取到）
-- ---------------------------------------------------------------------------
create table if not exists source.resource_catalog (
 catalog_entry_id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 need_id uuid not null references source.source_needs(need_id),
 provider text not null check (length(btrim(provider)) between 1 and 200),
 catalog_title text not null check (length(btrim(catalog_title)) between 1 and 500),
 -- 目录号/索书号/URL 标识都是"对方怎么称呼它"，可为空但不得用空串冒充。
 catalog_identifier text check (catalog_identifier is null or length(btrim(catalog_identifier)) between 1 and 500),
 carrier_hint text check (carrier_hint is null or length(btrim(carrier_hint)) between 1 and 64),
 language text check (language is null or length(btrim(language)) between 1 and 32),
 coverage_hint jsonb not null default '{}'::jsonb,
 rights_hint jsonb not null default '{}'::jsonb,
 availability_state text not null check (availability_state in (
   'catalog_found','catalog_listed_no_item','restricted','not_available','unknown')),
 discovered_by_method text not null check (length(btrim(discovered_by_method)) between 1 and 64),
 method_version text not null check (length(btrim(method_version)) between 1 and 64),
 evidence_ref jsonb not null default '{}'::jsonb,
 correction_of uuid references source.resource_catalog(catalog_entry_id),
 created_at timestamptz not null default now(),
 check (jsonb_typeof(coverage_hint) = 'object'),
 check (jsonb_typeof(rights_hint) = 'object'),
 check (jsonb_typeof(evidence_ref) = 'object')
);
-- 同一需求下同一提供方的同一编号只登记一次；无编号的条目不做唯一约束（同题多版是正常情形）。
create unique index if not exists resource_catalog_identity
  on source.resource_catalog(need_id, provider, catalog_identifier)
  where catalog_identifier is not null and correction_of is null;
create index if not exists resource_catalog_need on source.resource_catalog(need_id, created_at desc);
create index if not exists resource_catalog_project on source.resource_catalog(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Y04 取得范围/缺失部件：跨尝试后的覆盖结论，不是又一次尝试
-- ---------------------------------------------------------------------------
create table if not exists source.acquisition_coverages (
 coverage_id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 attempt_id uuid not null references source.acquisition_attempts(attempt_id),
 catalog_entry_id uuid references source.resource_catalog(catalog_entry_id),
 coverage_scope jsonb not null default '{}'::jsonb,
 missing_parts jsonb not null default '[]'::jsonb,
 completeness_state text not null check (completeness_state in ('complete','partial','unknown')),
 verified_against jsonb not null default '{}'::jsonb,
 note text,
 correction_of uuid references source.acquisition_coverages(coverage_id),
 created_at timestamptz not null default now(),
 check (jsonb_typeof(coverage_scope) = 'object'),
 check (jsonb_typeof(missing_parts) = 'array'),
 check (jsonb_typeof(verified_against) = 'object'),
 -- 完整与缺件互斥：不许一边说"完整"一边挂着缺失项。
 check (completeness_state <> 'complete' or missing_parts = '[]'::jsonb)
);
create index if not exists acquisition_coverages_attempt on source.acquisition_coverages(attempt_id);
create index if not exists acquisition_coverages_catalog on source.acquisition_coverages(catalog_entry_id);

-- "完整"必须有一次已核验的取得做依据：没有字节与哈希的尝试不能宣布覆盖完整。
create or replace function source.guard_coverage_complete() returns trigger
language plpgsql as $$
declare a source.acquisition_attempts;
begin
  if new.completeness_state <> 'complete' then return new; end if;
  select * into a from source.acquisition_attempts where attempt_id = new.attempt_id;
  if a.attempt_id is null
     or a.result_state <> 'acquired_verified'
     or a.asset_sha256 is null or a.byte_size is null then
    raise exception 'COVERAGE_COMPLETE_REQUIRES_VERIFIED_ATTEMPT';
  end if;
  return new;
end $$;
drop trigger if exists acquisition_coverages_complete_guard on source.acquisition_coverages;
create trigger acquisition_coverages_complete_guard
  before insert on source.acquisition_coverages
  for each row execute function source.guard_coverage_complete();

-- ---------------------------------------------------------------------------
-- 3) Y03 候选来源核查：这家能不能用，结论必须带逐项依据
-- ---------------------------------------------------------------------------
create table if not exists source.candidate_verifications (
 verification_id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 catalog_entry_id uuid not null references source.resource_catalog(catalog_entry_id),
 checks jsonb not null,
 verdict text not null check (verdict in ('admissible','rejected','needs_owner')),
 reason_code text not null check (length(btrim(reason_code)) between 1 and 128),
 method_key text not null check (length(btrim(method_key)) between 1 and 64),
 method_version text not null check (length(btrim(method_version)) between 1 and 64),
 correction_of uuid references source.candidate_verifications(verification_id),
 created_at timestamptz not null default now(),
 check (jsonb_typeof(checks) = 'object'),
 -- 空依据不能给结论：至少一条逐项结论。
 check (checks <> '{}'::jsonb)
);
create index if not exists candidate_verifications_catalog on source.candidate_verifications(catalog_entry_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) Y06 优先级评估：为什么先取这一家
-- ---------------------------------------------------------------------------
create table if not exists source.priority_assessments (
 assessment_id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 need_id uuid not null references source.source_needs(need_id),
 catalog_entry_id uuid not null references source.resource_catalog(catalog_entry_id),
 -- 权威性/相关性/覆盖/时效/权利五项与各自依据，缺项如实 unknown，不在存储层好看化。
 criteria jsonb not null default '{}'::jsonb,
 decision text not null check (decision in ('selected','deferred','excluded')),
 rationale text not null check (length(btrim(rationale)) between 1 and 2000),
 method_key text not null check (length(btrim(method_key)) between 1 and 64),
 method_version text not null check (length(btrim(method_version)) between 1 and 64),
 correction_of uuid references source.priority_assessments(assessment_id),
 created_at timestamptz not null default now(),
 check (jsonb_typeof(criteria) = 'object')
);
create index if not exists priority_assessments_need on source.priority_assessments(need_id, created_at desc);

-- 未核不得入选：selected 必须已有同一候选的 admissible 核查行。
create or replace function source.guard_priority_selected() returns trigger
language plpgsql as $$
begin
  if new.decision <> 'selected' then return new; end if;
  if not exists (
    select 1 from source.candidate_verifications v
    where v.catalog_entry_id = new.catalog_entry_id and v.verdict = 'admissible'
  ) then
    raise exception 'PRIORITY_SELECTED_REQUIRES_ADMISSIBLE_VERIFICATION';
  end if;
  return new;
end $$;
drop trigger if exists priority_assessments_selected_guard on source.priority_assessments;
create trigger priority_assessments_selected_guard
  before insert on source.priority_assessments
  for each row execute function source.guard_priority_selected();

-- ---------------------------------------------------------------------------
-- 5) 历史不可变：四张表一律追加
-- ---------------------------------------------------------------------------
drop trigger if exists resource_catalog_append_only on source.resource_catalog;
create trigger resource_catalog_append_only before update or delete on source.resource_catalog
  for each row execute function source.forbid_d00_history_mutation();
drop trigger if exists acquisition_coverages_append_only on source.acquisition_coverages;
create trigger acquisition_coverages_append_only before update or delete on source.acquisition_coverages
  for each row execute function source.forbid_d00_history_mutation();
drop trigger if exists candidate_verifications_append_only on source.candidate_verifications;
create trigger candidate_verifications_append_only before update or delete on source.candidate_verifications
  for each row execute function source.forbid_d00_history_mutation();
drop trigger if exists priority_assessments_append_only on source.priority_assessments;
create trigger priority_assessments_append_only before update or delete on source.priority_assessments
  for each row execute function source.forbid_d00_history_mutation();

comment on table source.resource_catalog is
 'Y02 resource catalog: what this research could see, independent of whether it was acquired. Append-only; correction is a new row.';
comment on table source.acquisition_coverages is
 'Y04 coverage conclusion across attempts: what was obtained and what is still missing. "complete" requires a verified attempt.';
comment on table source.candidate_verifications is
 'Y03 candidate verification: verdict with per-item checks. An empty checks object is not a decision.';
comment on table source.priority_assessments is
 'Y06 priority assessment: why this candidate is taken first. "selected" requires an admissible verification of the same candidate.';

-- ---------------------------------------------------------------------------
-- 6) RLS 与最小授权（沿用 source.* 惯例：默认拒绝，逐角色开）
-- ---------------------------------------------------------------------------
alter table source.resource_catalog enable row level security;
alter table source.acquisition_coverages enable row level security;
alter table source.candidate_verifications enable row level security;
alter table source.priority_assessments enable row level security;

grant usage on schema source to mohen_private_worker;
revoke all on source.resource_catalog, source.acquisition_coverages,
  source.candidate_verifications, source.priority_assessments
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select, insert on source.resource_catalog, source.acquisition_coverages,
  source.candidate_verifications, source.priority_assessments to mohen_private_worker;
grant select on source.resource_catalog, source.acquisition_coverages,
  source.candidate_verifications, source.priority_assessments
  to mohen_gate_authority, mohen_gate_signer;

do $$
declare t text;
begin
  foreach t in array array['resource_catalog','acquisition_coverages','candidate_verifications','priority_assessments'] loop
    execute format('drop policy if exists %I_worker_write on source.%I', t, t);
    execute format('create policy %I_worker_write on source.%I for insert to mohen_private_worker with check (true)', t, t);
    execute format('drop policy if exists %I_worker_read on source.%I', t, t);
    execute format('create policy %I_worker_read on source.%I for select to mohen_private_worker using (true)', t, t);
    execute format('drop policy if exists %I_review_read on source.%I', t, t);
    execute format('create policy %I_review_read on source.%I for select to mohen_gate_authority, mohen_gate_signer using (true)', t, t);
  end loop;
end $$;

-- 零改动自检：四张表必须存在，且既有三元链行数未变由验证工具核对。
do $$
begin
  if to_regclass('source.resource_catalog') is null
     or to_regclass('source.acquisition_coverages') is null
     or to_regclass('source.candidate_verifications') is null
     or to_regclass('source.priority_assessments') is null then
    raise exception 'D00C4_TABLES_MISSING';
  end if;
end $$;

commit;
