-- 202610280950_watch_sessions.sql
-- 观看进度（API-081 POST/GET /api/watch/sessions）。轻量：无账号系统，按 work_id 存最近 playhead。
create table if not exists public.watch_sessions (
  work_id    uuid primary key,
  playhead   numeric,
  updated_at timestamptz not null default now()
);
alter table public.watch_sessions enable row level security;
