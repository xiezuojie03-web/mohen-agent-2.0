-- 202610280910_notifications.sql
-- 通知（API-022 GET /api/notifications 的物理承载）。当前轻量阶段无产生源，诚实空态。
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_ref   text not null default 'public',
  type       text not null default 'info',
  title      text not null,
  body       text not null default '',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
