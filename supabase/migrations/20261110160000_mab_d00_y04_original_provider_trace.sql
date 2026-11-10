-- D00 Y04: 聚合目录原机构回溯（OriginalProviderTrace）的最小可信落点
--
-- 为什么需要一张新表（沿用 D00 交付包的落点裁决，不是自选）：
--   * 规范 Y04 的输出是 OriginalProviderTrace、catalog_record_ref、holding_ref 候选及
--     provenance 链；验收要求"每一跳可追、有原馆编号和核查时刻"。
--   * `source.resource_catalog` 是 Y02 的资源总目录**现值**（发现入口，可更新），
--     没有任何列能承载"多跳回溯链 + 每跳核查时刻 + 三层许可分离"这种不可覆写的审计事件。
--   * P0.3 §1 明确：「如果审计需要不可覆盖的多次尝试，而现表无法承载，允许增加专用
--     事件表并给出理由」；主规 §5.1 要求「沿用同职责来源表，新增字段或事件表必须证成」。
--     这里的理由就是"多跳链天然追加、且不得覆写历史回溯"。
--
-- 本迁移刻意不做的事：
--   * 不改写 source.sources / source_versions / raw_items / resource_catalog 的任何行；
--   * 不建第二个来源身份真值：原馆身份仍以 provider + catalog_no + uri 表达，与
--     resource_catalog 用 catalog_entry_id 关联；
--   * 不授予 UPDATE/DELETE：回溯结论更正一律以新行 + correction_of 表达。
begin;

create table if not exists source.original_provider_traces (
 trace_id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 -- catalog_record_ref：这条回溯是从哪条聚合/镜像目录记录出发的（Y02 的条目）。
 catalog_entry_id uuid references source.resource_catalog(catalog_entry_id),
 -- 聚合侧原样字段：provider / dataProvider / holding / license 读到了什么就记什么。
 aggregated_record jsonb not null default '{}'::jsonb,
 -- 原馆一侧：provider + catalog_no + uri。UNRESOLVED 时三者必须为空，不允许虚构。
 original_provider jsonb not null default '{}'::jsonb,
 -- holding_ref 候选：state=resolved/candidate 才允许有 value；unresolved 必须为空。
 holding_ref jsonb not null default '{}'::jsonb,
 -- 三层许可分离：聚合元数据许可 / 数字副本权利 / 馆藏身份，逐层带证据。
 rights_layers jsonb not null default '{}'::jsonb,
 -- provenance 链：每跳 {seq,kind,uri,checked_at,result,http_status,response_sha256,note}。
 provenance jsonb not null default '{}'::jsonb,
 origin_state text not null check (origin_state in ('RESOLVED','UNRESOLVED')),
 checked_at timestamptz not null,
 method_key text,
 method_version text,
 produced_by text not null default 'Y04',
 correction_of uuid references source.original_provider_traces(trace_id),
 created_at timestamptz not null default now(),
 check (jsonb_typeof(aggregated_record) = 'object'),
 check (jsonb_typeof(original_provider) = 'object'),
 check (jsonb_typeof(holding_ref) = 'object'),
 check (jsonb_typeof(rights_layers) = 'object'),
 check (jsonb_typeof(provenance) = 'object'),
 -- 三层许可必须都在，缺一层就等于把聚合许可默认当成了图像许可。
 check (rights_layers ? 'aggregation_metadata_license'
    and rights_layers ? 'digital_copy_rights'
    and rights_layers ? 'holding_identity'),
 -- 链必须是非空数组：没有"哪一跳"的回溯不是证据。
 check (jsonb_typeof(provenance->'hops') = 'array'
    and jsonb_array_length(provenance->'hops') >= 1),
 -- 回源成立：有原馆编号、有原馆 URI、链路标记完整，且不止一跳。
 check (origin_state <> 'RESOLVED' or (
   nullif(btrim(original_provider->>'catalog_no'), '') is not null
   and nullif(btrim(original_provider->>'uri'), '') is not null
   and nullif(btrim(original_provider->>'provider'), '') is not null
   and provenance->>'chain_complete' = 'true'
   and jsonb_array_length(provenance->'hops') >= 2)),
 -- 未回源：不得携带任何馆藏身份值，且必须写明查不回来的原因。
 check (origin_state <> 'UNRESOLVED' or (
   original_provider->>'catalog_no' is null
   and original_provider->>'uri' is null
   and holding_ref->>'value' is null
   and holding_ref->>'state' = 'unresolved'
   and nullif(btrim(provenance->>'unresolved_reason'), '') is not null))
);
create index if not exists original_provider_traces_project
  on source.original_provider_traces(project_id, created_at desc);
create index if not exists original_provider_traces_catalog
  on source.original_provider_traces(catalog_entry_id);

comment on table source.original_provider_traces is
 'Y04 original-provider trace: aggregated hit -> original institution, with a per-hop provenance chain and three licence layers kept apart. Append-only; correction is a new row.';
comment on column source.original_provider_traces.origin_state is
 'RESOLVED requires original catalog number, original URI and a traceable chain; UNRESOLVED keeps only the aggregated lead and must not invent holding identity.';
comment on column source.original_provider_traces.rights_layers is
 'Aggregation metadata licence, digital-copy rights and holding identity are recorded separately; aggregated CC0 never stands in for image rights.';

-- 历史不可覆写：回溯结论只能追加。
drop trigger if exists original_provider_traces_append_only on source.original_provider_traces;
create trigger original_provider_traces_append_only
  before update or delete on source.original_provider_traces
  for each row execute function source.forbid_d00_history_mutation();

-- 工序归位（D00 交付包规范原文）：extent/missing_parts 属 Y08，不属 Y04。
comment on table source.acquisition_coverages is
 'Y08 coverage conclusion across attempts: what was obtained and what is still missing. "complete" requires a verified attempt. (Was mislabelled Y04 before the D00 package relocation; rows are append-only and keep their original text.)';

-- RLS 与最小授权（沿用 source.* 惯例：默认拒绝，逐角色开）
alter table source.original_provider_traces enable row level security;

grant usage on schema source to mohen_private_worker;
revoke all on source.original_provider_traces
  from public, anon, authenticated, service_role, mohen_producer, mohen_gate_signer;
grant select, insert on source.original_provider_traces to mohen_private_worker;
grant select on source.original_provider_traces
  to mohen_gate_authority, mohen_gate_signer_m5_machine;

drop policy if exists original_provider_traces_worker_write on source.original_provider_traces;
create policy original_provider_traces_worker_write on source.original_provider_traces
  for insert to mohen_private_worker with check (true);
drop policy if exists original_provider_traces_worker_read on source.original_provider_traces;
create policy original_provider_traces_worker_read on source.original_provider_traces
  for select to mohen_private_worker using (true);
drop policy if exists original_provider_traces_review_read on source.original_provider_traces;
create policy original_provider_traces_review_read on source.original_provider_traces
  for select to mohen_gate_authority, mohen_gate_signer_m5_machine using (true);

do $$
begin
  if to_regclass('source.original_provider_traces') is null then
    raise exception 'D00_Y04_TRACE_TABLE_MISSING';
  end if;
end $$;

commit;
