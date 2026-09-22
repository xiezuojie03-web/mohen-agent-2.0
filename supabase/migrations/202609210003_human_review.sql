-- 202609210003_human_review.sql
-- TASK-0005 — 人审决策落库（HR-1~HR-6）。
--
-- 设计约束（Task §4 / §13）：
--   1. 不修改 001/002（本文件为全新迁移，仅追加）。
--   2. review_queue.review_tier 是「Data Factory Tier A/B/C」，与人审决策代码「HR 的 A/B/C」
--      语义不同，混用会混淆。故单独建 human_review_decisions 表承载 HR 决策，避免歧义。
--   3. machine_readable_flags 承载 legend / pending / conflict / excluded 等机器可读语义，
--      供下游（Knowledge Weave / 视觉选择 / 关系生成）直接消费，不靠自然语言判断。
--   4. visual_assets.eligibility_tags 为追加列（默认 '{}'，非破坏性），用于落实 HR-5
--      「本批 20 张视觉资产不得进入 heritage-primary selection」。

create table if not exists human_review_decisions (
  decision_id uuid primary key default gen_random_uuid(),
  hr_code text not null unique,                              -- 'HR-1' .. 'HR-6'（人审包编号）
  decision_code text not null check (decision_code in ('A','B','C')),  -- 用户的编辑决策代码（≠ Data Factory Tier）
  decision_label text not null,                             -- 该 HR 的 A/B/C 含义（人话）
  object_type text not null,                               -- entity / relation / visual_asset
  object_ref text not null,                                -- legacy_id / 实体引用 / 'visual_asset:batch-20'
  review_note text not null,                               -- 落库说明（含冻结语义）
  reviewed_at timestamptz not null,                        -- 人审时间（冻结于 TASK-0005）
  actor text not null default 'human'
    check (actor in ('human','user-confirmed','ai')),      -- 必须为人工确认
  status_after text not null,                              -- verified / candidate / legend / pending / research / excluded
  machine_readable_flags jsonb not null default '{}'::jsonb,
  source_refs text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_hr_code on human_review_decisions(hr_code);
create index if not exists idx_hr_object on human_review_decisions(object_type, object_ref);

-- HR-5 落地：视觉资产使用资格标记（追加列，非破坏性）。
alter table visual_assets
  add column if not exists eligibility_tags text[] not null default '{}';

create index if not exists idx_visual_asset_eligibility
  on visual_assets using gin (eligibility_tags);
