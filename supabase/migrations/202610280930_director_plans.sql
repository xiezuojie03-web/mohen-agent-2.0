-- 202610280930_director_plans.sql
-- 创作编导（E1-3）：导演方案持久化（A/B 方案 + 选定 + 节拍），支撑 director-plans 系列候选 API。

create table if not exists public.director_plans (
  plan_id    uuid primary key default gen_random_uuid(),
  brief      text not null,
  topic      text not null default 'jinze',
  plan_a     jsonb not null default '{}'::jsonb,
  plan_b     jsonb not null default '{}'::jsonb,
  facts      jsonb not null default '[]'::jsonb,
  selected   text,
  beats      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.director_plans enable row level security;
