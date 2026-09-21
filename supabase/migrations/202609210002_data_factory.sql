-- 202609210002_data_factory.sql
-- TASK-0003 — Data Factory 最小管线表。
-- 不修改 202609210001_foundation.sql。全部幂等（if not exists），可重复重建。
--
-- 证据门禁 G0-G6 含义（详见 skills/mohen-evidence-gate）：
--   G0 来源完整 / G1 对象身份 / G2 时间语义 / G3 空间诚实
--   G4 证据支持 / G5 冲突检测 / G6 发布资格
-- evidence_gate_audit 为每个 Gate 写审计；review_queue 收纳不达标项（Tier C 不得自动 approved）。

create table if not exists ingest_runs (
  ingest_run_id uuid primary key default gen_random_uuid(),
  pipeline_name text not null,
  source_scope text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running','completed','failed','partial')),
  input_count integer not null default 0,
  candidate_count integer not null default 0,
  verified_count integer not null default 0,
  rejected_count integer not null default 0,
  pending_count integer not null default 0,
  error_count integer not null default 0,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists review_queue (
  review_id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id text not null,
  review_tier text not null check (review_tier in ('A','B','C')),
  reason_code text,
  summary text,
  evidence_ids text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','needs_research')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

create table if not exists legacy_mappings (
  mapping_id uuid primary key default gen_random_uuid(),
  legacy_source text not null,
  legacy_type text not null,
  legacy_id text not null,
  target_type text not null,
  target_id text not null,
  mapping_status text not null default 'candidate',
  mapping_method text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  ingest_run_id uuid,
  unique (legacy_source, legacy_type, legacy_id, target_type)
);

create table if not exists evidence_gate_audit (
  audit_id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id text not null,
  gate_code text not null check (gate_code in ('G0','G1','G2','G3','G4','G5','G6')),
  result text not null check (result in ('pass','fail','pending')),
  reason text,
  actor_type text not null default 'rule' check (actor_type in ('rule','ai','human')),
  created_at timestamptz not null default now()
);

create index if not exists idx_review_queue_tier_status
  on review_queue(review_tier, status);
create index if not exists idx_legacy_mappings_legacy
  on legacy_mappings(legacy_source, legacy_type, legacy_id);
create index if not exists idx_evidence_gate_audit_obj
  on evidence_gate_audit(object_type, object_id, gate_code);

-- Tier C 不得自动 approved：缺少人工复核记录（review_note + reviewed_at）时禁止置为 approved。
-- 说明：A/B 级可由确定性机器转换自动 approved；C 级必须人工复核后才可 approved。
create or replace function guard_review_queue_tier_c()
returns trigger language plpgsql as $$
begin
  if new.review_tier = 'C' and new.status = 'approved'
     and (new.review_note is null or new.reviewed_at is null) then
    raise exception 'Tier C review item % requires human review note + reviewed_at before approval', new.review_id;
  end if;
  return new;
end $$;

drop trigger if exists review_queue_tier_c_guard on review_queue;
create trigger review_queue_tier_c_guard
  before insert or update on review_queue
  for each row execute function guard_review_queue_tier_c();
