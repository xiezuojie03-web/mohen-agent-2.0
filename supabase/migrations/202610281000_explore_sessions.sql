-- 202610281000_explore_sessions.sql
-- 探索会话（E1-6）：独立历史探索会话，支持零作品探索（Origin 可选）。
create table if not exists public.explore_sessions (
  session_id      uuid primary key default gen_random_uuid(),
  intent          text,
  origin_snapshot jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
alter table public.explore_sessions enable row level security;
