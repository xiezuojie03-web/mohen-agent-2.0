-- 202610281100_study_asset_receipts.sql
-- E1-2 Studio 受托研究的资产回执（StudyAssetReceipts）：工具调用 + D 阶段生产的可复用回执。
-- 承载 CR-01（D 回执）、CR-02（未发表知识仍存）、CR-13（预算恢复 checkpoint）。

create table if not exists public.study_asset_receipts (
  receipt_id     uuid primary key default gen_random_uuid(),
  task_id        uuid not null references public.research_tasks(task_id) on delete cascade,
  kind           text not null check (kind in ('tool','d_stage','checkpoint')),
  stage          text not null,                          -- 'tool' | 'D00'..'D05'
  tool_id        text,                                   -- kind='tool' 时的工具注册 id
  cost           numeric not null default 0,
  output_locator text,                                   -- 无 key 的输出定位（uri / 文件路径 / 表引用）
  status         text not null check (status in ('reserved','settled','hold')),
  payload        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_study_receipts_task on public.study_asset_receipts(task_id);
alter table public.study_asset_receipts enable row level security;
